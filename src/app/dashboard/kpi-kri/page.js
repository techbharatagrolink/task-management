'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import KPICard from '@/components/ui/kpi-card';
import KRIAlert from '@/components/ui/kri-alert';
import { authenticatedFetch } from '@/lib/auth-client';
import { 
  TrendingUp, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Filter,
  Calendar,
  Users,
  Building2
} from 'lucide-react';

export default function KPIKRIDashboard() {
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [periodType, setPeriodType] = useState('monthly');
  const [userId, setUserId] = useState('');
  const [department, setDepartment] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Data
  const [kpiDefinitions, setKpiDefinitions] = useState([]);
  const [kriDefinitions, setKriDefinitions] = useState([]);
  const [kpiMetrics, setKpiMetrics] = useState([]);
  const [kriMetrics, setKriMetrics] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    fetchUserRole();
    fetchDefinitions();
    fetchEmployees();
    setDefaultDateRange();
  }, []);

  useEffect(() => {
    if (kpiDefinitions.length > 0 || kriDefinitions.length > 0) {
      fetchMetrics();
    }
  }, [periodType, userId, department, startDate, endDate]);

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

  const fetchDefinitions = async () => {
    try {
      const [kpiRes, kriRes] = await Promise.all([
        authenticatedFetch('/api/kpi/definitions'),
        authenticatedFetch('/api/kri/definitions')
      ]);
      const kpiData = await kpiRes.json();
      const kriData = await kriRes.json();
      setKpiDefinitions(kpiData.definitions || []);
      setKriDefinitions(kriData.definitions || []);
    } catch (err) {
      console.error('Failed to fetch definitions:', err);
      setError('Failed to load KPI/KRI definitions');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await authenticatedFetch('/api/employees');
      const data = await res.json();
      const employeesList = data.employees || [];
      setEmployees(employeesList);
      
      // Extract unique departments
      const depts = [...new Set(employeesList.map(emp => emp.department).filter(Boolean))];
      setDepartments(depts);
    } catch (err) {
      console.error('Failed to fetch employees:', err);
    }
  };

  const setDefaultDateRange = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    setStartDate(startOfMonth.toISOString().split('T')[0]);
    setEndDate(endOfMonth.toISOString().split('T')[0]);
  };

  const fetchMetrics = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({
        period_type: periodType,
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate }),
        ...(userId && { user_id: userId }),
        ...(department && { department: department })
      });

      const [kpiRes, kriRes] = await Promise.all([
        authenticatedFetch(`/api/kpi/metrics?${params.toString()}`),
        authenticatedFetch(`/api/kri/metrics?${params.toString()}`)
      ]);

      const kpiData = await kpiRes.json();
      const kriData = await kriRes.json();

      setKpiMetrics(kpiData.metrics || []);
      setKriMetrics(kriData.metrics || []);
    } catch (err) {
      console.error('Failed to fetch metrics:', err);
      setError('Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculate = async () => {
    setCalculating(true);
    setError('');
    setSuccess('');
    try {
      const body = {
        period_type: periodType,
        ...(startDate && { period_start: startDate }),
        ...(endDate && { period_end: endDate }),
        ...(userId && { user_id: parseInt(userId) }),
        ...(department && { department: department })
      };

      await Promise.all([
        authenticatedFetch('/api/kpi/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        }),
        authenticatedFetch('/api/kri/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        })
      ]);

      setSuccess('Metrics calculated successfully');
      fetchMetrics();
    } catch (err) {
      console.error('Failed to calculate metrics:', err);
      setError('Failed to calculate metrics');
    } finally {
      setCalculating(false);
    }
  };

  // Group metrics by definition for display
  const getLatestMetricForKPI = (kpiId) => {
    return kpiMetrics.find(m => m.kpi_id === kpiId) || null;
  };

  const getLatestMetricForKRI = (kriId) => {
    return kriMetrics.find(m => m.kri_id === kriId) || null;
  };

  const isAdmin = userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Manager' || userRole === 'HR';

  if (loading && kpiDefinitions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8" />
            KPI & KRI Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">Monitor performance indicators and risk metrics</p>
        </div>
        {isAdmin && (
          <Button 
            onClick={handleCalculate} 
            disabled={calculating}
            className="gap-2"
          >
            {calculating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Calculate Metrics
              </>
            )}
          </Button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="bg-green-50 border-green-200">
          <AlertDescription className="text-green-800">{success}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle>Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="period-type">Period Type</Label>
              <Select value={periodType} onValueChange={setPeriodType}>
                <SelectTrigger id="period-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isAdmin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="user">User</Label>
                  <Select value={userId || 'all'} onValueChange={(value) => setUserId(value === 'all' ? '' : value)}>
                    <SelectTrigger id="user">
                      <SelectValue placeholder="All Users" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Users</SelectItem>
                      {employees.map(emp => (
                        <SelectItem key={emp.id} value={emp.id.toString()}>
                          {emp.name} {emp.department ? `(${emp.department})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Select value={department || 'all'} onValueChange={(value) => setDepartment(value === 'all' ? '' : value)}>
                    <SelectTrigger id="department">
                      <SelectValue placeholder="All Departments" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KRI Alerts Section */}
      {kriDefinitions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
            <h2 className="text-2xl font-semibold">Key Risk Indicators (KRIs)</h2>
          </div>
          {kriMetrics.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No KRI metrics found. Click "Calculate Metrics" to generate data.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {kriDefinitions
                .filter(kri => kri.is_active)
                .map(kri => {
                  const metric = getLatestMetricForKRI(kri.id);
                  return metric ? (
                    <KRIAlert key={kri.id} kri={kri} metric={metric} />
                  ) : null;
                })}
            </div>
          )}
        </div>
      )}

      {/* KPI Metrics Section */}
      {kpiDefinitions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            <h2 className="text-2xl font-semibold">Key Performance Indicators (KPIs)</h2>
          </div>
          {kpiMetrics.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No KPI metrics found. Click "Calculate Metrics" to generate data.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kpiDefinitions
                .filter(kpi => kpi.is_active)
                .map(kpi => {
                  const metric = getLatestMetricForKPI(kpi.id);
                  return metric ? (
                    <KPICard key={kpi.id} kpi={kpi} metric={metric} />
                  ) : null;
                })}
            </div>
          )}
        </div>
      )}

      {kpiDefinitions.length === 0 && kriDefinitions.length === 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No KPI/KRI definitions found. Please check database setup.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

