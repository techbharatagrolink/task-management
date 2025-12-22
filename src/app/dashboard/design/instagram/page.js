'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Instagram, Plus, Heart, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';

import { authenticatedFetch } from '@/lib/auth-client';
export default function InstagramPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchPosts();
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

  const fetchPosts = async () => {
    try {
      const res = await authenticatedFetch('/api/design/instagram');
      const data = await res.json();
      
      if (res.ok) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch posts:', err);
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
            <Instagram className="h-8 w-8" />
            Instagram Content
          </h1>
          <p className="text-muted-foreground mt-1">Manage Instagram posts and analytics</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Post
        </Button>
      </div>

      {posts.length === 0 ? (
        <NoData 
          title="No Instagram Posts" 
          description="There are no Instagram posts to display."
          actionLabel="Refresh"
          onAction={fetchPosts}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Post List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Instagram className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{post.caption || 'No caption'}</p>
                      <p className="text-sm text-muted-foreground">
                        {post.posted_date ? new Date(post.posted_date).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{post.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{post.comments || 0}</span>
                    </div>
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


