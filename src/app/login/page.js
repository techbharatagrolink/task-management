'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader } from '@/components/ui/loader';
import { Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { setAuthToken } from '@/lib/auth-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    // Check if already logged in
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { getAuthHeaders } = await import('@/lib/auth-client');
      const res = await fetch('/api/auth/check', {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      
      if (data.authenticated) {
        if (!data.ndaAccepted) {
          router.push('/nda');
        } else {
          redirectToDashboard(data.user.role);
        }
      }
    } catch (err) {
      console.error('Auth check failed:', err);
    }
  };

  const redirectToDashboard = (role) => {
    const roleRoutes = {
      'Super Admin': '/dashboard/admin',
      'Admin': '/dashboard/admin',
      'HR': '/dashboard/hr',
      'Manager': '/dashboard/manager',
      'Backend Developer': '/dashboard/developer',
      'Frontend Developer': '/dashboard/developer',
      'AI/ML Developer': '/dashboard/developer',
      'App Developer': '/dashboard/developer',
      'Digital Marketing': '/dashboard/marketing',
      'Logistics': '/dashboard/logistics',
      'Design & Content Team': '/dashboard/design'
    };
    
    router.push(roleRoutes[role] || '/dashboard');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        const errorMessage = data.error || 'Login failed';
        const errorDetails = data.details || '';
        
        // Set error state for inline display
        setError(errorMessage);
        
        // Show toast notification with details
        toast({
          variant: 'destructive',
          title: 'Login Failed',
          description: errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage,
        });
        
        setLoading(false);
        return;
      }

      // Store token in localStorage
      if (data.token) {
        const tokenStored = setAuthToken(data.token);
        if (!tokenStored) {
          toast({
            variant: 'destructive',
            title: 'Warning',
            description: 'Failed to store authentication token. Please try again.',
          });
          setLoading(false);
          return;
        }
        console.log('[LOGIN CLIENT] Token stored successfully');
      } else {
        console.error('[LOGIN CLIENT] No token in response');
        toast({
          variant: 'destructive',
          title: 'Login Error',
          description: 'Authentication token not received. Please try again.',
        });
        setLoading(false);
        return;
      }

      // Success - show success toast
      toast({
        title: 'Login Successful',
        description: `Welcome back, ${data.user.name || data.user.email}!`,
      });
      
      // Check NDA status
      if (!data.ndaAccepted) {
        setLoading(false);
        router.push('/nda');
      } else {
        setLoading(false);
        // Redirect immediately - no need to wait for cookies
        redirectToDashboard(data.user.role);
      }
    } catch (err) {
      const errorMessage = 'Network error. Please check your connection and try again.';
      setError(errorMessage);
      
      // Show toast for network errors
      toast({
        variant: 'destructive',
        title: 'Connection Error',
        description: err.message || errorMessage,
      });
      
      console.error('Login network error:', err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl rounded-2xl border-0">
          <CardHeader className="space-y-1 text-center pb-8">
            <div className="flex justify-center mb-4">
              <div className="p-4 bg-primary/10 ">
                <img 
                  src="https://ik.imagekit.io/h7mvzndkk/seller.bharatagrolink.com/whatsappbg.png?updatedAt=1763807245201" 
                  alt="Bharat Agrolink Logo" 
                  className="h-12 w-auto object-contain"
                />
              </div>
            </div>
            <CardTitle className="text-3xl font-bold tracking-tight">
              Bharat Agrolink Management
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <Alert variant="destructive" className="animate-fadeIn">
                  <AlertDescription className="font-medium">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                    emailFocused ? "text-primary" : "text-muted-foreground"
                  )} />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError('');
                    }}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    required
                    placeholder="name@example.com"
                    disabled={loading}
                    className={cn(
                      "pl-10 h-11",
                      error && "border-destructive focus-visible:ring-destructive"
                    )}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className={cn(
                    "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors",
                    passwordFocused ? "text-primary" : "text-muted-foreground"
                  )} />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setError('');
                    }}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    required
                    placeholder="Enter your password"
                    disabled={loading}
                    className={cn(
                      "pl-10 pr-10 h-11",
                      error && "border-destructive focus-visible:ring-destructive"
                    )}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-11 text-base font-semibold border-2"
                size="lg"
                disabled={loading || !email || !password}
              >
                {loading ? (
                  <>
                    <Loader className="mr-2 text-white" size="sm" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    <span>Sign In</span>
                  </>
                )}
              </Button>

              {/* <div className="text-center text-sm text-muted-foreground pt-1">
                <p>Secure login with encrypted credentials</p>
              </div> */}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

