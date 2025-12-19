'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Megaphone, Globe, TrendingUp } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';

export default function MarketingDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeAds: 0,
    websiteTraffic: 0
  });

  useEffect(() => {
    fetchUser();
    fetchStats();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        if (!hasRoleAccess(data.user.role, ['Digital Marketing', 'Super Admin', 'Admin'])) {
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      // TODO: Fetch actual marketing stats from APIs
      setStats({
        totalLeads: 0,
        activeAds: 0,
        websiteTraffic: 0
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user || !hasRoleAccess(user.role, ['Digital Marketing', 'Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to Digital Marketing team, Admin, and Super Admin." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Marketing Dashboard</h1>
        <p className="text-muted-foreground mt-1">Digital Marketing Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Active Ads</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeAds}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Website Traffic</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.websiteTraffic}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/dashboard/marketing/leads"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Target className="h-5 w-5 mb-2" />
              <p className="font-medium">Manage Leads</p>
              <p className="text-sm text-muted-foreground">View and manage marketing leads</p>
            </a>
            <a
              href="/dashboard/marketing/ads"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Megaphone className="h-5 w-5 mb-2" />
              <p className="font-medium">Manage Ads</p>
              <p className="text-sm text-muted-foreground">Create and monitor ad campaigns</p>
            </a>
            <a
              href="/dashboard/marketing/traffic"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Globe className="h-5 w-5 mb-2" />
              <p className="font-medium">View Traffic</p>
              <p className="text-sm text-muted-foreground">Analyze website traffic data</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


