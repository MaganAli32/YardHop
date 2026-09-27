/**
 * POST /api/appraise — full appraisal (web + Try It). Runs the shared v2
 * pipeline (services/appraisal) and returns toApiResponse(result).
 * `buildAppraisalRow` is shared with routes/extension.js so both entry
 * points save identically.
 */
import express from 'express';
import multer from 'multer';
import { optionalAuth } from '../middleware/auth.js';
import { createClient } from '@supabase/supabase-js';
import { runAppraisal, toApiResponse } from '../services/appraisal/index.js';

const router = express.Router();

// Guarded init: createClient throws if the service key is missing, which would
// crash the whole server at import time instead of degrading gracefully.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = (process.env.SUPABASE_URL && serviceRoleKey)
  ? createClient(process.env.SUPABASE_URL, serviceRoleKey)
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // match frontend Try It 20MB limit
});

const FREE_LIMIT = 3;
const APPRAISAL_TIMEOUT_MS = Number(process.env.APPRAISAL_TIMEOUT_MS || 95000);

// Start of the current calendar month (UTC) — free limit resets monthly.
function startOfMonthIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function withTimeout(promise, ms = APPRAISAL_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Appraisal timed out')), ms)),
  ]);
}

/**
 * Shapes a raw runAppraisal() result into the two column groups used when
 * saving to `appraisals`: `legacy` (pre-v2 schema, always safe to insert)
 * and `v2` (migration 021 — see database/migrations/021_appraisals_v2.sql).
 * Callers insert `{ ...legacy, ...v2 }` and retry with `legacy` alone if the
 * migration hasn't run yet (schema-cache error).
 */
export function buildAppraisalRow(result, meta) {
  const { userId, ip, fingerprint, inputType, hint } = meta || {};
  const id = result.identification || {};
  const ver = result.verification;
  const p = result.pricing;
  const listing = result.listing;

  const legacy = {
    user_id: userId ?? null,
    ip_address: ip ?? null,
    fingerprint: fingerprint ?? null,
    is_free: true,
    item_name: id.name || null,
    item_brand: id.brand || null,
    item_category: id.category || null,
    item_condition: id.condition || null,
    item_description: listing?.description || id.conditionNotes || null,
    input_type: inputType || 'text',
    price_fair: p?.priceFair ?? null,
    price_low: p?.priceLow ?? null,
    price_high: p?.priceHigh ?? null,
    confidence_score: p?.confidenceScore ?? null,
    sources_summary: p?.sourcesSummary ?? null,
    sources_count: p?.sourcesCount ?? null,
    seller_tips: listing?.sellerTips || [],
    raw_sources: result.comps || [],
  };

  const v2 = {
    item_model: id.model || null,
    item_variant: id.variant || null,
    item_reference: id.referenceNumber || null,
    item_attributes: {
      size: id.size || null,
      color: id.color || null,
      visibleText: id.visibleText || null,
      alternatives: id.alternatives || [],
      authenticityRisk: id.authenticityRisk || null,
      subcategory: id.subcategory || null,
    },
    identity_level: id.identityLevel || null,
    identity_confidence: id.identityConfidence ?? null,
    verified: Boolean(ver?.verified),
    msrp: ver?.msrp ?? null,
    comp_query: id.searchQueries?.exact || ver?.compQuery || null,
    listing_title: listing?.title || null,
    listing_description: listing?.description || null,
    listing_highlights: listing?.highlights || [],
    comps: result.comps || [],
    price_method: p?.method || null,
    status: result.status,
    pipeline_version: result.pipelineVersion,
    hint: hint || null,
    diagnostics: result.diagnostics || null,
  };

  return { legacy, v2 };
}

/**
 * Run the pipeline for the v1 API (image_url or item_description).
 * Keeps the v1 response contract: { item_name, price_low, price_high,
 * price_recommended, confidence, sources }.
 */
