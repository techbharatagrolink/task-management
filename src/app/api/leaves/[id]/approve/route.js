// Approve/Reject leave API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin, Manager, HR can approve
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body; // 'approved' or 'rejected'

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status' },
        { status: 400 }
      );
    }

    // For Managers, verify they can only approve leaves from their direct reports (manager_id)
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      const leaveCheck = await query(
        `SELECT l.id, u.manager_id 
         FROM leaves l
         JOIN users u ON l.user_id = u.id
         WHERE l.id = ? AND u.manager_id = ?`,
        [id, user.id]
      );
      
      if (leaveCheck.length === 0) {
        return NextResponse.json(
          { error: 'Forbidden: You can only approve leaves from your direct team members' },
          { status: 403 }
        );
      }
    }

    await query(
      `UPDATE leaves 
       SET status = ?, approved_by = ?, approved_at = NOW()
       WHERE id = ?`,
      [status, user.id, id]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'approve_leave', 'leaves', `${status} leave ID: ${id}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Approve leave error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

