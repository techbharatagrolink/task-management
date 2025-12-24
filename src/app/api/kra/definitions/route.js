// KRA Definitions API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

// Get KRA definitions for a role
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let sql = 'SELECT * FROM kra_definitions WHERE is_active = 1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY role, kra_number ASC';

    const definitions = await query(sql, params);

    return NextResponse.json({ definitions });
  } catch (error) {
    console.error('Get KRA definitions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

