'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NDAPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/check');
      const data = await res.json();
      
      if (!data.authenticated) {
        router.push('/login');
      } else if (data.ndaAccepted) {
        // Already accepted, redirect to dashboard
        redirectToDashboard(data.user.role);
      }
    } catch (err) {
      console.error('Auth check failed:', err);
      router.push('/login');
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

  const handleAccept = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/nda/accept', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to accept NDA');
        setLoading(false);
        return;
      }

      // Get user role and redirect
      const authRes = await fetch('/api/auth/check');
      const authData = await authRes.json();
      
      if (authData.authenticated) {
        redirectToDashboard(authData.user.role);
      }
    } catch (err) {
      setError('Network error. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Non-Disclosure Agreement</h1>
          <p className="text-gray-600">Please read and accept the NDA to continue</p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6 max-h-96 overflow-y-auto">
          <div className="prose max-w-none">
            <h2 className="text-xl font-semibold mb-4">Confidentiality Agreement</h2>
            
            <p className="mb-4">
              This Non-Disclosure Agreement ("Agreement") is entered into between you and the Company 
              to protect confidential and proprietary information.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">1. Definition of Confidential Information</h3>
            <p className="mb-4">
              Confidential Information includes all non-public, proprietary, or confidential information 
              disclosed by the Company, including but not limited to: business plans, financial data, 
              customer lists, trade secrets, technical data, software, processes, and any other 
              information marked as confidential.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">2. Obligations</h3>
            <p className="mb-4">
              You agree to: (a) hold all Confidential Information in strict confidence; (b) not disclose 
              any Confidential Information to third parties without prior written consent; (c) use 
              Confidential Information solely for the purpose of performing your duties; and (d) take 
              reasonable precautions to protect the confidentiality of such information.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">3. Exceptions</h3>
            <p className="mb-4">
              This Agreement does not apply to information that: (a) is publicly available; (b) was 
              already known to you prior to disclosure; (c) is independently developed; or (d) is 
              required to be disclosed by law.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">4. Duration</h3>
            <p className="mb-4">
              Your obligations under this Agreement shall remain in effect during your employment and 
              continue indefinitely after termination of employment.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">5. Return of Materials</h3>
            <p className="mb-4">
              Upon termination of employment, you agree to return all Confidential Information and 
              materials containing such information to the Company.
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">6. Remedies</h3>
            <p className="mb-4">
              You acknowledge that any breach of this Agreement may cause irreparable harm to the 
              Company, and the Company shall be entitled to seek injunctive relief and other remedies 
              available under law.
            </p>

            <p className="mt-6 text-sm text-gray-600">
              By clicking "I Agree" below, you acknowledge that you have read, understood, and agree 
              to be bound by the terms of this Non-Disclosure Agreement.
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleAccept}
            disabled={loading}
            className="bg-indigo-600 text-white py-3 px-8 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {loading ? 'Processing...' : 'I Agree'}
          </button>
        </div>
      </div>
    </div>
  );
}

