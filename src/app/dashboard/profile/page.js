'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Briefcase, Building2, Calendar } from 'lucide-react';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';

import { authenticatedFetch } from '@/lib/auth-client';
export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const data = await res.json();
      
      if (data.authenticated) {
        setUser(data.user);
      } else {
        setError('Unauthorized');
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      setError('Failed to load profile');
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

  if (error) {
    return <AccessDenied message={error} />;
  }

  if (!user) {
    return <NoData title="Profile Not Found" description="Unable to load your profile information." />;
  }

  const isOwner = user.role === 'Super Admin';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          {isOwner 
            ? 'Owner account - Full system access and control' 
            : 'View and manage your profile information'}
        </p>
      </div>

      {isOwner && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-primary">Owner Account</p>
                <p className="text-sm text-muted-foreground">
                  You have full system access and administrative privileges. This account is not listed as an employee.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {isOwner ? 'Owner Information' : 'Personal Information'}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Full Name
              </Label>
              <Input value={user.name || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                Email Address
              </Label>
              <Input value={user.email || 'N/A'} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                {user.role === 'Super Admin' ? 'Position' : 'Role'}
              </Label>
              <Input 
                value={user.role === 'Super Admin' ? 'Owner' : (user.role || 'N/A')} 
                disabled 
                className={user.role === 'Super Admin' ? 'font-semibold text-primary' : ''}
              />
            </div>
            {!isOwner && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    Department
                  </Label>
                  <Input value={user.department || 'N/A'} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    Designation
                  </Label>
                  <Input value={user.designation || 'N/A'} disabled />
                </div>
              </>
            )}
            {isOwner && (
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  System Access
                </Label>
                <Input value="Full System Access - All Departments" disabled className="font-medium" />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

