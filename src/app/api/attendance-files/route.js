// Attendance Files API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';
import { uploadToR2, downloadFromR2, deleteFromR2 } from '@/lib/r2-client';

// Get attendance files
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const periodType = searchParams.get('period_type');
    const periodValue = searchParams.get('period_value');
    const fileId = searchParams.get('id');

    let sql = `
      SELECT 
        af.id,
        af.file_name,
        af.original_file_name,
        af.file_key,
        af.file_size,
        af.file_type,
        af.period_type,
        af.period_value,
        af.description,
        af.uploaded_by,
        af.created_at,
        af.updated_at,
        u.name as uploaded_by_name,
        u.email as uploaded_by_email
      FROM attendance_files af
      INNER JOIN users u ON af.uploaded_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by file ID if specified
    if (fileId) {
      sql += ' AND af.id = ?';
      params.push(fileId);
    }

    // Filter by period type if specified
    if (periodType) {
      sql += ' AND af.period_type = ?';
      params.push(periodType);
    }

    // Filter by period value if specified
    if (periodValue) {
      sql += ' AND af.period_value = ?';
      params.push(periodValue);
    }

    // Non-admin users can only see files they uploaded
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      sql += ' AND af.uploaded_by = ?';
      params.push(user.id);
    }

    sql += ' ORDER BY af.created_at DESC';

    const files = await query(sql, params);

    return NextResponse.json({ files });
  } catch (error) {
    console.error('Get attendance files error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Upload attendance file
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, HR, Manager can upload files
    const canUpload = hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager']);
    if (!canUpload) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const formData = await request.formData();
    const file = formData.get('file');
    const periodType = formData.get('period_type');
    const periodValue = formData.get('period_value');
    const description = formData.get('description');

    // Validate required fields
    if (!file || !periodType || !periodValue) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'File, period type, and period value are required' },
        { status: 400 }
      );
    }

    // Validate period type
    if (!['day', 'week', 'month'].includes(periodType)) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Period type must be day, week, or month' },
        { status: 400 }
      );
    }

    // Validate file type (only XLS/XLSX)
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream' // Some browsers send this for .xls
    ];
    const fileType = file.type || 'application/vnd.ms-excel';
    
    // Check file extension as fallback
    const fileName = file.name || '';
    const fileExtension = fileName.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx'].includes(fileExtension)) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Only XLS and XLSX files are allowed' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    // Generate unique file key
    const timestamp = Date.now();
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileKey = `attendance-files/${timestamp}-${sanitizedFileName}`;

    // Upload to R2
    await uploadToR2(fileBuffer, fileKey, fileType);

    // Save metadata to database
    const [result] = await connection.execute(
      `INSERT INTO attendance_files 
       (file_name, original_file_name, file_key, file_size, file_type, period_type, period_value, description, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sanitizedFileName,
        fileName,
        fileKey,
        fileBuffer.length,
        fileType,
        periodType,
        periodValue,
        description || null,
        user.id
      ]
    );

    // Fetch the created file record
    const [fileResults] = await connection.execute(
      `SELECT 
        af.id,
        af.file_name,
        af.original_file_name,
        af.file_key,
        af.file_size,
        af.file_type,
        af.period_type,
        af.period_value,
        af.description,
        af.uploaded_by,
        af.created_at,
        u.name as uploaded_by_name,
        u.email as uploaded_by_email
       FROM attendance_files af
       INNER JOIN users u ON af.uploaded_by = u.id
       WHERE af.id = ?`,
      [result.insertId]
    );

    await connection.commit();

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'upload_attendance_file', 'attendance_files', `Uploaded attendance file: ${fileName}`]
    );

    return NextResponse.json({
      success: true,
      file: fileResults[0]
    });
  } catch (error) {
    await connection.rollback();
    console.error('Upload attendance file error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// Delete attendance file
export async function DELETE(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, HR can delete files
    const canDelete = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    if (!canDelete) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('id');

    if (!fileId) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Get file record
    const [files] = await connection.execute(
      'SELECT file_key, file_name FROM attendance_files WHERE id = ?',
      [fileId]
    );

    if (files.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // Delete from R2
    await deleteFromR2(file.file_key);

    // Delete from database
    await connection.execute(
      'DELETE FROM attendance_files WHERE id = ?',
      [fileId]
    );

    await connection.commit();

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'delete_attendance_file', 'attendance_files', `Deleted attendance file: ${file.file_name}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Delete attendance file error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

