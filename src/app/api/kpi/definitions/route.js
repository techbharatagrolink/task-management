// KPI Definitions API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// Get all KPI definitions
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active_only') !== 'false';

    let sql = 'SELECT * FROM kpi_definitions WHERE 1=1';
    const params = [];

    if (activeOnly) {
      sql += ' AND is_active = 1';
    }

    sql += ' ORDER BY name ASC';

    const definitions = await query(sql, params);

    return NextResponse.json({ definitions });
  } catch (error) {
    console.error('Get KPI definitions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

