// Employee management API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

// Get all employees
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canView = hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager']) ||
                    user.role?.includes('Developer');
    
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const department = searchParams.get('department');
    const role = searchParams.get('role');

    let sql = `
      SELECT u.id, u.name, u.email, u.role, u.department, u.designation, u.profile_photo, 
             u.joining_date, u.salary, u.is_active, u.created_at, u.manager_id,
             m.name as manager_name
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.role != 'Super Admin'
    `;
    const params = [];

    // Filter by department if same department employee
    if (user.role?.includes('Developer') && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
      sql += ' AND u.department = ?';
      params.push(user.department);
    }
    
    // Managers see only their direct team members (employees who report to them)
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      sql += ' AND u.manager_id = ?';
      params.push(user.id);
    }

    if (department) {
      sql += ' AND u.department = ?';
      params.push(department);
    }

    if (role) {
      sql += ' AND u.role = ?';
      params.push(role);
    }

    sql += ' ORDER BY u.created_at DESC';

    const employees = await query(sql, params);

    // Remove sensitive data
    const safeEmployees = employees.map(emp => ({
      ...emp,
      salary: hasPermission(user.role, ['Super Admin', 'Admin', 'HR']) ? emp.salary : null
    }));

    return NextResponse.json({ employees: safeEmployees });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new employee
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin, Super Admin, and HR can create employees
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      name,
      email,
      password,
      role,
      department,
      designation,
      profile_photo,
      joining_date,
      salary,
      access_permissions,
      manager_id
    } = body;

    // Validate required fields
    if (!name || !email || !password || !role) {
      return NextResponse.json(
        { error: 'Name, email, password, and role are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existing = await query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return NextResponse.json(
        { error: 'Email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Validate manager_id if provided
    if (manager_id) {
      const manager = await query('SELECT id FROM users WHERE id = ?', [manager_id]);
      if (manager.length === 0) {
        return NextResponse.json(
          { error: 'Invalid manager ID. Manager must exist' },
          { status: 400 }
        );
      }
    }

    // Insert user
    const result = await query(
      `INSERT INTO users (name, email, password, role, department, designation, 
        profile_photo, joining_date, salary, access_permissions, manager_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email,
        hashedPassword,
        role,
        department || null,
        designation || null,
        profile_photo || null,
        joining_date || null,
        salary || null,
        access_permissions ? JSON.stringify(access_permissions) : null,
        manager_id || null
      ]
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'create_employee', 'employees', `Created employee: ${email}`]
    );

    return NextResponse.json({
      success: true,
      employee: {
        id: result.insertId,
        name,
        email,
        role
      }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

