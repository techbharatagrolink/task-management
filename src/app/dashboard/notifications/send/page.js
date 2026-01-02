'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Send, Loader2, ArrowLeft, Users } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import { hasRoleAccess } from '@/lib/roleCheck';
import AccessDenied from '@/components/AccessDenied';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function SendNotificationPage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployees, setSelectedEmployees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: ''
  });
  const router = useRouter();

  useEffect(() => {
    fetchUser();
    fetchEmployees();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        if (!hasRoleAccess(data.user.role, ['Super Admin', 'Admin', 'Manager', 'HR'])) {
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

  const fetchEmployees = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      if (data.employees) {
        // Filter out Super Admin and inactive employees
        setEmployees(data.employees.filter(emp => 
          emp.role !== 'Super Admin' && emp.is_active !== 0
        ));
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId) => {
    setSelectedEmployees(prev => {
      if (prev.includes(employeeId)) {
        return prev.filter(id => id !== employeeId);
      } else {
        return [...prev, employeeId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map(emp => emp.id));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      alert('Please fill in both title and message');
      return;
    }

    if (selectedEmployees.length === 0) {
      alert('Please select at least one employee');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authenticatedFetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          message: formData.message,
          recipient_ids: selectedEmployees
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        alert(`Notification sent successfully to ${selectedEmployees.length} ${selectedEmployees.length === 1 ? 'person' : 'people'}!`);
        router.push('/dashboard/notifications');
      } else {
        alert(data.error || 'Failed to send notification');
      }
    } catch (err) {
      console.error('Failed to send notification:', err);
      alert('Failed to send notification');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !hasRoleAccess(user.role, ['Super Admin', 'Admin', 'Manager', 'HR'])) {
    return <AccessDenied message="This page is only accessible to Super Admin, Admin, Manager, and HR." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Send Notification</h1>
          <p className="text-muted-foreground mt-1">
            Send notifications to selected employees
          </p>
        </div>
        <Link href="/dashboard/notifications">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Notifications
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Notification</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter notification title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                placeholder="Enter notification message"
                rows={6}
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Select Recipients *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedEmployees.length === employees.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                {employees.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No employees available</p>
                ) : (
                  <div className="space-y-3">
                    {employees.map((employee) => (
                      <div
                        key={employee.id}
                        className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded"
                      >
                        <Checkbox
                          id={`employee-${employee.id}`}
                          checked={selectedEmployees.includes(employee.id)}
                          onCheckedChange={() => handleEmployeeToggle(employee.id)}
                        />
                        <Label
                          htmlFor={`employee-${employee.id}`}
                          className="flex-1 cursor-pointer flex items-center gap-2"
                        >
                          <div className="flex-shrink-0 h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                            <span className="text-indigo-600 font-medium text-sm">
                              {employee.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium">{employee.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {employee.role} {employee.department ? `• ${employee.department}` : ''}
                            </div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {selectedEmployees.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {selectedEmployees.length} {selectedEmployees.length === 1 ? 'employee' : 'employees'} selected
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/dashboard/notifications">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={submitting || selectedEmployees.length === 0}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Notification
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}



