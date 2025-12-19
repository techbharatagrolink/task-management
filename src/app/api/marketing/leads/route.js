// Marketing leads API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get leads
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
    const channel = searchParams.get('channel');

    // PERFORMANCE FIX: Select specific columns
    let sql = 'SELECT id, lead_date, lead_count, channel, conversion_percentage, roas, created_at FROM marketing_leads WHERE 1=1';
    const params = [];

    if (startDate) {
      sql += ' AND lead_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND lead_date <= ?';
      params.push(endDate);
    }

    if (channel) {
      sql += ' AND channel = ?';
      params.push(channel);
    }

    sql += ' ORDER BY lead_date DESC LIMIT 500';

    const leads = await query(sql, params);

    // Calculate totals - FIX: Weighted average for conversion
    const totals = leads.reduce((acc, lead) => {
      acc.total_leads += lead.lead_count || 0;
      acc.total_roas += lead.roas || 0;
      acc.weighted_conversion_sum += (lead.conversion_percentage || 0) * (lead.lead_count || 0);
      return acc;
    }, {
      total_leads: 0,
      total_roas: 0,
      weighted_conversion_sum: 0
    });

    // Calculate weighted average conversion
    totals.avg_conversion = totals.total_leads > 0 
      ? totals.weighted_conversion_sum / totals.total_leads 
      : 0;

    return NextResponse.json({ leads, totals });
  } catch (error) {
    console.error('Get leads error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create/Update lead
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
    const { lead_date, lead_count, channel, conversion_percentage, roas } = body;

    if (!lead_date) {
      return NextResponse.json(
        { error: 'Lead date is required' },
        { status: 400 }
      );
    }

    await query(
      `INSERT INTO marketing_leads 
       (lead_date, lead_count, channel, conversion_percentage, roas)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
       lead_count = VALUES(lead_count),
       channel = VALUES(channel),
       conversion_percentage = VALUES(conversion_percentage),
       roas = VALUES(roas)`,
      [
        lead_date,
        lead_count || 0,
        channel || 'other',
        conversion_percentage || 0,
        roas || 0
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Create lead error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

