'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Megaphone, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';

export default function AdsPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchAds();
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
    }
  };

  const fetchAds = async () => {
    try {
      const res = await fetch('/api/marketing/ads');
      const data = await res.json();
      
      if (res.ok) {
        setAds(data.ads || []);
      }
    } catch (err) {
      console.error('Failed to fetch ads:', err);
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

  if (!user || !hasRoleAccess(user.role, ['Digital Marketing', 'Super Admin', 'Admin'])) {
    return <AccessDenied message="This page is only accessible to Digital Marketing team, Admin, and Super Admin." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Megaphone className="h-8 w-8" />
            Ad Campaigns
          </h1>
          <p className="text-muted-foreground mt-1">Manage advertising campaigns</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {ads.length === 0 ? (
        <NoData 
          title="No Ad Campaigns" 
          description="There are no ad campaigns to display."
          actionLabel="Refresh"
          onAction={fetchAds}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Campaign List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ads.map((ad) => (
                <div
                  key={ad.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{ad.campaign_name || 'Unnamed Campaign'}</p>
                    <p className="text-sm text-muted-foreground">
                      {ad.platform} • {ad.status || 'Active'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{ad.budget || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">
                      {ad.start_date ? new Date(ad.start_date).toLocaleDateString() : 'N/A'}
                    </p>
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


