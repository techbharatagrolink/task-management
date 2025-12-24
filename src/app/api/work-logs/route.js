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

    // Permission check: users can only see their own logs unless they're admin/manager/hr
    let targetUserId = null;
    if (userId && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = parseInt(userId);
    } else if (userId && parseInt(userId) !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (!userId && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = user.id;
    }

    let sql = `
      SELECT 
        dwl.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
      FROM daily_work_logs dwl
      LEFT JOIN users u ON dwl.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (targetUserId) {
      sql += ' AND dwl.user_id = ?';
      params.push(targetUserId);
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

    // Determine target user - admin can create for others, users can only create for themselves
    const targetUserId = user_id && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager']) 
      ? parseInt(user_id) 
      : user.id;

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

