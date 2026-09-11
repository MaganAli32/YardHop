/**
 * ============================================================
 * PROFILES ROUTES
 * User profile management
 * ============================================================
 */

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/profiles/:id
 * Get user profile
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('profiles')
      .select(`
        id, name, bio, location, avatar_url, role, verified,
        rating_average, rating_count, created_at
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Profile not found' });
      }
      throw error;
    }

    // Get stats
    const [productsCount, reviewsData] = await Promise.all([
      req.supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('seller_id', id)
        .eq('status', 'active'),
      req.supabase
        .from('reviews')
        .select('rating, comment, created_at, reviewer:profiles!reviewer_id(name, avatar_url)')
        .eq('reviewee_id', id)
        .order('created_at', { ascending: false })
        .limit(5),
    ]);

    res.json({
      ...data,
      stats: {
        products_count: productsCount.count || 0,
      },
      recent_reviews: reviewsData.data || [],
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/profiles/:id
 * Update user profile
 */
router.put('/:id', requireAuth, validate(schemas.updateProfile), async (req, res) => {
  try {
    const { id } = req.params;

    // Verify user is updating their own profile
    if (id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const { data, error } = await req.supabase
      .from('profiles')
      .update(req.body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/profiles/:id/products
 * Get user's products
 */
router.get('/:id/products', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = req.supabase
      .from('products')
      .select(`
        *,
        images:product_images(id, url, is_primary, order_index)
      `, { count: 'exact' })
      .eq('seller_id', id)
      .order('created_at', { ascending: false });

    // Only show active products to others
    if (req.user?.id !== id) {
      query = query.eq('status', 'active');
    } else if (status) {
      query = query.eq('status', status);
    }

    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      products: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching user products:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/profiles/:id/reviews
 * Get reviews for user
 */
router.get('/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await req.supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, name, avatar_url)
      `, { count: 'exact' })
      .eq('reviewee_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      reviews: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
