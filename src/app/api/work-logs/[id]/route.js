// Individual Work Log API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get single work log
export async function GET(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const logs = await query(
      `SELECT 
        dwl.*,
        u.name as user_name,
        u.email as user_email,
        u.role as user_role
       FROM daily_work_logs dwl
       LEFT JOIN users u ON dwl.user_id = u.id
       WHERE dwl.id = ?`,
      [id]
    );

    if (logs.length === 0) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    const log = logs[0];

    // Permission check: users can only see their own logs unless they're admin/manager/hr
    if (log.user_id !== user.id && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse JSON field_data
    let fieldData = log.field_data;
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
    log.field_data = fieldData;

    return NextResponse.json({ log });
  } catch (error) {
    console.error('Get work log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update work log
export async function PUT(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();
    const { field_data, notes } = body;

    // Get existing log
    const existingLogs = await query(
      'SELECT * FROM daily_work_logs WHERE id = ?',
      [id]
    );

    if (existingLogs.length === 0) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    const existingLog = existingLogs[0];

    // Permission check: users can only update their own logs unless they're admin/manager/hr
    if (existingLog.user_id !== user.id && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!field_data || typeof field_data !== 'object') {
      return NextResponse.json(
        { error: 'Field data is required' },
        { status: 400 }
      );
    }

    await query(
      `UPDATE daily_work_logs 
       SET field_data = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [JSON.stringify(field_data), notes || null, id]
    );

    return NextResponse.json({ success: true, message: 'Work log updated successfully' });
  } catch (error) {
    console.error('Update work log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete work log
export async function DELETE(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Get existing log
    const existingLogs = await query(
      'SELECT * FROM daily_work_logs WHERE id = ?',
      [id]
    );

    if (existingLogs.length === 0) {
      return NextResponse.json({ error: 'Work log not found' }, { status: 404 });
    }

    const existingLog = existingLogs[0];

    // Permission check: users can only delete their own logs unless they're admin/manager/hr
    if (existingLog.user_id !== user.id && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await query('DELETE FROM daily_work_logs WHERE id = ?', [id]);

    return NextResponse.json({ success: true, message: 'Work log deleted successfully' });
  } catch (error) {
    console.error('Delete work log error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


