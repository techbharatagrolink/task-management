// Task ratings API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Rate task
export async function POST(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin and Manager can rate
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params; // task_id
    const body = await request.json();
    const { user_id, rating, feedback } = body;

    if (!user_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'User ID and rating (1-5) are required' },
        { status: 400 }
      );
    }

    // Insert or update rating
    await query(
      `INSERT INTO task_ratings (task_id, user_id, rated_by, rating, feedback)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       rating = VALUES(rating),
       feedback = VALUES(feedback)`,
      [id, user_id, user.id, rating, feedback || null]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'rate_task', 'tasks', `Rated task ${id} for user ${user_id}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Rate task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

