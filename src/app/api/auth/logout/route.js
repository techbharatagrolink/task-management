// Logout API route
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    
    if (user) {
      // Record logout time
      const today = new Date().toISOString().split('T')[0];
      await query(
        `UPDATE attendance 
         SET logout_time = NOW(), 
             total_hours = TIMESTAMPDIFF(HOUR, login_time, NOW())
         WHERE user_id = ? AND date = ?`,
        [user.id, today]
      );

      // Log activity
      await query(
        'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
        [user.id, 'logout', 'auth', 'User logged out']
      );
    }

    // Clear cookie
    const cookieStore = await cookies();
    cookieStore.delete('token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

