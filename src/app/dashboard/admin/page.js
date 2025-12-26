'use client';

import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DeadlineTimer from '@/components/DeadlineTimer';
import { authenticatedFetch } from '@/lib/auth-client';
import { 
  CheckSquare, 
  Clock, 
  AlertCircle, 
  ArrowRight, 
  Users, 
  Activity, 
  CheckCircle2, 
  CalendarClock,
  UserCog,
  ListTodo,
  FileText,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import KPICard from '@/components/ui/kpi-card';
import KRIAlert from '@/components/ui/kri-alert';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    activeTasks: 0,
    completedTasks: 0,
    pendingLeaves: 0
  });
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiMetrics, setKpiMetrics] = useState([]);
  const [kriMetrics, setKriMetrics] = useState([]);
  const [kpiDefinitions, setKpiDefinitions] = useState([]);
  const [kriDefinitions, setKriDefinitions] = useState([]);

  useEffect(() => {
    fetchDashboardData();
    fetchKPIMetrics();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch employees
      const empRes = await authenticatedFetch('/api/employees');
      const empData = await empRes.json();
      const totalEmployees = empData.employees?.length || 0;

      // Fetch all tasks (no status filter to ensure we get all tasks for accurate counting)
      const taskRes = await authenticatedFetch('/api/tasks');
      const taskData = await taskRes.json();
      const allTasks = Array.isArray(taskData.tasks) ? taskData.tasks : [];
      setTasks(allTasks);
      
      // Count tasks by status - ensure we only count tasks with valid status values
      const pendingTasks = allTasks.filter(t => t?.status === 'pending').length;
      // Active Tasks includes both pending and in_progress tasks (any task that's not completed or cancelled)
      const activeTasks = allTasks.filter(t => t?.status === 'pending' || t?.status === 'in_progress').length;
      const completedTasks = allTasks.filter(t => t?.status === 'completed').length;
      const cancelledTasks = allTasks.filter(t => t?.status === 'cancelled').length;

      // Fetch all leaves first, then filter for pending to ensure accurate count
      // This ensures we get all leaves and can count pending ones correctly
      const leaveRes = await authenticatedFetch('/api/leaves');
      const leaveData = await leaveRes.json();
      const allLeaves = Array.isArray(leaveData.leaves) ? leaveData.leaves : [];
      const pendingLeaves = allLeaves.filter(l => l?.status === 'pending').length;

      setStats({
        totalEmployees,
        pendingTasks,
        activeTasks,
        completedTasks,
        cancelledTasks,
        pendingLeaves
      });
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKPIMetrics = async () => {
    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];

      const [kpiDefRes, kriDefRes, kpiMetricsRes, kriMetricsRes] = await Promise.all([
        authenticatedFetch('/api/kpi/definitions'),
        authenticatedFetch('/api/kri/definitions'),
        authenticatedFetch(`/api/kpi/metrics?period_type=monthly&start_date=${startOfMonth}&end_date=${endOfMonth}&limit=5`),
        authenticatedFetch(`/api/kri/metrics?period_type=monthly&start_date=${startOfMonth}&end_date=${endOfMonth}&limit=4`)
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const taskChartData = {
    labels: ['Pending', 'In Progress', 'Completed', 'Cancelled'],
    datasets: [{
      label: 'Tasks',
      data: [
        stats.pendingTasks || 0,
        stats.activeTasks,
        stats.completedTasks,
        stats.cancelledTasks || 0
      ],
      backgroundColor: [
        'rgba(255, 206, 86, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)'
      ]
    }]
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Employees</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</p>
            </div>
            <div className="bg-indigo-100 rounded-full p-3">
              <Users className="h-6 w-6 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeTasks}</p>
            </div>
            <div className="bg-blue-100 rounded-full p-3">
              <Activity className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed Tasks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completedTasks}</p>
            </div>
            <div className="bg-green-100 rounded-full p-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Leaves</p>
              <p className="text-2xl font-bold text-gray-900">{stats.pendingLeaves}</p>
            </div>
            <div className="bg-yellow-100 rounded-full p-3">
              <CalendarClock className="h-6 w-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      {/* KRI Alerts Section */}
      {kriMetrics.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-semibold">Key Risk Indicators</h2>
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

      {/* KPI Summary Section */}
      {kpiMetrics.length > 0 && (
        <div className="space-y-4 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              <h2 className="text-xl font-semibold">Key Performance Indicators</h2>
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Task Status Distribution</h2>
          <Doughnut data={taskChartData} />
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              href="/dashboard/employees"
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-indigo-100 rounded-lg p-2 group-hover:bg-indigo-200 transition-colors">
                <UserCog className="h-5 w-5 text-indigo-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium block mb-1">Manage Employees</span>
                <p className="text-sm text-gray-600">View and manage employee profiles</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
            <Link
              href="/dashboard/tasks"
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-blue-100 rounded-lg p-2 group-hover:bg-blue-200 transition-colors">
                <ListTodo className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium block mb-1">View All Tasks</span>
                <p className="text-sm text-gray-600">Monitor task progress and assignments</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
            <Link
              href="/dashboard/leaves"
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-yellow-100 rounded-lg p-2 group-hover:bg-yellow-200 transition-colors">
                <FileText className="h-5 w-5 text-yellow-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium block mb-1">Review Leaves</span>
                <p className="text-sm text-gray-600">Approve or reject leave requests</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
            <Link
              href="/dashboard/admin/menu-permissions"
              className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="bg-purple-100 rounded-lg p-2 group-hover:bg-purple-200 transition-colors">
                <ListTodo className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <span className="font-medium block mb-1">Menu Permissions</span>
                <p className="text-sm text-gray-600">Manage menu visibility for roles</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Tasks with Timers */}
      <Card className="mt-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              <CardTitle>Recent Tasks</CardTitle>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/tasks">
                View All
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No tasks found</p>
          ) : (
            <div className="space-y-3">
              {tasks
                .filter(t => t.status !== 'completed' && t.status !== 'cancelled')
                .slice(0, 5)
                .map((task) => (
                  <Link
                    key={task.id}
                    href={`/dashboard/tasks/${task.id}`}
                    className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm mb-1 truncate">{task.title}</h3>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={task.priority === 'critical' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'}>
                            {task.priority}
                          </Badge>
                          <Badge variant={task.status === 'in_progress' ? 'default' : 'outline'}>
                            {task.status.replace('_', ' ')}
                          </Badge>
                          {task.subtasks && task.subtasks.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <div className="mt-2">
                          <div className="w-full bg-secondary rounded-full h-1.5">
                            <div
                              className="bg-primary h-1.5 rounded-full transition-all"
                              style={{ width: `${task.progress || 0}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{task.progress || 0}% complete</p>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {task.deadline ? (
                          <DeadlineTimer deadline={task.deadline} />
                        ) : (
                          <Badge variant="outline" className="gap-1.5">
                            <Clock className="h-3 w-3" />
                            <span>No deadline</span>
                          </Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

