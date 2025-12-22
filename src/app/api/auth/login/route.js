// Login API route
import { NextResponse } from 'next/server';
import { comparePassword, generateToken, checkNDAAccepted, getUserByEmail } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      console.error('[LOGIN] Missing credentials - email or password not provided');
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    let user;
    try {
      user = await getUserByEmail(email);
    } catch (dbError) {
      console.error('[LOGIN] Database error while fetching user:', {
        email,
        error: dbError.message,
        stack: dbError.stack
      });
      return NextResponse.json(
        { error: 'Database connection error. Please try again later.', details: process.env.NODE_ENV === 'development' ? dbError.message : undefined },
        { status: 500 }
      );
    }

    if (!user) {
      console.error('[LOGIN] User not found:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    let isValidPassword;
    try {
      isValidPassword = await comparePassword(password, user.password);
    } catch (bcryptError) {
      console.error('[LOGIN] Password comparison error:', {
        email,
        error: bcryptError.message
      });
      return NextResponse.json(
        { error: 'Authentication error. Please try again.', details: process.env.NODE_ENV === 'development' ? bcryptError.message : undefined },
        { status: 500 }
      );
    }

    if (!isValidPassword) {
      console.error('[LOGIN] Invalid password for user:', email);
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    let token;
    try {
      token = generateToken(user.id, user.email, user.role);
    } catch (tokenError) {
      console.error('[LOGIN] Token generation error:', {
        userId: user.id,
        email: user.email,
        error: tokenError.message
      });
      return NextResponse.json(
        { error: 'Token generation failed. Please try again.', details: process.env.NODE_ENV === 'development' ? tokenError.message : undefined },
        { status: 500 }
      );
    }

    // Record login time (using UTC for consistency)
    const today = new Date().toISOString().split('T')[0];
    try {
      await query(
        `INSERT INTO attendance (user_id, login_time, date, status) 
         VALUES (?, UTC_TIMESTAMP(), ?, 'present')
         ON DUPLICATE KEY UPDATE login_time = UTC_TIMESTAMP()`,
        [user.id, today]
      );
    } catch (attendanceError) {
      console.error('[LOGIN] Attendance logging error:', {
        userId: user.id,
        error: attendanceError.message
      });
      // Don't fail login if attendance logging fails, just log it
    }

    // Log activity - FIX: Proper IP extraction
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');
    
    try {
      await query(
        'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
        [user.id, 'login', 'auth', `User logged in from ${ipAddress}`]
      );
    } catch (activityError) {
      console.error('[LOGIN] Activity logging error:', {
        userId: user.id,
        error: activityError.message
      });
      // Don't fail login if activity logging fails, just log it
    }

    // Check NDA status
    let ndaAccepted;
    try {
      ndaAccepted = await checkNDAAccepted(user.id);
    } catch (ndaError) {
      console.error('[LOGIN] NDA check error:', {
        userId: user.id,
        error: ndaError.message
      });
      // Default to false if check fails
      ndaAccepted = false;
    }

    // SECURITY FIX: Don't return token in response (it's in httpOnly cookie)
    // Create response with JSON data
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        designation: user.designation
      },
      ndaAccepted
    });

    // Set cookie on the response object (required for Next.js App Router)
    // CRITICAL FIX for Vercel: Cookie configuration must be precise
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    
    // Cookie settings optimized for Vercel
    // IMPORTANT: Do NOT set domain attribute - let browser/Vercel handle it
    // Setting domain manually can prevent cookies from being set in browsers
    const cookieOptions = {
      httpOnly: true,
      secure: true, // Always true on Vercel (HTTPS required) - browsers reject secure cookies on HTTP
      sameSite: 'lax', // 'lax' works for same-site requests (login is same-site)
      maxAge: 86400, // 24 hours in seconds
      path: '/', // Available across all routes
      // Explicitly DO NOT set domain - browser will use current domain
    };

    try {
      // Set the cookie using Next.js cookies API
      response.cookies.set('token', token, cookieOptions);
      
      // Additional: Try to manually append Set-Cookie header as backup
      // This ensures the cookie is definitely in the response headers
      const existingCookies = response.headers.getSetCookie();
      console.log('[LOGIN] Existing Set-Cookie headers:', existingCookies);
      
      // Build cookie string for verification
      const cookieStringParts = [
        `token=${token}`,
        `Path=${cookieOptions.path}`,
        `Max-Age=${cookieOptions.maxAge}`,
        cookieOptions.httpOnly ? 'HttpOnly' : '',
        cookieOptions.secure ? 'Secure' : '',
        `SameSite=${cookieOptions.sameSite}`
      ].filter(Boolean);
      
      console.log('[LOGIN] Cookie configuration:', {
        userId: user.id,
        email: user.email,
        production: isProduction,
        vercel: isVercel,
        cookieOptions: {
          httpOnly: cookieOptions.httpOnly,
          secure: cookieOptions.secure,
          sameSite: cookieOptions.sameSite,
          path: cookieOptions.path,
          maxAge: cookieOptions.maxAge,
          domain: 'NOT_SET (browser default)'
        },
        expectedCookieString: cookieStringParts.join('; '),
        setCookieHeaders: existingCookies,
        tokenLength: token.length
      });
      
      // Verify cookie was added to headers
      // Note: getSetCookie() returns an array of cookie strings
      const allCookies = response.headers.getSetCookie();
      const tokenCookieExists = allCookies && allCookies.length > 0 && allCookies.some(cookie => cookie.includes('token='));
      
      if (!tokenCookieExists) {
        console.error('[LOGIN] WARNING - Token cookie not found in Set-Cookie headers!');
        console.error('[LOGIN] Available Set-Cookie headers:', allCookies);
        console.error('[LOGIN] All response headers:', Object.fromEntries(response.headers.entries()));
      } else {
        console.log('[LOGIN] Cookie successfully added to Set-Cookie headers');
        // Log the actual cookie string that will be sent (first 100 chars of token for security)
        const tokenCookieHeader = allCookies.find(cookie => cookie.includes('token='));
        if (tokenCookieHeader) {
          console.log('[LOGIN] Set-Cookie header value (first 150 chars):', tokenCookieHeader.substring(0, 150) + '...');
        }
      }
      
      console.log('[LOGIN] Success - Cookie set for user:', {
        userId: user.id,
        email: user.email,
        cookieSet: tokenCookieExists
      });
    } catch (cookieError) {
      console.error('[LOGIN] Cookie setting error:', {
        error: cookieError.message,
        stack: cookieError.stack,
        userId: user.id
      });
      // Return error if cookie cannot be set
      return NextResponse.json(
        { error: 'Failed to set authentication cookie. Please try again.', details: process.env.NODE_ENV === 'development' ? cookieError.message : undefined },
        { status: 500 }
      );
    }

    return response;
  } catch (error) {
    console.error('[LOGIN] Unexpected error:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      },
      { status: 500 }
    );
  }
}

