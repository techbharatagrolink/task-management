// Login API route
import { NextResponse } from 'next/server';
import { comparePassword, generateToken, checkNDAAccepted, getUserByEmail } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate token
    const token = generateToken(user.id, user.email, user.role);

    // Record login time (using UTC for consistency)
    const today = new Date().toISOString().split('T')[0];
    await query(
      `INSERT INTO attendance (user_id, login_time, date, status) 
       VALUES (?, UTC_TIMESTAMP(), ?, 'present')
       ON DUPLICATE KEY UPDATE login_time = UTC_TIMESTAMP()`,
      [user.id, today]
    );

    // Log activity - FIX: Proper IP extraction
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : (realIp || 'unknown');
    
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'login', 'auth', `User logged in from ${ipAddress}`]
    );

    // Check NDA status
    const ndaAccepted = await checkNDAAccepted(user.id);

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
    const isProduction = process.env.NODE_ENV === 'production';
    response.cookies.set('token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 86400, // 24 hours
      path: '/' // Ensure cookie is available across all routes
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

