// Payslip by ID API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get single payslip
export async function GET(request, { params }) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canView = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    const payslips = await query(
      `SELECT 
        p.id,
        p.employee_id,
        p.payslip_month,
        p.employee_name,
        p.employee_id_code,
        p.designation,
        p.department,
        p.date_of_joining,
        p.bank_name,
        p.account_number,
        p.uan_pf_number,
        p.earnings,
        p.deductions,
        p.total_earnings,
        p.total_deductions,
        p.net_pay,
        p.net_pay_words,
        p.created_by,
        p.created_at,
        p.updated_at,
        e.name as employee_full_name,
        e.email as employee_email,
        creator.name as created_by_name
       FROM payslips p
       INNER JOIN users e ON p.employee_id = e.id
       INNER JOIN users creator ON p.created_by = creator.id
       WHERE p.id = ?`,
      [id]
    );

    if (payslips.length === 0) {
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    // Managers can only view payslips for their team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      const payslip = payslips[0];
      const [employees] = await query(
        'SELECT manager_id FROM users WHERE id = ?',
        [payslip.employee_id]
      );
      if (employees.length === 0 || employees[0].manager_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Parse JSON fields
    const payslip = {
      ...payslips[0],
      earnings: typeof payslips[0].earnings === 'string' 
        ? JSON.parse(payslips[0].earnings) 
        : payslips[0].earnings,
      deductions: typeof payslips[0].deductions === 'string' 
        ? JSON.parse(payslips[0].deductions) 
        : payslips[0].deductions
    };

    return NextResponse.json({ payslip });
  } catch (error) {
    console.error('Get payslip error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Update payslip
export async function PUT(request, { params }) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    const canUpdate = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canUpdate) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body = await request.json();
    const {
      payslip_month,
      employee_name,
      employee_id_code,
      designation,
      department,
      date_of_joining,
      bank_name,
      account_number,
      uan_pf_number,
      earnings,
      deductions,
      net_pay_words
    } = body;

    // Check if payslip exists
    const [existing] = await connection.execute(
      'SELECT id, employee_id FROM payslips WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    // Managers can only update payslips for their team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      const [employees] = await connection.execute(
        'SELECT manager_id FROM users WHERE id = ?',
        [existing[0].employee_id]
      );
      if (employees.length === 0 || employees[0].manager_id !== user.id) {
        await connection.rollback();
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Calculate totals if earnings/deductions are provided
    let totalEarnings, totalDeductions, netPay;
    if (earnings !== undefined) {
      if (!Array.isArray(earnings)) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Earnings must be an array' },
          { status: 400 }
        );
      }

      totalEarnings = earnings.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || 0;
        return sum + amount;
      }, 0);

      // Deductions are optional - default to empty array if not provided
      const deductionsArray = deductions !== undefined 
        ? (Array.isArray(deductions) ? deductions : [])
        : [];

      if (deductions !== undefined && !Array.isArray(deductions)) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'Deductions must be an array' },
          { status: 400 }
        );
      }

      totalDeductions = deductionsArray.reduce((sum, item) => {
        const amount = parseFloat(item.amount) || 0;
        return sum + amount;
      }, 0);

      netPay = totalEarnings - totalDeductions;
    }

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (payslip_month !== undefined) {
      updateFields.push('payslip_month = ?');
      updateValues.push(payslip_month);
    }
    if (employee_name !== undefined) {
      updateFields.push('employee_name = ?');
      updateValues.push(employee_name);
    }
    if (employee_id_code !== undefined) {
      updateFields.push('employee_id_code = ?');
      updateValues.push(employee_id_code || null);
    }
    if (designation !== undefined) {
      updateFields.push('designation = ?');
      updateValues.push(designation || null);
    }
    if (department !== undefined) {
      updateFields.push('department = ?');
      updateValues.push(department || null);
    }
    if (date_of_joining !== undefined) {
      updateFields.push('date_of_joining = ?');
      updateValues.push(date_of_joining || null);
    }
    if (bank_name !== undefined) {
      updateFields.push('bank_name = ?');
      updateValues.push(bank_name || null);
    }
    if (account_number !== undefined) {
      updateFields.push('account_number = ?');
      updateValues.push(account_number || null);
    }
    if (uan_pf_number !== undefined) {
      updateFields.push('uan_pf_number = ?');
      updateValues.push(uan_pf_number || null);
    }
    if (earnings !== undefined) {
      updateFields.push('earnings = ?');
      updateValues.push(JSON.stringify(earnings));
    }
    if (deductions !== undefined) {
      const deductionsArray = Array.isArray(deductions) ? deductions : [];
      updateFields.push('deductions = ?');
      updateValues.push(JSON.stringify(deductionsArray));
    }
    if (totalEarnings !== undefined) {
      updateFields.push('total_earnings = ?');
      updateValues.push(totalEarnings);
    }
    if (totalDeductions !== undefined) {
      updateFields.push('total_deductions = ?');
      updateValues.push(totalDeductions);
    }
    if (netPay !== undefined) {
      updateFields.push('net_pay = ?');
      updateValues.push(netPay);
    }
    if (net_pay_words !== undefined) {
      updateFields.push('net_pay_words = ?');
      updateValues.push(net_pay_words || null);
    }

    if (updateFields.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateValues.push(id);

    await connection.execute(
      `UPDATE payslips SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    await connection.commit();

    // Fetch updated payslip
    const [updated] = await query(
      `SELECT 
        p.*,
        e.name as employee_full_name,
        e.email as employee_email
       FROM payslips p
       INNER JOIN users e ON p.employee_id = e.id
       WHERE p.id = ?`,
      [id]
    );

    // Parse JSON fields
    const payslip = {
      ...updated[0],
      earnings: typeof updated[0].earnings === 'string' 
        ? JSON.parse(updated[0].earnings) 
        : updated[0].earnings,
      deductions: typeof updated[0].deductions === 'string' 
        ? JSON.parse(updated[0].deductions) 
        : updated[0].deductions
    };

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'update_payslip', 'payslips', `Updated payslip ID: ${id}`]
    );

    return NextResponse.json({ success: true, payslip });
  } catch (error) {
    await connection.rollback();
    console.error('Update payslip error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// Delete payslip
export async function DELETE(request, { params }) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Only Admin and Super Admin can delete
    const canDelete = hasPermission(user.role, ['Super Admin', 'Admin']);
    if (!canDelete) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // Check if payslip exists
    const [existing] = await connection.execute(
      'SELECT id FROM payslips WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
    }

    await connection.execute('DELETE FROM payslips WHERE id = ?', [id]);

    await connection.commit();

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'delete_payslip', 'payslips', `Deleted payslip ID: ${id}`]
    );

    return NextResponse.json({ success: true, message: 'Payslip deleted successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Delete payslip error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}




