// Birthday Events API - Individual event operations
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { getConnection } from '@/lib/db';

// Update a birthday event
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
    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'HR'])) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const eventId = params.id;
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

    // Check if event exists
    const [existingEvents] = await connection.execute(
      'SELECT id FROM birthday_events WHERE id = ?',
      [eventId]
    );

    if (existingEvents.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
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

    // Update birthday event
    await connection.execute(
      `UPDATE birthday_events 
       SET employee_id = ?, event_type = ?, event_date = ?, event_year = ?, notes = ?
       WHERE id = ?`,
      [
        employee_id,
        event_type,
        event_date,
        event_year || null,
        notes || null,
        eventId
      ]
    );

    // Fetch the updated event with employee info
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
    console.error('Update birthday event error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// Delete a birthday event
export async function DELETE(request, { params }) {
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

    const eventId = params.id;

    // Check if event exists
    const [existingEvents] = await connection.execute(
      'SELECT id FROM birthday_events WHERE id = ?',
      [eventId]
    );

    if (existingEvents.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Delete the event
    await connection.execute(
      'DELETE FROM birthday_events WHERE id = ?',
      [eventId]
    );

    await connection.commit();

    return NextResponse.json({ 
      success: true,
      message: 'Event deleted successfully'
    });
  } catch (error) {
    await connection.rollback();
    console.error('Delete birthday event error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}


