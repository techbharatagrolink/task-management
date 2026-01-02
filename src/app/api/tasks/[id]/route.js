// Individual task API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get task by ID
export async function GET(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const tasks = await query(
      `SELECT t.*, 
              GROUP_CONCAT(DISTINCT u.id) as assigned_user_ids,
              GROUP_CONCAT(DISTINCT u.name) as assigned_user_names
       FROM tasks t
       LEFT JOIN task_assignments ta ON t.id = ta.task_id
       LEFT JOIN users u ON ta.user_id = u.id
       WHERE t.id = ?
       GROUP BY t.id`,
      [id]
    );

    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const task = tasks[0];

    // Check if user has access
    const assignedUserIds = task.assigned_user_ids ? task.assigned_user_ids.split(',').map(Number) : [];
    
    // Super Admin, Admin, and HR can view all tasks
    let canView = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']) ||
                  assignedUserIds.includes(user.id);
    
    // Managers can only view tasks they created, are assigned to, or assigned to their team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin'])) {
      // Check if any assigned user is a team member
      if (assignedUserIds.length > 0) {
        const teamMembers = await query(
          'SELECT id FROM users WHERE manager_id = ? AND id IN (' + assignedUserIds.map(() => '?').join(',') + ')',
          [user.id, ...assignedUserIds]
        );
        const hasTeamMember = teamMembers.length > 0;
        
        // Manager can view if:
        // 1. They created the task
        // 2. They are assigned to the task
        // 3. Any team member is assigned to the task
        canView = task.created_by === user.id ||
                  assignedUserIds.includes(user.id) ||
                  hasTeamMember;
      } else {
        // No assigned users, manager can only view if they created it
        canView = task.created_by === user.id;
      }
    }
    
    // Employees and other roles (not Super Admin, Admin, Manager, HR, Developer, Operations, Design & Content Team) 
    // can only view tasks they are assigned to
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']) && 
        !user.role?.includes('Developer') && 
        !user.role?.includes('Operations') && 
        !user.role?.includes('Operation') && 
        user.role !== 'Design & Content Team') {
      canView = assignedUserIds.includes(user.id);
    }

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get subtasks - PERFORMANCE FIX: Select specific columns
    const subtasks = await query(
      'SELECT id, task_id, title, description, status, progress, created_at, updated_at FROM subtasks WHERE task_id = ? ORDER BY created_at ASC',
      [id]
    );
    task.subtasks = subtasks;

    // Get comments
    const comments = await query(
      `SELECT tc.*, u.name as user_name, u.role as user_role
       FROM task_comments tc
       JOIN users u ON tc.user_id = u.id
       WHERE tc.task_id = ?
       ORDER BY tc.created_at ASC`,
      [id]
    );
    task.comments = comments;

    // Get reports
    const reports = await query(
      `SELECT tr.*, u.name as user_name
       FROM task_reports tr
       JOIN users u ON tr.user_id = u.id
       WHERE tr.task_id = ?
       ORDER BY tr.submitted_at DESC`,
      [id]
    );
    task.reports = reports;

    return NextResponse.json({ task });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update task
export async function PUT(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // Check permissions
    const canEdit = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const {
      title,
      description,
      priority,
      status,
      deadline,
      progress,
      assigned_users
    } = body;

    const updates = [];
    const params_arr = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params_arr.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params_arr.push(description);
    }
    if (priority !== undefined) {
      updates.push('priority = ?');
      params_arr.push(priority);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params_arr.push(status);
    }
    if (deadline !== undefined) {
      // Store deadline as-is (no UTC conversion) to preserve user's intended local time
      updates.push('deadline = ?');
      params_arr.push(deadline);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      params_arr.push(progress);
    }

    if (updates.length > 0) {
      params_arr.push(id);
      await query(
        `UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`,
        params_arr
      );
    }

    // Update assignments
    if (assigned_users !== undefined) {
      await query('DELETE FROM task_assignments WHERE task_id = ?', [id]);
      if (assigned_users.length > 0) {
        for (const userId of assigned_users) {
          await query(
            'INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)',
            [id, userId]
          );
        }
      }
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'update_task', 'tasks', `Updated task ID: ${id}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete task
export async function DELETE(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check permissions - Super Admin, Admin, Manager, and HR can delete tasks
    const canDelete = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden: Only admins, managers, and HR can delete tasks' }, { status: 403 });
    }

    // Check if task exists
    const tasks = await query('SELECT id FROM tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Delete related records first (due to foreign key constraints)
    await query('DELETE FROM task_assignments WHERE task_id = ?', [id]);
    await query('DELETE FROM subtasks WHERE task_id = ?', [id]);
    await query('DELETE FROM task_comments WHERE task_id = ?', [id]);
    await query('DELETE FROM task_reports WHERE task_id = ?', [id]);
    
    // Delete the task
    await query('DELETE FROM tasks WHERE id = ?', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'delete_task', 'tasks', `Deleted task ID: ${id}`]
    );

    return NextResponse.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

