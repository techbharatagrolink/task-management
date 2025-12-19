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

