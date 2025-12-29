'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Send, Loader2, User } from 'lucide-react';
import NoData from '@/components/NoData';
import { authenticatedFetch } from '@/lib/auth-client';
import { hasRoleAccess } from '@/lib/roleCheck';
import AccessDenied from '@/components/AccessDenied';
import Link from 'next/link';
// Helper function to format date as "X time ago"
function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days !== 1 ? 's' : ''} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years !== 1 ? 's' : ''} ago`;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchNotifications();
  }, []);

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

  const fetchNotifications = async () => {
    try {
      const res = await authenticatedFetch('/api/notifications');
      const data = await res.json();
      
      console.log('Notifications API response:', { status: res.status, data });
      
      if (res.ok) {
        const notificationsList = data.notifications || [];
        console.log(`Received ${notificationsList.length} notifications`);
        setNotifications(notificationsList);
      } else {
        console.error('Failed to fetch notifications:', data.error || data.details || 'Unknown error');
        // Still set empty array to show "no notifications" message
        setNotifications([]);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const canSendNotifications = user && hasRoleAccess(user.role, ['Super Admin', 'Admin', 'Manager', 'HR']);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!user) {
    return <AccessDenied message="Please log in to view notifications." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            {canSendNotifications 
              ? 'View notifications you\'ve sent and manage communications'
              : 'View your notifications and important updates'}
          </p>
        </div>
        {canSendNotifications && (
          <Link href="/dashboard/notifications/send">
            <Button className="gap-2">
              <Send className="h-4 w-4" />
              Send Notification
            </Button>
          </Link>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {canSendNotifications ? 'Sent Notifications' : 'Your Notifications'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length === 0 ? (
            <NoData
              title="No notifications"
              description={
                canSendNotifications
                  ? "You haven't sent any notifications yet."
                  : "You don't have any notifications at this time."
              }
            />
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">
                        {notification.title}
                      </h3>
                      <p className="text-muted-foreground mb-3 whitespace-pre-wrap">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>From: {notification.created_by_name} ({notification.created_by_role})</span>
                        </div>
                        <span>
                          {formatTimeAgo(notification.created_at)}
                        </span>
                        {canSendNotifications && notification.recipient_count && (
                          <span>
                            Sent to {notification.recipient_count} {notification.recipient_count === 1 ? 'person' : 'people'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

