'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, Calendar, CheckCircle2, XCircle, LogIn, LogOut, Loader2, Users, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { authenticatedFetch } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [allAttendance, setAllAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [viewMode, setViewMode] = useState('personal'); // 'personal' or 'admin'
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchUser();
    fetchAttendance();
    fetchTodayAttendance();
  }, []);

  useEffect(() => {
    if (user && (user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'HR')) {
      fetchAllAttendance();
      fetchEmployees();
    }
  }, [user, dateFilter]);

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

  const fetchAttendance = async () => {
    try {
      const res = await authenticatedFetch('/api/attendance');
      const data = await res.json();
      
      if (res.ok) {
        setAttendance(data.records || []);
      } else {
        setError(data.error || 'Failed to fetch attendance');
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
      setError('Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayAttendance = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const res = await authenticatedFetch(`/api/attendance?start_date=${today}&end_date=${today}`);
      const data = await res.json();
      
      if (res.ok && data.records && data.records.length > 0) {
        setTodayAttendance(data.records[0]);
      } else {
        setTodayAttendance(null);
      }
    } catch (err) {
      console.error('Failed to fetch today attendance:', err);
    }
  };

  const fetchAllAttendance = async () => {
    try {
      const res = await authenticatedFetch(`/api/attendance?start_date=${dateFilter}&end_date=${dateFilter}`);
      const data = await res.json();
      
      if (res.ok) {
        setAllAttendance(data.records || []);
      }
    } catch (err) {
      console.error('Failed to fetch all attendance:', err);
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
    }
  };

  const handleSignIn = async () => {
    setSigningIn(true);
    try {
      const res = await authenticatedFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ action: 'sign_in' }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success',
          description: 'Signed in successfully',
        });
        fetchTodayAttendance();
        fetchAttendance();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to sign in',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to sign in:', err);
      toast({
        title: 'Error',
        description: 'Failed to sign in',
        variant: 'destructive',
      });
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      const res = await authenticatedFetch('/api/attendance', {
        method: 'POST',
        body: JSON.stringify({ action: 'sign_out' }),
      });

      const data = await res.json();

      if (res.ok) {
        toast({
          title: 'Success',
          description: `Signed out successfully. Total hours: ${data.total_hours || 0}`,
        });
        fetchTodayAttendance();
        fetchAttendance();
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to sign out',
          variant: 'destructive',
        });
      }
    } catch (err) {
      console.error('Failed to sign out:', err);
      toast({
        title: 'Error',
        description: 'Failed to sign out',
        variant: 'destructive',
      });
    } finally {
      setSigningOut(false);
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
    return <AccessDenied message="You do not have permission to view attendance records." />;
  }

  const isSignedIn = todayAttendance && todayAttendance.login_time && !todayAttendance.logout_time;
  const isSignedOut = todayAttendance && todayAttendance.logout_time;
  const isAdmin = user && (user.role === 'Super Admin' || user.role === 'Admin' || user.role === 'HR');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Clock className="h-8 w-8" />
            Attendance
          </h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin && viewMode === 'admin' 
              ? 'View all employees attendance records' 
              : 'Sign in/out and view your attendance records'}
          </p>
        </div>
        {isAdmin && (
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'personal' ? 'default' : 'outline'}
              onClick={() => setViewMode('personal')}
            >
              My Attendance
            </Button>
            <Button
              variant={viewMode === 'admin' ? 'default' : 'outline'}
              onClick={() => setViewMode('admin')}
              className="gap-2"
            >
              <Users className="h-4 w-4" />
              All Employees
            </Button>
          </div>
        )}
      </div>

      {viewMode === 'admin' && isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              All Employees Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="date-filter">Filter by Date</Label>
                  <Input
                    id="date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
              
              {allAttendance.length === 0 ? (
                <NoData 
                  title="No Attendance Records" 
                  description={`No attendance records found for ${new Date(dateFilter).toLocaleDateString()}`}
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Employee
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sign In
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sign Out
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Hours
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allAttendance.map((record) => (
                        <tr key={record.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                <span className="text-indigo-600 font-medium">
                                  {record.user_name?.charAt(0).toUpperCase() || 'U'}
                                </span>
                              </div>
                              <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900">{record.user_name}</div>
                                <div className="text-sm text-gray-500">{record.user_email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(record.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.login_time 
                              ? new Date(record.login_time).toLocaleTimeString() 
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.logout_time 
                              ? new Date(record.logout_time).toLocaleTimeString() 
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {record.total_hours 
                              ? `${parseFloat(record.total_hours).toFixed(2)} hrs` 
                              : '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              record.status === 'present' 
                                ? 'bg-green-100 text-green-800' 
                                : record.status === 'half_day'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {record.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>

      {/* Today's Attendance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          {todayAttendance ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-accent/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{new Date(todayAttendance.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                    <div className="text-sm text-muted-foreground space-y-1 mt-1">
                      {todayAttendance.login_time && (
                        <p>Sign In: {new Date(todayAttendance.login_time).toLocaleTimeString()}</p>
                      )}
                      {todayAttendance.logout_time && (
                        <p>Sign Out: {new Date(todayAttendance.logout_time).toLocaleTimeString()}</p>
                      )}
                      {todayAttendance.total_hours && (
                        <p className="font-medium text-foreground">Total Hours: {parseFloat(todayAttendance.total_hours).toFixed(2)}</p>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isSignedOut ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : isSignedIn ? (
                    <Clock className="h-5 w-5 text-blue-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-gray-600" />
                  )}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    isSignedOut 
                      ? 'bg-green-100 text-green-800' 
                      : isSignedIn
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {isSignedOut ? 'Signed Out' : isSignedIn ? 'Signed In' : 'Not Signed In'}
                  </span>
                </div>
              </div>
              <div className="flex gap-3">
                {!isSignedIn && (
                  <Button 
                    onClick={handleSignIn} 
                    disabled={signingIn || signingOut}
                    className="gap-2 flex-1"
                    size="lg"
                  >
                    {signingIn ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing In...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4" />
                        Sign In
                      </>
                    )}
                  </Button>
                )}
                {isSignedIn && !isSignedOut && (
                  <Button 
                    onClick={handleSignOut} 
                    disabled={signingIn || signingOut}
                    variant="outline"
                    className="gap-2 flex-1"
                    size="lg"
                  >
                    {signingOut ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Signing Out...
                      </>
                    ) : (
                      <>
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">You haven't signed in today</p>
                <Button 
                  onClick={handleSignIn} 
                  disabled={signingIn || signingOut}
                  className="gap-2"
                  size="lg"
                >
                  {signingIn ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    <>
                      <LogIn className="h-4 w-4" />
                      Sign In
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Attendance History */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
        </CardHeader>
        <CardContent>
          {attendance.length === 0 ? (
            <NoData 
              title="No Attendance Records" 
              description="Your attendance records will appear here once you start logging in."
              actionLabel="Refresh"
              onAction={fetchAttendance}
            />
          ) : (
            <div className="space-y-4">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{new Date(record.date).toLocaleDateString()}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.login_time ? `Sign In: ${new Date(record.login_time).toLocaleTimeString()}` : 'No sign in time'}
                        {record.logout_time && ` | Sign Out: ${new Date(record.logout_time).toLocaleTimeString()}`}
                      </p>
                      {record.total_hours && (
                        <p className="text-sm font-medium text-foreground mt-1">
                          Total Hours: {parseFloat(record.total_hours).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.status === 'present' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-600" />
                    )}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      record.status === 'present' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}


