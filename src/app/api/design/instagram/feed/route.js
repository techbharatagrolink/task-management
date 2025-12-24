// Instagram feed API - Proxy for external Behold.so API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';

const INSTAGRAM_FEED_API = 'https://feeds.behold.so/n6p92l3vvzszmv2469km';

// Get Instagram feed from external API
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Design & Content Team'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch from external API
    const response = await fetch(INSTAGRAM_FEED_API, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch Instagram feed: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get Instagram feed error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch Instagram feed' },
      { status: 500 }
    );
  }
}


