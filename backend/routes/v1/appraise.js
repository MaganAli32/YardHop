/**
 * POST /api/v1/appraise — API key authenticated appraisal.
 * Body: { image_url?, item_description?, condition?, category? }
 * Returns appraisal + _meta (plan, usage_this_month, limit).
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { apiKeyAuth } from '../../middleware/apiKeyAuth.js';
import { runAppraisalForApi } from '../appraise.js';

const router = express.Router();

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

router.post('/', apiKeyAuth, async (req, res) => {
  const { image_url, item_description, condition, category } = req.body || {};

  if (!image_url && !item_description) {
    return res.status(400).json({
      error: 'Provide at least image_url or item_description',
    });
  }

  try {
    const appraisalResult = await runAppraisalForApi({
      image_url,
      item_description,
      condition,
      category,
    });

    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      await supabaseAdmin.from('api_usage').insert({
        user_id: req.apiKey.user_id,
        api_key_id: req.apiKey.id,
        endpoint: '/api/v1/appraise',
        item_name: appraisalResult.item_name,
        image_url: image_url || null,
        price_low: appraisalResult.price_low,
        price_high: appraisalResult.price_high,
        confidence: appraisalResult.confidence,
        status: 'success',
      });
    }

    return res.json({
      ...appraisalResult,
      _meta: {
        plan: req.apiKey.plan,
        usage_this_month: req.apiKeyUsage + 1,
        limit: req.apiKey.monthly_limit,
        remaining: Math.max(0, req.apiKey.monthly_limit - (req.apiKeyUsage + 1)),
      },
    });
  } catch (err) {
    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      supabaseAdmin
        .from('api_usage')
        .insert({
          user_id: req.apiKey.user_id,
          api_key_id: req.apiKey.id,
          endpoint: '/api/v1/appraise',
          status: 'error',
        })
        .then(() => {})
        .catch(() => {});
    }
    console.error('[v1/appraise] error:', err.message);
    return res.status(500).json({
      error: 'Appraisal failed',
      detail: err.message,
    });
  }
});

export default router;
