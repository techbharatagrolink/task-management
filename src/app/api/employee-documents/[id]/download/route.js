// Download employee document from R2
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';
import { downloadFromR2 } from '@/lib/r2-client';

export async function GET(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get document record
    const documents = await query(
      `SELECT 
        ed.id,
        ed.employee_id,
        ed.document_name,
        ed.original_file_name,
        ed.file_key,
        ed.file_type,
        e.name as employee_name
       FROM employee_documents ed
       INNER JOIN users e ON ed.employee_id = e.id
       WHERE ed.id = ?`,
      [id]
    );

    if (documents.length === 0) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    const document = documents[0];

    // Check permissions
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      // Regular users can only download their own documents
      if (parseInt(document.employee_id) !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      // Managers can only download documents for their team members
      const [employee] = await query(
        'SELECT manager_id FROM users WHERE id = ?',
        [document.employee_id]
      );
      if (employee.length === 0 || employee[0].manager_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Download from R2
    const { body, contentType, contentLength } = await downloadFromR2(document.file_key);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return file as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || document.file_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${document.original_file_name}"`,
        'Content-Length': contentLength || buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download employee document error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

