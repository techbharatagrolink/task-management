'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Get user role and redirect to appropriate dashboard
    fetch('/api/auth/check')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
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
        } else {
          router.push('/login');
        }
      })
      .catch(() => {
        router.push('/login');
      });
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading dashboard...</p>
      </div>
    </div>
  );
}

