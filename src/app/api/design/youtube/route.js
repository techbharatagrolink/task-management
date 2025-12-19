// YouTube vlogs API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get YouTube vlogs
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Design & Content Team'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let sql = `
      SELECT y.*, u.name as created_by_name
      FROM youtube_vlogs y
      JOIN users u ON y.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND y.vlog_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND y.vlog_date <= ?';
      params.push(endDate);
    }

    sql += ' ORDER BY y.vlog_date DESC LIMIT 500';

    const vlogs = await query(sql, params);

    // Calculate totals
    const totals = vlogs.reduce((acc, vlog) => {
      acc.total_vlogs += 1;
      acc.total_views += vlog.view_count || 0;
      acc.total_subscriber_impact += vlog.subscriber_impact || 0;
      return acc;
    }, {
      total_vlogs: 0,
      total_views: 0,
      total_subscriber_impact: 0
    });

    return NextResponse.json({ vlogs, totals });
  } catch (error) {
    console.error('Get YouTube vlogs error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create YouTube vlog
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Design & Content Team'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { vlog_date, title, description, vlog_link, view_count, subscriber_impact } = body;

    if (!vlog_date || !title) {
      return NextResponse.json(
        { error: 'Vlog date and title are required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO youtube_vlogs 
       (vlog_date, title, description, vlog_link, view_count, subscriber_impact, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        vlog_date,
        title,
        description || null,
        vlog_link || null,
        view_count || 0,
        subscriber_impact || 0,
        user.id
      ]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Create YouTube vlog error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

