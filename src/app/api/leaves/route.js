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

    // Check permissions - HR can see all leaves, Managers see their team's leaves, others see only their own
    const isHR = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    const isManager = user.role === 'Manager' && !isHR;
    let targetUserId = user.id;
    if (userId && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = userId;
    }

    let sql = `
      SELECT l.*, u.name as user_name, u.email as user_email,
             u.manager_id,
             approver.name as approved_by_name,
             DATEDIFF(l.end_date, l.start_date) + 1 as days
      FROM leaves l
      JOIN users u ON l.user_id = u.id
      LEFT JOIN users approver ON l.approved_by = approver.id
    `;
    const params = [];

    // HR can see all leaves, Managers see their team's leaves, others see only their own
    if (isHR && !userId) {
      // HR viewing all leaves - no user filter
      sql += ' WHERE 1=1';
    } else if (isManager && !userId) {
      // Manager viewing their team members' leaves
      sql += ' WHERE u.manager_id = ?';
      params.push(user.id);
    } else {
      sql += ' WHERE l.user_id = ?';
      params.push(targetUserId);
    }

    if (status) {
      sql += ' AND l.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY l.created_at DESC';

    const leaves = await query(sql, params);

    // Get comments for all leaves if there are any
    if (leaves.length > 0) {
      const leaveIds = leaves.map(l => l.id);
      const placeholders = leaveIds.map(() => '?').join(',');
      
      const comments = await query(
        `SELECT lc.*, u.name as user_name, u.role as user_role, u.email as user_email
         FROM leave_comments lc
         JOIN users u ON lc.user_id = u.id
         WHERE lc.leave_id IN (${placeholders})
         ORDER BY lc.created_at ASC`,
        leaveIds
      );

      // Group comments by leave_id
      const commentsByLeave = {};
      comments.forEach(comment => {
        if (!commentsByLeave[comment.leave_id]) {
          commentsByLeave[comment.leave_id] = [];
        }
        commentsByLeave[comment.leave_id].push(comment);
      });

      // Attach comments to leaves
      leaves.forEach(leave => {
        leave.comments = commentsByLeave[leave.id] || [];
      });
    }

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

