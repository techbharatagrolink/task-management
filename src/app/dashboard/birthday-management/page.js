'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Cake, Plus, Edit, Trash2, Loader2, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import { hasRoleAccess } from '@/lib/roleCheck';

export default function BirthdayManagementPage() {
  const [eventsByMonth, setEventsByMonth] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const currentMonthRef = useRef(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  const [formData, setFormData] = useState({
    employee_id: '',
    event_type: 'birthday',
    event_date: '',
    event_year: '',
    notes: ''
  });

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchEvents();
      fetchEmployees();
    }
  }, [user]);

  // Auto-scroll to current month on load
  useEffect(() => {
    if (eventsByMonth.length > 0 && currentMonthRef.current && !hasScrolled) {
      setTimeout(() => {
        currentMonthRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start',
          inline: 'nearest'
        });
        setHasScrolled(true);
      }, 300);
    }
  }, [eventsByMonth, hasScrolled]);

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

  const fetchEvents = async () => {
    try {
      const res = await authenticatedFetch('/api/birthday-events');
      const data = await res.json();
      if (res.ok && data.eventsByMonth) {
        setEventsByMonth(data.eventsByMonth);
      }
    } catch (err) {
      console.error('Failed to fetch events:', err);
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
    }
  };

  const handleOpenForm = (event = null) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        employee_id: event.employee_id.toString(),
        event_type: event.event_type,
        event_date: event.event_date,
        event_year: event.event_year ? event.event_year.toString() : '',
        notes: event.notes || ''
      });
    } else {
      setEditingEvent(null);
      setFormData({
        employee_id: '',
        event_type: 'birthday',
        event_date: '',
        event_year: '',
        notes: ''
      });
    }
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');

    if (!formData.employee_id || !formData.event_date) {
      setError('Employee and event date are required');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        employee_id: parseInt(formData.employee_id),
        event_type: formData.event_type,
        event_date: formData.event_date,
        event_year: formData.event_year ? parseInt(formData.event_year) : null,
        notes: formData.notes.trim() || null
      };

      let res;
      if (editingEvent) {
        res = await authenticatedFetch(`/api/birthday-events/${editingEvent.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        res = await authenticatedFetch('/api/birthday-events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      const data = await res.json();

      if (res.ok) {
        setSuccess(editingEvent ? 'Event updated successfully!' : 'Event created successfully!');
        setShowForm(false);
        fetchEvents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save event');
      }
    } catch (err) {
      console.error('Failed to save event:', err);
      setError('Failed to save event. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) {
      return;
    }

    try {
      const res = await authenticatedFetch(`/api/birthday-events/${eventId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setSuccess('Event deleted successfully!');
        fetchEvents();
        setTimeout(() => setSuccess(''), 3000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to delete event');
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError('Failed to delete event. Please try again.');
    }
  };

  const getCurrentMonth = () => {
    return new Date().getMonth() + 1; // 1-12
  };

  const isCurrentMonth = (monthNumber) => {
    return monthNumber === getCurrentMonth();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const isHR = hasRoleAccess(user?.role, ['Super Admin', 'Admin', 'HR']);

  if (!isHR) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>You don't have permission to access this page.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Cake className="h-8 w-8" />
            Birthday Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage birthdays and anniversaries for employees
          </p>
        </div>
        <Button onClick={() => handleOpenForm()} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Event
        </Button>
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

      <div className="space-y-8">
        {eventsByMonth.map((monthData) => {
          const isCurrent = isCurrentMonth(monthData.monthNumber);
          return (
            <div
              key={monthData.monthNumber}
              ref={isCurrent ? currentMonthRef : null}
              className={`scroll-mt-20 ${isCurrent ? 'ring-2 ring-indigo-500 rounded-lg p-4 bg-indigo-50/50' : ''}`}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {monthData.month}
                    {isCurrent && (
                      <span className="text-sm font-normal text-indigo-600 bg-indigo-100 px-2 py-1 rounded">
                        Current Month
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {monthData.events.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Cake className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No events this month</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {monthData.events.map((event) => (
                        <Card
                          key={event.id}
                          className={`relative overflow-hidden ${
                            event.event_type === 'birthday'
                              ? 'border-blue-200 bg-blue-50/50'
                              : 'border-purple-200 bg-purple-50/50'
                          }`}
                        >
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {event.event_type === 'birthday' ? (
                                    <Cake className="h-5 w-5 text-blue-600" />
                                  ) : (
                                    <Calendar className="h-5 w-5 text-purple-600" />
                                  )}
                                  <span
                                    className={`text-xs font-semibold px-2 py-1 rounded ${
                                      event.event_type === 'birthday'
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'bg-purple-100 text-purple-700'
                                    }`}
                                  >
                                    {event.event_type === 'birthday' ? 'Birthday' : 'Anniversary'}
                                  </span>
                                </div>
                                <h3 className="font-semibold text-lg mb-1">
                                  {event.employee_name}
                                </h3>
                                <p className="text-sm text-muted-foreground mb-2">
                                  {new Date(event.event_date).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: event.event_year ? 'numeric' : undefined
                                  })}
                                  {event.event_year && ` (${event.event_year})`}
                                </p>
                                {event.notes && (
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {event.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex gap-2 mt-4">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenForm(event)}
                                className="flex-1"
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDelete(event.id)}
                                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Create/Edit Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingEvent ? 'Edit Event' : 'Add New Event'}
            </DialogTitle>
            <DialogDescription>
              {editingEvent
                ? 'Update the birthday or anniversary event details'
                : 'Create a new birthday or anniversary event for an employee'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Employee *</Label>
              <Select
                value={formData.employee_id}
                onValueChange={(val) => setFormData(prev => ({ ...prev, employee_id: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} {emp.department ? `- ${emp.department}` : ''} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Event Type *</Label>
              <Select
                value={formData.event_type}
                onValueChange={(val) => setFormData(prev => ({ ...prev, event_type: val }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="birthday">Birthday</SelectItem>
                  <SelectItem value="anniversary">Anniversary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Event Date *</Label>
              <Input
                type="date"
                value={formData.event_date}
                onChange={(e) => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Select the date of the event (month and day are used for recurring events)
              </p>
            </div>

            <div>
              <Label>Event Year (Optional)</Label>
              <Input
                type="number"
                placeholder="e.g., 1990"
                value={formData.event_year}
                onChange={(e) => setFormData(prev => ({ ...prev, event_year: e.target.value }))}
                min="1900"
                max="2100"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty for recurring events, or specify a year for one-time events
              </p>
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes about this event..."
                rows={3}
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
                editingEvent ? 'Update' : 'Create'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}




