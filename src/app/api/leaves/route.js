// Leaves API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get leaves
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const status = searchParams.get('status');

    // Check permissions
    let targetUserId = user.id;
    if (userId && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = userId;
    }

    let sql = `
      SELECT l.*, u.name as user_name, u.email as user_email,
             approver.name as approved_by_name
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      WHERE l.user_id = ?
    `;
    const params = [targetUserId];

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.created_at DESC';

    const leaves = await query(sql, params);

    return NextResponse.json({ leaves });
  } catch (error) {
    console.error('Get leaves error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply for leave
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { leave_type, start_date, end_date, reason } = body;

    if (!leave_type || !start_date || !end_date) {
      return NextResponse.json(
        { error: 'Leave type, start date, and end date are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO leaves (user_id, leave_type, start_date, end_date, reason)
       VALUES (?, ?, ?, ?, ?)`,
      [user.id, leave_type, start_date, end_date, reason || null]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'apply_leave', 'leaves', `Applied for ${leave_type} leave`]
    );

    return NextResponse.json({
      success: true,
      leave: { id: result.insertId }
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

