/**
 * ============================================================
 * MARKETPLACE ROUTES (YardFront listings)
 * ============================================================
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function getAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const CATEGORIES = ['Electronics', 'Furniture', 'Clothing', 'Sneakers', 'Instruments', 'Collectibles', 'Sports', 'Tools', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

/**
 * GET /api/marketplace — list active listings with filters
 */
router.get('/', async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { search, category, condition, price_min, price_max, sort = 'newest', page = 1, limit = 24 } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 24));
    const offset = (pageNum - 1) * limitNum;

    let query = admin
      .from('listings')
      .select(`
        id, title, description, category, condition, asking_price, images, location,
        created_at, user_id, appraisal_id
      `, { count: 'exact' })
      .eq('status', 'active');

    if (search && String(search).trim()) {
      const term = String(search).trim().replace(/'/g, "''");
      query = query.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }
    if (category) query = query.eq('category', category);
    if (condition) query = query.eq('condition', condition);
    if (price_min != null && price_min !== '') query = query.gte('asking_price', parseFloat(price_min));
    if (price_max != null && price_max !== '') query = query.lte('asking_price', parseFloat(price_max));

    if (sort === 'price_asc') query = query.order('asking_price', { ascending: true });
    else if (sort === 'price_desc') query = query.order('asking_price', { ascending: false });
    else if (sort === 'best_deals') query = query.order('asking_price', { ascending: true });
    else query = query.order('created_at', { ascending: false });

    const { data: rows, error, count } = await query.range(offset, offset + limitNum - 1);

    if (error) throw error;

    // Fetch appraisal data for listings that have appraisal_id
    const withAppraisal = (rows || []).map(async (row) => {
      if (!row.appraisal_id) return { ...row, appraisal: null };
      const { data: appraisal } = await admin.from('appraisals').select('price_low, price_high, price_fair, confidence_score, sources_count').eq('id', row.appraisal_id).single();
      return { ...row, appraisal: appraisal ? { price_low: appraisal.price_low, price_high: appraisal.price_high, confidence_score: appraisal.confidence_score } : null };
    });

    const listings = await Promise.all(withAppraisal);

    res.json({
      listings,
      total: count ?? 0,
      page: pageNum,
      pages: Math.ceil((count ?? 0) / limitNum),
    });
  } catch (err) {
    console.error('Marketplace list error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch listings' });
  }
});

/**
 * POST /api/marketplace — create listing (requires auth)
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { title, description, category, condition, asking_price, images, location, shipping, appraisal_id } = req.body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!category || !CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Valid category is required' });
    }
    if (!condition || !CONDITIONS.includes(condition)) {
      return res.status(400).json({ error: 'Valid condition is required' });
    }
    const price = parseFloat(asking_price);
    if (isNaN(price) || price < 0) {
      return res.status(400).json({ error: 'Valid price is required' });
    }
    const imgArr = Array.isArray(images) ? images : [];
    if (imgArr.length === 0) {
      return res.status(400).json({ error: 'At least one image is required' });
    }

    const { data, error } = await admin
      .from('listings')
      .insert({
        user_id: req.user.id,
        title: title.trim(),
        description: (description || '').trim() || null,
        category,
        condition,
        asking_price: price,
        images: imgArr,
        location: (location || '').trim() || null,
        shipping: ['local', 'shipping', 'both'].includes(shipping) ? shipping : 'local',
        appraisal_id: appraisal_id || null,
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('Marketplace create error:', err);
    res.status(500).json({ error: err.message || 'Failed to create listing' });
  }
});

/**
 * GET /api/marketplace/:id — get single listing with seller + appraisal
 */
