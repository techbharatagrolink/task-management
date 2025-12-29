// Employee Ratings API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get employee ratings
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, Manager, HR can view ratings
    const canView = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const period = searchParams.get('period'); // Optional: filter by period

    let sql = `
      SELECT 
        er.id,
        er.employee_id,
        er.rated_by,
        er.workplace_behaviour,
        er.discipline,
        er.innovations,
        er.punctuality,
        er.critical_task_delivery,
        er.comments,
        er.rating_period,
        er.created_at,
        er.updated_at,
        e.name as employee_name,
        e.email as employee_email,
        e.role as employee_role,
        e.department as employee_department,
        rater.name as rated_by_name,
        rater.role as rated_by_role
      FROM employee_ratings er
      INNER JOIN users e ON er.employee_id = e.id
      INNER JOIN users rater ON er.rated_by = rater.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by employee if specified
    if (employeeId) {
      sql += ' AND er.employee_id = ?';
      params.push(employeeId);
    }

    // Filter by period if specified
    if (period) {
      sql += ' AND er.rating_period = ?';
      params.push(period);
    }

    // Managers can only see ratings for their team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      sql += ' AND e.manager_id = ?';
      params.push(user.id);
    }

    sql += ' ORDER BY er.created_at DESC';

    const ratings = await query(sql, params);

    return NextResponse.json({ ratings });
  } catch (error) {
    console.error('Get employee ratings error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Submit employee rating
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, Manager, HR can submit ratings
    const canSubmit = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canSubmit) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      employee_id,
      workplace_behaviour,
      discipline,
      innovations,
      punctuality,
      critical_task_delivery,
      comments,
      rating_period
    } = body;

    // Validate required fields
    if (!employee_id || 
        workplace_behaviour === undefined || 
        discipline === undefined || 
        innovations === undefined || 
        punctuality === undefined || 
        critical_task_delivery === undefined) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Employee ID and all rating fields are required' },
        { status: 400 }
      );
    }

    // Validate rating values (1-5)
    const ratingValues = {
      workplace_behaviour,
      discipline,
      innovations,
      punctuality,
      critical_task_delivery
    };

    for (const [key, value] of Object.entries(ratingValues)) {
      if (value < 1 || value > 5 || !Number.isInteger(value)) {
        await connection.rollback();
        return NextResponse.json(
          { error: `${key} must be an integer between 1 and 5` },
          { status: 400 }
        );
      }
    }

    // Verify employee exists and is not the rater themselves
    if (employee_id === user.id) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'You cannot rate yourself' },
        { status: 400 }
      );
    }

    const [employees] = await connection.execute(
      'SELECT id, name, role, manager_id FROM users WHERE id = ? AND role != ?',
      [employee_id, 'Super Admin']
    );

    if (employees.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const employee = employees[0];

    // Managers can only rate their direct team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      if (employee.manager_id !== user.id) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'You can only rate employees in your team' },
          { status: 403 }
        );
      }
    }

    // Insert rating
    const [result] = await connection.execute(
      `INSERT INTO employee_ratings 
       (employee_id, rated_by, workplace_behaviour, discipline, innovations, 
        punctuality, critical_task_delivery, comments, rating_period) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        user.id,
        workplace_behaviour,
        discipline,
        innovations,
        punctuality,
        critical_task_delivery,
        comments || null,
        rating_period || null
      ]
    );

    // Fetch the created rating with employee and rater info
    const [ratingResults] = await connection.execute(
      `SELECT 
        er.id,
        er.employee_id,
        er.rated_by,
        er.workplace_behaviour,
        er.discipline,
        er.innovations,
        er.punctuality,
        er.critical_task_delivery,
        er.comments,
        er.rating_period,
        er.created_at,
        e.name as employee_name,
        e.email as employee_email,
        e.role as employee_role,
        rater.name as rated_by_name,
        rater.role as rated_by_role
       FROM employee_ratings er
       INNER JOIN users e ON er.employee_id = e.id
       INNER JOIN users rater ON er.rated_by = rater.id
       WHERE er.id = ?`,
      [result.insertId]
    );

    await connection.commit();

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'submit_rating', 'employee_ratings', `Submitted rating for employee: ${employee.name} (ID: ${employee_id})`]
    );

    return NextResponse.json({ 
      success: true, 
      rating: ratingResults[0] 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Submit employee rating error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

