/**
 * ============================================================
 * REVIEWS ROUTES
 * User ratings and reviews
 * ============================================================
 */

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/reviews/user/:userId
 * Get reviews for a user
 */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await req.supabase
      .from('reviews')
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, name, avatar_url),
        order:orders(id, created_at, items:order_items(product:products(title)))
      `, { count: 'exact' })
      .eq('reviewee_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    // Get average rating
    const { data: stats } = await req.supabase
      .from('profiles')
      .select('rating_average, rating_count')
      .eq('id', userId)
      .single();

    res.json({
      reviews: data || [],
      stats: {
        average: stats?.rating_average || 0,
        count: stats?.rating_count || 0,
      },
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, pages: Math.ceil((count || 0) / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/reviews
 * Create a review
 */
router.post('/', requireAuth, validate(schemas.createReview), async (req, res) => {
  try {
    const { reviewee_id, order_id, rating, comment } = req.body;

    // Can't review yourself
    if (reviewee_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot review yourself' });
    }

    // Check for existing review
    if (order_id) {
      const { data: existing } = await req.supabase
        .from('reviews')
        .select('id')
        .eq('reviewer_id', req.user.id)
        .eq('order_id', order_id)
        .single();

      if (existing) {
        return res.status(400).json({ error: 'Already reviewed this order' });
      }

      // Verify user was part of order
      const { data: order } = await req.supabase
        .from('orders')
        .select('buyer_id, seller_id')
        .eq('id', order_id)
        .single();

      if (!order || (order.buyer_id !== req.user.id && order.seller_id !== req.user.id)) {
        return res.status(403).json({ error: 'Not authorized to review this order' });
      }
    }

    const { data, error } = await req.supabase
      .from('reviews')
      .insert({
        reviewer_id: req.user.id,
        reviewee_id,
        order_id,
        rating,
        comment,
      })
      .select(`
        *,
        reviewer:profiles!reviewer_id(id, name, avatar_url)
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error creating review:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/reviews/pending
 * Get orders pending review
 */
router.get('/pending', requireAuth, async (req, res) => {
  try {
    // Get completed orders user participated in
    const { data: orders } = await req.supabase
      .from('orders')
      .select(`
        id,
        buyer_id,
        seller_id,
        created_at,
        buyer:profiles!buyer_id(id, name, avatar_url),
        seller:profiles!seller_id(id, name, avatar_url),
        items:order_items(product:products(title))
      `)
      .eq('status', 'completed')
      .or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`)
      .order('created_at', { ascending: false });

    // Get user's existing reviews
    const { data: existingReviews } = await req.supabase
      .from('reviews')
      .select('order_id')
      .eq('reviewer_id', req.user.id);

    const reviewedOrderIds = new Set(existingReviews?.map(r => r.order_id) || []);

    // Filter to orders not yet reviewed
    const pendingReviews = (orders || [])
      .filter(order => !reviewedOrderIds.has(order.id))
      .map(order => ({
        order,
        reviewee: order.buyer_id === req.user.id ? order.seller : order.buyer,
      }));

    res.json(pendingReviews);
  } catch (error) {
    console.error('Error fetching pending reviews:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
