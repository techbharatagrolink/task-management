// Marketing ads API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get ads
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
    let sql = 'SELECT id, ad_date, daily_roas, spend, generated_revenue, created_at FROM marketing_ads WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND ad_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND ad_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY ad_date DESC LIMIT 500';

    const ads = await query(sql, params);

    // Calculate totals
    const totals = ads.reduce((acc, ad) => {
      acc.total_spend += ad.spend || 0;
      acc.total_revenue += ad.generated_revenue || 0;
      acc.total_roas += ad.daily_roas || 0;
      return acc;
    }, {
      total_spend: 0,
      total_revenue: 0,
      total_roas: 0
    });

    totals.avg_roas = ads.length > 0 ? totals.total_roas / ads.length : 0;

    return NextResponse.json({ ads, totals });
  } catch (error) {
    console.error('Get ads error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create/Update ad
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
    const { ad_date, daily_roas, spend, generated_revenue } = body;

    if (!ad_date) {
      return NextResponse.json(
        { error: 'Ad date is required' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO marketing_ads 
       (ad_date, daily_roas, spend, generated_revenue)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       daily_roas = VALUES(daily_roas),
       spend = VALUES(spend),
       generated_revenue = VALUES(generated_revenue)`,
      [
        ad_date,
        daily_roas || 0,
        spend || 0,
        generated_revenue || 0
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create ad error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

