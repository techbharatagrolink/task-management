// Task status request approval API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get status requests for a task
export async function GET(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get all status requests for this task
    const requests = await query(
      `SELECT tsr.*, 
              u1.name as requested_by_name,
              u2.name as verified_by_name,
              u3.name as reassigned_to_name
       FROM task_status_requests tsr
       LEFT JOIN users u1 ON tsr.requested_by = u1.id
       LEFT JOIN users u2 ON tsr.verified_by = u2.id
       LEFT JOIN users u3 ON tsr.reassigned_to = u3.id
       WHERE tsr.task_id = ?
       ORDER BY tsr.created_at DESC`,
      [id]
    );

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('Get status requests error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Approve/Reject/Reassign status request
export async function POST(request, { params }) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params; // task_id
    const body = await request.json();
    const { request_id, action, comment, reassigned_to } = body;

    if (!request_id || !action) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Request ID and action are required' },
        { status: 400 }
      );
    }

    // Get the status request
    const requests = await query(
      'SELECT * FROM task_status_requests WHERE id = ? AND task_id = ?',
      [request_id, id]
    );

    if (requests.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Status request not found' }, { status: 404 });
    }

    const statusRequest = requests[0];

    if (statusRequest.status !== 'pending') {
      await connection.rollback();
      return NextResponse.json(
        { error: 'This status request has already been processed' },
        { status: 400 }
      );
    }

    // Check if user can verify (must be assigned to task or be manager/admin/hr)
    const canVerify = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    
    if (!canVerify) {
      // Check if user is assigned to the task
      const assignments = await query(
        'SELECT user_id FROM task_assignments WHERE task_id = ? AND user_id = ?',
        [id, user.id]
      );

      if (assignments.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'You are not authorized to verify this request' },
          { status: 403 }
        );
      }
    }

    let newStatus = statusRequest.status;
    let updateTaskStatus = null;

    if (action === 'approve') {
      newStatus = 'approved';
      updateTaskStatus = statusRequest.requested_status;
    } else if (action === 'reject') {
      newStatus = 'rejected';
    } else if (action === 'reassign') {
      if (!reassigned_to) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Reassigned user ID is required for reassign action' },
          { status: 400 }
        );
      }
      newStatus = 'reassigned';
      
      // Update task assignment
      await connection.execute(
        'DELETE FROM task_assignments WHERE task_id = ? AND user_id = ?',
        [id, statusRequest.requested_by]
      );
      await connection.execute(
        'INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)',
        [id, reassigned_to]
      );
    } else {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Invalid action. Must be approve, reject, or reassign' },
        { status: 400 }
      );
    }

    // Update status request
    await connection.execute(
      `UPDATE task_status_requests 
       SET status = ?, verified_by = ?, verification_comment = ?, reassigned_to = ?, verified_at = NOW()
       WHERE id = ?`,
      [
        newStatus,
        user.id,
        comment || null,
        action === 'reassign' ? reassigned_to : null,
        request_id
      ]
    );

    // Update task status if approved
    if (updateTaskStatus) {
      await connection.execute(
        'UPDATE tasks SET status = ? WHERE id = ?',
        [updateTaskStatus, id]
      );
    }

    // Log activity
    await connection.execute(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [
        user.id,
        'verify_status_request',
        'tasks',
        `${action}ed status change request for task ID: ${id}`
      ]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: `Status request ${action}ed successfully`
    });
  } catch (error) {
    await connection.rollback();
    console.error('Verify status request error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
