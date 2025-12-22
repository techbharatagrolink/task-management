'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { hasRoleAccess } from '@/lib/roleCheck';

import { authenticatedFetch } from '@/lib/auth-client';
export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetchUser();
    fetchLeads();
  }, []);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
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

  const fetchLeads = async () => {
    try {
      const res = await authenticatedFetch('/api/marketing/leads');
      const data = await res.json();
      
      if (res.ok) {
        setLeads(data.leads || []);
      }
    } catch (err) {
      console.error('Failed to fetch leads:', err);
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
            <Target className="h-8 w-8" />
            Leads
          </h1>
          <p className="text-muted-foreground mt-1">Manage marketing leads</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Lead
        </Button>
      </div>

      {leads.length === 0 ? (
        <NoData 
          title="No Leads" 
          description="There are no leads to display."
          actionLabel="Refresh"
          onAction={fetchLeads}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Lead List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {leads.map((lead) => (
                <div
                  key={lead.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div>
                    <p className="font-medium">{lead.name || 'Unknown'}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.email} • {lead.source || 'N/A'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{lead.status || 'New'}</p>
                    <p className="text-sm text-muted-foreground">
                      {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : 'N/A'}
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


