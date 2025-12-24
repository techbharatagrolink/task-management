'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { authenticatedFetch } from '@/lib/auth-client';
import { 
  Target, 
  Loader2,
  Calendar,
  TrendingUp,
  Users
} from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function KRAScoresPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [userRole, setUserRole] = useState(null);

  // Filters
  const [periodType, setPeriodType] = useState('monthly');
  const [periodYear, setPeriodYear] = useState(new Date().getFullYear());
  const [selectedUserId, setSelectedUserId] = useState('all');
  const [selectedRole, setSelectedRole] = useState('all');

  useEffect(() => {
    fetchUserRole();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (userRole && ['Super Admin', 'Admin', 'HR', 'Manager'].includes(userRole)) {
      fetchScores();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodType, periodYear, selectedUserId, selectedRole, userRole]);

  const fetchUserRole = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated && data.user) {
        setUserRole(data.user.role);
        // If not admin, redirect to personal KRA page
        if (!['Super Admin', 'Admin', 'HR', 'Manager'].includes(data.user.role)) {
          router.push('/dashboard/kra');
        }
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

  const fetchScores = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period_type: periodType,
        period_year: periodYear.toString()
      });

      const res = await authenticatedFetch(`/api/kra/scores?${params.toString()}`);
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('API error:', errorData);
        setScores([]);
        return;
      }

      const data = await res.json();
      let filteredScores = data.scores || [];

      // Apply filters
      if (selectedUserId !== 'all') {
        filteredScores = filteredScores.filter(s => s.user_id === parseInt(selectedUserId));
      }

      if (selectedRole !== 'all') {
        filteredScores = filteredScores.filter(s => s.user_role === selectedRole);
      }

      setScores(filteredScores);
    } catch (err) {
      console.error('Failed to fetch KRA scores:', err);
      setScores([]);
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceBadge = (category) => {
    const colors = {
      'Outstanding': 'bg-green-600 text-white',
      'Very Good': 'bg-blue-600 text-white',
      'Good': 'bg-yellow-600 text-white',
      'Needs Improvement': 'bg-orange-600 text-white',
      'Poor': 'bg-red-600 text-white'
    };
    return colors[category] || 'bg-gray-600 text-white';
  };

  const getPeriodLabel = (score) => {
    if (score.period_type === 'monthly' && score.period_month) {
      const monthName = new Date(2000, score.period_month - 1).toLocaleString('default', { month: 'long' });
      return `${monthName} ${score.period_year}`;
    } else if (score.period_type === 'quarterly' && score.period_quarter) {
      return `Q${score.period_quarter} ${score.period_year}`;
    } else if (score.period_type === 'yearly') {
      return score.period_year.toString();
    }
    return `${score.period_type} ${score.period_year}`;
  };

  // Get unique roles from employees
  const uniqueRoles = [...new Set(employees.map(emp => emp.role).filter(Boolean))].sort();

  // Filter employees by selected role
  const filteredEmployees = selectedRole === 'all' 
    ? employees 
    : employees.filter(emp => emp.role === selectedRole);

  // Show loading only on initial load
  if (loading && userRole === null) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="h-8 w-8" />
          KRA Performance Scores
        </h1>
        <p className="text-muted-foreground mt-1">View KRA performance scores for all employees</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-type">Period Type</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger id="period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="period-year">Year</Label>
              <Input
                id="period-year"
                type="number"
                value={periodYear}
                onChange={(e) => setPeriodYear(parseInt(e.target.value) || new Date().getFullYear())}
                min="2020"
                max="2030"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role-filter">Role</Label>
              <Select value={selectedRole} onValueChange={setSelectedRole}>
                <SelectTrigger id="role-filter">
                  <SelectValue placeholder="All Roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {uniqueRoles.map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employee-filter">Employee</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger id="employee-filter">
                  <SelectValue placeholder="All Employees" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {filteredEmployees.map(emp => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.name} {emp.department ? `(${emp.department})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scores Table */}
      {scores.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                No KRA scores found for the selected period and filters.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Performance Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Employee</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Period</th>
                    <th className="text-right p-3 font-medium">Score</th>
                    <th className="text-center p-3 font-medium">Category</th>
                    <th className="text-left p-3 font-medium">Last Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {scores.map((score) => (
                    <tr key={score.id} className="border-b hover:bg-accent">
                      <td className="p-3">
                        <div className="font-medium">{score.user_name}</div>
                        <div className="text-sm text-muted-foreground">{score.user_email}</div>
                      </td>
                      <td className="p-3">
                        <Badge variant="secondary">{score.user_role}</Badge>
                      </td>
                      <td className="p-3">{getPeriodLabel(score)}</td>
                      <td className="p-3 text-right">
                        <span className="text-2xl font-bold">{parseFloat(score.total_score).toFixed(2)}%</span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge className={getPerformanceBadge(score.performance_category)}>
                          {score.performance_category}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm text-muted-foreground">
                        {new Date(score.updated_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

