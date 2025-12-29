// Individual calendar item API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Update calendar item
export async function PUT(request, { params }) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { title, description, event_date, event_time, is_public } = body;

    // Check if item exists and user has permission to edit
    const [items] = await connection.execute(
      'SELECT * FROM calendar_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Calendar item not found' }, { status: 404 });
    }

    const item = items[0];

    // Only creator can edit their items
    if (item.created_by !== user.id) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'You can only edit your own calendar items' },
        { status: 403 }
      );
    }

    // Validate required fields
    if (!title || !event_date) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Title and event date are required' },
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

    // Validate time format if provided
    if (event_time && !/^\d{2}:\d{2}(:\d{2})?$/.test(event_time)) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM or HH:MM:SS' },
        { status: 400 }
      );
    }

    // Update calendar item
    await connection.execute(
      `UPDATE calendar_items 
       SET title = ?, description = ?, event_date = ?, event_time = ?, is_public = ?
       WHERE id = ?`,
      [
        title,
        description || null,
        event_date,
        event_time || null,
        is_public ? 1 : 0,
        id
      ]
    );

    // Fetch updated item with user info
    const [updatedItems] = await connection.execute(
      `SELECT c.id, c.title, c.description, c.event_date, c.event_time,
              c.is_public, c.created_by, c.created_at, c.updated_at,
              u.name as created_by_name, u.role as created_by_role
       FROM calendar_items c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [id]
    );

    await connection.commit();

    const updatedItem = updatedItems[0];
    
    if (!updatedItem || !updatedItem.event_date) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Failed to retrieve updated calendar item' },
        { status: 500 }
      );
    }
    
    // Format date - ensure it's YYYY-MM-DD
    // Use local date methods to avoid timezone conversion issues with toISOString()
    let eventDate;
    if (updatedItem.event_date instanceof Date) {
      const d = updatedItem.event_date;
      eventDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else {
      eventDate = String(updatedItem.event_date).split('T')[0];
    }
    
    // Format time if present
    let eventTime = null;
    if (updatedItem.event_time) {
      const timeStr = String(updatedItem.event_time);
      eventTime = timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
    }
    
    // For all-day events, use just the date to avoid timezone issues
    const start = eventTime ? `${eventDate}T${eventTime}` : eventDate;
    
    const event = {
      id: updatedItem.id.toString(),
      title: updatedItem.title,
      description: updatedItem.description || '',
      start: start,
      allDay: !eventTime,
      backgroundColor: updatedItem.is_public === 1 ? '#3b82f6' : '#8b5cf6',
      borderColor: updatedItem.is_public === 1 ? '#2563eb' : '#7c3aed',
      extendedProps: {
        description: updatedItem.description,
        isPublic: updatedItem.is_public === 1,
        createdBy: updatedItem.created_by_name,
        createdByRole: updatedItem.created_by_role,
        createdById: updatedItem.created_by,
        canEdit: true
      }
    };

    return NextResponse.json({ success: true, event });
  } catch (error) {
    await connection.rollback();
    console.error('Update calendar item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// Delete calendar item
export async function DELETE(request, { params }) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Check if item exists and user has permission to delete
    const [items] = await connection.execute(
      'SELECT * FROM calendar_items WHERE id = ?',
      [id]
    );

    if (items.length === 0) {
      await connection.rollback();
      return NextResponse.json({ error: 'Calendar item not found' }, { status: 404 });
    }

    const item = items[0];

    // Only creator can delete their items
    if (item.created_by !== user.id) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'You can only delete your own calendar items' },
        { status: 403 }
      );
    }

    // Delete calendar item
    await connection.execute('DELETE FROM calendar_items WHERE id = ?', [id]);

    await connection.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Delete calendar item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

