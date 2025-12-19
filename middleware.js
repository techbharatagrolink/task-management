// Next.js middleware for authentication
import { NextResponse } from 'next/server';
import { verifyToken } from './src/lib/token.js';

export function middleware(request) {
  // Skip middleware for API routes (they handle auth themselves)
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Skip middleware for login and NDA pages
  if (request.nextUrl.pathname === '/login' || request.nextUrl.pathname === '/nda') {
    return NextResponse.next();
  }

  // Check for token in cookies
  const token = request.cookies.get('token')?.value;

  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // CRITICAL FIX: Verify token validity in middleware
  const decoded = verifyToken(token);
  if (!decoded) {
    // Invalid token - clear cookie and redirect
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('token');
    return response;
  }

  // Token is valid, allow access
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg$).*)',
  ],
};

