// Check menu permissions for a specific role
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { sidebarItems } from '@/config/sidebarPermissions';

// Get menu permissions for a specific role
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role') || user.role;

    if (!role) {
      return NextResponse.json({ error: 'Role is required' }, { status: 400 });
    }

    // Super Admin always has access to everything
    if (role === 'Super Admin') {
      const allPermissions = {};
      Object.keys(sidebarItems).forEach(key => {
        allPermissions[key] = true;
      });
      return NextResponse.json({ permissions: allPermissions });
    }

    // Get permissions from database
    const dbPermissions = await query(
      'SELECT menu_key, is_enabled FROM menu_permissions WHERE role = ?',
      [role]
    );

    // Build permission map from database
    const dbPermissionMap = {};
    dbPermissions.forEach(p => {
      dbPermissionMap[p.menu_key] = p.is_enabled === 1;
    });

    // Get default permissions from config
    const defaultPermissions = {};
    Object.entries(sidebarItems).forEach(([key, item]) => {
      // Check if permission exists in database
      if (dbPermissionMap.hasOwnProperty(key)) {
        defaultPermissions[key] = dbPermissionMap[key];
      } else {
        // Use default from config
        if (item.roles.includes('all')) {
          defaultPermissions[key] = true;
        } else {
          // Check if role matches
          const hasAccess = item.roles.some(r => {
            if (r === role) return true;
            if (role.includes('Developer') && r.includes('Developer')) return true;
            if ((role.includes('Operations') || role.includes('Operation')) && 
                (r.includes('Operations') || r.includes('Operation'))) return true;
            return false;
          });
          defaultPermissions[key] = hasAccess;
        }
      }
    });

    return NextResponse.json({ permissions: defaultPermissions });
  } catch (error) {
    console.error('Check menu permissions error:', error);
    // Fallback to default permissions on error
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    
    const defaultPermissions = {};
    Object.entries(sidebarItems).forEach(([key, item]) => {
      if (item.roles.includes('all')) {
        defaultPermissions[key] = true;
      } else {
        const hasAccess = item.roles.some(r => {
          if (r === role) return true;
          if (role?.includes('Developer') && r.includes('Developer')) return true;
          if ((role?.includes('Operations') || role?.includes('Operation')) && 
              (r.includes('Operations') || r.includes('Operation'))) return true;
          return false;
        });
        defaultPermissions[key] = hasAccess;
      }
    });
    
    return NextResponse.json({ permissions: defaultPermissions });
  }
}




