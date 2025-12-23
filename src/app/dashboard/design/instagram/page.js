'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, ExternalLink, Calendar, Hash, Users, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';
import { authenticatedFetch } from '@/lib/auth-client';

export default function InstagramPage() {
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
      const res = await authenticatedFetch('/api/design/instagram/feed');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || `Failed to fetch feed: ${res.statusText}`);
      }
      
      const data = await res.json();
      setFeedData(data);
    } catch (err) {
      console.error('Failed to fetch Instagram feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'Invalid date';
    }
  };

  const truncateCaption = (caption, maxLength = 150) => {
    if (!caption) return '';
    if (caption.length <= maxLength) return caption;
    return caption.substring(0, maxLength) + '...';
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
              <Instagram className="h-8 w-8" />
              Instagram Feed
            </h1>
            <p className="text-muted-foreground mt-1">View Instagram posts from feed</p>
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

  if (!feedData || !feedData.posts || feedData.posts.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Instagram className="h-8 w-8" />
              Instagram Feed
            </h1>
            <p className="text-muted-foreground mt-1">View Instagram posts from feed</p>
          </div>
        </div>
        <NoData 
          title="No Instagram Posts" 
          description="There are no Instagram posts to display."
          actionLabel="Refresh"
          onAction={fetchFeed}
        />
      </div>
    );
  }

  const { username, biography, profilePictureUrl, website, followersCount, followsCount, posts } = feedData;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Instagram className="h-8 w-8" />
            Instagram Feed
          </h1>
          <p className="text-muted-foreground mt-1">View Instagram posts from @{username}</p>
        </div>
        <Button onClick={fetchFeed} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="flex-shrink-0">
              <img
                src={profilePictureUrl}
                alt={username}
                className="w-24 h-24 rounded-full object-cover border-2 border-border"
              />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-bold">@{username}</h2>
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Website
                  </a>
                )}
              </div>
              {biography && (
                <p className="text-sm whitespace-pre-line text-muted-foreground">
                  {biography}
                </p>
              )}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{followersCount?.toLocaleString()}</span>
                  <span className="text-muted-foreground">followers</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{followsCount?.toLocaleString()}</span>
                  <span className="text-muted-foreground">following</span>
                </div>
                <div className="flex items-center gap-2">
                  <Instagram className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">{posts.length}</span>
                  <span className="text-muted-foreground">posts</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Posts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {posts.map((post) => {
          const imageUrl = post.sizes?.medium?.mediaUrl || post.sizes?.large?.mediaUrl || post.sizes?.small?.mediaUrl || post.mediaUrl;
          const isCarousel = post.mediaType === 'CAROUSEL_ALBUM';
          const isVideo = post.mediaType === 'VIDEO';
          
          return (
            <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <a
                href={post.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="block"
              >
                <div className="relative aspect-square bg-muted overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={post.caption || 'Instagram post'}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%23f3f4f6" width="400" height="400"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-family="sans-serif" font-size="14"%3EImage unavailable%3C/text%3E%3C/svg%3E';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No image available
                    </div>
                  )}
                  {(isCarousel || isVideo) && (
                    <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                      <Instagram className="h-3 w-3" />
                      {isCarousel ? 'Carousel' : 'Video'}
                    </div>
                  )}
                </div>
              </a>
              <CardContent className="p-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(post.timestamp)}</span>
                  </div>
                  
                  {post.caption && (
                    <p className="text-sm line-clamp-3">
                      {truncateCaption(post.prunedCaption || post.caption, 120)}
                    </p>
                  )}
                  
                  {post.hashtags && post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {post.hashtags.slice(0, 5).map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                        >
                          <Hash className="h-3 w-3" />
                          {tag}
                        </span>
                      ))}
                      {post.hashtags.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{post.hashtags.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                  
                  <a
                    href={post.permalink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline"
                  >
                    View on Instagram
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


