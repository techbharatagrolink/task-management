'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Calendar, CheckCircle2, XCircle } from 'lucide-react';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';

export default function AttendancePage() {
  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchAttendance();
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

  const fetchAttendance = async () => {
    try {
      const res = await fetch('/api/attendance');
      const data = await res.json();
      
      if (res.ok) {
        setAttendance(data.attendance || []);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Clock className="h-8 w-8" />
          Attendance
        </h1>
        <p className="text-muted-foreground mt-1">View your attendance records</p>
      </div>

      {attendance.length === 0 ? (
        <NoData 
          title="No Attendance Records" 
          description="Your attendance records will appear here once you start logging in."
          actionLabel="Refresh"
          onAction={fetchAttendance}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Attendance History</CardTitle>
          </CardHeader>
          <CardContent>
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
                        {record.login_time ? `Login: ${new Date(record.login_time).toLocaleTimeString()}` : 'No login time'}
                        {record.logout_time && ` | Logout: ${new Date(record.logout_time).toLocaleTimeString()}`}
                      </p>
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}


