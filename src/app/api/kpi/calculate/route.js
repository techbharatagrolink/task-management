// KPI Calculation API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';
import { calculateKPIMetric } from '@/lib/kpi-calculator';

// Calculate KPI metrics
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
      kpi_id,
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

    // Get KPI definitions to calculate
    let kpiDefinitions;
    if (kpi_id) {
      kpiDefinitions = await query('SELECT * FROM kpi_definitions WHERE id = ? AND is_active = 1', [kpi_id]);
    } else {
      kpiDefinitions = await query('SELECT * FROM kpi_definitions WHERE is_active = 1');
    }

    if (kpiDefinitions.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'No active KPI definitions found' }, { status: 404 });
    }

    const calculatedMetrics = [];

    // Calculate for each KPI
    for (const kpiDef of kpiDefinitions) {
      const calculatedValue = await calculateKPIMetric(
        kpiDef,
        user_id || null,
        department || null,
        { start: startDate, end: endDate, type: period_type }
      );

      // Determine status based on target
      let status = 'on_target';
      if (kpiDef.target_value !== null) {
        if (calculatedValue < kpiDef.target_value * 0.9) {
          status = 'below_target';
        } else if (calculatedValue > kpiDef.target_value * 1.1) {
          status = 'above_target';
        }
      }

      // Store or update metric
      await connection.execute(
        `INSERT INTO kpi_metrics 
         (kpi_id, user_id, department, period_type, period_start, period_end, calculated_value, target_value, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         calculated_value = VALUES(calculated_value),
         target_value = VALUES(target_value),
         status = VALUES(status),
         calculated_at = CURRENT_TIMESTAMP`,
        [
          kpiDef.id,
          user_id || null,
          department || null,
          period_type,
          startDate,
          endDate,
          calculatedValue,
          kpiDef.target_value,
          status
        ]
      );

      calculatedMetrics.push({
        kpi_id: kpiDef.id,
        kpi_code: kpiDef.code,
        kpi_name: kpiDef.name,
        calculated_value: calculatedValue,
        target_value: kpiDef.target_value,
        status
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
    console.error('Calculate KPI error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

