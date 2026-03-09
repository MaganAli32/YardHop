/**
 * Usage check endpoint — returns appraisal count and limit for freemium gating
 * GET /api/usage
 * Anonymous: tracked by IP + X-Fingerprint header
 * Logged in: tracked by user_id (requires optionalAuth + Authorization header)
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const FREE_LIMIT = 3;

router.get('/', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();
    const fingerprint = req.headers['x-fingerprint'] || null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    let count = 0;

    // Authenticated (Bearer token): daily count by user_id (for extension and web)
    if (userId) {
      const { count: dbCount } = await supabase
        .from('appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayIso);
      count = dbCount ?? 0;
    } else {
      let query = supabase
        .from('appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .eq('is_free', true);
      if (fingerprint) {
        query = query.eq('fingerprint', fingerprint);
      }
      const { count: dbCount } = await query;
      count = dbCount ?? 0;
    }

    res.json({
      used: count,
      limit: FREE_LIMIT,
      remaining: Math.max(0, FREE_LIMIT - count),
      is_limited: count >= FREE_LIMIT,
      is_pro: false,
    });
  } catch (error) {
    console.error('Usage check error:', error);
    res.status(500).json({ error: 'Could not check usage' });
  }
});

export default router;
