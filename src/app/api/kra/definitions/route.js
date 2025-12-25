// KRA Definitions API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';

// Get KRA definitions for a role
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const includeInactive = searchParams.get('include_inactive') === 'true';

    let sql = 'SELECT * FROM kra_definitions WHERE 1=1';
    const params = [];

    if (!includeInactive) {
      sql += ' AND is_active = 1';
    }

    if (role) {
      sql += ' AND role = ?';
      params.push(role);
    }

    sql += ' ORDER BY role, kra_number ASC';

    const definitions = await query(sql, params);

    return NextResponse.json({ definitions });
  } catch (error) {
    console.error('Get KRA definitions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create or update KRA definition (Admin only)
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    
    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Admin and Super Admin can manage KRA definitions
    if (!hasPermission(user.role, ['Super Admin', 'Admin'])) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const {
      id,
      role,
      kra_number,
      kra_name,
      weight_percentage,
      kpi_1_name,
      kpi_1_target,
      kpi_1_scale,
      kpi_1_rating_labels,
      kpi_2_name,
      kpi_2_target,
      kpi_2_scale,
      kpi_2_rating_labels,
      is_active = 1
    } = body;

    if (!role || !kra_number || !kra_name || !weight_percentage) {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Role, KRA number, name, and weight are required' },
        { status: 400 }
      );
    }

    // Convert rating labels to JSON string if it's an object
    // If object is empty or all values are empty, store NULL
    let kpi1Labels = null;
    if (kpi_1_rating_labels) {
      if (typeof kpi_1_rating_labels === 'object') {
        const hasValues = Object.values(kpi_1_rating_labels).some(v => v && v.trim() !== '');
        kpi1Labels = hasValues ? JSON.stringify(kpi_1_rating_labels) : null;
      } else {
        kpi1Labels = kpi_1_rating_labels.trim() !== '' ? kpi_1_rating_labels : null;
      }
    }
    
    let kpi2Labels = null;
    if (kpi_2_rating_labels) {
      if (typeof kpi_2_rating_labels === 'object') {
        const hasValues = Object.values(kpi_2_rating_labels).some(v => v && v.trim() !== '');
        kpi2Labels = hasValues ? JSON.stringify(kpi_2_rating_labels) : null;
      } else {
        kpi2Labels = kpi_2_rating_labels.trim() !== '' ? kpi_2_rating_labels : null;
      }
    }

    if (id) {
      // Update existing
      await connection.execute(
        `UPDATE kra_definitions SET
          role = ?, kra_number = ?, kra_name = ?, weight_percentage = ?,
          kpi_1_name = ?, kpi_1_target = ?, kpi_1_scale = ?, kpi_1_rating_labels = ?,
          kpi_2_name = ?, kpi_2_target = ?, kpi_2_scale = ?, kpi_2_rating_labels = ?,
          is_active = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          role, kra_number, kra_name, weight_percentage,
          kpi_1_name || null, kpi_1_target || null, kpi_1_scale || null, kpi1Labels || null,
          kpi_2_name || null, kpi_2_target || null, kpi_2_scale || null, kpi2Labels || null,
          is_active ? 1 : 0, id
        ]
      );
    } else {
      // Create new
      const [result] = await connection.execute(
        `INSERT INTO kra_definitions 
         (role, kra_number, kra_name, weight_percentage,
          kpi_1_name, kpi_1_target, kpi_1_scale, kpi_1_rating_labels,
          kpi_2_name, kpi_2_target, kpi_2_scale, kpi_2_rating_labels,
          is_active)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          role, kra_number, kra_name, weight_percentage,
          kpi_1_name || null, kpi_1_target || null, kpi_1_scale || null, kpi1Labels || null,
          kpi_2_name || null, kpi_2_target || null, kpi_2_scale || null, kpi2Labels || null,
          is_active ? 1 : 0
        ]
      );
    }

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Create/Update KRA definition error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

// Delete KRA definition (Admin only)
export async function DELETE(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();
    
    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin'])) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      await connection.rollback();
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    await connection.execute(
      'UPDATE kra_definitions SET is_active = 0 WHERE id = ?',
      [id]
    );

    await connection.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Delete KRA definition error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

