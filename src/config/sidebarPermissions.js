// Sidebar navigation items configuration with role-based access control

import {
  LayoutDashboard,
  User,
  Clock,
  Calendar,
  Users,
  CheckSquare,
  BarChart3,
  Package,
  Target,
  Megaphone,
  Globe,
  Video,
  Instagram,
  TrendingUp,
} from 'lucide-react';

// Define all available sidebar items
export const sidebarItems = {
  dashboard: {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: (role) => `/dashboard/${getRolePath(role)}`,
    roles: ['all'], // Available to all roles
  },
  profile: {
    name: 'Profile',
    icon: User,
    href: '/dashboard/profile',
    roles: ['all'],
  },
  attendance: {
    name: 'Attendance',
    icon: Clock,
    href: '/dashboard/attendance',
    roles: ['all'],
  },
  leaves: {
    name: 'Leaves',
    icon: Calendar,
    href: '/dashboard/leaves',
    roles: ['all'],
  },
  employees: {
    name: 'Employees',
    icon: Users,
    href: '/dashboard/employees',
    roles: ['Super Admin', 'Admin', 'HR'],
  },
  tasks: {
    name: 'Tasks',
    icon: CheckSquare,
    href: '/dashboard/tasks',
    roles: ['Super Admin', 'Admin', 'Manager'],
  },
  myTasks: {
    name: 'My Tasks',
    icon: CheckSquare,
    href: '/dashboard/tasks',
    roles: ['Backend Developer', 'Frontend Developer', 'AI/ML Developer', 'App Developer'],
  },
  team: {
    name: 'Team',
    icon: Users,
    href: '/dashboard/team',
    roles: ['Super Admin', 'Admin', 'Manager'],
  },
  kpiKri: {
    name: 'KPI & KRI',
    icon: TrendingUp,
    href: '/dashboard/kpi-kri',
    roles: ['Super Admin', 'Admin', 'Manager', 'HR'],
  },
  // reports: {
  //   name: 'Reports',
  //   icon: BarChart3,
  //   href: '/dashboard/reports',
  //   roles: ['Super Admin', 'Admin', 'HR', 'Manager'],
  // },
  orders: {
    name: 'Orders',
    icon: Package,
    href: '/dashboard/logistics/orders',
    roles: ['Super Admin', 'Admin', 'Logistics'],
  },
  statistics: {
    name: 'Statistics',
    icon: BarChart3,
    href: '/dashboard/logistics/stats',
    roles: ['Super Admin', 'Admin', 'Logistics'],
  },
  leads: {
    name: 'Leads',
    icon: Target,
    href: '/dashboard/marketing/leads',
    roles: ['Super Admin', 'Admin', 'Digital Marketing'],
  },
  ads: {
    name: 'Ads',
    icon: Megaphone,
    href: '/dashboard/marketing/ads',
    roles: ['Super Admin', 'Admin', 'Digital Marketing'],
  },
  traffic: {
    name: 'Traffic',
    icon: Globe,
    href: '/dashboard/marketing/traffic',
    roles: ['Super Admin', 'Admin', 'Digital Marketing'],
  },
  youtube: {
    name: 'YouTube',
    icon: Video,
    href: '/dashboard/design/youtube',
    roles: ['Super Admin', 'Admin', 'Design & Content Team'],
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    href: '/dashboard/design/instagram',
    roles: ['Super Admin', 'Admin', 'Design & Content Team'],
  },
};

// Helper function to get role path
function getRolePath(role) {
  if (role === 'Super Admin' || role === 'Admin') return 'admin';
  if (role === 'HR') return 'hr';
  if (role === 'Manager') return 'manager';
  if (role?.includes('Developer')) return 'developer';
  if (role === 'Logistics') return 'logistics';
  if (role === 'Digital Marketing') return 'marketing';
  if (role === 'Design & Content Team') return 'design';
  return 'dashboard';
}

// Check if a role has access to a sidebar item
export function hasSidebarAccess(userRole, itemRoles) {
  if (!userRole) return false;
  
  // 'all' means accessible to everyone
  if (itemRoles.includes('all')) return true;
  
  // Super Admin has access to everything
  if (userRole === 'Super Admin') return true;
  
  // Check exact match
  if (itemRoles.includes(userRole)) return true;
  
  // Check for Developer roles (partial match)
  if (userRole.includes('Developer')) {
    return itemRoles.some(role => role.includes('Developer'));
  }
  
  return false;
}

// Get sidebar items for a specific role
export function getSidebarItemsForRole(userRole) {
  if (!userRole) return [];
  
  const items = [];
  const seenHrefs = new Set(); // Track seen hrefs to prevent duplicates
  
  Object.entries(sidebarItems).forEach(([key, item]) => {
    if (hasSidebarAccess(userRole, item.roles)) {
      const href = typeof item.href === 'function' ? item.href(userRole) : item.href;
      
      // Skip if we've already added an item with this href
      // This prevents "Tasks" and "My Tasks" from both appearing
      if (seenHrefs.has(href)) {
        return;
      }
      
      seenHrefs.add(href);
      
      items.push({
        key: key, // Unique key for React
        name: item.name,
        icon: item.icon,
        href: href,
      });
    }
  });
  
  return items;
}

// Get all roles in the system
export function getAllRoles() {
  const rolesSet = new Set();
  
  Object.values(sidebarItems).forEach((item) => {
    item.roles.forEach(role => {
      if (role !== 'all') {
        rolesSet.add(role);
      }
    });
  });
  
  return Array.from(rolesSet).sort();
}

// Get sidebar items that a role can access
export function getItemsForRole(role) {
  return Object.entries(sidebarItems)
    .filter(([_, item]) => hasSidebarAccess(role, item.roles))
    .map(([key, item]) => ({
      key,
      ...item,
      href: typeof item.href === 'function' ? item.href(role) : item.href,
    }));
}

