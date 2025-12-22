'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import DeadlineTimer from '@/components/DeadlineTimer';
import {
  CheckSquare,
  Plus,
  X,
  Calendar,
  AlertCircle,
  Users,
  Loader2,
  Clock,
  ListChecks
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { authenticatedFetch } from '@/lib/auth-client';
export default function TasksPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    assigned_users: [],
    subtasks: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [newSubtask, setNewSubtask] = useState({ title: '', description: '' });

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, []);

  const [employees, setEmployees] = useState([]);

  const fetchTasks = async () => {
    try {
      const res = await authenticatedFetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    
    try {
      const res = await authenticatedFetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (res.ok) {
        setShowCreateModal(false);
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          deadline: '',
          assigned_users: [],
          subtasks: []
        });
        setNewSubtask({ title: '', description: '' });
        fetchTasks();
      } else {
        setError(data.error || 'Failed to create task');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const addSubtask = () => {
    if (newSubtask.title.trim()) {
      setFormData({
        ...formData,
        subtasks: [...formData.subtasks, { ...newSubtask }]
      });
      setNewSubtask({ title: '', description: '' });
    }
  };

  const removeSubtask = (index) => {
    setFormData({
      ...formData,
      subtasks: formData.subtasks.filter((_, i) => i !== index)
    });
  };

  const handleClose = () => {
    if (!submitting) {
      setShowCreateModal(false);
      setFormData({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        assigned_users: [],
        subtasks: []
      });
      setNewSubtask({ title: '', description: '' });
      setError('');
    }
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || colors.pending;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CheckSquare className="h-8 w-8" />
            Tasks
          </h1>
          <p className="text-muted-foreground mt-1">Manage and track all tasks</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="gap-2" size="lg">
          <Plus className="h-4 w-4" />
          Create Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tasks found. Create your first task to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => (
            <Card key={task.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/tasks/${task.id}`} className="flex-1">
                    <CardTitle className="text-lg hover:text-primary transition-colors">
                      {task.title}
                    </CardTitle>
                  </Link>
                  <div className="flex items-center gap-2">
                    <Badge variant={task.priority === 'critical' ? 'destructive' : task.priority === 'high' ? 'warning' : 'secondary'}>
                      {task.priority}
                    </Badge>
                  </div>
                </div>
                {task.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                    {task.description}
                  </p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Badge variant={task.status === 'completed' ? 'success' : task.status === 'in_progress' ? 'default' : 'outline'}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                  {task.deadline && (
                    <DeadlineTimer deadline={task.deadline} />
                  )}
                </div>

                {task.subtasks && task.subtasks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <ListChecks className="h-4 w-4" />
                      <span>{task.subtasks.length} Subtask{task.subtasks.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="space-y-1">
                      {task.subtasks.slice(0, 3).map((subtask) => (
                        <div key={subtask.id} className="flex items-center gap-2 text-sm">
                          <div className={cn(
                            "h-2 w-2 rounded-full",
                            subtask.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                          )} />
                          <span className={cn(
                            "flex-1 truncate",
                            subtask.status === 'completed' && 'line-through text-muted-foreground'
                          )}>
                            {subtask.title}
                          </span>
                        </div>
                      ))}
                      {task.subtasks.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{task.subtasks.length - 3} more subtasks
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{task.progress || 0}%</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${task.progress || 0}%` }}
                    />
                  </div>
                </div>

                {task.assigned_users && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span className="truncate">{task.assigned_users}</span>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/dashboard/tasks/${task.id}`}>
                      View Details
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Task Dialog */}
      <Dialog open={showCreateModal} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <CheckSquare className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Create New Task</DialogTitle>
                <DialogDescription className="mt-1 text-base">
                  Create a task with subtasks and set deadlines
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-6 pt-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center gap-2 pb-2">
                <CheckSquare className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Task Information</h3>
              </div>
              <Separator className="mb-4" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="title" className="text-sm font-medium">
                    Task Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Enter task title"
                    disabled={submitting}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="description" className="text-sm font-medium">
                    Description
                  </Label>
                  <textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Enter task description"
                    disabled={submitting}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows="3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="priority" className="text-sm font-medium">
                    Priority
                  </Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                    disabled={submitting}
                  >
                    <SelectTrigger id="priority" className="h-11">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="deadline" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Deadline
                  </Label>
                  <Input
                    id="deadline"
                    type="datetime-local"
                    value={formData.deadline}
                    onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                    disabled={submitting}
                    className="h-11"
                    min={new Date().toISOString().slice(0, 16)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="assigned_users" className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Assign To
                  </Label>
                  <select
                    id="assigned_users"
                    multiple
                    value={formData.assigned_users.map(String)}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                      setFormData({ ...formData, assigned_users: selected });
                    }}
                    disabled={submitting}
                    className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(() => {
                      // Group employees by role
                      const employeesByRole = employees
                        .filter(emp => emp.role !== 'Super Admin' && emp.is_active !== 0)
                        .reduce((acc, emp) => {
                          const role = emp.role || 'Other';
                          if (!acc[role]) {
                            acc[role] = [];
                          }
                          acc[role].push(emp);
                          return acc;
                        }, {});

                      // Sort roles and render
                      const sortedRoles = Object.keys(employeesByRole).sort();
                      
                      return sortedRoles.map(role => (
                        <optgroup key={role} label={role}>
                          {employeesByRole[role]
                            .sort((a, b) => a.name.localeCompare(b.name))
                            .map(emp => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} {emp.department ? `- ${emp.department}` : ''}
                              </option>
                            ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                  <p className="text-xs text-muted-foreground">Hold Ctrl/Cmd to select multiple. Employees are grouped by role.</p>
                </div>
              </div>
            </div>

            {/* Subtasks Section */}
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <div className="flex items-center justify-between pb-2">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <h3 className="text-lg font-semibold text-foreground">Subtasks</h3>
                </div>
                <Badge variant="secondary">{formData.subtasks.length} Added</Badge>
              </div>
              <Separator className="mb-4" />

              {/* Add Subtask */}
              <div className="space-y-2 p-3 bg-background rounded-lg border-2 border-dashed">
                <Label className="text-sm font-medium">Add New Subtask</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    type="text"
                    value={newSubtask.title}
                    onChange={(e) => setNewSubtask({ ...newSubtask, title: e.target.value })}
                    placeholder="Subtask title"
                    disabled={submitting}
                    className="h-10"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addSubtask();
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      value={newSubtask.description}
                      onChange={(e) => setNewSubtask({ ...newSubtask, description: e.target.value })}
                      placeholder="Description (optional)"
                      disabled={submitting}
                      className="h-10"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSubtask();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={addSubtask}
                      disabled={!newSubtask.title.trim() || submitting}
                      size="icon"
                      className="h-10 w-10"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Subtasks List */}
              {formData.subtasks.length > 0 && (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {formData.subtasks.map((subtask, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 p-3 bg-background rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-sm">{subtask.title}</p>
                        {subtask.description && (
                          <p className="text-xs text-muted-foreground mt-1">{subtask.description}</p>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSubtask(index)}
                        disabled={submitting}
                        className="h-8 w-8"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
                disabled={submitting}
                className="gap-2 min-w-[120px]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Create Task
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