router.get('/:id', async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { id } = req.params;

    const { data: listing, error } = await admin
      .from('listings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !listing) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (listing.status !== 'active') {
      return res.status(404).json({ error: 'Listing not found' });
    }

    // Get seller profile
    const { data: profile } = await admin.from('profiles').select('id, name, avatar_url, created_at').eq('id', listing.user_id).single();

    let listingCount = 0;
    const { count } = await admin.from('listings').select('*', { count: 'exact', head: true }).eq('user_id', listing.user_id).eq('status', 'active');
    listingCount = count ?? 0;

    const seller = profile ? {
      id: profile.id,
      name: profile.name,
      avatar_url: profile.avatar_url,
      member_since: profile.created_at,
      listing_count: listingCount,
    } : null;

    // Get appraisal if linked
    let appraisal = null;
    if (listing.appraisal_id) {
      const { data: a } = await admin.from('appraisals').select('price_low, price_high, price_fair, confidence_score, sources_count, raw_sources').eq('id', listing.appraisal_id).single();
      if (a) {
        // raw_sources is the pricingSources array saved at appraisal time —
        // {source, count, avg, low, high, prices}. Older rows may instead
        // have it as a plain object keyed by source name; fall back to just
        // the names in that case rather than guessing at missing stats.
        const sources = Array.isArray(a.raw_sources)
          ? a.raw_sources.filter(Boolean).map(s => ({
              name: s.source,
              count: s.count,
              avg: Math.round(s.avg),
              low: Math.round(s.low),
              high: Math.round(s.high),
              prices: (s.prices || []).slice(0, 30),
            }))
          : (a.raw_sources && typeof a.raw_sources === 'object' ? Object.keys(a.raw_sources) : null);
        appraisal = {
          price_low: a.price_low,
          price_high: a.price_high,
          price_recommended: a.price_fair,
          confidence_score: a.confidence_score ?? 0,
          sources_count: a.sources_count ?? 0,
          sources,
        };
      }
    }

    res.json({ ...listing, seller, appraisal });
  } catch (err) {
    console.error('Marketplace get error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch listing' });
  }
});

/**
 * PUT /api/marketplace/:id — update listing (owner only)
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { id } = req.params;
    const { data: existing } = await admin.from('listings').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this listing' });
    }

    const allowed = ['title', 'description', 'category', 'condition', 'asking_price', 'images', 'location', 'shipping'];
    const updates = {};
    for (const k of allowed) {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    updates.updated_at = new Date().toISOString();

    const { data, error } = await admin.from('listings').update(updates).eq('id', id).select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Marketplace update error:', err);
    res.status(500).json({ error: err.message || 'Failed to update listing' });
  }
});

/**
 * DELETE /api/marketplace/:id — delete listing (owner only)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { id } = req.params;
    const { data: existing } = await admin.from('listings').select('user_id').eq('id', id).single();
    if (!existing || existing.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this listing' });
    }

    const { error } = await admin.from('listings').delete().eq('id', id);
    if (error) throw error;
    res.json({ message: 'Listing deleted' });
  } catch (err) {
    console.error('Marketplace delete error:', err);
    res.status(500).json({ error: err.message || 'Failed to delete listing' });
  }
});

/**
 * POST /api/marketplace/:id/save — save/wishlist
 */
router.post('/:id/save', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { id } = req.params;
    const { error } = await admin.from('saved_items').upsert({ user_id: req.user.id, listing_id: id }, { onConflict: 'user_id,listing_id' });
    if (error) throw error;
    res.json({ saved: true });
  } catch (err) {
    console.error('Marketplace save error:', err);
    res.status(500).json({ error: err.message || 'Failed to save' });
  }
});

/**
 * DELETE /api/marketplace/:id/save — unsave
 */
router.delete('/:id/save', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { id } = req.params;
    const { error } = await admin.from('saved_items').delete().eq('user_id', req.user.id).eq('listing_id', id);
    if (error) throw error;
    res.json({ message: 'Removed from saved' });
  } catch (err) {
    console.error('Marketplace unsave error:', err);
    res.status(500).json({ error: err.message || 'Failed to unsave' });
  }
});

export default router;
