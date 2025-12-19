// Instagram posts API
import { NextResponse } from 'next/server';
import { verifyAuth, hasPermission } from '@/lib/auth';
import { query } from '@/lib/db';

// Get Instagram posts
export async function GET(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Design & Content Team'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const postType = searchParams.get('post_type');

    let sql = `
      SELECT i.*, u.name as created_by_name
      FROM instagram_posts i
      JOIN users u ON i.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (startDate) {
      sql += ' AND i.post_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      sql += ' AND i.post_date <= ?';
      params.push(endDate);
    }

    if (postType) {
      sql += ' AND i.post_type = ?';
      params.push(postType);
    }

    sql += ' ORDER BY i.post_date DESC LIMIT 500';

    const posts = await query(sql, params);

    // Calculate totals by type
    const totals = {
      posts: 0,
      reels: 0,
      banners: 0,
      total_views: 0,
      total_follows: 0
    };

    posts.forEach(post => {
      if (post.post_type === 'post') totals.posts += 1;
      if (post.post_type === 'reel') totals.reels += 1;
      if (post.post_type === 'banner') totals.banners += 1;
      totals.total_views += post.view_count || 0;
      totals.total_follows += post.follow_count || 0;
    });

    return NextResponse.json({ posts, totals });
  } catch (error) {
    console.error('Get Instagram posts error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create Instagram post
export async function POST(request) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasPermission(user.role, ['Super Admin', 'Admin', 'Design & Content Team'])) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { post_date, post_type, description, post_link, view_count, follow_count } = body;

    if (!post_date || !post_type) {
      return NextResponse.json(
        { error: 'Post date and type are required' },
        { status: 400 }
      );
    }

    if (!['post', 'reel', 'banner'].includes(post_type)) {
      return NextResponse.json(
        { error: 'Invalid post type' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO instagram_posts 
       (post_date, post_type, description, post_link, view_count, follow_count, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        post_date,
        post_type,
        description || null,
        post_link || null,
        view_count || 0,
        follow_count || 0,
        user.id
      ]
    );

    return NextResponse.json({ success: true, id: result.insertId });
  } catch (error) {
    console.error('Create Instagram post error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

