'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, Plus, Play, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';

import { authenticatedFetch } from '@/lib/auth-client';
export default function YouTubePage() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchVideos();
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
    }
  };

  const fetchVideos = async () => {
    try {
      const res = await authenticatedFetch('/api/design/youtube');
      const data = await res.json();
      
      if (res.ok) {
        setVideos(data.videos || []);
      }
    } catch (err) {
      console.error('Failed to fetch videos:', err);
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

  if (!user || !hasRoleAccess(user.role, ['Design & Content Team', 'Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to Design & Content Team, Admin, and Super Admin." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="h-8 w-8" />
            YouTube Content
          </h1>
          <p className="text-muted-foreground mt-1">Manage YouTube videos and analytics</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Video
        </Button>
      </div>

      {videos.length === 0 ? (
        <NoData 
          title="No YouTube Videos" 
          description="There are no YouTube videos to display."
          actionLabel="Refresh"
          onAction={fetchVideos}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Video List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Play className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{video.title || 'Untitled Video'}</p>
                      <p className="text-sm text-muted-foreground">
                        {video.views || 0} views • {video.published_date ? new Date(video.published_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">{video.views || 0}</span>
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


