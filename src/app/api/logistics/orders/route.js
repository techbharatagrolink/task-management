// Logistics orders API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get orders
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
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // PERFORMANCE FIX: Select specific columns instead of *
    let sql = 'SELECT id, order_id, status, order_date, dispatch_date, delivery_date, rto_date, created_at FROM logistics_orders WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    if (startDate) {
      sql += ' AND order_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND order_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY order_date DESC, created_at DESC LIMIT 500';

    const orders = await query(sql, params);

    return NextResponse.json({ orders });
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create/Update order
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Logistics'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { order_id, status, order_date, dispatch_date, delivery_date, rto_date } = body;

    if (!order_id) {
      return NextResponse.json(
        { error: 'Order ID is required' },
        { status: 400 }
      );
    }

    // Check if order exists
    const existing = await query('SELECT id FROM logistics_orders WHERE order_id = ?', [order_id]);

    if (existing.length > 0) {
      // Update existing order - SECURITY FIX: Use safe parameterized updates
      const validStatuses = ['confirmed', 'dispatched', 'out_for_delivery', 'delivered', 'rto'];
      const updates = [];
      const updateParams = [];

      if (status && validStatuses.includes(status)) {
        updates.push('status = ?');
        updateParams.push(status);
      }
      if (dispatch_date) {
        updates.push('dispatch_date = ?');
        updateParams.push(dispatch_date);
      }
      if (delivery_date) {
        updates.push('delivery_date = ?');
        updateParams.push(delivery_date);
      }
      if (rto_date) {
        updates.push('rto_date = ?');
        updateParams.push(rto_date);
      }

      if (updates.length > 0) {
        updateParams.push(order_id);
        await query(
          `UPDATE logistics_orders SET ${updates.join(', ')} WHERE order_id = ?`,
          updateParams
        );
      }
    } else {
      // Create new order
      await query(
        `INSERT INTO logistics_orders (order_id, status, order_date, dispatch_date, delivery_date, rto_date, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          order_id,
          status || 'confirmed',
          order_date || new Date().toISOString().split('T')[0],
          dispatch_date || null,
          delivery_date || null,
          rto_date || null,
          user.id
        ]
      );
    }

    // Update daily stats
    await updateDailyStats(order_date || new Date().toISOString().split('T')[0]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create/Update order error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update daily stats
async function updateDailyStats(date) {
  const stats = await query(
    `SELECT 
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_count,
      COUNT(CASE WHEN status = 'dispatched' THEN 1 END) as dispatched_count,
      COUNT(CASE WHEN status = 'out_for_delivery' THEN 1 END) as out_for_delivery_count,
      COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_count,
      COUNT(CASE WHEN status = 'rto' THEN 1 END) as rto_count
     FROM logistics_orders
     WHERE order_date = ?`,
    [date]
  );

  if (stats.length > 0) {
    const stat = stats[0];
    const total = stat.confirmed_count + stat.dispatched_count + 
                  stat.out_for_delivery_count + stat.delivered_count + stat.rto_count;
    const rtoPercentage = total > 0 ? (stat.rto_count / total) * 100 : 0;

    await query(
      `INSERT INTO logistics_stats 
       (date, confirmed_count, dispatched_count, out_for_delivery_count, 
        delivered_count, rto_count, rto_percentage)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       confirmed_count = VALUES(confirmed_count),
       dispatched_count = VALUES(dispatched_count),
       out_for_delivery_count = VALUES(out_for_delivery_count),
       delivered_count = VALUES(delivered_count),
       rto_count = VALUES(rto_count),
       rto_percentage = VALUES(rto_percentage)`,
      [
        date,
        stat.confirmed_count,
        stat.dispatched_count,
        stat.out_for_delivery_count,
        stat.delivered_count,
        stat.rto_count,
        rtoPercentage
      ]
    );
  }
}

