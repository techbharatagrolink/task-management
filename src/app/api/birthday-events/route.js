// Birthday Events API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get birthday events
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - HR, Admin, and Super Admin can access
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year') || new Date().getFullYear();

    // Get all birthday events
    const sql = `
      SELECT be.id, be.employee_id, be.event_type, be.event_date, be.event_year, be.notes,
             be.created_by, be.created_at, be.updated_at,
             u.name as employee_name, u.email as employee_email, u.profile_photo,
             creator.name as created_by_name
      FROM birthday_events be
      INNER JOIN users u ON be.employee_id = u.id
      LEFT JOIN users creator ON be.created_by = creator.id
      WHERE u.is_active = 1
      ORDER BY be.event_date ASC
    `;
    
    const events = await query(sql, []);

    // Group events by month
    const eventsByMonth = {};
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Initialize all months
    months.forEach((month, index) => {
      eventsByMonth[index + 1] = {
        month: month,
        monthNumber: index + 1,
        events: []
      };
    });

    // Group events by month
    events.forEach(event => {
      if (event.event_date) {
        const eventDate = new Date(event.event_date);
        const month = eventDate.getMonth() + 1; // 1-12
        
        if (eventsByMonth[month]) {
          eventsByMonth[month].events.push({
            id: event.id,
            employee_id: event.employee_id,
            employee_name: event.employee_name,
            employee_email: event.employee_email,
            profile_photo: event.profile_photo,
            event_type: event.event_type,
            event_date: event.event_date,
            event_year: event.event_year,
            notes: event.notes,
            created_by: event.created_by,
            created_by_name: event.created_by_name,
            created_at: event.created_at,
            updated_at: event.updated_at
          });
        }
      }
    });

    return NextResponse.json({ 
      eventsByMonth: Object.values(eventsByMonth),
      currentYear: parseInt(year)
    });
  } catch (error) {
    console.error('Get birthday events error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Create a new birthday event
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { employee_id, event_type, event_date, event_year, notes } = body;

    // Validate required fields
    if (!employee_id || !event_type || !event_date) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Employee, event type, and event date are required' },
        { status: 400 }
      );
    }

    // Validate event_type
    if (!['birthday', 'anniversary'].includes(event_type)) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Event type must be either "birthday" or "anniversary"' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(event_date)) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Check if employee exists and is active
    const [employees] = await connection.execute(
      'SELECT id, name FROM users WHERE id = ? AND is_active = 1',
      [employee_id]
    );

    if (employees.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Employee not found or inactive' },
        { status: 404 }
      );
    }

    // Insert birthday event
    const [result] = await connection.execute(
      `INSERT INTO birthday_events 
       (employee_id, event_type, event_date, event_year, notes, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        event_type,
        event_date,
        event_year || null,
        notes || null,
        user.id
      ]
    );

    const eventId = result.insertId;

    // Fetch the created event with employee info
    const [events] = await connection.execute(
      `SELECT be.id, be.employee_id, be.event_type, be.event_date, be.event_year, be.notes,
              be.created_by, be.created_at, be.updated_at,
              u.name as employee_name, u.email as employee_email, u.profile_photo,
              creator.name as created_by_name
       FROM birthday_events be
       INNER JOIN users u ON be.employee_id = u.id
       LEFT JOIN users creator ON be.created_by = creator.id
       WHERE be.id = ?`,
      [eventId]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true, 
      event: events[0] 
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create birthday event error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}


