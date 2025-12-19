'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DeadlineTimer from '@/components/DeadlineTimer';
import { CheckSquare, ListChecks, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DeveloperDashboard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch assigned tasks
      const taskRes = await fetch('/api/tasks');
      const taskData = await taskRes.json();
      setTasks(taskData.tasks || []);

      // Fetch today's attendance
      const today = new Date().toISOString().split('T')[0];
      const attRes = await fetch(`/api/attendance?start_date=${today}&end_date=${today}`);
      const attData = await attRes.json();
      if (attData.records && attData.records.length > 0) {
        setAttendance(attData.records[0]);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
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

  const myTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
  const completedTasks = tasks.filter(t => t.status === 'completed');

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Developer Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Active Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{myTasks.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Completed Tasks</p>
          <p className="text-2xl font-bold text-gray-900">{completedTasks.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600">Today's Hours</p>
          <p className="text-2xl font-bold text-gray-900">
            {attendance?.total_hours || 0}h
          </p>
        </div>
      </div>

      {/* My Tasks */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-primary" />
            <CardTitle>My Active Tasks</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {myTasks.length === 0 ? (
            <div className="text-center py-8">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No active tasks assigned</p>
            </div>
          ) : (
            <div className="space-y-4">
              {myTasks.map((task) => (
                <Link
                  key={task.id}
                  href={`/dashboard/tasks/${task.id}`}
                  className="block p-4 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-base mb-1">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {task.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <Badge variant={task.priority === 'critical' ? 'destructive' : task.priority === 'high' ? 'default' : 'secondary'}>
                          {task.priority}
                        </Badge>
                        <Badge variant={task.status === 'in_progress' ? 'default' : 'outline'}>
                          {task.status.replace('_', ' ')}
                        </Badge>
                        {task.subtasks && task.subtasks.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ListChecks className="h-3 w-3" />
                            <span>{task.subtasks.length} subtask{task.subtasks.length !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
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
                    </div>
                    <div className="flex-shrink-0">
                      {task.deadline ? (
                        <DeadlineTimer deadline={task.deadline} />
                      ) : (
                        <Badge variant="outline" className="gap-1.5">
                          <Clock className="h-3 w-3" />
                          <span>No deadline</span>
                        </Badge>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

