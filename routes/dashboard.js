/**
 * ============================================================
 * DASHBOARD ROUTES — user's listings, appraisals, saved items
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

/**
 * GET /api/dashboard/listings — user's own listings
 */
router.get('/listings', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { data, error } = await admin
      .from('listings')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const withAppraisal = await Promise.all((data || []).map(async (row) => {
      if (!row.appraisal_id) return { ...row, appraisal: null };
      const { data: appraisal } = await admin.from('appraisals').select('price_low, price_high, confidence_score').eq('id', row.appraisal_id).single();
      return { ...row, appraisal };
    }));

    res.json({ listings: withAppraisal });
  } catch (err) {
    console.error('Dashboard listings error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch listings' });
  }
});

/**
 * GET /api/dashboard/appraisals — user's appraisal history
 */
router.get('/appraisals', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { data, error } = await admin
      .from('appraisals')
      .select('id, item_name, item_description, item_category, item_condition, price_fair, price_low, price_high, confidence_score, sources_count, raw_sources, created_at')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ appraisals: data || [] });
  } catch (err) {
    console.error('Dashboard appraisals error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch appraisals' });
  }
});

/**
 * GET /api/dashboard/saved — user's saved/wishlisted items
 */
router.get('/saved', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { data: savedRows, error } = await admin
      .from('saved_items')
      .select('listing_id')
      .eq('user_id', req.user.id);

    if (error) throw error;
    const ids = (savedRows || []).map((r) => r.listing_id).filter(Boolean);
    if (ids.length === 0) return res.json({ saved: [] });

    const { data: listings, error: listError } = await admin
      .from('listings')
      .select('*')
      .in('id', ids)
      .eq('status', 'active');

    if (listError) throw listError;

    const withAppraisal = await Promise.all((listings || []).map(async (row) => {
      if (!row.appraisal_id) return { ...row, appraisal: null };
      const { data: a } = await admin.from('appraisals').select('price_low, price_high').eq('id', row.appraisal_id).single();
      return { ...row, appraisal: a };
    }));

    const saved = (savedRows || []).map((s) => ({
      id: s.listing_id,
      listing: withAppraisal.find((l) => l.id === s.listing_id),
    }));

    res.json({ saved });
  } catch (err) {
    console.error('Dashboard saved error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch saved' });
  }
});

/**
 * GET /api/dashboard/stats — user stats (views, messages)
 */
router.get('/stats', requireAuth, async (req, res) => {
  try {
    const admin = getAdminClient();
    if (!admin) return res.status(500).json({ error: 'Service not configured' });

    const { data: listings } = await admin.from('listings').select('views').eq('user_id', req.user.id);
    const views = (listings || []).reduce((sum, l) => sum + (l.views || 0), 0);

    const { count } = await admin.from('listing_messages').select('*', { count: 'exact', head: true }).eq('receiver_id', req.user.id);
    const messages = count ?? 0;

    res.json({ views, messages });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch stats' });
  }
});

export default router;
