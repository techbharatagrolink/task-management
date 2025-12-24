// Work Log Field Definitions API (for Admin to manage fields)
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get field definitions
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let sql = 'SELECT * FROM work_log_field_definitions WHERE is_active = 1';
    const params = [];

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY role, display_order ASC';

    const fields = await query(sql, params);

    // Parse JSON field_options for each field
    const parsedFields = fields.map(field => ({
      ...field,
      field_options: typeof field.field_options === 'string' 
        ? JSON.parse(field.field_options || 'null') 
        : field.field_options
    }));

    return NextResponse.json({ fields: parsedFields });
  } catch (error) {
    console.error('Get field definitions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create/Update field definition (Admin only)
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { role, field_key, field_label, field_type, field_options, is_required, display_order, is_active } = body;

    if (!role || !field_key || !field_label || !field_type) {
      return NextResponse.json(
        { error: 'Role, field_key, field_label, and field_type are required' },
        { status: 400 }
      );
    }

    // Check if field already exists
    const existing = await query(
      'SELECT id FROM work_log_field_definitions WHERE role = ? AND field_key = ?',
      [role, field_key]
    );

    if (existing.length > 0) {
      // Update existing field
      await query(
        `UPDATE work_log_field_definitions 
         SET field_label = ?, field_type = ?, field_options = ?, 
             is_required = ?, display_order = ?, is_active = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE role = ? AND field_key = ?`,
        [
          field_label,
          field_type,
          field_options ? JSON.stringify(field_options) : null,
          is_required ? 1 : 0,
          display_order || 0,
          is_active !== undefined ? (is_active ? 1 : 0) : 1,
          role,
          field_key
        ]
      );

      return NextResponse.json({ success: true, message: 'Field definition updated successfully' });
    } else {
      // Create new field
      await query(
        `INSERT INTO work_log_field_definitions 
         (role, field_key, field_label, field_type, field_options, is_required, display_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          role,
          field_key,
          field_label,
          field_type,
          field_options ? JSON.stringify(field_options) : null,
          is_required ? 1 : 0,
          display_order || 0,
          is_active !== undefined ? (is_active ? 1 : 0) : 1
        ]
      );

      return NextResponse.json({ success: true, message: 'Field definition created successfully' });
    }
  } catch (error) {
    console.error('Create/Update field definition error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete field definition (Admin only)
export async function DELETE(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const role = searchParams.get('role');
    const field_key = searchParams.get('field_key');

    if (!id && (!role || !field_key)) {
      return NextResponse.json(
        { error: 'Either id or both role and field_key are required' },
        { status: 400 }
      );
    }

    if (id) {
      await query('DELETE FROM work_log_field_definitions WHERE id = ?', [id]);
    } else {
      await query(
        'DELETE FROM work_log_field_definitions WHERE role = ? AND field_key = ?',
        [role, field_key]
      );
    }

    return NextResponse.json({ success: true, message: 'Field definition deleted successfully' });
  } catch (error) {
    console.error('Delete field definition error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


