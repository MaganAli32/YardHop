/**
 * API key management (regenerate). Requires JWT auth, not API key.
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

/**
 * POST /api/user/regenerate-key
 * Regenerate the API key for the authenticated user. Old key stops working immediately.
 */
router.post('/regenerate-key', requireAuth, async (req, res) => {
  try {
    const admin = getSupabaseAdmin();
    if (!admin) return res.status(503).json({ error: 'Service not configured' });

    const newKey = 'yf_live_' + [...Array(16)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

    const { data, error } = await admin
      .from('api_keys')
      .update({ key: newKey })
      .eq('user_id', req.user.id)
      .select('key')
      .single();

    if (error) {
      console.error('[apiKeys] regenerate error:', error);
      return res.status(500).json({ error: 'Failed to regenerate key' });
    }

    return res.json({ key: data?.key ?? newKey });
  } catch (err) {
    console.error('[apiKeys] regenerate exception:', err);
    return res.status(500).json({ error: 'Failed to regenerate key' });
  }
});

export default router;
