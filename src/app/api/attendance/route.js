// Attendance API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get attendance records
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

    // Check permissions
    let targetUserId = user.id;
    if (userId && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = userId;
    }

    let sql = `
      SELECT a.*, u.name as user_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      WHERE a.user_id = ?
    `;
    const params = [targetUserId];

    if (startDate) {
      sql += ' AND a.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND a.date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY a.date DESC LIMIT 100';

    const records = await query(sql, params);

    // Calculate weekly hours - FIX: Use ISO week standard
    const weeklyHours = await query(
      `SELECT 
        YEARWEEK(date, 3) as week,
        SUM(total_hours) as total_hours
       FROM attendance
       WHERE user_id = ? AND date >= DATE_SUB(CURDATE(), INTERVAL 4 WEEK)
       GROUP BY week
       ORDER BY week DESC`,
      [targetUserId]
    );

    // For admin/HR, return all records if no user_id specified
    if (hasPermission(user.role, ['Super Admin', 'Admin', 'HR']) && !userId) {
      let adminSql = `
        SELECT a.*, u.name as user_name, u.email as user_email
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE 1=1
      `;
      const adminParams = [];

      if (startDate) {
        adminSql += ' AND a.date >= ?';
        adminParams.push(startDate);
      }

      if (endDate) {
        adminSql += ' AND a.date <= ?';
        adminParams.push(endDate);
      }

      adminSql += ' ORDER BY a.date DESC, u.name ASC LIMIT 500';
      const allRecords = await query(adminSql, adminParams);
      return NextResponse.json({
        records: allRecords,
        weeklyHours: []
      });
    }

    return NextResponse.json({
      records,
      weeklyHours
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Sign In / Sign Out
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action } = body; // 'sign_in' or 'sign_out'

    if (!['sign_in', 'sign_out'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be sign_in or sign_out' },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    if (action === 'sign_in') {
      // Check if already signed in today
      const existing = await query(
        'SELECT id, login_time FROM attendance WHERE user_id = ? AND date = ?',
        [user.id, today]
      );

      if (existing.length > 0) {
        return NextResponse.json(
          { error: 'You have already signed in today', alreadySignedIn: true },
          { status: 400 }
        );
      }

      // Create new attendance record
      const result = await query(
        `INSERT INTO attendance (user_id, login_time, date, status)
         VALUES (?, NOW(), ?, 'present')`,
        [user.id, today]
      );

      // Log activity
      await query(
        'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
        [user.id, 'sign_in', 'attendance', `Signed in on ${today}`]
      );

      return NextResponse.json({
        success: true,
        message: 'Signed in successfully',
        attendance: { id: result.insertId, login_time: new Date().toISOString() }
      });
    } else if (action === 'sign_out') {
      // Check if signed in today
      const existing = await query(
        'SELECT id, login_time FROM attendance WHERE user_id = ? AND date = ?',
        [user.id, today]
      );

      if (existing.length === 0) {
        return NextResponse.json(
          { error: 'You have not signed in today' },
          { status: 400 }
        );
      }

      const attendance = existing[0];

      // Check if already signed out
      if (attendance.logout_time) {
        return NextResponse.json(
          { error: 'You have already signed out today', alreadySignedOut: true },
          { status: 400 }
        );
      }

      // Calculate total hours
      const loginTime = new Date(attendance.login_time);
      const logoutTime = new Date();
      const diffMs = logoutTime - loginTime;
      const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

      // Update attendance record
      await query(
        `UPDATE attendance 
         SET logout_time = NOW(), total_hours = ?
         WHERE id = ?`,
        [totalHours, attendance.id]
      );

      // Log activity
      await query(
        'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
        [user.id, 'sign_out', 'attendance', `Signed out on ${today} - ${totalHours} hours`]
      );

      return NextResponse.json({
        success: true,
        message: 'Signed out successfully',
        total_hours: parseFloat(totalHours)
      });
    }
  } catch (error) {
    console.error('Sign in/out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

