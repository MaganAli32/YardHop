/**
 * ============================================================
 * FAVORITES ROUTES
 * Wishlist/saved items management
 * ============================================================
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/favorites
 * Get user's favorites
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await req.supabase
      .from('favorites')
      .select(`
        id,
        created_at,
        product:products(
          id, title, description, price, original_price, market_average,
          is_steal, steal_percentage, condition, category, location, status,
          images:product_images(id, url, is_primary),
          seller:profiles!seller_id(id, name, avatar_url)
        )
      `, { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      favorites: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/favorites
 * Add product to favorites
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

    // Check if already favorited
    const { data: existing } = await req.supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .single();

    if (existing) {
      return res.status(400).json({ error: 'Product already in favorites' });
    }

    const { data, error } = await req.supabase
      .from('favorites')
      .insert({
        user_id: req.user.id,
        product_id,
      })
      .select(`
        id,
        created_at,
        product:products(id, title, price, images:product_images(url))
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding favorite:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/favorites/:productId
 * Remove product from favorites
 */
router.delete('/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const { error } = await req.supabase
      .from('favorites')
      .delete()
      .eq('user_id', req.user.id)
      .eq('product_id', productId);

    if (error) throw error;

    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/favorites/check/:productId
 * Check if product is favorited
 */
router.get('/check/:productId', requireAuth, async (req, res) => {
  try {
    const { productId } = req.params;

    const { data } = await req.supabase
      .from('favorites')
      .select('id')
      .eq('user_id', req.user.id)
      .eq('product_id', productId)
      .single();

    res.json({ is_favorited: !!data });
  } catch (error) {
    res.json({ is_favorited: false });
  }
});

export default router;
