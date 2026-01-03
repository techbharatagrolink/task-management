// Subtasks API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Add new subtask
export async function POST(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only Admin, Manager, HR can add subtasks
    const canEdit = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params; // task_id
    const body = await request.json();
    const { title, description } = body;

    if (!title || !title.trim()) {
      return NextResponse.json(
        { error: 'Subtask title is required' },
        { status: 400 }
      );
    }

    // Verify task exists
    const tasks = await query('SELECT id FROM tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Insert new subtask
    const result = await query(
      'INSERT INTO subtasks (task_id, title, description, status, progress) VALUES (?, ?, ?, ?, ?)',
      [id, title.trim(), description?.trim() || null, 'pending', 0]
    );

    // Recalculate main task progress
    await recalculateTaskProgress(id);

    return NextResponse.json({ 
      success: true, 
      subtask: { id: result.insertId, title: title.trim(), description: description?.trim() || null }
    });
  } catch (error) {
    console.error('Add subtask error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update subtask
export async function PUT(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params; // task_id
    const body = await request.json();
    const { subtask_id, title, description, status, progress } = body;

    if (!subtask_id) {
      return NextResponse.json(
        { error: 'Subtask ID is required' },
        { status: 400 }
      );
    }

    const updates = [];
    const params_arr = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params_arr.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params_arr.push(description?.trim() || null);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      params_arr.push(status);
    }
    if (progress !== undefined) {
      updates.push('progress = ?');
      params_arr.push(progress);
    }

    if (updates.length > 0) {
      params_arr.push(subtask_id);
      await query(
        `UPDATE subtasks SET ${updates.join(', ')} WHERE id = ? AND task_id = ?`,
        [...params_arr, id]
      );

      // Recalculate main task progress
      await recalculateTaskProgress(id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update subtask error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete subtask
export async function DELETE(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - only Admin, Manager, HR can delete subtasks
    const canDelete = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params; // task_id
    const { searchParams } = new URL(request.url);
    const subtaskId = searchParams.get('subtask_id');

    if (!subtaskId) {
      return NextResponse.json(
        { error: 'Subtask ID is required' },
        { status: 400 }
      );
    }

    // Verify subtask exists and belongs to this task
    const subtasks = await query(
      'SELECT id FROM subtasks WHERE id = ? AND task_id = ?',
      [subtaskId, id]
    );
    if (subtasks.length === 0) {
      return NextResponse.json({ error: 'Subtask not found' }, { status: 404 });
    }

    // Delete the subtask
    await query('DELETE FROM subtasks WHERE id = ? AND task_id = ?', [subtaskId, id]);

    // Recalculate main task progress
    await recalculateTaskProgress(id);

    return NextResponse.json({ success: true, message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Delete subtask error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper function to recalculate task progress
async function recalculateTaskProgress(taskId) {
  const subtasks = await query(
    'SELECT progress, status FROM subtasks WHERE task_id = ?',
    [taskId]
  );

  if (subtasks.length > 0) {
    const totalProgress = subtasks.reduce((sum, st) => sum + (st.progress || 0), 0);
    const avgProgress = Math.round(totalProgress / subtasks.length);
    
    // If all subtasks completed, task should be 100%
    const allCompleted = subtasks.every(st => st.status === 'completed');
    const finalProgress = allCompleted ? 100 : avgProgress;
    
    await query('UPDATE tasks SET progress = ? WHERE id = ?', [finalProgress, taskId]);
    
    // Auto-complete task if all subtasks done
    if (allCompleted) {
      await query(
        'UPDATE tasks SET status = ? WHERE id = ? AND status != ?',
        ['completed', taskId, 'cancelled']
      );
    }
  } else {
    // No subtasks, reset progress to 0
    await query('UPDATE tasks SET progress = 0 WHERE id = ?', [taskId]);
  }
}

