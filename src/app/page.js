'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/lib/auth-client';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is already logged in
    const checkAuth = async () => {
      try {
        const res = await authenticatedFetch('/api/auth/check');
        const data = await res.json();
        
        if (data.authenticated) {
          // User is logged in, redirect to appropriate dashboard
          if (!data.ndaAccepted) {
            router.push('/nda');
          } else {
            const role = data.user.role;
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
            router.push(roleRoutes[role] || '/dashboard/admin');
          }
        } else {
          // Not logged in, redirect to login
          router.push('/login');
        }
      } catch (error) {
        // Error checking auth, redirect to login
        router.push('/login');
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <div className="mb-6">
          <div className="inline-block p-4 bg-indigo-600 rounded-full mb-4">
            <svg
              className="w-12 h-12 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Inhouse Management System</h1>
          <p className="text-gray-600">Internal Work & Performance Monitoring</p>
        </div>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
