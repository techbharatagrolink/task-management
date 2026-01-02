// Tasks API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get tasks
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assigned_to');
    const createdBy = searchParams.get('created_by');

    let sql = `
      SELECT t.*, 
             GROUP_CONCAT(DISTINCT u.name) as assigned_users,
             GROUP_CONCAT(DISTINCT u.id) as assigned_user_ids
      FROM tasks t
      LEFT JOIN task_assignments ta ON t.id = ta.task_id
      LEFT JOIN users u ON ta.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by assigned user if developer, operations, or design & content team role (and not admin/manager/hr)
    if ((user.role?.includes('Developer') || user.role?.includes('Operations') || user.role?.includes('Operation') || user.role === 'Design & Content Team') && !hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR'])) {
      sql += ' AND ta.user_id = ?';
      params.push(user.id);
    }

    // Managers see only tasks assigned to them or their team members (manager_id), or tasks they created
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin'])) {
      sql += ` AND (
        t.created_by = ? OR 
        ta.user_id = ? OR 
        ta.user_id IN (SELECT id FROM users WHERE manager_id = ?)
      )`;
      params.push(user.id, user.id, user.id);
    }

    if (status) {
      sql += ' AND t.status = ?';
      params.push(status);
    }

    if (assignedTo) {
      sql += ' AND ta.user_id = ?';
      params.push(assignedTo);
    }

    if (createdBy) {
      sql += ' AND t.created_by = ?';
      params.push(createdBy);
    }

    sql += ' GROUP BY t.id ORDER BY t.created_at DESC';

    const tasks = await query(sql, params);

    // PERFORMANCE FIX: Batch fetch all subtasks in one query instead of N+1
    if (tasks.length > 0) {
      const taskIds = tasks.map(t => t.id);
      const placeholders = taskIds.map(() => '?').join(',');
      const allSubtasks = await query(
        `SELECT id, task_id, title, description, status, progress, created_at, updated_at FROM subtasks WHERE task_id IN (${placeholders}) ORDER BY task_id, created_at ASC`,
        taskIds
      );
      
      // Group subtasks by task_id
      const subtasksByTask = {};
      allSubtasks.forEach(subtask => {
        if (!subtasksByTask[subtask.task_id]) {
          subtasksByTask[subtask.task_id] = [];
        }
        subtasksByTask[subtask.task_id].push(subtask);
      });
      
      // Assign subtasks to tasks
      tasks.forEach(task => {
        task.subtasks = subtasksByTask[task.id] || [];
      });
    }

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create task
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    
    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin, Manager, HR, Super Admin can create tasks
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR'])) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      priority,
      deadline,
      assigned_users,
      subtasks
    } = body;

    if (!title) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }

    // Validate deadline is in future (if provided)
    if (deadline) {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Deadline cannot be in the past' },
          { status: 400 }
        );
      }
    }

    // Insert task
    const [result] = await connection.execute(
      `INSERT INTO tasks (title, description, priority, deadline, created_by)
       VALUES (?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        priority || 'medium',
        deadline || null,
        user.id
      ]
    );

    const taskId = result.insertId;

    // Assign users
    if (assigned_users && assigned_users.length > 0) {
      for (const userId of assigned_users) {
        await connection.execute(
          'INSERT INTO task_assignments (task_id, user_id) VALUES (?, ?)',
          [taskId, userId]
        );
      }
    }

    // Create subtasks
    if (subtasks && subtasks.length > 0) {
      for (const subtask of subtasks) {
        await connection.execute(
          `INSERT INTO subtasks (task_id, title, description)
           VALUES (?, ?, ?)`,
          [taskId, subtask.title, subtask.description || null]
        );
      }
    }

    // Log activity
    await connection.execute(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'create_task', 'tasks', `Created task: ${title}`]
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      task: { id: taskId, title }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
