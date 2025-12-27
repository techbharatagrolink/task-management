// Leave comments API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get comments for a leave
export async function GET(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params; // leave_id

    // Verify user has permission to view this leave
    const leave = await query(
      'SELECT l.*, u.manager_id FROM leaves l JOIN users u ON l.user_id = u.id WHERE l.id = ?',
      [id]
    );

    if (leave.length === 0) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    const leaveData = leave[0];
    const isHR = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    const isManager = user.role === 'Manager' && !isHR;

    // Check permissions
    let canView = false;
    if (isHR) {
      canView = true;
    } else if (isManager) {
      // Manager can view comments if they are the manager of the employee
      canView = leaveData.manager_id === user.id;
    } else {
      // Employee can view comments on their own leaves
      canView = leaveData.user_id === user.id;
    }

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get comments with user info
    const comments = await query(
      `SELECT lc.*, u.name as user_name, u.role as user_role, u.email as user_email
       FROM leave_comments lc
       JOIN users u ON lc.user_id = u.id
       WHERE lc.leave_id = ?
       ORDER BY lc.created_at ASC`,
      [id]
    );

    return NextResponse.json({ comments });
  } catch (error) {
    console.error('Get leave comments error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Add comment to a leave
export async function POST(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params; // leave_id
    const body = await request.json();
    const { comment } = body;

    if (!comment || !comment.trim()) {
      return NextResponse.json(
        { error: 'Comment is required' },
        { status: 400 }
      );
    }

    // Verify leave exists and user has permission to comment
    const leave = await query(
      'SELECT l.*, u.manager_id FROM leaves l JOIN users u ON l.user_id = u.id WHERE l.id = ?',
      [id]
    );

    if (leave.length === 0) {
      return NextResponse.json({ error: 'Leave not found' }, { status: 404 });
    }

    const leaveData = leave[0];
    const isHR = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    const isManager = user.role === 'Manager' && !isHR;

    // Only HR and Managers can add comments
    let canComment = false;
    if (isHR) {
      canComment = true;
    } else if (isManager) {
      // Manager can comment if they are the manager of the employee
      canComment = leaveData.manager_id === user.id;
    }

    if (!canComment) {
      return NextResponse.json(
        { error: 'Forbidden: Only HR and Managers can add comments on leave requests' },
        { status: 403 }
      );
    }

    // Insert comment
    const result = await query(
      'INSERT INTO leave_comments (leave_id, user_id, comment) VALUES (?, ?, ?)',
      [id, user.id, comment.trim()]
    );

    // Get the created comment with user info
    const comments = await query(
      `SELECT lc.*, u.name as user_name, u.role as user_role, u.email as user_email
       FROM leave_comments lc
       JOIN users u ON lc.user_id = u.id
       WHERE lc.id = ?`,
      [result.insertId]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'add_leave_comment', 'leaves', `Added comment on leave ID: ${id}`]
    );

    return NextResponse.json({
      success: true,
      comment: comments[0]
    });
  } catch (error) {
    console.error('Add leave comment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

