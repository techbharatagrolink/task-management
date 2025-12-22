import DashboardLayout from '../../components/DashboardLayout';

// Server-side layout - user authentication will be checked client-side in DashboardLayout
// This allows the page to load and handle auth checks with token from localStorage
export default async function DashboardLayoutWrapper({ children }) {
  // Return layout without user - DashboardLayout will fetch user client-side with token
  // This is necessary because we can't access localStorage on the server
  return <DashboardLayout user={null}>{children}</DashboardLayout>;
}

