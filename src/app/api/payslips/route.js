// Payslips API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get payslips
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, Manager, HR can view payslips
    const canView = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canView) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('employee_id');
    const payslipId = searchParams.get('id');

    let sql = `
      SELECT 
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
        creator.name as created_by_name,
        creator.role as created_by_role
      FROM payslips p
      INNER JOIN users e ON p.employee_id = e.id
      INNER JOIN users creator ON p.created_by = creator.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by payslip ID if specified
    if (payslipId) {
      sql += ' AND p.id = ?';
      params.push(payslipId);
    }

    // Filter by employee if specified
    if (employeeId) {
      sql += ' AND p.employee_id = ?';
      params.push(employeeId);
    }

    // Managers can only see payslips for their team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      sql += ' AND e.manager_id = ?';
      params.push(user.id);
    }

    sql += ' ORDER BY p.created_at DESC';

    const payslips = await query(sql, params);

    // Parse JSON fields
    const parsedPayslips = payslips.map(payslip => ({
      ...payslip,
      earnings: typeof payslip.earnings === 'string' ? JSON.parse(payslip.earnings) : payslip.earnings,
      deductions: typeof payslip.deductions === 'string' ? JSON.parse(payslip.deductions) : payslip.deductions
    }));

    return NextResponse.json({ payslips: parsedPayslips });
  } catch (error) {
    console.error('Get payslips error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Create payslip
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Admin, Manager, HR can create payslips
    const canCreate = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canCreate) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      employee_id,
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

    // Validate required fields
    if (!employee_id || !payslip_month || !employee_name || !earnings || !deductions) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Employee ID, payslip month, employee name, earnings, and deductions are required' },
        { status: 400 }
      );
    }

    // Validate earnings and deductions are arrays
    if (!Array.isArray(earnings) || !Array.isArray(deductions)) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Earnings and deductions must be arrays' },
        { status: 400 }
      );
    }

    // Calculate totals
    const totalEarnings = earnings.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);

    const totalDeductions = deductions.reduce((sum, item) => {
      const amount = parseFloat(item.amount) || 0;
      return sum + amount;
    }, 0);

    const netPay = totalEarnings - totalDeductions;

    // Verify employee exists
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

    // Managers can only create payslips for their direct team members
    if (user.role === 'Manager' && !hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      if (employee.manager_id !== user.id) {
        await connection.rollback();
        return NextResponse.json(
          { error: 'You can only create payslips for employees in your team' },
          { status: 403 }
        );
      }
    }

    // Insert payslip
    const [result] = await connection.execute(
      `INSERT INTO payslips 
       (employee_id, payslip_month, employee_name, employee_id_code, designation, 
        department, date_of_joining, bank_name, account_number, uan_pf_number,
        earnings, deductions, total_earnings, total_deductions, net_pay, net_pay_words, created_by) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        payslip_month,
        employee_name,
        employee_id_code || null,
        designation || null,
        department || null,
        date_of_joining || null,
        bank_name || null,
        account_number || null,
        uan_pf_number || null,
        JSON.stringify(earnings),
        JSON.stringify(deductions),
        totalEarnings,
        totalDeductions,
        netPay,
        net_pay_words || null,
        user.id
      ]
    );

    // Fetch the created payslip
    const [payslipResults] = await connection.execute(
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
        e.name as employee_full_name,
        e.email as employee_email
       FROM payslips p
       INNER JOIN users e ON p.employee_id = e.id
       WHERE p.id = ?`,
      [result.insertId]
    );

    await connection.commit();

    // Parse JSON fields
    const payslip = {
      ...payslipResults[0],
      earnings: typeof payslipResults[0].earnings === 'string' 
        ? JSON.parse(payslipResults[0].earnings) 
        : payslipResults[0].earnings,
      deductions: typeof payslipResults[0].deductions === 'string' 
        ? JSON.parse(payslipResults[0].deductions) 
        : payslipResults[0].deductions
    };

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'create_payslip', 'payslips', `Created payslip for ${employee_name} (${payslip_month})`]
    );

    return NextResponse.json({ 
      success: true, 
      payslip 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create payslip error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

