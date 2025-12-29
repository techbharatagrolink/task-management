// Calendar API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get calendar items
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    let start = searchParams.get('start'); // ISO date string
    let end = searchParams.get('end'); // ISO date string

    // Build date filter
    let dateFilter = '';
    const params = [];

    if (start && end) {
      // Ensure dates are in YYYY-MM-DD format
      start = start.split('T')[0];
      end = end.split('T')[0];
      dateFilter = 'WHERE event_date >= ? AND event_date <= ?';
      params.push(start, end);
    } else {
      // Default to current month if no dates provided
      const today = new Date();
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      start = firstDay.toISOString().split('T')[0];
      end = lastDay.toISOString().split('T')[0];
      dateFilter = 'WHERE event_date >= ? AND event_date <= ?';
      params.push(start, end);
    }

    // Get calendar items:
    // 1. Public items (is_public = 1)
    // 2. Private items created by the current user
    const sql = `
      SELECT c.id, c.title, c.description, c.event_date, c.event_time,
             c.is_public, c.created_by, c.created_at, c.updated_at,
             u.name as created_by_name, u.role as created_by_role
      FROM calendar_items c
      LEFT JOIN users u ON c.created_by = u.id
      ${dateFilter}
      AND (c.is_public = 1 OR c.created_by = ?)
      ORDER BY c.event_date ASC, c.event_time ASC
    `;
    params.push(user.id);
    
    const items = await query(sql, params);

    // Format items for FullCalendar
    const events = items.map(item => {
      // Handle date formatting - MySQL returns dates as Date objects or strings
      // Use local date methods to avoid timezone conversion issues with toISOString()
      let eventDate;
      if (!item.event_date) {
        // Skip items with null/undefined dates
        console.warn('Calendar item has no event_date:', item.id);
        return null;
      }
      
      if (item.event_date instanceof Date) {
        const d = item.event_date;
        eventDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      } else {
        eventDate = String(item.event_date).split('T')[0];
      }
      
      // Handle time formatting - MySQL returns time as string HH:MM:SS or null
      let eventTime = null;
      if (item.event_time) {
        const timeStr = String(item.event_time);
        // Remove seconds if present (HH:MM:SS -> HH:MM)
        eventTime = timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
      }
      
      // For all-day events, use just the date (YYYY-MM-DD) to avoid timezone issues
      // For timed events, use local datetime format
      let start;
      if (eventTime) {
        // Timed event - use local datetime format (YYYY-MM-DDTHH:MM)
        start = `${eventDate}T${eventTime}`;
      } else {
        // All-day event - use just the date string (YYYY-MM-DD)
        // This tells FullCalendar to treat it as a local date, not UTC
        start = eventDate;
      }
      
      return {
        id: item.id.toString(),
        title: item.title,
        description: item.description || '',
        start: start,
        allDay: !eventTime,
        backgroundColor: item.is_public === 1 ? '#3b82f6' : '#8b5cf6', // Blue for public, Purple for private
        borderColor: item.is_public === 1 ? '#2563eb' : '#7c3aed',
        extendedProps: {
          description: item.description,
          isPublic: item.is_public === 1,
          createdBy: item.created_by_name || 'Unknown',
          createdByRole: item.created_by_role || '',
          createdById: item.created_by,
          canEdit: item.created_by === user.id
        }
      };
    }).filter(event => event !== null); // Remove any null events

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Get calendar items error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Create a new calendar item
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, event_date, event_time, is_public } = body;

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

    // Insert calendar item
    const [result] = await connection.execute(
      `INSERT INTO calendar_items 
       (title, description, event_date, event_time, is_public, created_by) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        event_date,
        event_time || null,
        is_public ? 1 : 0,
        user.id
      ]
    );

    const itemId = result.insertId;

    // Fetch the created item with user info
    const [items] = await connection.execute(
      `SELECT c.id, c.title, c.description, c.event_date, c.event_time,
              c.is_public, c.created_by, c.created_at, c.updated_at,
              u.name as created_by_name, u.role as created_by_role
       FROM calendar_items c
       LEFT JOIN users u ON c.created_by = u.id
       WHERE c.id = ?`,
      [itemId]
    );

    await connection.commit();

    const item = items[0];
    
    if (!item || !item.event_date) {
      return NextResponse.json(
        { error: 'Failed to retrieve created calendar item' },
        { status: 500 }
      );
    }
    
    // Format date - ensure it's YYYY-MM-DD
    // Use local date methods to avoid timezone conversion issues with toISOString()
    let eventDate;
    if (item.event_date instanceof Date) {
      const d = item.event_date;
      eventDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    } else {
      eventDate = String(item.event_date).split('T')[0];
    }
    
    // Format time if present
    let eventTime = null;
    if (item.event_time) {
      const timeStr = String(item.event_time);
      eventTime = timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
    }
    
    // For all-day events, use just the date to avoid timezone issues
    const start = eventTime ? `${eventDate}T${eventTime}` : eventDate;
    
    const event = {
      id: item.id.toString(),
      title: item.title,
      description: item.description || '',
      start: start,
      allDay: !eventTime,
      backgroundColor: item.is_public === 1 ? '#3b82f6' : '#8b5cf6',
      borderColor: item.is_public === 1 ? '#2563eb' : '#7c3aed',
      extendedProps: {
        description: item.description,
        isPublic: item.is_public === 1,
        createdBy: item.created_by_name,
        createdByRole: item.created_by_role,
        createdById: item.created_by,
        canEdit: true
      }
    };

    return NextResponse.json({ success: true, event });
  } catch (error) {
    await connection.rollback();
    console.error('Create calendar item error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
