// Subtasks API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// Update subtask
export async function PUT(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params; // task_id
    const body = await request.json();
    const { subtask_id, status, progress } = body;

    if (!subtask_id) {
      return NextResponse.json(
        { error: 'Subtask ID is required' },
        { status: 400 }
      );
    }

    const updates = [];
    const params_arr = [];

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
      const subtasks = await query(
        'SELECT progress, status FROM subtasks WHERE task_id = ?',
        [id]
      );

      if (subtasks.length > 0) {
        const totalProgress = subtasks.reduce((sum, st) => sum + (st.progress || 0), 0);
        const avgProgress = Math.round(totalProgress / subtasks.length);
        
        // If all subtasks completed, task should be 100%
        const allCompleted = subtasks.every(st => st.status === 'completed');
        const finalProgress = allCompleted ? 100 : avgProgress;
        
        await query('UPDATE tasks SET progress = ? WHERE id = ?', [finalProgress, id]);
        
        // Auto-complete task if all subtasks done
        if (allCompleted) {
          await query(
            'UPDATE tasks SET status = ? WHERE id = ? AND status != ?',
            ['completed', id, 'cancelled']
          );
        }
      }
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