export async function runAppraisalForApi(options) {
  return withTimeout((async () => {
    const { image_url, item_description, condition, category } = options || {};
    if (!image_url && !item_description) {
      throw new Error('Provide at least image_url or item_description');
    }

    const images = [];
    if (image_url) {
      const res = await fetch(image_url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const mimeType = (res.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
      images.push({ buffer, mimeType, filename: image_url.split('/').pop() });
    }

    const result = await runAppraisal({
      images,
      text: images.length ? undefined : item_description,
      hint: images.length ? item_description : undefined,
      condition,
      category,
    });

    const p = result.pricing;
    const sourceNames = [...new Set(result.comps.map((c) => c.site).filter(Boolean))]
      .map((s) => s.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''));

    return {
      item_name: result.identification.name,
      price_low: p?.priceLow ?? null,
      price_high: p?.priceHigh ?? null,
      price_recommended: p?.priceFair ?? null,
      confidence: Math.round(p?.confidenceScore || 0) / 100,
      sources: sourceNames.length ? sourceNames : ['estimate'],
      status: result.status,
    };
  })(), APPRAISAL_TIMEOUT_MS);
}

router.post('/', optionalAuth, upload.single('image'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Service not configured' });
    }

    const startTime = Date.now();
    const userId = req.user?.id || null;
    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();
    const fingerprint = req.headers['x-fingerprint'] || null;

    // Usage check — block if free monthly limit reached (resets each calendar month)
    const monthStartIso = startOfMonthIso();
    let count = 0;
    if (userId) {
      const { count: dbCount } = await supabase
        .from('appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_free', true)
        .gte('created_at', monthStartIso);
      count = dbCount ?? 0;
    } else {
      let query = supabase
        .from('appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .eq('is_free', true)
        .gte('created_at', monthStartIso);
      if (fingerprint) query = query.eq('fingerprint', fingerprint);
      const { count: dbCount } = await query;
      count = dbCount ?? 0;
    }
    if (count >= FREE_LIMIT) {
      return res.status(403).json({
        error: 'free_limit_reached',
        message: `You've used all ${FREE_LIMIT} free appraisals this month. Upgrade to Pro for unlimited appraisals.`,
        used: count,
        limit: FREE_LIMIT,
      });
    }

    const description = req.body.description || req.body.item_description || undefined;
    if (!req.file && !description) {
      return res.status(400).json({ error: 'No image or description provided' });
    }

    const images = req.file
      ? [{ buffer: req.file.buffer, mimeType: req.file.mimetype, filename: req.file.originalname }]
      : [];
    const inputType = req.file ? 'photo' : 'text';

    const result = await withTimeout(
      runAppraisal({
        images,
        text: images.length ? undefined : description,
        hint: images.length ? description : undefined,
        condition: req.body.condition,
        category: req.body.category,
      }),
    );

    // unidentified items don't cost a free credit — nothing useful was produced
    let savedId = null;
    if (result.status !== 'unidentified') {
      const { legacy, v2 } = buildAppraisalRow(result, { userId, ip, fingerprint, inputType, hint: description });
      let { data: saved, error: dbError } = await supabase
        .from('appraisals')
        .insert({ ...legacy, ...v2 })
        .select('id')
        .single();
      if (dbError && /column|schema cache/i.test(dbError.message || '')) {
        // Migration 021 hasn't run yet — fall back to the columns that exist.
        ({ data: saved, error: dbError } = await supabase.from('appraisals').insert(legacy).select('id').single());
      }
      if (dbError) console.error('[appraise] DB save error:', dbError.message);
      else savedId = saved?.id || null;
    }

    res.json(toApiResponse(result, { appraisalId: savedId, elapsedSeconds: ((Date.now() - startTime) / 1000).toFixed(1) }));
  } catch (err) {
    console.error('[appraise] error:', err);
    if (err?.message === 'Appraisal timed out') {
      return res.status(504).json({ error: 'Appraisal timed out. Please try again with a clearer image.' });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
