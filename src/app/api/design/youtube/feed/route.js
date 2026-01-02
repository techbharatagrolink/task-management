// YouTube feed API - Proxy for external YouTube API
import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';

const YOUTUBE_CHANNEL_ID = 'UCT0hk8wAizrLKXW62D_N3Jg';
const YOUTUBE_API_BASE_URL = 'https://www.googleapis.com/youtube/v3/search';

// Get YouTube feed from external API
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'YouTube API key is not configured' },
        { status: 500 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const maxResults = searchParams.get('maxResults') || '10';

    // Build YouTube API URL
    const url = new URL(YOUTUBE_API_BASE_URL);
    url.searchParams.append('part', 'snippet');
    url.searchParams.append('channelId', YOUTUBE_CHANNEL_ID);
    url.searchParams.append('maxResults', maxResults);
    url.searchParams.append('order', 'date');
    url.searchParams.append('type', 'video');
    url.searchParams.append('key', apiKey);

    // Fetch from YouTube API
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 300 } // Cache for 5 minutes
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `YouTube API error: ${response.statusText}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Get YouTube feed error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch YouTube feed' },
      { status: 500 }
    );
  }
}

