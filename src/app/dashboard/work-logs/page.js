'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Plus, Calendar, Edit, Trash2, Settings, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import { hasRoleAccess } from '@/lib/roleCheck';

export default function WorkLogsPage() {
  const [logs, setLogs] = useState([]);
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showFieldManagement, setShowFieldManagement] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [formData, setFormData] = useState({});
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingLog, setEditingLog] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchFields();
      fetchLogs();
      if (hasRoleAccess(user.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
        fetchEmployees();
      }
    }
  }, [user, selectedEmployee]);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFields = async () => {
    try {
      const role = user?.role;
      if (!role) return;

      const res = await authenticatedFetch(`/api/work-logs/fields?role=${encodeURIComponent(role)}`);
      const data = await res.json();
      setFields(data.fields || []);
    } catch (err) {
      console.error('Failed to fetch fields:', err);
    }
  };

  const fetchLogs = async () => {
    try {
      const params = new URLSearchParams();
      if (selectedEmployee && hasRoleAccess(user?.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
        params.append('user_id', selectedEmployee);
      }
      
      // Get logs for last 30 days
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      params.append('start_date', startDate);
      params.append('end_date', endDate);

      const res = await authenticatedFetch(`/api/work-logs?${params.toString()}`);
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      setEmployees(data.employees || []);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const handleOpenForm = (log = null) => {
    if (log) {
      setEditingLog(log);
      setSelectedDate(log.log_date);
      setFormData(log.field_data || {});
      setNotes(log.notes || '');
    } else {
      setEditingLog(null);
      setFormData({});
      setNotes('');
    }
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleFieldChange = (fieldKey, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldKey]: value
    }));
  };

  const validateForm = () => {
    for (const field of fields) {
      if (field.is_required && (!formData[field.field_key] || formData[field.field_key].toString().trim() === '')) {
        setError(`${field.field_label} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        log_date: selectedDate,
        field_data: formData,
        notes: notes.trim() || null
      };

      if (selectedEmployee && hasRoleAccess(user?.role, ['Super Admin', 'Admin', 'HR', 'Manager'])) {
        payload.user_id = parseInt(selectedEmployee);
      }

      let res;
      if (editingLog) {
        res = await authenticatedFetch(`/api/work-logs/${editingLog.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await authenticatedFetch('/api/work-logs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();

      if (res.ok) {
        setSuccess(editingLog ? 'Work log updated successfully!' : 'Work log created successfully!');
        setShowForm(false);
        fetchLogs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save work log');
      }
    } catch (err) {
      console.error('Failed to save work log:', err);
      setError('Failed to save work log. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (logId) => {
    if (!confirm('Are you sure you want to delete this work log?')) {
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/work-logs/${logId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSuccess('Work log deleted successfully!');
        fetchLogs();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete work log');
      }
    } catch (err) {
      console.error('Failed to delete work log:', err);
      setError('Failed to delete work log. Please try again.');
    }
  };

  const getLogForDate = (date) => {
    return logs.find(log => log.log_date === date);
  };

  const renderField = (field) => {
    const value = formData[field.field_key] || '';

    switch (field.field_type) {
      case 'dropdown':
        return (
          <Select
            value={value || undefined}
            onValueChange={(val) => handleFieldChange(field.field_key, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${field.field_label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.field_options && field.field_options.map((option, idx) => (
                <SelectItem key={idx} value={option || String(idx)}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'textarea':
        return (
          <textarea
            className="w-full min-h-[100px] px-3 py-2 border rounded-md"
            value={value}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={`Enter ${field.field_label}`}
          />
        );

      case 'url':
        return (
          <Input
            type="url"
            value={value}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={`Enter ${field.field_label}`}
          />
        );

      case 'number':
        return (
          <Input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={`Enter ${field.field_label}`}
          />
        );

      default:
        return (
          <Input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.field_key, e.target.value)}
            placeholder={`Enter ${field.field_label}`}
          />
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isAdmin = hasRoleAccess(user?.role, ['Super Admin', 'Admin']);
  const canViewAll = hasRoleAccess(user?.role, ['Super Admin', 'Admin', 'HR', 'Manager']);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Daily Work Logs
          </h1>
          <p className="text-muted-foreground mt-1">Record your daily work activities</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              onClick={() => setShowFieldManagement(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Manage Fields
            </Button>
          )}
          <Button onClick={() => handleOpenForm()} className="gap-2">
            <Plus className="h-4 w-4" />
            New Log
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {canViewAll && (
        <Card>
          <CardHeader>
            <CardTitle>Filter by Employee</CardTitle>
          </CardHeader>
          <CardContent>
            <Select
              value={selectedEmployee ? selectedEmployee.toString() : 'all'}
              onValueChange={(val) => setSelectedEmployee(val === 'all' ? null : val)}
            >
              <SelectTrigger className="w-full md:w-[300px]">
                <SelectValue placeholder="All Employees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.id.toString()}>
                    {emp.name} ({emp.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Recent Work Logs</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No work logs found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {new Date(log.log_date).toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                        {canViewAll && (
                          <span className="text-sm text-muted-foreground">
                            by {log.user_name || 'Unknown'}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 mt-3">
                        {Object.entries(log.field_data || {}).map(([key, value]) => {
                          const field = fields.find(f => f.field_key === key);
                          if (!field) return null;
                          return (
                            <div key={key} className="text-sm">
                              <span className="font-medium text-muted-foreground">
                                {field.field_label}:
                              </span>{' '}
                              <span className="text-foreground">
                                {field.field_type === 'url' ? (
                                  <a
                                    href={value}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline"
                                  >
                                    {value}
                                  </a>
                                ) : (
                                  value
                                )}
                              </span>
                            </div>
                          );
                        })}
                        {log.notes && (
                          <div className="text-sm mt-2">
                            <span className="font-medium text-muted-foreground">Notes:</span>{' '}
                            <span className="text-foreground">{log.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenForm(log)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      {(log.user_id === user?.id || isAdmin) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(log.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLog ? 'Edit Work Log' : 'Create Work Log'}
            </DialogTitle>
            <DialogDescription>
              Fill in your daily work activities for {selectedDate}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={!!editingLog}
              />
            </div>

            {canViewAll && (
              <div>
                <Label>Employee</Label>
                <Select
                  value={selectedEmployee ? selectedEmployee.toString() : (user?.id ? user.id.toString() : undefined)}
                  onValueChange={(val) => setSelectedEmployee(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name} ({emp.role})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {fields.map((field) => (
              <div key={field.id}>
                <Label>
                  {field.field_label}
                  {field.is_required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                {renderField(field)}
              </div>
            ))}

            <div>
              <Label>Notes (Optional)</Label>
              <textarea
                className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                editingLog ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Field Management Dialog (Admin only) */}
      {isAdmin && (
        <FieldManagementDialog
          open={showFieldManagement}
          onOpenChange={setShowFieldManagement}
          user={user}
          onFieldsUpdated={fetchFields}
        />
      )}
    </div>
  );
}

// Field Management Component (Admin only)
function FieldManagementDialog({ open, onOpenChange, user, onFieldsUpdated }) {
  const [allFields, setAllFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (open) {
      fetchAllFields();
    }
  }, [open]);

  const fetchAllFields = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/work-logs/fields');
      const data = await res.json();
      setAllFields(data.fields || []);
    } catch (err) {
      console.error('Failed to fetch fields:', err);
    } finally {
      setLoading(false);
    }
  };

  const roles = [...new Set(allFields.map(f => f.role))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Field Definitions</DialogTitle>
          <DialogDescription>
            Configure fields for each role. Changes will affect future work log forms.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Filter by Role</Label>
            <Select value={selectedRole || 'all'} onValueChange={(val) => setSelectedRole(val === 'all' ? '' : val)}>
              <SelectTrigger>
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {(selectedRole ? allFields.filter(f => f.role === selectedRole) : allFields).map((field) => (
                <Card key={field.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium">{field.field_label}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          Role: {field.role} • Type: {field.field_type} • 
                          {field.is_required ? ' Required' : ' Optional'}
                        </div>
                        {field.field_options && (
                          <div className="text-sm text-muted-foreground mt-1">
                            Options: {field.field_options.join(', ')}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onOpenChange}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

