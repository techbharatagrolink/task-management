'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Users, CheckSquare, BarChart3, Target, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';
import KPICard from '@/components/ui/kpi-card';
import KRIAlert from '@/components/ui/kri-alert';

import { authenticatedFetch } from '@/lib/auth-client';
export default function ManagerDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    teamMembers: 0,
    activeTasks: 0,
    completedTasks: 0
  });
  const [kpiMetrics, setKpiMetrics] = useState([]);
  const [kriMetrics, setKriMetrics] = useState([]);
  const [kpiDefinitions, setKpiDefinitions] = useState([]);
  const [kriDefinitions, setKriDefinitions] = useState([]);

  useEffect(() => {
    fetchUser();
    fetchStats();
    fetchKPIMetrics();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        if (!hasRoleAccess(data.user.role, ['Manager', 'Super Admin', 'Admin'])) {
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch team members and tasks in parallel
      const [empRes, taskRes] = await Promise.all([
        authenticatedFetch('/api/employees'),
        authenticatedFetch('/api/tasks')
      ]);
      
      const empData = await empRes.json();
      const taskData = await taskRes.json();
      
      // Get team members count (employees who report to this manager)
      const teamMembers = Array.isArray(empData.employees) ? empData.employees.length : 0;
      
      // Get all tasks (API already filters for manager - tasks they created, assigned to them, or assigned to their team)
      const allTasks = Array.isArray(taskData.tasks) ? taskData.tasks : [];
      
      // Active Tasks includes both pending and in_progress tasks
      const activeTasks = allTasks.filter(t => t?.status === 'pending' || t?.status === 'in_progress').length;
      const completedTasks = allTasks.filter(t => t?.status === 'completed').length;
      
      setStats({
        teamMembers,
        activeTasks,
        completedTasks
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchKPIMetrics = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      // Get user's department for team-level metrics
      const userRes = await authenticatedFetch('/api/auth/check');
      const userData = await userRes.json();
      const department = userData.user?.department;

      const params = new URLSearchParams({
        period_type: 'monthly',
        start_date: startOfMonth,
        end_date: endOfMonth,
        limit: '5',
        ...(department && { department: department })
      });

      const [kpiDefRes, kriDefRes, kpiMetricsRes, kriMetricsRes] = await Promise.all([
        authenticatedFetch('/api/kpi/definitions'),
        authenticatedFetch('/api/kri/definitions'),
        authenticatedFetch(`/api/kpi/metrics?${params.toString()}`),
        authenticatedFetch(`/api/kri/metrics?${params.toString()}`)
      ]);

      const kpiDefData = await kpiDefRes.json();
      const kriDefData = await kriDefRes.json();
      const kpiMetricsData = await kpiMetricsRes.json();
      const kriMetricsData = await kriMetricsRes.json();

      setKpiDefinitions(kpiDefData.definitions || []);
      setKriDefinitions(kriDefData.definitions || []);
      setKpiMetrics(kpiMetricsData.metrics || []);
      setKriMetrics(kriMetricsData.metrics || []);
    } catch (err) {
      console.error('Failed to fetch KPI/KRI metrics:', err);
    }
  };

  const getLatestMetricForKPI = (kpiId) => {
    return kpiMetrics.find(m => m.kpi_id === kpiId) || null;
  };

  const getLatestMetricForKRI = (kriId) => {
    return kriMetrics.find(m => m.kri_id === kriId) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !hasRoleAccess(user.role, ['Manager', 'Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to Managers, Admin, and Super Admin." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Manager Dashboard</h1>
        <p className="text-muted-foreground mt-1">Team Management Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Team Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teamMembers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeTasks}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Completed Tasks</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team KPI/KRI Summary */}
      {(kpiMetrics.length > 0 || kriMetrics.length > 0) && (
        <div className="space-y-4">
          {kriMetrics.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h2 className="text-xl font-semibold">Team Risk Indicators</h2>
                </div>
                <Link href="/dashboard/kpi-kri">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {kriDefinitions
                  .filter(kri => kri.is_active)
                  .slice(0, 4)
                  .map(kri => {
                    const metric = getLatestMetricForKRI(kri.id);
                    return metric ? (
                      <KRIAlert key={kri.id} kri={kri} metric={metric} />
                    ) : null;
                  })}
              </div>
            </div>
          )}

          {kpiMetrics.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                  <h2 className="text-xl font-semibold">Team Performance Indicators</h2>
                </div>
                <Link href="/dashboard/kpi-kri">
                  <Button variant="outline" size="sm">
                    View All
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {kpiDefinitions
                  .filter(kpi => kpi.is_active)
                  .slice(0, 3)
                  .map(kpi => {
                    const metric = getLatestMetricForKPI(kpi.id);
                    return metric ? (
                      <KPICard key={kpi.id} kpi={kpi} metric={metric} />
                    ) : null;
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/team"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5 mb-2" />
              <p className="font-medium">Manage Team</p>
              <p className="text-sm text-muted-foreground">View and manage your team members</p>
            </a>
            <a
              href="/dashboard/tasks"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <CheckSquare className="h-5 w-5 mb-2" />
              <p className="font-medium">View Tasks</p>
              <p className="text-sm text-muted-foreground">Monitor task progress and assignments</p>
            </a>
            <a
              href="/dashboard/reports"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <BarChart3 className="h-5 w-5 mb-2" />
              <p className="font-medium">View Reports</p>
              <p className="text-sm text-muted-foreground">Access team performance reports</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


