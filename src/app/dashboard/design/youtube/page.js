'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Video, ExternalLink, Calendar, Clock, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';
import { authenticatedFetch } from '@/lib/auth-client';

export default function YouTubePage() {
  const [feedData, setFeedData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchFeed();
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

  const fetchFeed = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await authenticatedFetch('/api/design/youtube/feed?maxResults=12');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to fetch feed: ${res.statusText}`);
      }
      
      const data = await res.json();
      setFeedData(data);
    } catch (err) {
      console.error('Failed to fetch YouTube feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) {
        return 'Today';
      } else if (diffDays === 1) {
        return 'Yesterday';
      } else if (diffDays < 7) {
        return `${diffDays} days ago`;
      } else if (diffDays < 30) {
        const weeks = Math.floor(diffDays / 7);
        return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
      } else {
        return date.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        });
      }
    } catch {
      return 'Invalid date';
    }
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
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

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="h-8 w-8" />
              YouTube Feed
            </h1>
            <p className="text-muted-foreground mt-1">View YouTube videos from channel</p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-red-600 mb-4">Error loading feed: {error}</p>
              <Button onClick={fetchFeed}>Retry</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!feedData || !feedData.items || feedData.items.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Video className="h-8 w-8" />
              YouTube Feed
            </h1>
            <p className="text-muted-foreground mt-1">View YouTube videos from channel</p>
          </div>
        </div>
        <NoData 
          title="No YouTube Videos" 
          description="There are no YouTube videos to display."
          actionLabel="Refresh"
          onAction={fetchFeed}
        />
      </div>
    );
  }

  const { items, pageInfo } = feedData;
  const channelTitle = items[0]?.snippet?.channelTitle || 'YouTube Channel';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Video className="h-8 w-8" />
            YouTube Feed
          </h1>
          <p className="text-muted-foreground mt-1">Latest videos from {channelTitle}</p>
        </div>
        <Button onClick={fetchFeed} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Channel Stats */}
      {pageInfo && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Video className="h-4 w-4 text-muted-foreground" />
                <span className="font-semibold">{pageInfo.totalResults?.toLocaleString()}</span>
                <span className="text-muted-foreground">total videos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold">{items.length}</span>
                <span className="text-muted-foreground">showing</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item) => {
          const videoId = item.id?.videoId;
          const snippet = item.snippet || {};
          const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url;
          const videoUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : '#';
          
          return (
            <Card key={item.etag || videoId} className="overflow-hidden hover:shadow-lg transition-shadow">
              <a
                href={videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative aspect-video bg-muted overflow-hidden">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={snippet.title || 'YouTube video'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="360"%3E%3Crect fill="%23f3f4f6" width="480" height="360"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EThumbnail unavailable%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No thumbnail available
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20 hover:bg-black/30 transition-colors group">
                    <div className="bg-red-600 rounded-full p-3 group-hover:scale-110 transition-transform">
                      <Play className="h-6 w-6 text-white ml-1" fill="white" />
                    </div>
                  </div>
                </div>
              </a>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <h3 className="font-semibold line-clamp-2 text-sm leading-tight">
                    <a
                      href={videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-blue-600 transition-colors"
                    >
                      {snippet.title || 'Untitled Video'}
                    </a>
                  </h3>
                  
                  {snippet.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {truncateText(snippet.description, 80)}
                    </p>
                  )}
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(snippet.publishedAt)}</span>
                    </div>
                    {snippet.publishTime && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(snippet.publishTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                  </div>
                  
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    Watch on YouTube
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}


