'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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
  Activity,
  Edit,
  Loader2,
  Eye,
  EyeOff,
  Trash2
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import AccessDenied from '@/components/AccessDenied';
import NoData from '@/components/NoData';
import { cn } from '@/lib/utils';

export default function EmployeeViewPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id;
  
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [managers, setManagers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    designation: '',
    joining_date: '',
    salary: '',
    manager_id: '',
    is_active: true
  });
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
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
      fetchUser();
      fetchEmployee();
      fetchStatistics();
      fetchRecentActivity();
      fetchManagers();
    }
  }, [employeeId]);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      if (data.employees) {
        setManagers(data.employees.filter(emp => 
          emp.role !== 'Super Admin' && emp.is_active !== 0 && emp.id !== parseInt(employeeId)
        ));
      }
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  };

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

  const canEdit = user && (
    ['Super Admin', 'Admin', 'HR'].includes(user.role) ||
    (parseInt(employeeId) === user.id)
  );

  const canEditAllFields = user && ['Super Admin', 'Admin', 'HR'].includes(user.role);
  const canEditRoleAndStatus = user && ['Super Admin', 'Admin'].includes(user.role);
  const canEditSalary = user && ['Super Admin', 'Admin', 'HR'].includes(user.role);
  const canDelete = user && ['Super Admin', 'Admin', 'HR'].includes(user.role);

  const handleOpenEdit = () => {
    if (employee) {
      setFormData({
        name: employee.name || '',
        email: employee.email || '',
        password: '',
        role: employee.role || '',
        department: employee.department || '',
        designation: employee.designation || '',
        joining_date: employee.joining_date ? employee.joining_date.split('T')[0] : '',
        salary: employee.salary || '',
        manager_id: employee.manager_id || '',
        is_active: employee.is_active !== 0
      });
      setEditError('');
      setEditSuccess(false);
      setFieldErrors({});
      setShowEditModal(true);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
    }
    setEditError('');
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (formData.password && formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setEditError('');
    setEditSuccess(false);
    
    if (!validateForm()) {
      setEditError('Please fix the errors in the form');
      return;
    }
    
    setSubmitting(true);
    try {
      // Build update payload - only include fields that should be updated
      const updatePayload = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department || null,
        designation: formData.designation || null,
        joining_date: formData.joining_date || null,
        manager_id: formData.manager_id || null,
      };

      // Only include password if it's provided
      if (formData.password) {
        updatePayload.password = formData.password;
      }

      // Only include salary if user has permission (HR, Admin, Super Admin)
      if (canEditSalary && formData.salary) {
        updatePayload.salary = parseFloat(formData.salary);
      }

      // Only include is_active if user has permission (Admin, Super Admin only)
      if (canEditRoleAndStatus) {
        updatePayload.is_active = formData.is_active ? 1 : 0;
      }

      // Only include role if user has permission (Admin, Super Admin only)
      if (canEditRoleAndStatus) {
        updatePayload.role = formData.role;
      }

      const res = await authenticatedFetch(`/api/employees/${employeeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      const data = await res.json();
      if (res.ok) {
        setEditSuccess(true);
        setFieldErrors({});
        setTimeout(() => {
          setShowEditModal(false);
          setEditSuccess(false);
          fetchEmployee(); // Refresh employee data
        }, 1500);
      } else {
        setEditError(data.error || 'Failed to update employee');
      }
    } catch (err) {
      setEditError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (!employee) return;

    setDeleting(true);
    try {
      const res = await authenticatedFetch(`/api/employees/${employeeId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        // Redirect to employees list after successful deletion
        router.push('/dashboard/employees');
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete employee');
        setDeleteDialogOpen(false);
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Network error. Please try again.');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const roles = [
    'Super Admin',
    'Admin',
    'HR',
    'Manager',
    'Employee',
    'Intern',
    'Backend Developer',
    'Frontend Developer',
    'AI/ML Developer',
    'App Developer',
    'Digital Marketing',
    'Logistics',
    'Design & Content Team',
    'Operations Manager',
    'Operations Executive',
    'Operation Specialist',
    'Operations Intern'
  ];

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
        <div className="flex items-center gap-3">
          <Badge className={getStatusBadge(employee.is_active ? 'active' : 'inactive')}>
            {employee.is_active ? 'Active' : 'Inactive'}
          </Badge>
          {canEdit && (
            <Button onClick={handleOpenEdit} className="gap-2">
              <Edit className="h-4 w-4" />
              Edit Employee
            </Button>
          )}
          {canDelete && parseInt(employeeId) !== user?.id && (
            <Button 
              onClick={handleDeleteClick} 
              variant="destructive" 
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Employee
            </Button>
          )}
        </div>
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

      {/* Edit Employee Dialog */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Edit Employee</DialogTitle>
                <DialogDescription className="mt-1 text-base">
                  Update employee information
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleUpdate} className="space-y-6 pt-4">
            {editError && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{editError}</AlertDescription>
              </Alert>
            )}

            {editSuccess && (
              <Alert className="border-green-500 bg-green-50 border-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  Employee updated successfully!
                </AlertDescription>
              </Alert>
            )}

            {/* Personal Information Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 pb-2">
                <User className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Personal Information</h3>
              </div>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_name" className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit_name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleFieldChange('name', e.target.value)}
                    placeholder="John Doe"
                    disabled={submitting}
                    className={cn(
                      "h-11",
                      fieldErrors.name && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.name && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.name}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_email" className="text-sm font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit_email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="john.doe@example.com"
                    disabled={submitting}
                    className={cn(
                      "h-11",
                      fieldErrors.email && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {fieldErrors.email && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit_password" className="text-sm font-medium">
                    New Password (leave blank to keep current)
                  </Label>
                  <div className="relative">
                    <Input
                      id="edit_password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      placeholder="Enter new password (min. 6 characters)"
                      disabled={submitting}
                      className={cn(
                        "h-11 pr-10",
                        fieldErrors.password && "border-destructive focus-visible:ring-destructive"
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                      disabled={submitting}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Professional Information Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 pb-2">
                <Briefcase className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Professional Information</h3>
              </div>
              <Separator className="mb-4" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_role" className="text-sm font-medium">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleFieldChange('role', value)}
                    disabled={submitting || !canEditRoleAndStatus}
                  >
                    <SelectTrigger 
                      id="edit_role" 
                      className={cn(
                        "h-11",
                        fieldErrors.role && "border-destructive focus-visible:ring-destructive"
                      )}
                    >
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map(role => (
                        <SelectItem key={role} value={role}>
                          {role}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {fieldErrors.role && (
                    <p className="text-sm text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldErrors.role}
                    </p>
                  )}
                  {!canEditRoleAndStatus && (
                    <p className="text-xs text-muted-foreground">
                      {user && parseInt(employeeId) === user.id 
                        ? 'You cannot change your own role' 
                        : 'Only Super Admin and Admin can change roles'}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_department" className="text-sm font-medium">
                    Department
                  </Label>
                  <Input
                    id="edit_department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                    placeholder="e.g., Engineering, Marketing"
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_designation" className="text-sm font-medium">
                    Designation
                  </Label>
                  <Input
                    id="edit_designation"
                    type="text"
                    value={formData.designation}
                    onChange={(e) => handleFieldChange('designation', e.target.value)}
                    placeholder="e.g., Senior Developer, Manager"
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit_joining_date" className="text-sm font-medium">
                    Joining Date
                  </Label>
                  <Input
                    id="edit_joining_date"
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => handleFieldChange('joining_date', e.target.value)}
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                {canEditSalary && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_salary" className="text-sm font-medium">
                      Salary
                    </Label>
                    <Input
                      id="edit_salary"
                      type="number"
                      value={formData.salary}
                      onChange={(e) => handleFieldChange('salary', e.target.value)}
                      placeholder="Enter salary"
                      disabled={submitting}
                      className="h-11"
                    />
                  </div>
                )}

                {canEditAllFields && (
                  <div className="space-y-2">
                    <Label htmlFor="edit_manager_id" className="text-sm font-medium">
                      Manager
                    </Label>
                    <Select
                      value={formData.manager_id || "none"}
                      onValueChange={(value) => handleFieldChange('manager_id', value === "none" ? '' : value)}
                      disabled={submitting}
                    >
                      <SelectTrigger id="edit_manager_id" className="h-11">
                        <SelectValue placeholder="Select a manager (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Manager</SelectItem>
                        {managers.map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name} - {emp.role} {emp.department ? `(${emp.department})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {canEditRoleAndStatus && (
                  <div className="space-y-2 md:col-span-2">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="edit_is_active"
                        checked={formData.is_active}
                        onChange={(e) => handleFieldChange('is_active', e.target.checked)}
                        disabled={submitting}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <Label htmlFor="edit_is_active" className="text-sm font-medium">
                        Active Employee
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditModal(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Update Employee
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={handleDeleteCancel}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Delete Employee
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this employee? This will deactivate their account. This action cannot be undone.
            </DialogDescription>
            {employee && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="font-semibold">{employee.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {employee.email}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Role: {employee.role} {employee.department && `• ${employee.department}`}
                </div>
              </div>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Employee
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

