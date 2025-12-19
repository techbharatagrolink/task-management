'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Plus, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';

export default function LeavesPage() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchLeaves();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/check');
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
      const res = await fetch('/api/leaves');
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Leaves
          </h1>
          <p className="text-muted-foreground mt-1">Manage your leave requests</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Request Leave
        </Button>
      </div>

      {leaves.length === 0 ? (
        <NoData 
          title="No Leave Requests" 
          description="You haven't submitted any leave requests yet."
          actionLabel="Request Leave"
          onAction={() => {/* TODO: Open leave request modal */}}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Leave Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leaves.map((leave) => (
                <div
                  key={leave.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {leave.leave_type} • {leave.days} day(s)
                      </p>
                      {leave.reason && (
                        <p className="text-sm text-muted-foreground mt-1">{leave.reason}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(leave.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(leave.status)}`}>
                      {leave.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


