// KRI Calculation API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';
import { calculateKRIMetric } from '@/lib/kpi-calculator';

// Calculate KRI metrics
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin, Manager, Super Admin can trigger calculations
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Manager'])) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      kri_id,
      user_id,
      department,
      period_type = 'daily',
      period_start,
      period_end
    } = body;

    // Determine period dates if not provided
    const today = new Date();
    let startDate, endDate;

    if (period_start && period_end) {
      startDate = period_start;
      endDate = period_end;
    } else {
      // Default to current period based on period_type
      if (period_type === 'daily') {
        startDate = today.toISOString().split('T')[0];
        endDate = startDate;
      } else if (period_type === 'weekly') {
        const dayOfWeek = today.getDay();
        const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust for Monday as first day
        const monday = new Date(today.getFullYear(), today.getMonth(), diff);
        startDate = monday.toISOString().split('T')[0];
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        endDate = sunday.toISOString().split('T')[0];
      } else if (period_type === 'monthly') {
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      }
    }

    // Get KRI definitions to calculate
    let kriDefinitions;
    if (kri_id) {
      kriDefinitions = await query('SELECT * FROM kri_definitions WHERE id = ? AND is_active = 1', [kri_id]);
    } else {
      kriDefinitions = await query('SELECT * FROM kri_definitions WHERE is_active = 1');
    }

    if (kriDefinitions.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'No active KRI definitions found' }, { status: 404 });
    }

    const calculatedMetrics = [];

    // Calculate for each KRI
    for (const kriDef of kriDefinitions) {
      const result = await calculateKRIMetric(
        kriDef,
        user_id || null,
        department || null,
        { start: startDate, end: endDate, type: period_type }
      );

      // Store or update metric
      await connection.execute(
        `INSERT INTO kri_metrics 
         (kri_id, user_id, department, period_type, period_start, period_end, calculated_value, risk_level)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         calculated_value = VALUES(calculated_value),
         risk_level = VALUES(risk_level),
         calculated_at = CURRENT_TIMESTAMP`,
        [
          kriDef.id,
          user_id || null,
          department || null,
          period_type,
          startDate,
          endDate,
          result.calculated_value,
          result.risk_level
        ]
      );

      calculatedMetrics.push({
        kri_id: kriDef.id,
        kri_code: kriDef.code,
        kri_name: kriDef.name,
        calculated_value: result.calculated_value,
        risk_level: result.risk_level,
        threshold_warning: kriDef.threshold_warning,
        threshold_critical: kriDef.threshold_critical
      });
    }

    await connection.commit();

    return NextResponse.json({
      success: true,
      metrics: calculatedMetrics,
      period: {
        type: period_type,
        start: startDate,
        end: endDate
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Calculate KRI error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

