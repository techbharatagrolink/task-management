// Notifications API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get notifications
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('show_all') === 'true'; // For senders to see all notifications

    // Check if user can send notifications (to determine what they can see)
    const canSend = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);

    let sql = `
      SELECT 
        n.id,
        n.title,
        n.message,
        n.created_by,
        n.created_at,
        u.name as created_by_name,
        u.role as created_by_role,
        COUNT(DISTINCT nr.user_id) as recipient_count
      FROM notifications n
      INNER JOIN users u ON n.created_by = u.id
      LEFT JOIN notification_recipients nr ON n.id = nr.notification_id
    `;

    const params = [];

    if (canSend && !showAll) {
      // By default, show only notifications sent by this user
      sql += ' WHERE n.created_by = ?';
      params.push(user.id);
    } else if (!canSend) {
      // Regular users see only notifications sent to them
      sql += ` 
        WHERE EXISTS (
          SELECT 1 FROM notification_recipients nr2 
          WHERE nr2.notification_id = n.id AND nr2.user_id = ?
        )
      `;
      params.push(user.id);
    }

    sql += `
      GROUP BY n.id, n.title, n.message, n.created_by, n.created_at, u.name, u.role
      ORDER BY n.created_at DESC
    `;

    const notifications = await query(sql, params);

    return NextResponse.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Create notification
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions - Only Admin, Manager, HR can send notifications
    const canSend = hasPermission(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);
    if (!canSend) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, recipient_ids } = body;

    // Validate required fields
    if (!title || !message) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    if (!recipient_ids || !Array.isArray(recipient_ids) || recipient_ids.length === 0) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    // Validate recipient IDs exist
    const placeholders = recipient_ids.map(() => '?').join(',');
    const [recipients] = await connection.execute(
      `SELECT id FROM users WHERE id IN (${placeholders}) AND role != ?`,
      [...recipient_ids, 'Super Admin']
    );

    if (recipients.length !== recipient_ids.length) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'One or more recipient IDs are invalid' },
        { status: 400 }
      );
    }

    // Insert notification
    const [result] = await connection.execute(
      `INSERT INTO notifications (title, message, created_by) 
       VALUES (?, ?, ?)`,
      [title, message, user.id]
    );

    const notificationId = result.insertId;

    // Insert recipients
    for (const recipientId of recipient_ids) {
      await connection.execute(
        'INSERT INTO notification_recipients (notification_id, user_id) VALUES (?, ?)',
        [notificationId, recipientId]
      );
    }

    await connection.commit();

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'send_notification', 'notifications', `Sent notification to ${recipient_ids.length} recipient(s)`]
    );

    return NextResponse.json({ 
      success: true, 
      notification: {
        id: notificationId,
        title,
        message,
        recipient_count: recipient_ids.length
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}
