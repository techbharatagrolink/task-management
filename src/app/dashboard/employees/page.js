'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  Briefcase, 
  Building2, 
  Award, 
  Calendar, 
  Loader2,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { authenticatedFetch } from '@/lib/auth-client';
export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: '',
    department: '',
    designation: '',
    joining_date: '',
    salary: '',
    manager_id: ''
  });
  const [managers, setManagers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUser();
    fetchEmployees();
    fetchManagers();
  }, []);

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
      // Fetch all employees for the manager dropdown (any user can be assigned as manager)
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      if (data.employees) {
        // Filter to show only active employees, excluding Super Admin
        setManagers(data.employees.filter(emp => 
          emp.role !== 'Super Admin' && emp.is_active !== 0
        ));
      }
    } catch (err) {
      console.error('Failed to fetch employees for manager selection:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      if (data.employees) {
        setEmployees(data.employees);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
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
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (!formData.role) {
      errors.role = 'Role is required';
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    
    if (!validateForm()) {
      setError('Please fix the errors in the form');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await authenticatedFetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setFieldErrors({});
        setTimeout(() => {
          setShowCreateModal(false);
          setSuccess(false);
          setFormData({
            name: '',
            email: '',
            password: '',
            role: '',
            department: '',
            designation: '',
            joining_date: '',
            salary: '',
            manager_id: ''
          });
          fetchEmployees();
        }, 1500);
      } else {
        setError(data.error || 'Failed to create employee');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    if (fieldErrors[field]) {
      setFieldErrors({ ...fieldErrors, [field]: '' });
    }
    setError('');
  };

  const handleClose = () => {
    if (!submitting) {
      setShowCreateModal(false);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: '',
        department: '',
        designation: '',
        joining_date: '',
        salary: ''
      });
      setError('');
      setFieldErrors({});
      setSuccess(false);
    }
  };

  const handleDeleteClick = (employee) => {
    setEmployeeToDelete(employee);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setEmployeeToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!employeeToDelete) return;

    setDeleting(true);
    try {
      const res = await authenticatedFetch(`/api/employees/${employeeToDelete.id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setDeleteDialogOpen(false);
        setEmployeeToDelete(null);
        fetchEmployees(); // Refresh the list
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

  const canDelete = user && ['Super Admin', 'Admin', 'HR'].includes(user.role);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Employees</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your team members and their information
          </p>
        </div>
        {user && ['Super Admin', 'Admin', 'HR'].includes(user.role) && (
          <Button
            onClick={() => setShowCreateModal(true)}
            className="gap-2"
            size="lg"
          >
            <UserPlus className="h-4 w-4" />
            Add Employee
          </Button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manager
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {employees.map((emp) => (
              <tr key={emp.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-medium">
                        {emp.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{emp.name}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {emp.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {emp.role}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {emp.department || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {emp.manager_name || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    emp.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {emp.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/dashboard/employees/${emp.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      View
                    </Link>
                    {canDelete && emp.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteClick(emp)}
                        className="text-red-600 hover:text-red-900 flex items-center gap-1"
                        title="Delete employee"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Employee Dialog */}
      <Dialog open={showCreateModal} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Create New Employee</DialogTitle>
                <DialogDescription className="mt-1 text-base">
                  Add a new team member to your organization
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-6 pt-4">
            {error && (
              <Alert variant="destructive" className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-500 bg-green-50 border-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  Employee created successfully!
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
                  <Label htmlFor="name" className="text-sm font-medium">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
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
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="email"
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
                  <Label htmlFor="password" className="text-sm font-medium">
                    Password <span className="text-destructive">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      placeholder="Enter secure password (min. 6 characters)"
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
                  <Label htmlFor="role" className="text-sm font-medium">
                    Role <span className="text-destructive">*</span>
                  </Label>
                  <Select
                    value={formData.role}
                    onValueChange={(value) => handleFieldChange('role', value)}
                    disabled={submitting}
                  >
                    <SelectTrigger 
                      id="role" 
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-medium">
                    Department
                  </Label>
                  <Input
                    id="department"
                    type="text"
                    value={formData.department}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                    placeholder="e.g., Engineering, Marketing"
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="designation" className="text-sm font-medium">
                    Designation
                  </Label>
                  <Input
                    id="designation"
                    type="text"
                    value={formData.designation}
                    onChange={(e) => handleFieldChange('designation', e.target.value)}
                    placeholder="e.g., Senior Developer, Manager"
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="manager_id" className="text-sm font-medium">
                    Manager
                  </Label>
                  <Select
                    value={formData.manager_id || "none"}
                    onValueChange={(value) => handleFieldChange('manager_id', value === "none" ? '' : value)}
                    disabled={submitting}
                  >
                    <SelectTrigger id="manager_id" className="h-11">
                      <SelectValue placeholder="Select a manager (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Manager</SelectItem>
                      {managers.map(employee => (
                        <SelectItem key={employee.id} value={employee.id.toString()}>
                          {employee.name} - {employee.role} {employee.department ? `(${employee.department})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="joining_date" className="text-sm font-medium">
                    Joining Date
                  </Label>
                  <Input
                    id="joining_date"
                    type="date"
                    value={formData.joining_date}
                    onChange={(e) => handleFieldChange('joining_date', e.target.value)}
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="salary" className="text-sm font-medium">
                    Salary
                  </Label>
                  <Input
                    id="salary"
                    type="number"
                    value={formData.salary}
                    onChange={(e) => handleFieldChange('salary', e.target.value)}
                    placeholder="Enter salary amount"
                    disabled={submitting}
                    className="h-11"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 pb-6 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || success}
                className="gap-2 min-w-[140px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : success ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Created!
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Create Employee
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
            {employeeToDelete && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="font-semibold">{employeeToDelete.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {employeeToDelete.email}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  Role: {employeeToDelete.role} {employeeToDelete.department && `• ${employeeToDelete.department}`}
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

