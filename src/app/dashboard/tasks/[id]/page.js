'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import DeadlineTimer from '@/components/DeadlineTimer';
import {
  CheckSquare,
  ArrowLeft,
  Calendar,
  Users,
  AlertCircle,
  MessageSquare,
  ListChecks,
  Loader2,
  Send,
  Clock,
  User,
  CheckCircle2,
  Circle,
  Trash2,
  Edit,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { authenticatedFetch } from '@/lib/auth-client';

export default function TaskDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id;
  
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [updatingSubtask, setUpdatingSubtask] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    deadline: '',
    progress: 0,
    assigned_users: []
  });
  const [employees, setEmployees] = useState([]);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
      fetchUserRole();
      fetchEmployees();
    }
  }, [taskId]);

  useEffect(() => {
    if (task && editDialogOpen) {
      // Parse assigned user IDs from the task
      const assignedIds = task.assigned_user_ids ? task.assigned_user_ids.split(',').map(Number) : [];
      
      // Format deadline for datetime-local input
      let deadlineValue = '';
      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        // Convert to local datetime-local format (YYYY-MM-DDTHH:mm)
        const year = deadlineDate.getFullYear();
        const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
        const day = String(deadlineDate.getDate()).padStart(2, '0');
        const hours = String(deadlineDate.getHours()).padStart(2, '0');
        const minutes = String(deadlineDate.getMinutes()).padStart(2, '0');
        deadlineValue = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
      
      setEditFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        status: task.status || 'pending',
        deadline: deadlineValue,
        progress: task.progress || 0,
        assigned_users: assignedIds
      });
    }
  }, [task, editDialogOpen]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      
      if (res.ok) {
        setTask(data.task);
      } else {
        setError(data.error || 'Failed to load task details');
      }
    } catch (err) {
      console.error('Failed to fetch task details:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubtaskToggle = async (subtask) => {
    if (updatingSubtask === subtask.id) return;
    
    setUpdatingSubtask(subtask.id);
    try {
      const newStatus = subtask.status === 'completed' ? 'pending' : 'completed';
      const newProgress = newStatus === 'completed' ? 100 : 0;
      
      const res = await authenticatedFetch(`/api/tasks/${taskId}/subtasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subtask_id: subtask.id,
          status: newStatus,
          progress: newProgress
        })
      });

      if (res.ok) {
        // Refresh task details to get updated progress
        await fetchTaskDetails();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to update subtask');
      }
    } catch (err) {
      console.error('Failed to update subtask:', err);
      setError('Network error. Please try again.');
    } finally {
      setUpdatingSubtask(null);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || submittingComment) return;

    setSubmittingComment(true);
    try {
      const res = await authenticatedFetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: newComment.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setNewComment('');
        // Refresh task details to get updated comments
        await fetchTaskDetails();
      } else {
        setError(data.error || 'Failed to add comment');
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      setError('Network error. Please try again.');
    } finally {
      setSubmittingComment(false);
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

  const fetchUserRole = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUserRole(data.user.role);
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
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

  const handleEditClick = () => {
    setEditDialogOpen(true);
  };

  const handleEditCancel = () => {
    setEditDialogOpen(false);
    setError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!task) return;

    setEditing(true);
    setError('');
    
    try {
      // Send the datetime-local value directly (no UTC conversion)
      // This preserves the user's intended local time
      const updateData = { ...editFormData };
      
      const res = await authenticatedFetch(`/api/tasks/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const data = await res.json();
      if (res.ok) {
        setEditDialogOpen(false);
        // Refresh task details
        await fetchTaskDetails();
      } else {
        setError(data.error || 'Failed to update task');
      }
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Network error. Please try again.');
    } finally {
      setEditing(false);
    }
  };

  const isAdmin = userRole === 'Super Admin' || userRole === 'Admin';
  const canDelete = isAdmin || userRole === 'Manager' || userRole === 'HR';
  const canEdit = isAdmin || userRole === 'Manager' || userRole === 'HR';

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!task) return;

    setDeleting(true);
    try {
      const res = await authenticatedFetch(`/api/tasks/${task.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (res.ok) {
        // Redirect to tasks list after successful deletion
        router.push('/dashboard/tasks');
      } else {
        setError(data.error || 'Failed to delete task');
        setDeleteDialogOpen(false);
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
      setError('Network error. Please try again.');
      setDeleteDialogOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    // Handle both ISO format and datetime-local format
    // Replace space with T if needed for consistent parsing
    const normalizedString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
    const date = new Date(normalizedString);
    // Check if date is valid
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    );
  }

  if (error && !task) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Task not found</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const completedSubtasks = task.subtasks?.filter(st => st.status === 'completed').length || 0;
  const totalSubtasks = task.subtasks?.length || 0;

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
              <CheckSquare className="h-8 w-8" />
              Task Details
            </h1>
            <p className="text-muted-foreground mt-1">View and manage task information</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button
              variant="outline"
              onClick={handleEditClick}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              Edit Task
            </Button>
          )}
          {canDelete && (
            <Button
              variant="destructive"
              onClick={handleDeleteClick}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete Task
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Task Information */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">{task.title}</CardTitle>
                  {task.description && (
                    <CardDescription className="text-base mt-2 whitespace-pre-wrap">
                      {task.description}
                    </CardDescription>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={getPriorityColor(task.priority)}>
                    {task.priority}
                  </Badge>
                  <Badge className={getStatusColor(task.status)}>
                    {task.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Task Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    <p className="font-medium">
                      {task.deadline ? formatDate(task.deadline) : 'No deadline'}
                    </p>
                    {task.deadline && (
                      <div className="mt-2">
                        <DeadlineTimer deadline={task.deadline} status={task.status} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Assigned To</p>
                    <p className="font-medium">
                      {task.assigned_user_names || 'Unassigned'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Created At</p>
                    <p className="font-medium">{formatDate(task.created_at)}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <CheckSquare className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Progress</p>
                    <p className="font-medium">{task.progress || 0}%</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">{task.progress || 0}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all"
                    style={{ width: `${task.progress || 0}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Subtasks Checklist */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5 text-primary" />
                  <CardTitle>Subtasks</CardTitle>
                </div>
                {totalSubtasks > 0 && (
                  <Badge variant="secondary">
                    {completedSubtasks} / {totalSubtasks} completed
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {!task.subtasks || task.subtasks.length === 0 ? (
                <div className="text-center py-8">
                  <ListChecks className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No subtasks for this task</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {task.subtasks.map((subtask) => {
                    const isCompleted = subtask.status === 'completed';
                    const isUpdating = updatingSubtask === subtask.id;
                    
                    return (
                      <div
                        key={subtask.id}
                        className={cn(
                          "flex items-start gap-3 p-4 rounded-lg border transition-colors",
                          isCompleted && "bg-green-50 border-green-200",
                          !isCompleted && "bg-background hover:bg-accent"
                        )}
                      >
                        <button
                          onClick={() => handleSubtaskToggle(subtask)}
                          disabled={isUpdating}
                          className={cn(
                            "mt-0.5 flex-shrink-0 transition-all",
                            isUpdating && "opacity-50 cursor-not-allowed"
                          )}
                        >
                          {isUpdating ? (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          ) : isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p
                            className={cn(
                              "font-medium",
                              isCompleted && "line-through text-muted-foreground"
                            )}
                          >
                            {subtask.title}
                          </p>
                          {subtask.description && (
                            <p
                              className={cn(
                                "text-sm mt-1",
                                isCompleted ? "text-muted-foreground" : "text-muted-foreground"
                              )}
                            >
                              {subtask.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2">
                            <Badge
                              variant={isCompleted ? 'success' : 'outline'}
                              className="text-xs"
                            >
                              {subtask.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {subtask.progress || 0}% complete
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Comments Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <CardTitle>Comments</CardTitle>
              </div>
              <CardDescription>
                {task.comments?.length || 0} comment{(task.comments?.length || 0) !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="comment">Add a comment</Label>
                  <div className="flex gap-2">
                    <textarea
                      id="comment"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      disabled={submittingComment}
                      className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                      rows="4"
                    />
                    <Button
                      type="submit"
                      disabled={!newComment.trim() || submittingComment}
                      size="icon"
                      className="h-[100px]"
                    >
                      {submittingComment ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </form>

              <Separator />

              {/* Comments List */}
              <div className="space-y-4">
                {!task.comments || task.comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
                  </div>
                ) : (
                  task.comments.map((comment) => (
                    <div key={comment.id} className="space-y-2">
                      <div className="flex items-start gap-3 p-4 rounded-lg border bg-background">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium text-sm">{comment.user_name}</p>
                            <Badge variant="outline" className="text-xs">
                              {comment.user_role}
                            </Badge>
                            <span className="text-xs text-muted-foreground ml-auto">
                              {formatDate(comment.created_at)}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{comment.comment}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Task ID</p>
                <p className="font-mono text-sm">#{task.id}</p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <Badge className={getStatusColor(task.status)}>
                  {task.status.replace('_', ' ')}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Priority</p>
                <Badge className={getPriorityColor(task.priority)}>
                  {task.priority}
                </Badge>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="text-sm font-medium">{formatDate(task.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Subtasks</p>
                <p className="text-2xl font-bold">
                  {completedSubtasks} / {totalSubtasks}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0}% completed
                </p>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">Comments</p>
                <p className="text-2xl font-bold">{task.comments?.length || 0}</p>
              </div>
              {task.reports && task.reports.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Reports</p>
                    <p className="text-2xl font-bold">{task.reports.length}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Task Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={handleEditCancel}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border-2 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Edit className="h-5 w-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl font-bold">Edit Task</DialogTitle>
                <DialogDescription className="mt-1 text-base">
                  Update task information and assignments
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-6 pt-4">
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
                  <Label htmlFor="edit-title" className="text-sm font-medium">
                    Task Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="edit-title"
                    type="text"
                    required
                    value={editFormData.title}
                    onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                    placeholder="Enter task title"
                    disabled={editing}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-description" className="text-sm font-medium">
                    Description
                  </Label>
                  <textarea
                    id="edit-description"
                    value={editFormData.description}
                    onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                    placeholder="Enter task description"
                    disabled={editing}
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows="3"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-priority" className="text-sm font-medium">
                    Priority
                  </Label>
                  <Select
                    value={editFormData.priority}
                    onValueChange={(value) => setEditFormData({ ...editFormData, priority: value })}
                    disabled={editing}
                  >
                    <SelectTrigger id="edit-priority" className="h-11">
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
                  <Label htmlFor="edit-status" className="text-sm font-medium">
                    Status
                  </Label>
                  <Select
                    value={editFormData.status}
                    onValueChange={(value) => setEditFormData({ ...editFormData, status: value })}
                    disabled={editing}
                  >
                    <SelectTrigger id="edit-status" className="h-11">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-deadline" className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Deadline
                  </Label>
                  <Input
                    id="edit-deadline"
                    type="datetime-local"
                    value={editFormData.deadline}
                    onChange={(e) => setEditFormData({ ...editFormData, deadline: e.target.value })}
                    disabled={editing}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-progress" className="text-sm font-medium">
                    Progress (%)
                  </Label>
                  <Input
                    id="edit-progress"
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.progress}
                    onChange={(e) => setEditFormData({ ...editFormData, progress: parseInt(e.target.value) || 0 })}
                    disabled={editing}
                    className="h-11"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="edit-assigned_users" className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    Assign To
                  </Label>
                  <select
                    id="edit-assigned_users"
                    multiple
                    value={editFormData.assigned_users.map(String)}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                      setEditFormData({ ...editFormData, assigned_users: selected });
                    }}
                    disabled={editing}
                    className="flex h-32 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {(() => {
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

            <DialogFooter className="gap-2 sm:gap-0 pt-4 border-t bg-gray-50 -mx-6 -mb-6 px-6 pb-6 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleEditCancel}
                disabled={editing}
                className="min-w-[100px]"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editing}
                className="gap-2 min-w-[120px]"
              >
                {editing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    Update Task
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
              Delete Task
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </DialogDescription>
            {task && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="font-semibold">{task.title}</div>
                {task.description && (
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-3">
                    {task.description}
                  </div>
                )}
                <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                  <span>Status: {task.status.replace('_', ' ')}</span>
                  <span>•</span>
                  <span>Priority: {task.priority}</span>
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
                  Delete Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


