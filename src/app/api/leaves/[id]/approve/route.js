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

