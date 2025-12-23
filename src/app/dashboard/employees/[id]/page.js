'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Mail, 
  Briefcase, 
  Building2, 
  Calendar, 
  DollarSign,
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar as CalendarIcon,
  TrendingUp,
  Activity
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import AccessDenied from '@/components/AccessDenied';
import NoData from '@/components/NoData';

export default function EmployeeViewPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id;
  
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    attendance: { total: 0, present: 0, absent: 0 },
    leaves: { total: 0, pending: 0, approved: 0, rejected: 0 },
    tasks: { total: 0, completed: 0, inProgress: 0, pending: 0 }
  });
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [recentLeaves, setRecentLeaves] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
      fetchStatistics();
      fetchRecentActivity();
    }
  }, [employeeId]);

  const fetchEmployee = async () => {
    try {
      const res = await authenticatedFetch(`/api/employees/${employeeId}`);
      const data = await res.json();
      
      if (res.ok) {
        setEmployee(data.employee);
      } else {
        setError(data.error || 'Failed to fetch employee');
      }
    } catch (err) {
      console.error('Failed to fetch employee:', err);
      setError('Failed to load employee information');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      // Fetch attendance stats
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0];
      
      const [attRes, leaveRes, taskRes] = await Promise.all([
        authenticatedFetch(`/api/attendance?user_id=${employeeId}&start_date=${startOfMonth}&end_date=${endOfMonth}`),
        authenticatedFetch(`/api/leaves?user_id=${employeeId}`),
        authenticatedFetch(`/api/tasks?assigned_to=${employeeId}`)
      ]);

      const attData = await attRes.json();
      const leaveData = await leaveRes.json();
      const taskData = await taskRes.json();

      // Calculate attendance stats
      const attendanceRecords = attData.records || [];
      const present = attendanceRecords.filter(a => a.status === 'present').length;
      const absent = attendanceRecords.filter(a => a.status === 'absent').length;

      // Calculate leave stats
      const leaves = leaveData.leaves || [];
      const pending = leaves.filter(l => l.status === 'pending').length;
      const approved = leaves.filter(l => l.status === 'approved').length;
      const rejected = leaves.filter(l => l.status === 'rejected').length;

      // Calculate task stats (already filtered by assigned_to parameter)
      const userTasks = taskData.tasks || [];
      const completed = userTasks.filter(t => t.status === 'completed').length;
      const inProgress = userTasks.filter(t => t.status === 'in_progress').length;
      const pendingTasks = userTasks.filter(t => t.status === 'pending').length;

      setStats({
        attendance: {
          total: attendanceRecords.length,
          present,
          absent
        },
        leaves: {
          total: leaves.length,
          pending,
          approved,
          rejected
        },
        tasks: {
          total: userTasks.length,
          completed,
          inProgress,
          pending: pendingTasks
        }
      });
    } catch (err) {
      console.error('Failed to fetch statistics:', err);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const [attRes, leaveRes] = await Promise.all([
        authenticatedFetch(`/api/attendance?user_id=${employeeId}`),
        authenticatedFetch(`/api/leaves?user_id=${employeeId}`)
      ]);

      const attData = await attRes.json();
      const leaveData = await leaveRes.json();

      setRecentAttendance((attData.records || []).slice(0, 5));
      setRecentLeaves((leaveData.leaves || []).slice(0, 5));
    } catch (err) {
      console.error('Failed to fetch recent activity:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const variants = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-red-100 text-red-800',
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      present: 'bg-green-100 text-green-800',
      absent: 'bg-red-100 text-red-800'
    };
    return variants[status] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && error.includes('Forbidden')) {
    return <AccessDenied message="You do not have permission to view this employee." />;
  }

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900">{error || 'Employee not found'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => router.back()} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <User className="h-8 w-8" />
              {employee.name}
            </h1>
            <p className="text-muted-foreground mt-1">Employee Details</p>
          </div>
        </div>
        <Badge className={getStatusBadge(employee.is_active ? 'active' : 'inactive')}>
          {employee.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </div>

      {/* Basic Information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">{employee.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </p>
              <p className="font-medium">{employee.email}</p>
            </div>
            {employee.joining_date && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Joining Date
                </p>
                <p className="font-medium">{formatDate(employee.joining_date)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Role</p>
              <Badge variant="outline" className="mt-1">{employee.role}</Badge>
            </div>
            {employee.department && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Department
                </p>
                <p className="font-medium">{employee.department}</p>
              </div>
            )}
            {employee.designation && (
              <div>
                <p className="text-sm text-muted-foreground">Designation</p>
                <p className="font-medium">{employee.designation}</p>
              </div>
            )}
            {employee.salary && (
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Salary
                </p>
                <p className="font-medium">{formatCurrency(employee.salary)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5" />
              Attendance (This Month)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Days</span>
                <span className="font-bold">{stats.attendance.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Present</span>
                <span className="font-bold text-green-600">{stats.attendance.present}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Absent</span>
                <span className="font-bold text-red-600">{stats.attendance.absent}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarIcon className="h-5 w-5" />
              Leaves
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Requests</span>
                <span className="font-bold">{stats.leaves.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Approved</span>
                <span className="font-bold text-green-600">{stats.leaves.approved}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-bold text-yellow-600">{stats.leaves.pending}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Rejected</span>
                <span className="font-bold text-red-600">{stats.leaves.rejected}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-5 w-5" />
              Tasks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Tasks</span>
                <span className="font-bold">{stats.tasks.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-bold text-green-600">{stats.tasks.completed}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">In Progress</span>
                <span className="font-bold text-blue-600">{stats.tasks.inProgress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-bold text-yellow-600">{stats.tasks.pending}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentAttendance.length === 0 ? (
              <NoData title="No attendance records" description="No recent attendance records found." />
            ) : (
              <div className="space-y-3">
                {recentAttendance.map((record) => (
                  <div key={record.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{formatDate(record.date)}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.login_time && new Date(record.login_time).toLocaleTimeString()}
                        {record.logout_time && ` - ${new Date(record.logout_time).toLocaleTimeString()}`}
                      </p>
                      {record.total_hours && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {record.total_hours} hours
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusBadge(record.status)}>
                      {record.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Recent Leave Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentLeaves.length === 0 ? (
              <NoData title="No leave requests" description="No recent leave requests found." />
            ) : (
              <div className="space-y-3">
                {recentLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">
                        {formatDate(leave.start_date)} - {formatDate(leave.end_date)}
                      </p>
                      <p className="text-sm text-muted-foreground capitalize">
                        {leave.leave_type} • {leave.days || 0} day(s)
                      </p>
                      {leave.reason && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {leave.reason}
                        </p>
                      )}
                    </div>
                    <Badge className={getStatusBadge(leave.status)}>
                      {leave.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

