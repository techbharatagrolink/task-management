// Task comments API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// Add comment
export async function POST(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params; // task_id
    const body = await request.json();
    const { comment } = body;

    if (!comment) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [id, user.id, comment]
    );

    // Get the created comment with user info
    const comments = await query(
      `SELECT tc.*, u.name as user_name, u.role as user_role
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.id = ?`,
      [result.insertId]
    );

    return NextResponse.json({
      success: true,
      comment: comments[0]
    });
  } catch (error) {
    console.error('Add comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

