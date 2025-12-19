// Digital traffic API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get traffic
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Digital Marketing'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    // PERFORMANCE FIX: Select specific columns
    let sql = 'SELECT id, traffic_date, unique_visitors, campaign_traffic, created_at FROM digital_traffic WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND traffic_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND traffic_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY traffic_date DESC LIMIT 500';

    const traffic = await query(sql, params);

    // Calculate totals
    const totals = traffic.reduce((acc, t) => {
      acc.total_visitors += t.unique_visitors || 0;
      acc.total_campaign_traffic += t.campaign_traffic || 0;
      return acc;
    }, {
      total_visitors: 0,
      total_campaign_traffic: 0
    });

    return NextResponse.json({ traffic, totals });
  } catch (error) {
    console.error('Get traffic error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create/Update traffic
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Digital Marketing'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { traffic_date, unique_visitors, campaign_traffic } = body;

    if (!traffic_date) {
      return NextResponse.json(
        { error: 'Traffic date is required' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO digital_traffic 
       (traffic_date, unique_visitors, campaign_traffic)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
       unique_visitors = VALUES(unique_visitors),
       campaign_traffic = VALUES(campaign_traffic)`,
      [
        traffic_date,
        unique_visitors || 0,
        campaign_traffic || 0
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create traffic error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

