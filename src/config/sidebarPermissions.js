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
  FileText,
  Settings,
  Bell,
  Trophy,
  Award,
  Cake,
  FolderOpen,
} from 'lucide-react';

// Define all available sidebar items
export const sidebarItems = {
  dashboard: {
    name: 'Dashboard',
    icon: LayoutDashboard,
    href: (role) => `/dashboard/${getRolePath(role)}`,
    roles: ['all'], // Available to all roles
    category: 'My Workspace',
  },
  profile: {
    name: 'Profile',
    icon: User,
    href: '/dashboard/profile',
    roles: ['all'],
    category: 'My Workspace',
  },
  // attendance: {
  //   name: 'Attendance',
  //   icon: Clock,
  //   href: '/dashboard/attendance',
  //   roles: ['all'],
  //   category: 'HR',
  // },
  attendancefiles: {
    name: 'Attendance Files',
    icon: Clock,
    href: '/dashboard/attendance-files',
    roles: ['Super Admin', 'Admin', 'HR'],
    category: 'HR',
  },
  employeeDocuments: {
    name: 'Employee Documents',
    icon: FolderOpen,
    href: '/dashboard/employee-documents',
    roles: ['Super Admin', 'Admin', 'HR'],
    category: 'HR',
  },
  leaves: {
    name: 'Leaves',
    icon: Calendar,
    href: '/dashboard/leaves',
    roles: ['all'],
    category: 'HR',
  },
  employees: {
    name: 'Employees',
    icon: Users,
    href: '/dashboard/employees',
    roles: ['Super Admin', 'Admin', 'HR'],
    category: 'HR',
  },
  tasks: {
    name: 'Tasks',
    icon: CheckSquare,
    href: '/dashboard/tasks',
    roles: ['Super Admin', 'Admin', 'Manager'],
    category: 'My Workspace',
  },
  myTasks: {
    name: 'My Tasks',
    icon: CheckSquare,
    href: '/dashboard/tasks',
    roles: ['Backend Developer', 'Frontend Developer', 'AI/ML Developer', 'App Developer', 'Operations Manager', 'Operations Executive', 'Operation Specialist', 'Operations Intern', 'Design & Content Team'],
    category: 'My Workspace',
  },
  team: {
    name: 'Team',
    icon: Users,
    href: '/dashboard/team',
    roles: ['Super Admin', 'Admin', 'Manager'],
    category: 'HR',
  },
  // kpiKri: {
  //   name: 'KPI & KRI',
  //   icon: TrendingUp,
  //   href: '/dashboard/kpi-kri',
  //   roles: ['Super Admin', 'Admin', 'Manager', 'HR'],
  //   category: 'Performance & Goals',
  // },
  kra: {
    name: 'Key Result Areas',
    icon: Target,
    href: '/dashboard/kra',
    roles: ['all'], // Available to all roles
    category: 'Performance & Goals',
  },
  manageKra: {
    name: 'Manage KRA',
    icon: Target,
    href: '/dashboard/admin/kra',
    roles: ['Super Admin', 'Admin'],
    category: 'Performance & Goals',
  },
  kraScores: {
    name: 'KRA Scores',
    icon: TrendingUp,
    href: '/dashboard/kra/scores',
    roles: ['Super Admin', 'Admin', 'HR'],
    category: 'Performance & Goals',
  },
  workLogs: {
    name: 'Daily Work Logs',
    icon: FileText,
    href: '/dashboard/work-logs',
    roles: ['all'], // Available to all roles
    category: 'My Workspace',
  },
  // reports: {
  //   name: 'Reports',
  //   icon: BarChart3,
  //   href: '/dashboard/reports',
  //   roles: ['Super Admin', 'Admin', 'HR', 'Manager'],
  // },
  // orders: {
  //   name: 'Orders',
  //   icon: Package,
  //   href: '/dashboard/logistics/orders',
  //   roles: ['Super Admin', 'Admin', 'Logistics'],
  // },
  // statistics: {
  //   name: 'Statistics',
  //   icon: BarChart3,
  //   href: '/dashboard/logistics/stats',
  //   roles: ['Super Admin', 'Admin', 'Logistics'],
  // },
  // leads: {
  //   name: 'Leads',
  //   icon: Target,
  //   href: '/dashboard/marketing/leads',
  //   roles: ['Super Admin', 'Admin', 'Digital Marketing'],
  // },
  // ads: {
  //   name: 'Ads',
  //   icon: Megaphone,
  //   href: '/dashboard/marketing/ads',
  //   roles: ['Super Admin', 'Admin', 'Digital Marketing'],
  // },
  // traffic: {
  //   name: 'Traffic',
  //   icon: Globe,
  //   href: '/dashboard/marketing/traffic',
  //   roles: ['Super Admin', 'Admin', 'Digital Marketing'],
  // },
  youtube: {
    name: 'YouTube',
    icon: Video,
    href: '/dashboard/design/youtube',
    roles: ['Super Admin', 'Admin', 'Design & Content Team'],
    category: 'Content Management',
  },
  instagram: {
    name: 'Instagram',
    icon: Instagram,
    href: '/dashboard/design/instagram',
    roles: ['Super Admin', 'Admin', 'Design & Content Team'],
    category: 'Content Management',
  },
  notifications: {
    name: 'Notifications',
    icon: Bell,
    href: '/dashboard/notifications',
    roles: ['all'], // Available to all roles
    category: 'My Workspace',
  },
  calendar: {
    name: 'Calendar',
    icon: Calendar,
    href: '/dashboard/calendar',
    roles: ['all'], // Available to all roles
    category: 'My Workspace',
  },
  menuPermissions: {
    name: 'Menu Permissions Management',
    icon: Settings,
    href: '/dashboard/admin/menu-permissions',
    roles: ['Super Admin'],
    category: 'Administration',
  },
  topEmployees: {
    name: 'Top Employees',
    icon: Trophy,
    href: '/dashboard/top-employees',
    roles: ['Super Admin', 'Admin', 'Manager', 'HR'],
    category: 'Performance & Goals',
  },
  employeeRatings: {
    name: 'Employee Ratings',
    icon: Award,
    href: '/dashboard/employee-ratings',
    roles: ['Super Admin', 'Admin', 'Manager', 'HR'],
    category: 'Performance & Goals',
  },
  payslips: {
    name: 'Payslips',
    icon: FileText,
    href: '/dashboard/payslips',
    roles: ['Super Admin', 'Admin', 'Manager', 'HR'],
    category: 'HR',
  },
  birthdayManagement: {
    name: 'Birthday Management',
    icon: Cake,
    href: '/dashboard/birthday-management',
    roles: ['Super Admin', 'Admin', 'HR'],
    category: 'HR',
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
  if (role?.includes('Operations')) return 'operations';
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
  
  // Check for Operations roles (partial match)
  if (userRole.includes('Operations') || userRole.includes('Operation')) {
    return itemRoles.some(role => role.includes('Operations') || role.includes('Operation'));
  }
  
  // Check for Design & Content Team
  if (userRole === 'Design & Content Team') {
    return itemRoles.includes('Design & Content Team');
  }
  
  return false;
}

// Get sidebar items for a specific role
// menuPermissions: optional object with menu_key -> boolean mapping from database
export function getSidebarItemsForRole(userRole, menuPermissions = null) {
  if (!userRole) return [];
  
  const items = [];
  const seenHrefs = new Set(); // Track seen hrefs to prevent duplicates
  
  Object.entries(sidebarItems).forEach(([key, item]) => {
    // Check database permissions first if available
    let hasAccess = false;
    if (menuPermissions && menuPermissions.hasOwnProperty(key)) {
      hasAccess = menuPermissions[key] === true;
    } else {
      // Fall back to default permission check
      hasAccess = hasSidebarAccess(userRole, item.roles);
    }
    
    if (hasAccess) {
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
        category: item.category || 'Other', // Include category
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

