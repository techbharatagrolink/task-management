// Task reports API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// Submit report
export async function POST(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params; // task_id
    const body = await request.json();
    const { report_text, working_links, completion_files } = body;

    if (!report_text) {
      return NextResponse.json(
        { error: 'Report text is required' },
        { status: 400 }
      );
    }

    // Check if report already exists (cannot be rejected once submitted)
    const existing = await query(
      'SELECT id FROM task_reports WHERE task_id = ? AND user_id = ?',
      [id, user.id]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Report already submitted. Cannot modify or resubmit.' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO task_reports (task_id, user_id, report_text, working_links, completion_files)
       VALUES (?, ?, ?, ?, ?)`,
      [
        id,
        user.id,
        report_text,
        working_links ? JSON.stringify(working_links) : null,
        completion_files ? JSON.stringify(completion_files) : null
      ]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'submit_report', 'tasks', `Submitted report for task ID: ${id}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Submit report error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

