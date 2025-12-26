'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { authenticatedFetch } from '@/lib/auth-client';
import { hasRoleAccess } from '@/lib/roleCheck';
import AccessDenied from '@/components/AccessDenied';
import { Save, Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MenuPermissionsPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState({});
  const [originalPermissions, setOriginalPermissions] = useState({});
  const router = useRouter();

  useEffect(() => {
    fetchUser();
    fetchPermissions();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        if (!hasRoleAccess(data.user.role, ['Super Admin', 'Admin'])) {
          setLoading(false);
          return;
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const res = await authenticatedFetch('/api/menu-permissions');
      const data = await res.json();
      
      if (data.menuItems && data.roles && data.permissions) {
        setMenuItems(data.menuItems);
        setRoles(data.roles);
        setPermissions(data.permissions);
        setOriginalPermissions(JSON.parse(JSON.stringify(data.permissions)));
      }
    } catch (err) {
      console.error('Failed to fetch permissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (menuKey, role, checked) => {
    setPermissions(prev => ({
      ...prev,
      [menuKey]: {
        ...prev[menuKey],
        [role]: checked
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await authenticatedFetch('/api/menu-permissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ permissions }),
      });

      const data = await res.json();
      if (data.success) {
        setOriginalPermissions(JSON.parse(JSON.stringify(permissions)));
        alert('Menu permissions updated successfully!');
      } else {
        alert('Failed to update permissions');
      }
    } catch (err) {
      console.error('Failed to save permissions:', err);
      alert('Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(permissions) !== JSON.stringify(originalPermissions);
  };

  const toggleAllForMenu = (menuKey, checked) => {
    setPermissions(prev => {
      const newPerms = { ...prev };
      roles.forEach(role => {
        newPerms[menuKey] = {
          ...newPerms[menuKey],
          [role]: checked
        };
      });
      return newPerms;
    });
  };

  const toggleAllForRole = (role, checked) => {
    setPermissions(prev => {
      const newPerms = { ...prev };
      menuItems.forEach(item => {
        newPerms[item.key] = {
          ...newPerms[item.key],
          [role]: checked
        };
      });
      return newPerms;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !hasRoleAccess(user.role, ['Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to Super Admin and Admin." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Menu Permissions Management</h1>
          <p className="text-muted-foreground mt-1">
            Control which menu items are visible to different roles
          </p>
        </div>
        <Link href="/dashboard/admin">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Role-Based Menu Access</CardTitle>
            <Button
              onClick={handleSave}
              disabled={!hasChanges() || saving}
              className="gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {menuItems.length === 0 || roles.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No menu items or roles found
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-semibold sticky left-0 bg-white z-10 min-w-[200px]">
                      Menu Item
                    </th>
                    {roles.map(role => (
                      <th
                        key={role}
                        className="text-center p-3 font-semibold min-w-[120px] border-l"
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs">{role}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              const allChecked = menuItems.every(item => 
                                permissions[item.key]?.[role]
                              );
                              toggleAllForRole(role, !allChecked);
                            }}
                          >
                            Toggle All
                          </Button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item, index) => (
                    <tr
                      key={item.key}
                      className={`border-b ${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}`}
                    >
                      <td className="p-3 font-medium sticky left-0 bg-inherit z-10">
                        <div className="flex items-center justify-between">
                          <span>{item.name}</span>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs ml-2"
                            onClick={() => {
                              const allChecked = roles.every(r => 
                                permissions[item.key]?.[r]
                              );
                              toggleAllForMenu(item.key, !allChecked);
                            }}
                          >
                            All
                          </Button>
                        </div>
                      </td>
                      {roles.map(role => (
                        <td
                          key={`${item.key}-${role}`}
                          className="p-3 text-center border-l"
                        >
                          <div className="flex justify-center">
                            <Checkbox
                              checked={permissions[item.key]?.[role] || false}
                              onCheckedChange={(checked) =>
                                handlePermissionChange(item.key, role, checked)
                              }
                            />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>• Check the boxes to grant menu access to specific roles</p>
          <p>• Uncheck to revoke access</p>
          <p>• Use "Toggle All" buttons to quickly select/deselect all items for a role or all roles for an item</p>
          <p>• Changes are saved to the database and will take effect immediately</p>
          <p>• Super Admin always has access to all menu items regardless of these settings</p>
        </CardContent>
      </Card>
    </div>
  );
}

