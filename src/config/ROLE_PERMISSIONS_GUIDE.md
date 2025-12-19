# Role-Based Sidebar Access Control Guide

This document explains how to manage role-based access control for sidebar navigation items.

## Overview

The sidebar navigation system uses a centralized configuration file (`sidebarPermissions.js`) that defines which sidebar items are accessible to which roles. This makes it easy to manage permissions without modifying the layout component.

## File Structure

- **`src/config/sidebarPermissions.js`** - Main configuration file containing all sidebar items and their role permissions
- **`src/components/DashboardLayout.js`** - Uses the configuration to render sidebar items based on user role

## How It Works

1. All sidebar items are defined in `sidebarPermissions.js` with their required roles
2. The `getSidebarItemsForRole()` function filters items based on the user's role
3. The DashboardLayout component automatically displays only the items the user has access to

## Adding a New Sidebar Item

To add a new sidebar item, edit `src/config/sidebarPermissions.js`:

```javascript
export const sidebarItems = {
  // ... existing items ...
  
  newItem: {
    name: 'New Item Name',
    icon: YourIcon, // Import from lucide-react
    href: '/dashboard/new-item',
    roles: ['Super Admin', 'Admin', 'Your Role'], // Roles that can access this
  },
};
```

## Setting Role Permissions

Each sidebar item has a `roles` array that specifies which roles can access it:

- **`['all']`** - Accessible to all roles (e.g., Dashboard, Profile, Attendance, Leaves)
- **`['Super Admin', 'Admin']`** - Only Super Admin and Admin can access
- **`['Super Admin', 'Admin', 'HR']`** - Multiple specific roles
- **`['Backend Developer', 'Frontend Developer']`** - Developer roles (handled automatically)

### Special Rules

1. **Super Admin** - Has access to ALL sidebar items automatically
2. **Developer Roles** - If a role contains "Developer", it will match any item with roles containing "Developer"
3. **'all'** - Special keyword that grants access to everyone

## Available Roles

- Super Admin
- Admin
- HR
- Manager
- Backend Developer
- Frontend Developer
- AI/ML Developer
- App Developer
- Digital Marketing
- Logistics
- Design & Content Team

## Example: Modifying Permissions

To allow HR to access Tasks:

```javascript
tasks: {
  name: 'Tasks',
  icon: CheckSquare,
  href: '/dashboard/tasks',
  roles: ['Super Admin', 'Admin', 'Manager', 'HR'], // Added 'HR'
},
```

## Functions Available

### `getSidebarItemsForRole(userRole)`
Returns an array of sidebar items accessible to the specified role.

```javascript
const items = getSidebarItemsForRole('HR');
// Returns: Dashboard, Profile, Attendance, Leaves, Employees, Reports
```

### `hasSidebarAccess(userRole, itemRoles)`
Checks if a role has access to specific item roles.

```javascript
hasSidebarAccess('HR', ['Super Admin', 'Admin', 'HR']); // Returns: true
hasSidebarAccess('Manager', ['Super Admin', 'Admin', 'HR']); // Returns: false
```

### `getAllRoles()`
Returns all unique roles defined in the system.

### `getItemsForRole(role)`
Returns all items accessible to a role with full item details.

## Best Practices

1. **Always include 'Super Admin'** in role arrays (though it's not required - Super Admin gets access automatically)
2. **Use 'all'** for common items like Dashboard, Profile, Attendance, Leaves
3. **Group similar roles** together (e.g., all Developer roles)
4. **Test permissions** after making changes
5. **Document new roles** in this file

## Troubleshooting

### Item not showing in sidebar?
1. Check if the role is included in the item's `roles` array
2. Verify the user's role matches exactly (case-sensitive)
3. Check browser console for errors

### Need to add a new role?
1. Add the role to relevant sidebar items' `roles` arrays
2. Update the `getRolePath()` function if needed for dashboard routing
3. Test with a user having that role

## Security Note

⚠️ **Important**: This is client-side permission filtering. Always verify permissions on the server-side API routes as well. Client-side filtering is for UX only - it doesn't provide security.


