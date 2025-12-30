'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User, Mail, Briefcase, Building2, Calendar, Lock, Eye, EyeOff, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import NoData from '@/components/NoData';
import AccessDenied from '@/components/AccessDenied';
import { cn } from '@/lib/utils';

import { authenticatedFetch } from '@/lib/auth-client';
export default function ProfilePage() {
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

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

  const handlePasswordChange = (field, value) => {
    setPasswordData({ ...passwordData, [field]: value });
    if (passwordErrors[field]) {
      setPasswordErrors({ ...passwordErrors, [field]: '' });
    }
    setPasswordSuccess(false);
  };

  const validatePasswordForm = () => {
    const errors = {};

    if (!passwordData.new_password) {
      errors.new_password = 'New password is required';
    } else if (passwordData.new_password.length < 6) {
      errors.new_password = 'Password must be at least 6 characters long';
    }

    if (!passwordData.confirm_password) {
      errors.confirm_password = 'Please confirm your new password';
    } else if (passwordData.new_password !== passwordData.confirm_password) {
      errors.confirm_password = 'Passwords do not match';
    }

    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordSuccess(false);

    if (!validatePasswordForm()) {
      return;
    }

    setChangingPassword(true);
    try {
      const res = await authenticatedFetch('/api/profile/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          new_password: passwordData.new_password
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setPasswordSuccess(true);
        setPasswordData({
          old_password: '',
          new_password: '',
          confirm_password: ''
        });
        toast({
          title: 'Success',
          description: 'Password changed successfully',
        });
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: data.error || 'Failed to change password',
        });
      }
    } catch (err) {
      console.error('Change password error:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Network error. Please try again.',
      });
    } finally {
      setChangingPassword(false);
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

      {/* Change Password Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password. Old password is not required.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            {passwordSuccess && (
              <Alert className="border-green-500 bg-green-50 border-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800 font-medium">
                  Password changed successfully!
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-4 p-4 bg-gray-50 rounded-lg border">
              <div className="space-y-2">
                <Label htmlFor="old_password" className="text-sm font-medium">
                  Current Password (for reference)
                </Label>
                <div className="relative">
                  <Input
                    id="old_password"
                    type={showOldPassword ? "text" : "password"}
                    value={passwordData.old_password}
                    onChange={(e) => handlePasswordChange('old_password', e.target.value)}
                    placeholder="Current password (cannot be displayed - stored securely)"
                    disabled
                    className="h-11 pr-10 bg-gray-100"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showOldPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Note: Your current password is stored securely and cannot be displayed. You can change your password without entering the old one.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="new_password" className="text-sm font-medium">
                  New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    value={passwordData.new_password}
                    onChange={(e) => handlePasswordChange('new_password', e.target.value)}
                    placeholder="Enter new password (min. 6 characters)"
                    disabled={changingPassword}
                    className={cn(
                      "h-11 pr-10",
                      passwordErrors.new_password && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    disabled={changingPassword}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {passwordErrors.new_password}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password" className="text-sm font-medium">
                  Confirm New Password <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="confirm_password"
                    type={showConfirmPassword ? "text" : "password"}
                    value={passwordData.confirm_password}
                    onChange={(e) => handlePasswordChange('confirm_password', e.target.value)}
                    placeholder="Confirm your new password"
                    disabled={changingPassword}
                    className={cn(
                      "h-11 pr-10",
                      passwordErrors.confirm_password && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                    disabled={changingPassword}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {passwordErrors.confirm_password && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {passwordErrors.confirm_password}
                  </p>
                )}
              </div>
            </div>

            <Button type="submit" disabled={changingPassword} className="w-full">
              {changingPassword ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Changing Password...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Change Password
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

