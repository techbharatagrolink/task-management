// Get current password hash (for display purposes - cannot decrypt)
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get password hash (for display - note that it's hashed and cannot be decrypted)
    const users = await query(
      'SELECT password FROM users WHERE id = ?',
      [user.id]
    );

    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Return a masked version or note that password cannot be displayed
    // Since password is hashed, we can't show the actual password
    return NextResponse.json({ 
      hasPassword: !!users[0].password,
      message: 'Password is stored securely and cannot be displayed'
    });
  } catch (error) {
    console.error('Get password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}



