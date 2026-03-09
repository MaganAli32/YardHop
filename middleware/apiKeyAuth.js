/**
 * API Key authentication for /api/v1/* routes.
 * Expects x-api-key header; validates key, checks monthly limit, attaches req.apiKey.
 */
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

export async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: 'Missing API key',
      hint: 'Include your key in the x-api-key header',
      docs: 'https://yardfrontend.com/dashboard',
    });
  }

  const supabaseAdmin = getSupabaseAdmin();
  if (!supabaseAdmin) {
    return res.status(503).json({ error: 'Service not configured' });
  }

  const { data: keyRecord, error } = await supabaseAdmin
    .from('api_keys')
    .select('id, user_id, plan, monthly_limit, is_active')
    .eq('key', apiKey)
    .single();

  if (error || !keyRecord) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  if (!keyRecord.is_active) {
    return res.status(403).json({
      error: 'API key is inactive',
      hint: 'Visit your dashboard to reactivate',
    });
  }

  const { data: usageData } = await supabaseAdmin
    .from('api_usage_this_month')
    .select('usage_count')
    .eq('api_key_id', keyRecord.id)
    .maybeSingle();

  const currentUsage = usageData?.usage_count ?? 0;
  const limit = keyRecord.monthly_limit;

  if (limit !== null && limit !== undefined && currentUsage >= limit) {
    return res.status(429).json({
      error: 'Monthly appraisal limit reached',
      limit: keyRecord.monthly_limit,
      used: currentUsage,
      hint: 'Upgrade your plan at yardfrontend.com/dashboard',
    });
  }

  req.apiKey = keyRecord;
  req.apiKeyUsage = currentUsage;

  supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRecord.id)
    .then(() => {})
    .catch(() => {});

  next();
}
