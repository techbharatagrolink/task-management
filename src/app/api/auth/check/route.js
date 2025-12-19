// Check authentication status API
import { NextResponse } from 'next/server';
import { verifyAuth, checkNDAAccepted } from '@/lib/auth';

export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
    }

    const ndaAccepted = await checkNDAAccepted(user.id);

    return NextResponse.json({
      authenticated: true,
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
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json(
      { authenticated: false },
      { status: 401 }
    );
  }
}

