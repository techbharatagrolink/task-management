// NDA acceptance API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { query } from '@/lib/db';

export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if already accepted - PERFORMANCE FIX: Select specific columns
    const existing = await query(
      'SELECT id, user_id, accepted, accepted_at FROM ndas WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [user.id]
    );

    if (existing.length > 0 && existing[0].accepted) {
      return NextResponse.json({
        success: true,
        message: 'NDA already accepted'
      });
    }

    // Insert or update NDA acceptance
    if (existing.length > 0) {
      await query(
        'UPDATE ndas SET accepted = 1, accepted_at = NOW() WHERE user_id = ?',
        [user.id]
      );
    } else {
      await query(
        'INSERT INTO ndas (user_id, accepted, accepted_at) VALUES (?, 1, NOW())',
        [user.id]
      );
    }

    // Log activity
    await query(
      'INSERT INTO activity_logs (user_id, action, module, details) VALUES (?, ?, ?, ?)',
      [user.id, 'nda_accepted', 'nda', 'User accepted NDA']
    );

    return NextResponse.json({
      success: true,
      message: 'NDA accepted successfully'
    });
  } catch (error) {
    console.error('NDA acceptance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

