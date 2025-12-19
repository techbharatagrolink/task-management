// Monthly performance API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get monthly performance
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    // Check permissions
    let targetUserId = user.id;
    if (userId && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = userId;
    }

    // PERFORMANCE FIX: Select specific columns
    let sql = 'SELECT id, user_id, month, year, score, tasks_completed, on_time_delivery, created_at, updated_at FROM monthly_performance WHERE user_id = ?';
    const params = [targetUserId];

    if (month) {
      sql += ' AND month = ?';
      params.push(month);
    }

    if (year) {
      sql += ' AND year = ?';
      params.push(year);
    }

    sql += ' ORDER BY year DESC, month DESC LIMIT 12';

    const performance = await query(sql, params);

    return NextResponse.json({ performance });
  } catch (error) {
    console.error('Get performance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update monthly performance
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin and Manager can update
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { user_id, month, year, score, tasks_completed, on_time_delivery } = body;

    if (!user_id || !month || !year) {
      return NextResponse.json(
        { error: 'User ID, month, and year are required' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO monthly_performance 
       (user_id, month, year, score, tasks_completed, on_time_delivery)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       score = VALUES(score),
       tasks_completed = VALUES(tasks_completed),
       on_time_delivery = VALUES(on_time_delivery)`,
      [
        user_id,
        month,
        year,
        score || 0,
        tasks_completed || 0,
        on_time_delivery || 0
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update performance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

