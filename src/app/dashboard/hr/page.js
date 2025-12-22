'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CheckSquare, Calendar, BarChart3 } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';
import { authenticatedFetch } from '@/lib/auth-client';
export default function HRDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalEmployees: 0,
    pendingLeaves: 0,
    activeEmployees: 0
  });

  useEffect(() => {
    fetchUser();
    fetchStats();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        if (!hasRoleAccess(data.user.role, ['HR', 'Super Admin', 'Admin'])) {
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

  const fetchStats = async () => {
    try {
      const [empRes, leaveRes] = await Promise.all([
        authenticatedFetch('/api/employees'),
        authenticatedFetch('/api/leaves?status=pending')
      ]);
      
      const empData = await empRes.json();
      const leaveData = await leaveRes.json();
      
      setStats({
        totalEmployees: empData.employees?.length || 0,
        pendingLeaves: leaveData.leaves?.length || 0,
        activeEmployees: empData.employees?.filter(e => e.is_active)?.length || 0
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !hasRoleAccess(user.role, ['HR', 'Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to HR, Admin, and Super Admin." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">HR Dashboard</h1>
        <p className="text-muted-foreground mt-1">Human Resources Management Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Active Employees</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeEmployees}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Pending Leaves</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingLeaves}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/employees"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5 mb-2" />
              <p className="font-medium">Manage Employees</p>
              <p className="text-sm text-muted-foreground">View and manage employee profiles</p>
            </a>
            <a
              href="/dashboard/leaves"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Calendar className="h-5 w-5 mb-2" />
              <p className="font-medium">Review Leaves</p>
              <p className="text-sm text-muted-foreground">Approve or reject leave requests</p>
            </a>
            <a
              href="/dashboard/reports"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <BarChart3 className="h-5 w-5 mb-2" />
              <p className="font-medium">View Reports</p>
              <p className="text-sm text-muted-foreground">Access HR reports and analytics</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


