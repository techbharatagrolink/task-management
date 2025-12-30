// Employee Documents API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';
import { uploadToR2, downloadFromR2, deleteFromR2 } from '@/lib/r2-client';

// Get employee documents
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const documentId = searchParams.get('id');

    let sql = `
      SELECT 
        ed.id,
        ed.employee_id,
        ed.document_name,
        ed.original_file_name,
        ed.file_key,
        ed.file_size,
        ed.file_type,
        ed.document_date,
        ed.description,
        ed.uploaded_by,
        ed.created_at,
        ed.updated_at,
        e.name as employee_name,
        e.email as employee_email,
        u.name as uploaded_by_name,
        u.email as uploaded_by_email
      FROM employee_documents ed
      INNER JOIN users e ON ed.employee_id = e.id
      INNER JOIN users u ON ed.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by document ID if specified
    if (documentId) {
      sql += ' AND ed.id = ?';
      params.push(documentId);
    }

    // Filter by employee ID if specified
    if (employeeId) {
      sql += ' AND ed.employee_id = ?';
      params.push(employeeId);
    }

    // Non-admin users can only see documents for employees they have access to
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      // Regular users can only see their own documents
      sql += ' AND ed.employee_id = ?';
      params.push(user.id);
    } else if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      // Managers can only see documents for their team members
      sql += ' AND e.manager_id = ?';
      params.push(user.id);
    }

    sql += ' ORDER BY ed.created_at DESC';

    const documents = await query(sql, params);

    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Get employee documents error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Upload employee document
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, HR can upload documents
    const canUpload = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    if (!canUpload) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const employeeId = formData.get('employee_id');
    const documentName = formData.get('document_name');
    const documentDate = formData.get('document_date');
    const description = formData.get('description');

    // Validate required fields
    if (!file || !employeeId || !documentName) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'File, employee ID, and document name are required' },
        { status: 400 }
      );
    }

    // Validate employee exists
    const [employees] = await connection.execute(
      'SELECT id, name FROM users WHERE id = ? AND role != ?',
      [employeeId, 'Super Admin']
    );

    if (employees.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `employee-documents/${employeeId}/${timestamp}-${sanitizedFileName}`;

    // Get file type
    const fileType = file.type || 'application/octet-stream';

    // Upload to R2
    await uploadToR2(fileBuffer, fileKey, fileType);

    // Save metadata to database
    const [result] = await connection.execute(
      `INSERT INTO employee_documents 
       (employee_id, document_name, original_file_name, file_key, file_size, file_type, document_date, description, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employeeId,
        documentName,
        file.name,
        fileKey,
        fileBuffer.length,
        fileType,
        documentDate || null,
        description || null,
        user.id
      ]
    );

    // Fetch the created document record
    const [documentResults] = await connection.execute(
      `SELECT 
        ed.id,
        ed.employee_id,
        ed.document_name,
        ed.original_file_name,
        ed.file_key,
        ed.file_size,
        ed.file_type,
        ed.document_date,
        ed.description,
        ed.uploaded_by,
        ed.created_at,
        e.name as employee_name,
        e.email as employee_email,
        u.name as uploaded_by_name
       FROM employee_documents ed
       INNER JOIN users e ON ed.employee_id = e.id
       INNER JOIN users u ON ed.uploaded_by = u.id
       WHERE ed.id = ?`,
      [result.insertId]
    );

    await connection.commit();

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'upload_employee_document', 'employee_documents', `Uploaded document: ${documentName} for employee ID: ${employeeId}`]
    );

    return NextResponse.json({
      success: true,
      document: documentResults[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Upload employee document error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// Delete employee document
export async function DELETE(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, HR can delete documents
    const canDelete = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    if (!canDelete) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('id');

    if (!documentId) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get document record
    const [documents] = await connection.execute(
      'SELECT file_key, document_name FROM employee_documents WHERE id = ?',
      [documentId]
    );

    if (documents.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documents[0];

    // Delete from R2
    await deleteFromR2(document.file_key);

    // Delete from database
    await connection.execute(
      'DELETE FROM employee_documents WHERE id = ?',
      [documentId]
    );

    await connection.commit();

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'delete_employee_document', 'employee_documents', `Deleted document: ${document.document_name}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Delete employee document error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

