'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  LogOut,
  Menu,
  X,
  User,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getSidebarItemsForRole } from '@/config/sidebarPermissions';
import { authenticatedFetch, removeAuthToken } from '@/lib/auth-client';

export default function DashboardLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const [menuPermissions, setMenuPermissions] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetchUser();
    // Set up inactivity timer
    let inactivityTimer;
    const resetTimer = () => {
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        handleLogout();
      }, 30 * 60 * 1000); // 30 minutes
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
      clearTimeout(inactivityTimer);
    };
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuOpen && !event.target.closest('.user-menu-container')) {
        setUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [userMenuOpen]);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setCurrentUser(data.user);
        // Fetch menu permissions for the user's role
        fetchMenuPermissions(data.user.role);
      } else {
        // Token is invalid or expired, already cleared by authenticatedFetch
        router.push('/login');
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      router.push('/login');
    }
  };

  const fetchMenuPermissions = async (role) => {
    try {
      const res = await authenticatedFetch(`/api/menu-permissions/check?role=${encodeURIComponent(role)}`);
      const data = await res.json();
      if (data.permissions) {
        setMenuPermissions(data.permissions);
      }
    } catch (err) {
      console.error('Failed to fetch menu permissions:', err);
      // Continue with default permissions
    }
  };

  const handleLogout = async () => {
    try {
      await authenticatedFetch('/api/auth/logout', { method: 'POST' });
      // Clear token from localStorage
      removeAuthToken();
      router.push('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      // Clear token anyway on error
      removeAuthToken();
      router.push('/login');
    }
  };

  // Get navigation items based on user role using the permission system
  // If menuPermissions are available, use them; otherwise fall back to default
  const navItems = currentUser?.role 
    ? getSidebarItemsForRole(currentUser.role, menuPermissions)
    : [];

  // Group items by category
  const groupedItems = navItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});

  // Define category order
  const categoryOrder = [
    'My Workspace',
    'Team',
    'Performance & Goals',
    'HR',
    'Administration',
    'Content Management',
    'Other'
  ];

  // Sort categories according to defined order
  const sortedCategories = Object.keys(groupedItems).sort((a, b) => {
    const indexA = categoryOrder.indexOf(a);
    const indexB = categoryOrder.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b bg-background backdrop-blur-sm shadow-sm">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
          {/* Hamburger Menu Button - Visible on all screens */}
          <Button
            variant="ghost"
            size="icon"
            className="mr-2"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>

          {/* Logo/Brand */}
          <Link href="/dashboard" className="flex items-center gap-2 mr-4 hover:opacity-80 transition-opacity">
            <img 
              src="https://ik.imagekit.io/h7mvzndkk/seller.bharatagrolink.com/New%20Project.jpg?updatedAt=1758957273385" 
              alt="Bharat Agrolink Logo" 
              className="h-8 w-auto object-contain"
            />
            <h1 className="text-lg font-semibold hidden sm:inline-block">
              BharatAgrolink Management System
            </h1>
            <span className="text-lg font-semibold sm:hidden">IM</span>
          </Link>

          {/* Spacer */}
          <div className="flex-1" />

          {/* User Menu */}
          <div className="relative user-menu-container">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2 h-auto py-2 px-3"
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="hidden sm:flex flex-col items-start text-left">
                  <span className="text-sm font-medium leading-tight">{currentUser?.name || 'User'}</span>
                  <span className="text-xs text-muted-foreground leading-tight">
                    {currentUser?.designation || currentUser?.role || 'Employee'}
                  </span>
                </div>
                <ChevronDown className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform",
                  userMenuOpen && "rotate-180"
                )} />
              </div>
            </Button>

            {/* Dropdown Menu */}
            {userMenuOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md border-2 border-border bg-white shadow-2xl z-50">
                <div className="p-2">
                  <div className="px-3 py-2 border-b border-border bg-gray-50 rounded-t-md">
                    <p className="text-sm font-medium text-foreground">{currentUser?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground truncate">{currentUser?.email || ''}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {currentUser?.role === 'Super Admin' ? 'Owner' : currentUser?.role || 'Role'}
                    </p>
                  </div>
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm rounded-md hover:bg-gray-100 text-foreground transition-colors"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    View Profile
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-start gap-2 mt-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "fixed left-0 z-40 w-64 border-r bg-white transform transition-transform duration-200 ease-in-out",
            "top-16 h-[calc(100vh-4rem)]",
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="h-full overflow-y-auto py-4">
            <nav className="space-y-6 px-3">
              {sortedCategories.map((category) => (
                <div key={category} className="space-y-1">
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {category}
                    </h3>
                  </div>
                  {groupedItems[category].map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.key || item.href}
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>
          </div>
        </aside>

        {/* Overlay - Only visible on mobile when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed top-16 left-0 right-0 bottom-0 bg-black/50 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 p-6 lg:p-8 transition-all duration-200",
          sidebarOpen ? "lg:ml-64" : "lg:ml-0"
        )}>
          {children}
        </main>
      </div>
    </div>
  );
}

