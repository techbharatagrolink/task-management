// Menu Permissions API - Manage which menu items are visible to which roles
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query, getConnection } from '@/lib/db';
import { sidebarItems } from '@/config/sidebarPermissions';

// Get all menu permissions
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin and Admin can view menu permissions
    if (!hasPermission(user.role, ['Super Admin', 'Admin'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get all roles from users table
    const roles = await query(
      'SELECT DISTINCT role FROM users WHERE role IS NOT NULL AND role != "" ORDER BY role'
    );
    const allRoles = roles.map(r => r.role);

    // Get all menu items from config
    const menuItems = Object.keys(sidebarItems).map(key => ({
      key,
      name: sidebarItems[key].name
    }));

    // Get permissions from database
    const permissions = await query(
      'SELECT menu_key, role, is_enabled FROM menu_permissions'
    );

    // Build permission map
    const permissionMap = {};
    permissions.forEach(p => {
      if (!permissionMap[p.menu_key]) {
        permissionMap[p.menu_key] = {};
      }
      permissionMap[p.menu_key][p.role] = p.is_enabled === 1;
    });

    // Get default permissions from config
    const defaultPermissions = {};
    Object.entries(sidebarItems).forEach(([key, item]) => {
      defaultPermissions[key] = {};
      if (item.roles.includes('all')) {
        allRoles.forEach(role => {
          defaultPermissions[key][role] = true;
        });
      } else {
        item.roles.forEach(role => {
          if (role !== 'all') {
            defaultPermissions[key][role] = true;
          }
        });
      }
    });

    // Merge database permissions with defaults (database takes precedence)
    const finalPermissions = {};
    menuItems.forEach(item => {
      finalPermissions[item.key] = {};
      allRoles.forEach(role => {
        // If permission exists in DB, use it; otherwise use default
        if (permissionMap[item.key] && permissionMap[item.key][role] !== undefined) {
          finalPermissions[item.key][role] = permissionMap[item.key][role];
        } else if (defaultPermissions[item.key] && defaultPermissions[item.key][role]) {
          finalPermissions[item.key][role] = true;
        } else {
          finalPermissions[item.key][role] = false;
        }
      });
    });

    return NextResponse.json({
      menuItems,
      roles: allRoles,
      permissions: finalPermissions
    });
  } catch (error) {
    console.error('Get menu permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update menu permissions
export async function POST(request) {
  const connection = await getConnection();
  try {
    await connection.beginTransaction();

    const user = await verifyAuth(request);
    if (!user) {
      await connection.rollback();
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only Super Admin and Admin can update menu permissions
    if (!hasPermission(user.role, ['Super Admin', 'Admin'])) {
      await connection.rollback();
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { permissions } = body; // { menu_key: { role: true/false } }

    if (!permissions || typeof permissions !== 'object') {
      await connection.rollback();
      return NextResponse.json(
        { error: 'Invalid permissions data' },
        { status: 400 }
      );
    }

    // Delete all existing permissions
    await connection.execute('DELETE FROM menu_permissions');

    // Insert new permissions
    const insertPromises = [];
    Object.entries(permissions).forEach(([menuKey, rolePermissions]) => {
      Object.entries(rolePermissions).forEach(([role, isEnabled]) => {
        if (isEnabled) {
          insertPromises.push(
            connection.execute(
              'INSERT INTO menu_permissions (menu_key, role, is_enabled) VALUES (?, ?, ?)',
              [menuKey, role, isEnabled ? 1 : 0]
            )
          );
        }
      });
    });

    await Promise.all(insertPromises);

    // Log activity
    await connection.execute(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'update_menu_permissions', 'settings', 'Updated menu permissions for all roles']
    );

    await connection.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    await connection.rollback();
    console.error('Update menu permissions error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    connection.release();
  }
}

