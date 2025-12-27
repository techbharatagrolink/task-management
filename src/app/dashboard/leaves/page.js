'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar, Plus, Clock, CheckCircle2, XCircle, AlertCircle, User, MessageSquare, Send, ChevronDown, ChevronUp } from 'lucide-react';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { authenticatedFetch } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedLeaves, setExpandedLeaves] = useState(new Set());
  const [commentInputs, setCommentInputs] = useState({});
  const [submittingComments, setSubmittingComments] = useState({});
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    leave_type: '',
    start_date: '',
    end_date: '',
    reason: ''
  });

  useEffect(() => {
    fetchUser();
    fetchLeaves();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchLeaves = async () => {
    try {
      const url = statusFilter !== 'all' 
        ? `/api/leaves?status=${statusFilter}`
        : '/api/leaves';
      const res = await authenticatedFetch(url);
      const data = await res.json();
      
      if (res.ok) {
        setLeaves(data.leaves || []);
      } else {
        setError(data.error || 'Failed to fetch leaves');
      }
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
      setError('Failed to load leave records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLeaves();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const isHR = user && ['HR', 'Super Admin', 'Admin'].includes(user.role);
  const isManager = user && user.role === 'Manager' && !isHR;
  const canApprove = isHR || isManager;

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await authenticatedFetch('/api/leaves', {
        method: 'POST',
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Leave request submitted successfully',
        });
        setIsDialogOpen(false);
        setFormData({
          leave_type: '',
          start_date: '',
          end_date: '',
          reason: ''
        });
        fetchLeaves();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to submit leave request',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to submit leave:', err);
      toast({
        title: 'Error',
        description: 'Failed to submit leave request',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveReject = async (leaveId, status) => {
    try {
      const res = await authenticatedFetch(`/api/leaves/${leaveId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ status }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Leave ${status} successfully`,
        });
        fetchLeaves();
      } else {
        toast({
          title: 'Error',
          description: data.error || `Failed to ${status} leave`,
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to approve/reject leave:', err);
      toast({
        title: 'Error',
        description: `Failed to ${status} leave`,
        variant: 'destructive',
      });
    }
  };

  const toggleLeaveExpanded = (leaveId) => {
    const newExpanded = new Set(expandedLeaves);
    if (newExpanded.has(leaveId)) {
      newExpanded.delete(leaveId);
    } else {
      newExpanded.add(leaveId);
    }
    setExpandedLeaves(newExpanded);
  };

  const handleAddComment = async (leaveId, e) => {
    e.preventDefault();
    const comment = commentInputs[leaveId]?.trim();
    if (!comment || submittingComments[leaveId]) return;

    setSubmittingComments({ ...submittingComments, [leaveId]: true });
    try {
      const res = await authenticatedFetch(`/api/leaves/${leaveId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Comment added successfully',
        });
        setCommentInputs({ ...commentInputs, [leaveId]: '' });
        fetchLeaves();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add comment',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to add comment:', err);
      toast({
        title: 'Error',
        description: 'Failed to add comment',
        variant: 'destructive',
      });
    } finally {
      setSubmittingComments({ ...submittingComments, [leaveId]: false });
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error && error.includes('Forbidden')) {
    return <AccessDenied message="You do not have permission to view leave records." />;
  }

  const filteredLeaves = statusFilter !== 'all' 
    ? leaves.filter(l => l.status === statusFilter)
    : leaves;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            {isHR ? 'Leave Management' : 'Leaves'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isHR ? 'Review and manage all leave requests' : 'Manage your leave requests'}
          </p>
        </div>
        {!isHR && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Request Leave
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Leave</DialogTitle>
                <DialogDescription>
                  Submit a new leave request. HR will review and approve your request.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitLeave}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="leave_type">Leave Type</Label>
                    <Select
                      value={formData.leave_type}
                      onValueChange={(value) => setFormData({ ...formData, leave_type: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select leave type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="casual">Casual</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="sick">Sick</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="start_date">Start Date</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      required
                      min={formData.start_date}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reason">Reason (Optional)</Label>
                    <Input
                      id="reason"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      placeholder="Enter reason for leave"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isHR && (
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leaves</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {filteredLeaves.length === 0 ? (
        <NoData 
          title={isHR || isManager ? "No Leave Requests" : "No Leave Requests"} 
          description={isHR || isManager ? "There are no leave requests to review." : "You haven't submitted any leave requests yet."}
          actionLabel={!(isHR || isManager) ? "Request Leave" : undefined}
          onAction={!(isHR || isManager) ? () => setIsDialogOpen(true) : undefined}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {isHR ? 'All Leave Requests' : isManager ? 'Team Leave Requests' : 'My Leave Requests'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredLeaves.map((leave) => {
                const isExpanded = expandedLeaves.has(leave.id);
                const comments = leave.comments || [];
                const hasComments = comments.length > 0;
                
                return (
                  <div
                    key={leave.id}
                    className="border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-4 flex-1">
                        <Calendar className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          {(isHR || isManager) && (
                            <div className="flex items-center gap-2 mb-1">
                              <User className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm font-medium">{leave.user_name || leave.user_email}</span>
                            </div>
                          )}
                          <p className="font-medium">
                            {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                          </p>
                          <span className="text-sm text-muted-foreground bg-yellow-100 p-1 rounded-md">
                            {leave.leave_type.charAt(0).toUpperCase() + leave.leave_type.slice(1)} • {leave.days || 0} day(s)
                          </span>
                          {leave.reason && (
                            <p className="text-sm text-muted-foreground mt-1">{leave.reason}</p>
                          )}
                          {leave.approved_by_name && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {leave.status === 'approved' ? 'Approved' : 'Rejected'} by {leave.approved_by_name}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {getStatusIcon(leave.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                          {leave.status}
                        </span>
                        {canApprove && leave.status === 'pending' && (
                          <div className="flex gap-2 ml-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-600 hover:bg-green-50"
                              onClick={() => handleApproveReject(leave.id, 'approved')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-600 hover:bg-red-50"
                              onClick={() => handleApproveReject(leave.id, 'rejected')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                        {(canApprove || hasComments) && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleLeaveExpanded(leave.id)}
                            className="gap-1"
                          >
                            <MessageSquare className="h-4 w-4" />
                            {hasComments && <span className="text-xs">({comments.length})</span>}
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {/* Comments Section */}
                    {isExpanded && (
                      <div className="border-t p-4 bg-muted/30">
                        <div className="space-y-4">
                          {/* Add Comment Form - Only for HR and Managers */}
                          {canApprove && (
                            <form onSubmit={(e) => handleAddComment(leave.id, e)} className="space-y-2">
                              <Label htmlFor={`comment-${leave.id}`}>Add a comment</Label>
                              <div className="flex gap-2">
                                <Textarea
                                  id={`comment-${leave.id}`}
                                  value={commentInputs[leave.id] || ''}
                                  onChange={(e) => setCommentInputs({ ...commentInputs, [leave.id]: e.target.value })}
                                  placeholder="Write a comment..."
                                  disabled={submittingComments[leave.id]}
                                  rows={3}
                                  className="resize-none"
                                />
                                <Button
                                  type="submit"
                                  disabled={!commentInputs[leave.id]?.trim() || submittingComments[leave.id]}
                                  size="icon"
                                  className="h-[72px]"
                                >
                                  {submittingComments[leave.id] ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </form>
                          )}

                          {/* Comments List */}
                          <div className="space-y-3">
                            {comments.length === 0 ? (
                              <div className="text-center py-4 text-sm text-muted-foreground">
                                No comments yet. {canApprove && 'Be the first to comment!'}
                              </div>
                            ) : (
                              comments.map((comment) => (
                                <div key={comment.id} className="flex items-start gap-3 p-3 rounded-lg border bg-background">
                                  <div className="flex-shrink-0">
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                      <User className="h-4 w-4 text-primary" />
                                    </div>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium text-sm">{comment.user_name}</p>
                                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                        {comment.user_role}
                                      </span>
                                    </div>
                                    <p className="text-sm text-foreground whitespace-pre-wrap">{comment.comment}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {new Date(comment.created_at).toLocaleString()}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


