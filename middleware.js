// Next.js middleware for authentication
// Note: Middleware runs on the edge and cannot access Authorization headers from client-side requests
// Authentication is now handled via Authorization headers in API routes and client-side checks
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Skip middleware for API routes (they handle auth themselves via Authorization headers)
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Skip middleware for login and NDA pages
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/nda') {
    return NextResponse.next();
  }

  // For page routes, let them load and handle authentication client-side
  // API routes will handle authentication via Authorization headers
  // This approach is more reliable than cookie-based auth for SPAs
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)',
  ],
};

