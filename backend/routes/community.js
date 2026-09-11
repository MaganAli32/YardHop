/**
 * ============================================================
 * COMMUNITY ROUTES
 * Community posts, free items, announcements
 * ============================================================
 */

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/community
 * List community posts
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = req.supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!author_id(id, name, avatar_url),
        images:community_post_images(id, url),
        likes:post_likes(count),
        comments:post_comments(count)
      `, { count: 'exact' })
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (type && type !== 'All') {
      query = query.eq('type', type);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Check if user liked each post
    let posts = data || [];
    if (req.user) {
      const { data: userLikes } = await req.supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', req.user.id)
        .in('post_id', posts.map(p => p.id));

      const likedPostIds = new Set(userLikes?.map(l => l.post_id) || []);
      posts = posts.map(post => ({
        ...post,
        is_liked: likedPostIds.has(post.id),
        like_count: post.likes?.[0]?.count || 0,
        comment_count: post.comments?.[0]?.count || 0,
      }));
    }

    res.json({
      posts,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, pages: Math.ceil((count || 0) / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/community/:id
 * Get single post
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles!author_id(id, name, avatar_url, bio),
        images:community_post_images(id, url),
        comments:post_comments(
          id, content, created_at,
          author:profiles!author_id(id, name, avatar_url)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Post not found' });
      }
      throw error;
    }

    // Get like count and check if user liked
    const { count: likeCount } = await req.supabase
      .from('post_likes')
      .select('id', { count: 'exact', head: true })
      .eq('post_id', id);

    let isLiked = false;
    if (req.user) {
      const { data: like } = await req.supabase
        .from('post_likes')
        .select('id')
        .eq('post_id', id)
        .eq('user_id', req.user.id)
        .single();
      isLiked = !!like;
    }

    // Increment view count
    await req.supabase
      .from('community_posts')
      .update({ view_count: (data.view_count || 0) + 1 })
      .eq('id', id);

    res.json({ ...data, like_count: likeCount || 0, is_liked: isLiked });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/community
 * Create community post
 */
router.post('/', requireAuth, validate(schemas.createPost), async (req, res) => {
  try {
    const { image_urls, ...postData } = req.body;

    const { data: post, error } = await req.supabase
      .from('community_posts')
      .insert({ ...postData, author_id: req.user.id })
      .select()
      .single();

    if (error) throw error;

    if (image_urls?.length > 0) {
      // Note: live DB's community_post_images has no order_index column
      // (created from database/schema/schema.sql); insertion order is preserved.
      const images = image_urls.map((url) => ({
        post_id: post.id,
        url,
      }));
      await req.supabase.from('community_post_images').insert(images);
    }

    const { data: completePost } = await req.supabase
      .from('community_posts')
      .select(`*, author:profiles!author_id(id, name, avatar_url), images:community_post_images(id, url)`)
      .eq('id', post.id)
      .single();

    res.status(201).json(completePost);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/community/:id/like
 * Like/unlike a post
 */
router.post('/:id/like', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await req.supabase
      .from('post_likes')
      .select('id')
      .eq('post_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (existing) {
      await req.supabase.from('post_likes').delete().eq('id', existing.id);
      res.json({ liked: false });
    } else {
      await req.supabase.from('post_likes').insert({ post_id: id, user_id: req.user.id });
      res.json({ liked: true });
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/community/:id/comments
 * Add comment to post
 */
router.post('/:id/comments', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const { data, error } = await req.supabase
      .from('post_comments')
      .insert({ post_id: id, author_id: req.user.id, content })
      .select(`id, content, created_at, author:profiles!author_id(id, name, avatar_url)`)
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/community/:id
 * Delete post
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data: existing } = await req.supabase
      .from('community_posts')
      .select('author_id')
      .eq('id', id)
      .single();

    if (!existing || existing.author_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await req.supabase.from('community_posts').update({ status: 'deleted' }).eq('id', id);
    res.json({ message: 'Post deleted' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
