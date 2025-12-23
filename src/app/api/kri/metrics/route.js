// KRI Metrics API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get calculated KRI metrics
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const department = searchParams.get('department');
    const kriId = searchParams.get('kri_id');
    const periodType = searchParams.get('period_type');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const riskLevel = searchParams.get('risk_level');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 100;

    // Normalize empty strings to null
    const normalizedDepartment = department && department.trim() !== '' ? department.trim() : null;
    const normalizedUserId = userId && userId.trim() !== '' ? userId.trim() : null;

    // Permission check: users can only see their own metrics unless they're admin/manager/hr
    let targetUserId = null;
    if (normalizedUserId && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = parseInt(normalizedUserId);
    } else if (normalizedUserId && parseInt(normalizedUserId) !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    } else if (!normalizedUserId && !normalizedDepartment && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      // Non-admin users without filters should see only their own metrics
      targetUserId = user.id;
    }

    let sql = `
      SELECT 
        km.*,
        kd.name as kri_name,
        kd.code as kri_code,
        kd.description as kri_description,
        kd.threshold_warning,
        kd.threshold_critical,
        u.name as user_name,
        u.department as user_department
      FROM kri_metrics km
      INNER JOIN kri_definitions kd ON km.kri_id = kd.id
      LEFT JOIN users u ON km.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (normalizedDepartment) {
      sql += ' AND km.department = ?';
      params.push(normalizedDepartment);
    } else if (targetUserId) {
      sql += ' AND km.user_id = ?';
      params.push(targetUserId);
    }

    if (kriId && kriId.trim() !== '') {
      sql += ' AND km.kri_id = ?';
      params.push(kriId);
    }

    if (periodType && periodType.trim() !== '') {
      sql += ' AND km.period_type = ?';
      params.push(periodType);
    }

    if (startDate && startDate.trim() !== '') {
      sql += ' AND km.period_start >= ?';
      params.push(startDate);
    }

    if (endDate && endDate.trim() !== '') {
      sql += ' AND km.period_end <= ?';
      params.push(endDate);
    }

    if (riskLevel && riskLevel.trim() !== '') {
      sql += ' AND km.risk_level = ?';
      params.push(riskLevel);
    }

    // Ensure limit is a valid integer before adding to query
    const validLimit = (limit && !isNaN(limit) && limit > 0) ? Math.min(parseInt(limit, 10), 1000) : 100;
    
    // Count placeholders in SQL
    const placeholderCount = (sql.match(/\?/g) || []).length;
    
    sql += ` ORDER BY km.risk_level DESC, km.period_start DESC, km.calculated_at DESC LIMIT ${validLimit}`;
    
    // Debug: Log the SQL and params to help diagnose
    console.log('KRI Metrics Query:', {
      sql: sql.replace(/\s+/g, ' ').trim(),
      paramCount: params.length,
      placeholderCountBefore: placeholderCount,
      params: params,
      limit: validLimit
    });

    const metrics = await query(sql, params);

    const metricsWithValues = metrics.map(metric => {
      return {
        ...metric,
        calculated_value: parseFloat(metric.calculated_value),
        threshold_warning: metric.threshold_warning ? parseFloat(metric.threshold_warning) : null,
        threshold_critical: metric.threshold_critical ? parseFloat(metric.threshold_critical) : null
      };
    });

    return NextResponse.json({ metrics: metricsWithValues });
  } catch (error) {
    console.error('Get KRI metrics error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

