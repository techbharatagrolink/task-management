// KRA Scores API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get KRA scores
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const periodType = searchParams.get('period_type');
    const periodYear = searchParams.get('period_year');
    const limit = parseInt(searchParams.get('limit') || '12', 10);

    // Check if user is admin/manager/hr - they can see all scores
    const isAdmin = hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager']);
    
    // Permission check for specific user
    let targetUserId = null;
    if (userId) {
      if (isAdmin) {
        targetUserId = parseInt(userId);
      } else if (parseInt(userId) !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      } else {
        targetUserId = user.id;
      }
    } else if (!isAdmin) {
      // Non-admin users can only see their own scores
      targetUserId = user.id;
    }

    let sql = `
      SELECT ks.*,
             u.name as user_name,
             u.role as user_role,
             u.email as user_email
      FROM kra_scores ks
      INNER JOIN users u ON ks.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by user if specified (or for non-admin users)
    if (targetUserId !== null) {
      sql += ' AND ks.user_id = ?';
      params.push(targetUserId);
    }

    if (periodType) {
      sql += ' AND ks.period_type = ?';
      params.push(periodType);
    }

    if (periodYear) {
      sql += ' AND ks.period_year = ?';
      params.push(parseInt(periodYear));
    }

    // Use a safe limit - insert directly into SQL instead of parameter
    const safeLimit = (limit && !isNaN(limit) && limit > 0) ? Math.min(parseInt(limit, 10), 1000) : 100;
    
    if (targetUserId !== null) {
      sql += ' ORDER BY ks.period_year DESC, ks.period_month DESC, ks.period_quarter DESC';
    } else {
      sql += ' ORDER BY u.name ASC, ks.period_year DESC, ks.period_month DESC, ks.period_quarter DESC';
    }
    
    sql += ` LIMIT ${safeLimit}`;

    const scores = await query(sql, params);

    return NextResponse.json({ scores });
  } catch (error) {
    console.error('Get KRA scores error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

