// Logistics stats API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Logistics'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const period = searchParams.get('period') || 'today'; // today, yesterday, week, month, custom

    let dateFilter = '';
    const params = [];

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    switch (period) {
      case 'today':
        dateFilter = 'date = ?';
        params.push(today);
        break;
      case 'yesterday':
        dateFilter = 'date = ?';
        params.push(yesterday);
        break;
      case 'week':
        dateFilter = 'date >= DATE_SUB(?, INTERVAL 7 DAY)';
        params.push(today);
        break;
      case 'month':
        dateFilter = 'date >= DATE_SUB(?, INTERVAL 28 DAY)';
        params.push(today);
        break;
      case 'last_month':
        dateFilter = 'date >= DATE_SUB(?, INTERVAL 1 MONTH) AND date < ?';
        params.push(today, today);
        break;
      case 'custom':
        if (startDate && endDate) {
          dateFilter = 'date >= ? AND date <= ?';
          params.push(startDate, endDate);
        }
        break;
    }

    // PERFORMANCE FIX: Select specific columns
    const sql = `
      SELECT id, date, confirmed_count, dispatched_count, out_for_delivery_count, 
             delivered_count, rto_count, rto_percentage, created_at, updated_at
      FROM logistics_stats
      ${dateFilter ? `WHERE ${dateFilter}` : ''}
      ORDER BY date DESC
    `;

    const stats = await query(sql, params);

    // Calculate totals from stats
    const totals = stats.reduce((acc, stat) => {
      acc.confirmed += stat.confirmed_count || 0;
      acc.dispatched += stat.dispatched_count || 0;
      acc.out_for_delivery += stat.out_for_delivery_count || 0;
      acc.delivered += stat.delivered_count || 0;
      acc.rto += stat.rto_count || 0;
      return acc;
    }, {
      confirmed: 0,
      dispatched: 0,
      out_for_delivery: 0,
      delivered: 0,
      rto: 0
    });

    // FIX: Calculate RTO% from actual orders for accuracy
    // Get date range for query
    let orderDateFilter = '';
    const orderParams = [];
    if (dateFilter) {
      // Extract date range from period
      if (period === 'today') {
        orderDateFilter = 'order_date = ?';
        orderParams.push(today);
      } else if (period === 'yesterday') {
        orderDateFilter = 'order_date = ?';
        orderParams.push(yesterday);
      } else if (period === 'week') {
        orderDateFilter = 'order_date >= DATE_SUB(?, INTERVAL 7 DAY)';
        orderParams.push(today);
      } else if (period === 'month') {
        orderDateFilter = 'order_date >= DATE_SUB(?, INTERVAL 28 DAY)';
        orderParams.push(today);
      } else if (period === 'last_month') {
        orderDateFilter = 'order_date >= DATE_SUB(?, INTERVAL 1 MONTH) AND order_date < ?';
        orderParams.push(today, today);
      } else if (period === 'custom' && startDate && endDate) {
        orderDateFilter = 'order_date >= ? AND order_date <= ?';
        orderParams.push(startDate, endDate);
      }
    }
    
    // Calculate actual RTO% from orders table
    const rtoCalc = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'rto' THEN 1 ELSE 0 END) as rto_count
       FROM logistics_orders
       ${orderDateFilter ? `WHERE ${orderDateFilter}` : ''}`,
      orderParams
    );
    
    const totalOrders = rtoCalc[0]?.total || 0;
    const rtoCount = rtoCalc[0]?.rto_count || 0;
    totals.rto_percentage = totalOrders > 0 ? (rtoCount / totalOrders) * 100 : 0;

    return NextResponse.json({
      stats,
      totals,
      period
    });
  } catch (error) {
    console.error('Get logistics stats error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

