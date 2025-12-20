// Logout API route
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

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

    // Create response
    const response = NextResponse.json({ success: true });
    
    // Clear cookie on the response object (required for Next.js App Router)
    response.cookies.delete('token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

