// Individual employee API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission, hashPassword } from '@/lib/auth';
import { query } from '@/lib/db';

// Get employee by ID
export async function GET(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check permissions
    const canView = hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager']) ||
                    parseInt(id) === user.id ||
                    (user.role?.includes('Developer') && user.department);

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY FIX: Don't select password field
    const employees = await query(
      'SELECT id, name, email, role, department, designation, profile_photo, joining_date, salary, access_permissions, is_active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );
    
    if (employees.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const employee = employees[0];

    // Remove password
    delete employee.password;

    // Hide salary if not authorized
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      employee.salary = null;
    }

    return NextResponse.json({ employee });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update employee
export async function PUT(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const body = await request.json();

    // Check permissions
    const canEdit = hasPermission(user.role, ['Super Admin', 'Admin']) ||
                    (parseInt(id) === user.id && !body.role && !body.salary);

    if (!canEdit) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

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
      is_active
    } = body;

    // Build update query dynamically
    const updates = [];
    const params = [];

    if (name !== undefined) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      params.push(email);
    }
    if (password !== undefined && password !== '') {
      const hashedPassword = await hashPassword(password);
      updates.push('password = ?');
      params.push(hashedPassword);
    }
    if (role !== undefined && hasPermission(user.role, ['Super Admin', 'Admin'])) {
      updates.push('role = ?');
      params.push(role);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      params.push(department);
    }
    if (designation !== undefined) {
      updates.push('designation = ?');
      params.push(designation);
    }
    if (profile_photo !== undefined) {
      updates.push('profile_photo = ?');
      params.push(profile_photo);
    }
    if (joining_date !== undefined) {
      updates.push('joining_date = ?');
      params.push(joining_date);
    }
    if (salary !== undefined && hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      updates.push('salary = ?');
      params.push(salary);
    }
    if (access_permissions !== undefined && hasPermission(user.role, ['Super Admin', 'Admin'])) {
      updates.push('access_permissions = ?');
      params.push(JSON.stringify(access_permissions));
    }
    if (is_active !== undefined && hasPermission(user.role, ['Super Admin', 'Admin'])) {
      updates.push('is_active = ?');
      params.push(is_active);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    params.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      params
    );

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'update_employee', 'employees', `Updated employee ID: ${id}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete employee (soft delete)
export async function DELETE(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Soft delete
    await query('UPDATE users SET is_active = 0 WHERE id = ?', [id]);

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'delete_employee', 'employees', `Deleted employee ID: ${id}`]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

