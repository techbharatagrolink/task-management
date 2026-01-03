'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Trophy, 
  Users, 
  CheckCircle2, 
  Star,
  TrendingUp,
  Award,
  Loader2,
  User
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import NoData from '@/components/NoData';

export default function TopEmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(10);
  const [department, setDepartment] = useState('');
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    fetchTopEmployees();
    fetchDepartments();
  }, [limit, department]);

  const fetchDepartments = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      if (data.employees) {
        const uniqueDepts = [...new Set(data.employees.map(emp => emp.department).filter(Boolean))];
        setDepartments(uniqueDepts.sort());
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  };

  const fetchTopEmployees = async () => {
    try {
      setLoading(true);
      let url = `/api/top-employees?limit=${limit}`;
      if (department) {
        url += `&department=${encodeURIComponent(department)}`;
      }
      
      const res = await authenticatedFetch(url);
      const text = await res.text();
      if (!text) {
        setEmployees([]);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr);
        setEmployees([]);
        return;
      }
      
      if (res.ok && data.employees) {
        setEmployees(data.employees);
      } else {
        console.error('Failed to fetch top employees:', data.error);
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to fetch top employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const getRatingColor = (rating) => {
    if (!rating) return 'text-muted-foreground';
    if (rating >= 4.5) return 'text-green-600';
    if (rating >= 4.0) return 'text-green-500';
    if (rating >= 3.5) return 'text-yellow-500';
    if (rating >= 3.0) return 'text-orange-500';
    return 'text-red-500';
  };

  const getRatingBadgeColor = (rating) => {
    if (!rating) return 'bg-gray-100 text-gray-600';
    if (rating >= 4.5) return 'bg-green-100 text-green-700';
    if (rating >= 4.0) return 'bg-green-50 text-green-600';
    if (rating >= 3.5) return 'bg-yellow-100 text-yellow-700';
    if (rating >= 3.0) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-500" />
            Top Employees
          </h1>
          <p className="text-muted-foreground mt-1">
            View top performing employees based on task completion and ratings
          </p>
        </div>
        <Link href="/dashboard/employee-ratings">
          <Button className="gap-2">
            <Award className="h-4 w-4" />
            Submit Rating
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm font-medium mb-2 block">Department</label>
              <Select value={department || "all"} onValueChange={(val) => setDepartment(val === "all" ? "" : val)}>
                <SelectTrigger>
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="min-w-[150px]">
              <label className="text-sm font-medium mb-2 block">Show Top</label>
              <Select value={limit.toString()} onValueChange={(val) => setLimit(parseInt(val))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Top 5</SelectItem>
                  <SelectItem value="10">Top 10</SelectItem>
                  <SelectItem value="20">Top 20</SelectItem>
                  <SelectItem value="50">Top 50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Employees List */}
      {employees.length === 0 ? (
        <NoData 
          title="No Employees Found" 
          description="No employee data available. Ratings and task completion data will appear here once employees start completing tasks and receiving ratings."
        />
      ) : (
        <div className="grid gap-6">
          {employees.map((employee, index) => (
            <Card key={employee.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      {index < 3 && (
                        <div className="absolute -top-2 -left-2 bg-yellow-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm z-10">
                          {index + 1}
                        </div>
                      )}
                      {employee.profile_photo ? (
                        <img 
                          src={employee.profile_photo} 
                          alt={employee.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center border-2 border-primary">
                          <User className="h-8 w-8 text-primary" />
                        </div>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-xl flex items-center gap-2">
                        {employee.name}
                        {index < 3 && (
                          <Trophy className="h-5 w-5 text-yellow-500" />
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {employee.designation || employee.role}
                        {employee.department && ` • ${employee.department}`}
                      </CardDescription>
                    </div>
                  </div>
                  <Link href={`/dashboard/employees/${employee.id}`}>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Task Completion Stats */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Task Performance
                    </h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          <span className="text-sm">Tasks Completed</span>
                        </div>
                        <span className="font-bold text-lg">{employee.tasks_completed}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Assigned</span>
                        <span className="font-medium">{employee.total_tasks_assigned}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Completion Rate</span>
                        <Badge variant="outline" className="font-semibold">
                          {employee.task_completion_rate.toFixed(1)}%
                        </Badge>
                      </div>
                      {employee.task_completion_rate > 0 && (
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-600 h-2 rounded-full transition-all"
                            style={{ width: `${Math.min(employee.task_completion_rate, 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Ratings */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Performance Ratings
                    </h3>
                    {employee.ratings.total_ratings === 0 ? (
                      <p className="text-sm text-muted-foreground">No ratings yet</p>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Star className="h-4 w-4 text-yellow-500" />
                            <span className="text-sm">Overall Average</span>
                          </div>
                          <Badge className={getRatingBadgeColor(employee.ratings.overall_average)}>
                            {employee.ratings.overall_average?.toFixed(2) || 'N/A'} / 5.0
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Workplace Behaviour</span>
                            <span className={getRatingColor(employee.ratings.workplace_behaviour)}>
                              {employee.ratings.workplace_behaviour?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Discipline</span>
                            <span className={getRatingColor(employee.ratings.discipline)}>
                              {employee.ratings.discipline?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Innovations</span>
                            <span className={getRatingColor(employee.ratings.innovations)}>
                              {employee.ratings.innovations?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Punctuality</span>
                            <span className={getRatingColor(employee.ratings.punctuality)}>
                              {employee.ratings.punctuality?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between col-span-2">
                            <span className="text-muted-foreground">Critical Task Delivery</span>
                            <span className={getRatingColor(employee.ratings.critical_task_delivery)}>
                              {employee.ratings.critical_task_delivery?.toFixed(1) || 'N/A'}
                            </span>
                          </div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Based on {employee.ratings.total_ratings} rating{employee.ratings.total_ratings !== 1 ? 's' : ''}</span>
                            <Link 
                              href={`/dashboard/employee-ratings?employee_id=${employee.id}`}
                              className="text-primary hover:underline"
                            >
                              View All Ratings
                            </Link>
                          </div>
                        </div>
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
  );
}

