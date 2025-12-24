// KRA Submissions API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get KRA submissions
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const periodType = searchParams.get('period_type') || 'monthly';
    const periodMonth = searchParams.get('period_month');
    const periodQuarter = searchParams.get('period_quarter');
    const periodYear = searchParams.get('period_year') || new Date().getFullYear();

    // Permission check
    let targetUserId = user.id;
    if (userId && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      targetUserId = parseInt(userId);
    } else if (userId && parseInt(userId) !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let sql = `
      SELECT ks.*, 
             kd.role as kra_role,
             kd.kra_name,
             kd.weight_percentage,
             u.name as user_name,
             u.role as user_role
      FROM kra_submissions ks
      INNER JOIN kra_definitions kd ON ks.kra_id = kd.id
      INNER JOIN users u ON ks.user_id = u.id
      WHERE ks.user_id = ? AND ks.period_type = ? AND ks.period_year = ?
    `;
    const params = [targetUserId, periodType, periodYear];

    if (periodType === 'monthly' && periodMonth) {
      sql += ' AND ks.period_month = ?';
      params.push(parseInt(periodMonth));
    } else if (periodType === 'quarterly' && periodQuarter) {
      sql += ' AND ks.period_quarter = ?';
      params.push(parseInt(periodQuarter));
    }

    sql += ' ORDER BY kd.kra_number ASC';

    const submissions = await query(sql, params);

    return NextResponse.json({ submissions });
  } catch (error) {
    console.error('Get KRA submissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Submit KRA ratings
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      user_id,
      period_type = 'monthly',
      period_month,
      period_quarter,
      period_year,
      submissions // Array of { kra_id, rating, comments }
    } = body;

    // Permission check - users can submit for themselves or admins/managers can submit for others
    const targetUserId = user_id && hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager']) 
      ? parseInt(user_id) 
      : user.id;

    if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Submissions array is required' },
        { status: 400 }
      );
    }

    // Validate period
    const currentYear = period_year || new Date().getFullYear();
    if (period_type === 'monthly' && !period_month) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'period_month is required for monthly period' },
        { status: 400 }
      );
    }
    if (period_type === 'quarterly' && !period_quarter) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'period_quarter is required for quarterly period' },
        { status: 400 }
      );
    }

    const insertedSubmissions = [];

    // Insert or update each submission
    for (const submission of submissions) {
      const { kra_id, rating, comments } = submission;

      if (!kra_id || !rating || rating < 1 || rating > 5) {
        continue; // Skip invalid submissions
      }

      await connection.execute(
        `INSERT INTO kra_submissions 
         (user_id, kra_id, period_type, period_month, period_quarter, period_year, rating, submitted_by, comments, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'submitted')
         ON DUPLICATE KEY UPDATE
         rating = VALUES(rating),
         comments = VALUES(comments),
         submitted_by = VALUES(submitted_by),
         status = 'submitted',
         updated_at = CURRENT_TIMESTAMP`,
        [
          targetUserId,
          kra_id,
          period_type,
          period_type === 'monthly' ? period_month : null,
          period_type === 'quarterly' ? period_quarter : null,
          currentYear,
          rating,
          user.id,
          comments || null
        ]
      );

      insertedSubmissions.push({ kra_id, rating });
    }

    // Calculate and store final score
    await calculateAndStoreKRAScore(
      connection,
      targetUserId,
      period_type,
      period_month,
      period_quarter,
      currentYear
    );

    await connection.commit();

    return NextResponse.json({
      success: true,
      message: 'KRA submissions saved successfully',
      submissions: insertedSubmissions
    });
  } catch (error) {
    await connection.rollback();
    console.error('Submit KRA error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// Helper function to calculate and store KRA score
async function calculateAndStoreKRAScore(connection, userId, periodType, periodMonth, periodQuarter, periodYear) {
  // Get all submissions for this user and period
  let sql = `
    SELECT ks.rating, kd.weight_percentage
    FROM kra_submissions ks
    INNER JOIN kra_definitions kd ON ks.kra_id = kd.id
    WHERE ks.user_id = ? AND ks.period_type = ? AND ks.period_year = ? AND ks.status = 'submitted'
  `;
  const params = [userId, periodType, periodYear];

  if (periodType === 'monthly' && periodMonth) {
    sql += ' AND ks.period_month = ?';
    params.push(periodMonth);
  } else if (periodType === 'quarterly' && periodQuarter) {
    sql += ' AND ks.period_quarter = ?';
    params.push(periodQuarter);
  }

  const submissions = await connection.execute(sql, params);
  const [rows] = submissions;

  if (!rows || rows.length === 0) {
    return; // No submissions to calculate
  }

  // Calculate weighted score: (KRA Weight × Rating Score) ÷ 5 for each KRA, then sum
  let totalScore = 0;
  for (const row of rows) {
    const weight = parseFloat(row.weight_percentage);
    const rating = parseInt(row.rating);
    totalScore += (weight * rating) / 5;
  }

  // Determine performance category
  let performanceCategory;
  if (totalScore >= 90) {
    performanceCategory = 'Outstanding';
  } else if (totalScore >= 75) {
    performanceCategory = 'Very Good';
  } else if (totalScore >= 60) {
    performanceCategory = 'Good';
  } else if (totalScore >= 50) {
    performanceCategory = 'Needs Improvement';
  } else {
    performanceCategory = 'Poor';
  }

  // Store or update score
  await connection.execute(
    `INSERT INTO kra_scores 
     (user_id, period_type, period_month, period_quarter, period_year, total_score, performance_category)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
     total_score = VALUES(total_score),
     performance_category = VALUES(performance_category),
     updated_at = CURRENT_TIMESTAMP`,
    [
      userId,
      periodType,
      periodType === 'monthly' ? periodMonth : null,
      periodType === 'quarterly' ? periodQuarter : null,
      periodYear,
      totalScore.toFixed(2),
      performanceCategory
    ]
  );
}

