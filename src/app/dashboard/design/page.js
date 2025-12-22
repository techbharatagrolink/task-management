'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Instagram, TrendingUp } from 'lucide-react';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';

import { authenticatedFetch } from '@/lib/auth-client';
export default function DesignDashboard() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    youtubeVideos: 0,
    instagramPosts: 0
  });

  useEffect(() => {
    fetchUser();
    fetchStats();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      if (data.authenticated) {
        setUser(data.user);
        if (!hasRoleAccess(data.user.role, ['Design & Content Team', 'Super Admin', 'Admin'])) {
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
      // TODO: Fetch actual design stats from APIs
      setStats({
        youtubeVideos: 0,
        instagramPosts: 0
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

  if (!user || !hasRoleAccess(user.role, ['Design & Content Team', 'Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to Design & Content Team, Admin, and Super Admin." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Design & Content Dashboard</h1>
        <p className="text-muted-foreground mt-1">Content Management Overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">YouTube Videos</CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.youtubeVideos}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Instagram Posts</CardTitle>
            <Instagram className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.instagramPosts}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a
              href="/dashboard/design/youtube"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Video className="h-5 w-5 mb-2" />
              <p className="font-medium">YouTube Content</p>
              <p className="text-sm text-muted-foreground">Manage YouTube videos and analytics</p>
            </a>
            <a
              href="/dashboard/design/instagram"
              className="p-4 border rounded-lg hover:bg-accent transition-colors"
            >
              <Instagram className="h-5 w-5 mb-2" />
              <p className="font-medium">Instagram Content</p>
              <p className="text-sm text-muted-foreground">Manage Instagram posts and analytics</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


