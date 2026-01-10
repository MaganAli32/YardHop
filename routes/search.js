/**
 * ============================================================
 * SEARCH ROUTES
 * Global search and saved searches
 * ============================================================
 */

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { searchLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * GET /api/search
 * Global search across products and garage sales
 */
router.get('/', optionalAuth, searchLimiter, async (req, res) => {
  try {
    const {
      q,
      type = 'all', // 'all', 'products', 'sales'
      category,
      min_price,
      max_price,
      latitude,
      longitude,
      radius = 25,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const results = { products: [], sales: [] };

    // Search products
    if (type === 'all' || type === 'products') {
      let productQuery = req.supabase
        .from('products')
        .select(`
          id, title, description, price, condition, category, location,
          latitude, longitude, is_steal, steal_percentage, created_at,
          images:product_images(url, is_primary),
          seller:profiles!seller_id(id, name, avatar_url)
        `)
        .eq('status', 'active');

      if (q) {
        productQuery = productQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`);
      }

      if (category && category !== 'All') {
        productQuery = productQuery.eq('category', category);
      }

      if (min_price) {
        productQuery = productQuery.gte('price', parseFloat(min_price));
      }

      if (max_price) {
        productQuery = productQuery.lte('price', parseFloat(max_price));
      }

      productQuery = productQuery
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      const { data: products } = await productQuery;
      results.products = products || [];

      // Calculate distance if location provided
      if (latitude && longitude) {
        results.products = results.products.map(p => ({
          ...p,
          distance: p.latitude && p.longitude
            ? calculateDistance(parseFloat(latitude), parseFloat(longitude), p.latitude, p.longitude)
            : null,
        }));

        if (radius) {
          results.products = results.products.filter(p => !p.distance || p.distance <= parseFloat(radius));
        }
      }
    }

    // Search garage sales
    if (type === 'all' || type === 'sales') {
      const today = new Date().toISOString().split('T')[0];

      let salesQuery = req.supabase
        .from('garage_sales')
        .select(`
          id, title, description, address, latitude, longitude,
          start_date, start_time, end_time, is_multi_family, created_at,
          images:garage_sale_images(url, is_primary),
          host:profiles!host_id(id, name, avatar_url)
        `)
        .in('status', ['upcoming', 'active'])
        .gte('start_date', today);

      if (q) {
        salesQuery = salesQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%,address.ilike.%${q}%`);
      }

      salesQuery = salesQuery
        .order('start_date', { ascending: true })
        .range(offset, offset + parseInt(limit) - 1);

      const { data: sales } = await salesQuery;
      results.sales = sales || [];

      // Calculate distance if location provided
      if (latitude && longitude) {
        results.sales = results.sales.map(s => ({
          ...s,
          distance: s.latitude && s.longitude
            ? calculateDistance(parseFloat(latitude), parseFloat(longitude), s.latitude, s.longitude)
            : null,
        }));

        if (radius) {
          results.sales = results.sales.filter(s => !s.distance || s.distance <= parseFloat(radius));
        }
      }
    }

    // Save search to history if authenticated
    if (req.user && q) {
      await req.supabase.from('recent_searches').insert({
        user_id: req.user.id,
        query: q,
        filters: { category, min_price, max_price, latitude, longitude, radius },
      });

      // Keep only last 20 searches
      const { data: oldSearches } = await req.supabase
        .from('recent_searches')
        .select('id')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false })
        .range(20, 100);

      if (oldSearches?.length > 0) {
        await req.supabase
          .from('recent_searches')
          .delete()
          .in('id', oldSearches.map(s => s.id));
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/search/recent
 * Get user's recent searches
 */
router.get('/recent', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('recent_searches')
      .select('id, query, filters, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;

    // Deduplicate by query
    const seen = new Set();
    const unique = (data || []).filter(s => {
      if (seen.has(s.query.toLowerCase())) return false;
      seen.add(s.query.toLowerCase());
      return true;
    });

    res.json(unique);
  } catch (error) {
    console.error('Error fetching recent searches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/search/recent
 * Clear recent searches
 */
router.delete('/recent', requireAuth, async (req, res) => {
  try {
    await req.supabase
      .from('recent_searches')
      .delete()
      .eq('user_id', req.user.id);

    res.json({ message: 'Recent searches cleared' });
  } catch (error) {
    console.error('Error clearing searches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/search/saved
 * Get saved searches
 */
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('saved_searches')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json(data || []);
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/search/saved
 * Save a search
 */
router.post('/saved', requireAuth, async (req, res) => {
  try {
    const { name, search_criteria, notify_enabled = false } = req.body;

    if (!name || !search_criteria) {
      return res.status(400).json({ error: 'Name and search criteria are required' });
    }

    const { data, error } = await req.supabase
      .from('saved_searches')
      .insert({
        user_id: req.user.id,
        name,
        search_criteria,
        notify_enabled,
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error saving search:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/search/saved/:id
 * Delete saved search
 */
router.delete('/saved/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('saved_searches')
      .delete()
      .eq('id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Saved search deleted' });
  } catch (error) {
    console.error('Error deleting saved search:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/search/suggestions
 * Get search suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json([]);
    }

    // Get matching categories
    const categories = [
      'Furniture', 'Electronics', 'Clothing', 'Home Decor', 'Kitchen',
      'Toys & Games', 'Sports & Outdoors', 'Books & Media', 'Tools & Garden',
      'Vintage & Collectibles', 'Other'
    ].filter(c => c.toLowerCase().includes(q.toLowerCase()));

    // Get matching product titles
    const { data: products } = await req.supabase
      .from('products')
      .select('title')
      .eq('status', 'active')
      .ilike('title', `%${q}%`)
      .limit(5);

    const suggestions = [
      ...categories.map(c => ({ type: 'category', text: c })),
      ...(products || []).map(p => ({ type: 'product', text: p.title })),
    ].slice(0, 10);

    res.json(suggestions);
  } catch (error) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export default router;
