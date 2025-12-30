// Download attendance file from R2
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

    // Get file record
    const files = await query(
      `SELECT 
        af.id,
        af.file_name,
        af.original_file_name,
        af.file_key,
        af.file_type,
        af.uploaded_by
       FROM attendance_files af
       WHERE af.id = ?`,
      [id]
    );

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    const file = files[0];

    // Non-admin users can only download files they uploaded
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      if (file.uploaded_by !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Download from R2
    const { body, contentType, contentLength } = await downloadFromR2(file.file_key);

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);

    // Return file as response
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType || file.file_type || 'application/vnd.ms-excel',
        'Content-Disposition': `attachment; filename="${file.original_file_name}"`,
        'Content-Length': contentLength || buffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download attendance file error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

