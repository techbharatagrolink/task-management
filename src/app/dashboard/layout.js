import DashboardLayout from '../../components/DashboardLayout';
import { cookies } from 'next/headers';

export default async function DashboardLayoutWrapper({ children }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  let user = null;
  if (token) {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const res = await fetch(`${baseUrl}/api/auth/check`, {
        headers: {
          Cookie: `token=${token}`,
        },
      });
      const data = await res.json();
      if (data.authenticated) {
        user = data.user;
      }
    } catch (err) {
      console.error('Failed to fetch user in layout:', err);
    }
  }

  if (!user) {
    return null; // Will redirect via middleware
  }

  return <DashboardLayout user={user}>{children}</DashboardLayout>;
}

