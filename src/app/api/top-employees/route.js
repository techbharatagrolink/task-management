// Top Employees API - Shows employees with task completion stats and ratings
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, Manager, HR can view top employees
    const canView = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10; // Default top 10
    const department = searchParams.get('department');

    // Get all employees with their task completion stats
    let sql = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.role,
        u.department,
        u.designation,
        u.profile_photo,
        u.joining_date,
        -- Task completion stats
        COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as tasks_completed,
        COUNT(DISTINCT t.id) as total_tasks_assigned,
        -- Rating averages
        AVG(er.workplace_behaviour) as avg_workplace_behaviour,
        AVG(er.discipline) as avg_discipline,
        AVG(er.innovations) as avg_innovations,
        AVG(er.punctuality) as avg_punctuality,
        AVG(er.critical_task_delivery) as avg_critical_task_delivery,
        -- Overall average rating
        AVG((er.workplace_behaviour + er.discipline + er.innovations + 
             er.punctuality + er.critical_task_delivery) / 5.0) as overall_avg_rating,
        COUNT(DISTINCT er.id) as total_ratings
      FROM users u
      LEFT JOIN task_assignments ta ON u.id = ta.user_id
      LEFT JOIN tasks t ON ta.task_id = t.id
      LEFT JOIN employee_ratings er ON u.id = er.employee_id
      WHERE u.role != 'Super Admin'
    `;
    const params = [];

    // Filter by department if specified
    if (department) {
      sql += ' AND u.department = ?';
      params.push(department);
    }

    // Managers can only see their team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      sql += ' AND u.manager_id = ?';
      params.push(user.id);
    }

    sql += `
      GROUP BY u.id, u.name, u.email, u.role, u.department, u.designation, u.profile_photo, u.joining_date
      ORDER BY 
        tasks_completed DESC,
        overall_avg_rating IS NULL,
        overall_avg_rating DESC,
        total_ratings DESC
      LIMIT ${parseInt(limit)}
    `;

    const employees = await query(sql, params);

    // Format the results
    const formattedEmployees = employees.map(emp => ({
      id: emp.id,
      name: emp.name,
      email: emp.email,
      role: emp.role,
      department: emp.department,
      designation: emp.designation,
      profile_photo: emp.profile_photo,
      joining_date: emp.joining_date,
      tasks_completed: parseInt(emp.tasks_completed || 0),
      total_tasks_assigned: parseInt(emp.total_tasks_assigned || 0),
      task_completion_rate: emp.total_tasks_assigned > 0 
        ? parseFloat(((emp.tasks_completed / emp.total_tasks_assigned) * 100).toFixed(2))
        : 0,
      ratings: {
        workplace_behaviour: emp.avg_workplace_behaviour != null 
          ? parseFloat(parseFloat(emp.avg_workplace_behaviour).toFixed(2)) 
          : null,
        discipline: emp.avg_discipline != null 
          ? parseFloat(parseFloat(emp.avg_discipline).toFixed(2)) 
          : null,
        innovations: emp.avg_innovations != null 
          ? parseFloat(parseFloat(emp.avg_innovations).toFixed(2)) 
          : null,
        punctuality: emp.avg_punctuality != null 
          ? parseFloat(parseFloat(emp.avg_punctuality).toFixed(2)) 
          : null,
        critical_task_delivery: emp.avg_critical_task_delivery != null 
          ? parseFloat(parseFloat(emp.avg_critical_task_delivery).toFixed(2)) 
          : null,
        overall_average: emp.overall_avg_rating != null 
          ? parseFloat(parseFloat(emp.overall_avg_rating).toFixed(2)) 
          : null,
        total_ratings: parseInt(emp.total_ratings || 0)
      }
    }));

    return NextResponse.json({ employees: formattedEmployees });
  } catch (error) {
    console.error('Get top employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

