// Daily Work Logs API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get work logs
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const role = searchParams.get('role');

    // Check permissions
    const isHR = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    const isManager = user.role === 'Manager' && !isHR;
    let targetUserId = null;

    if (userId) {
      const requestedUserId = parseInt(userId);
      // Super Admin, Admin, HR can view any user's logs
      if (isHR) {
        targetUserId = requestedUserId;
      }
      // Managers can only view their team members' logs
      else if (isManager) {
        const teamMember = await query(
          'SELECT id FROM users WHERE id = ? AND manager_id = ?',
          [requestedUserId, user.id]
        );
        if (teamMember.length === 0) {
          return NextResponse.json(
            { error: 'Forbidden: You can only view logs for your team members' },
            { status: 403 }
          );
        }
        targetUserId = requestedUserId;
      }
      // Regular users can only view their own logs
      else if (requestedUserId === user.id) {
        targetUserId = requestedUserId;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      // No user_id specified
      if (!isHR && !isManager) {
        // Regular users see only their own logs
        targetUserId = user.id;
      }
      // HR and Manager will see filtered results based on their role (handled in SQL)
    }

    let sql = `
      SELECT 
        dwl.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role,
        u.manager_id
      FROM daily_work_logs dwl
      LEFT JOIN users u ON dwl.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (targetUserId) {
      sql += ' AND dwl.user_id = ?';
      params.push(targetUserId);
    } else if (isManager && !userId) {
      // Manager viewing all team logs - filter by manager_id (direct reports only)
      sql += ' AND u.manager_id = ?';
      params.push(user.id);
    }

    if (startDate) {
      sql += ' AND dwl.log_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND dwl.log_date <= ?';
      params.push(endDate);
    }

    if (role) {
      sql += ' AND dwl.role = ?';
      params.push(role);
    }

    sql += ' ORDER BY dwl.log_date DESC, dwl.created_at DESC LIMIT 500';

    const logs = await query(sql, params);

    // Parse JSON field_data for each log
    const parsedLogs = logs.map(log => {
      let fieldData = log.field_data;
      
      // Handle field_data parsing
      if (fieldData === null || fieldData === undefined) {
        fieldData = {};
      } else if (typeof fieldData === 'string') {
        try {
          fieldData = fieldData.trim() === '' ? {} : JSON.parse(fieldData);
        } catch (parseError) {
          console.error(`Failed to parse field_data for log ${log.id}:`, parseError);
          fieldData = {};
        }
      }
      
      return {
        ...log,
        field_data: fieldData
      };
    });

    return NextResponse.json({ logs: parsedLogs });
  } catch (error) {
    console.error('Get work logs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create/Update work log
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { log_date, field_data, notes, user_id } = body;

    // Determine target user
    const isHR = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']);
    const isManager = user.role === 'Manager' && !isHR;
    
    let targetUserId = user.id;
    if (user_id) {
      const requestedUserId = parseInt(user_id);
      // HR can create logs for anyone
      if (isHR) {
        targetUserId = requestedUserId;
      }
      // Managers can only create logs for their team members
      else if (isManager) {
        const teamMember = await query(
          'SELECT id FROM users WHERE id = ? AND manager_id = ?',
          [requestedUserId, user.id]
        );
        if (teamMember.length === 0) {
          return NextResponse.json(
            { error: 'Forbidden: You can only create logs for your team members' },
            { status: 403 }
          );
        }
        targetUserId = requestedUserId;
      }
      // Regular users can only create logs for themselves
      else if (requestedUserId === user.id) {
        targetUserId = requestedUserId;
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    if (!log_date) {
      return NextResponse.json(
        { error: 'Log date is required' },
        { status: 400 }
      );
    }

    if (!field_data || typeof field_data !== 'object') {
      return NextResponse.json(
        { error: 'Field data is required' },
        { status: 400 }
      );
    }

    // Get the role for the target user
    const targetUser = targetUserId === user.id ? user : await query(
      'SELECT role FROM users WHERE id = ? AND is_active = 1',
      [targetUserId]
    );

    if (!targetUser || (Array.isArray(targetUser) && targetUser.length === 0)) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userRole = Array.isArray(targetUser) ? targetUser[0].role : targetUser.role;

    // Check if log already exists for this user and date
    const existingLog = await query(
      'SELECT id FROM daily_work_logs WHERE user_id = ? AND log_date = ?',
      [targetUserId, log_date]
    );

    if (existingLog.length > 0) {
      // Update existing log
      await query(
        `UPDATE daily_work_logs 
         SET field_data = ?, notes = ?, role = ?, updated_at = CURRENT_TIMESTAMP
         WHERE user_id = ? AND log_date = ?`,
        [JSON.stringify(field_data), notes || null, userRole, targetUserId, log_date]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Work log updated successfully',
        log_id: existingLog[0].id
      });
    } else {
      // Create new log
      const result = await query(
        `INSERT INTO daily_work_logs 
         (user_id, log_date, role, field_data, notes)
         VALUES (?, ?, ?, ?, ?)`,
        [targetUserId, log_date, userRole, JSON.stringify(field_data), notes || null]
      );

      return NextResponse.json({ 
        success: true, 
        message: 'Work log created successfully',
        log_id: result.insertId
      });
    }
  } catch (error) {
    console.error('Create/Update work log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

