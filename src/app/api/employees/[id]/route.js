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

    const { id } = await params;

    // Check permissions
    const canView = hasPermission(user.role, ['Super Admin', 'Admin', 'HR', 'Manager']) ||
                    parseInt(id) === user.id ||
                    (user.role?.includes('Developer') && user.department);

    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // SECURITY FIX: Don't select password field
    const employees = await query(
      `SELECT u.id, u.name, u.email, u.role, u.department, u.designation, u.profile_photo, 
              u.joining_date, u.salary, u.access_permissions, u.is_active, u.created_at, 
              u.updated_at, u.manager_id, m.name as manager_name
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = ?`,
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

    const { id } = await params;
    const body = await request.json();

    // Check permissions
    const canEdit = hasPermission(user.role, ['Super Admin', 'Admin', 'HR']) ||
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
      is_active,
      manager_id
    } = body;

    // Build update query dynamically
    const updates = [];
    const queryParams = [];

    if (name !== undefined) {
      updates.push('name = ?');
      queryParams.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      queryParams.push(email);
    }
    if (password !== undefined && password !== '') {
      const hashedPassword = await hashPassword(password);
      updates.push('password = ?');
      queryParams.push(hashedPassword);
    }
    if (role !== undefined && hasPermission(user.role, ['Super Admin', 'Admin'])) {
      updates.push('role = ?');
      queryParams.push(role);
    }
    if (department !== undefined) {
      updates.push('department = ?');
      queryParams.push(department);
    }
    if (designation !== undefined) {
      updates.push('designation = ?');
      queryParams.push(designation);
    }
    if (profile_photo !== undefined) {
      updates.push('profile_photo = ?');
      queryParams.push(profile_photo);
    }
    if (joining_date !== undefined) {
      updates.push('joining_date = ?');
      queryParams.push(joining_date);
    }
    if (salary !== undefined && hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      updates.push('salary = ?');
      queryParams.push(salary);
    }
    if (access_permissions !== undefined && hasPermission(user.role, ['Super Admin', 'Admin'])) {
      updates.push('access_permissions = ?');
      queryParams.push(JSON.stringify(access_permissions));
    }
    if (is_active !== undefined && hasPermission(user.role, ['Super Admin', 'Admin'])) {
      updates.push('is_active = ?');
      queryParams.push(is_active);
    }
    if (manager_id !== undefined && hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      // Validate manager_id if provided
      if (manager_id !== null && manager_id !== '') {
        const manager = await query('SELECT id FROM users WHERE id = ?', [manager_id]);
        if (manager.length === 0) {
          return NextResponse.json(
            { error: 'Invalid manager ID. Manager must exist' },
            { status: 400 }
          );
        }
        // Prevent assigning a manager to themselves
        if (parseInt(manager_id) === parseInt(id)) {
          return NextResponse.json(
            { error: 'A user cannot be assigned as their own manager' },
            { status: 400 }
          );
        }
      }
      updates.push('manager_id = ?');
      queryParams.push(manager_id || null);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    queryParams.push(id);

    await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      queryParams
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

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Prevent users from deleting themselves
    if (parseInt(id) === user.id) {
      return NextResponse.json(
        { error: 'You cannot delete your own account' },
        { status: 400 }
      );
    }

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

