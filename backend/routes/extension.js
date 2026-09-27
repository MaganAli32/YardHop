/**
 * Extension API routes: full appraisal (image URL) and quick appraisal (Gemini-only).
 * Auth: Bearer token required (requireAuth).
 * Full appraisals run the shared pipeline in services/appraisal (same as /api/appraise).
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { runAppraisal } from '../services/appraisal/index.js';
import { buildAppraisalRow } from './appraise.js';
import { fetchGroundedComps, fetchEbaySold } from '../services/appraisal/comps.js';
import { computeMarketPrice } from '../services/appraisal/price.js';

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

const supabaseAdmin = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  : null;

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:5173';

const FREE_MONTHLY_LIMIT = 3;

// Start of the current calendar month (UTC) — free limit resets monthly.
function startOfMonthIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

// --- Shared appraisal pipeline (services/appraisal) ---

function verdictFromPrice(askingPrice, low, high) {
  if (askingPrice == null || low == null || high == null) return null;
  if (askingPrice < low * 0.85) return 'great_deal';
  if (askingPrice <= high) return 'fair';
  if (askingPrice <= high * 1.15) return 'above_market';
  return 'overpriced';
}

// --- Routes ---

/**
 * POST /api/appraise/extension
 * Full appraisal: imageUrl (or title), askingPrice, platform.
 * Fetches image if imageUrl, identifies with Gemini, fetches pricing, synthesizes, returns verdict + marketRange.
 */
router.post('/extension', requireAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Service not configured' });
    }
    // Check monthly usage limit (resets each calendar month)
    const { count, error: countError } = await supabaseAdmin
      .from('appraisals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', startOfMonthIso());
    const usage = count ?? 0;
    if (usage >= FREE_MONTHLY_LIMIT) {
      return res.status(429).json({
        error: 'Monthly limit reached',
        message: `You've used ${usage} of ${FREE_MONTHLY_LIMIT} free appraisals this month. Upgrade to Pro for unlimited.`,
        usage,
        limit: FREE_MONTHLY_LIMIT,
        upgradeUrl: 'https://yardfront.com/#pricing',
      });
    }

    const { title, askingPrice, imageUrl, platform, condition } = req.body || {};

    if (!title && !imageUrl) {
      return res.status(400).json({ error: 'Title or image URL required' });
    }

    const images = [];
    if (imageUrl) {
      const imageResponse = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) });
      if (!imageResponse.ok) {
        return res.status(400).json({ error: 'Failed to fetch image from URL' });
      }
      const buffer = Buffer.from(await imageResponse.arrayBuffer());
      const mimeType = (imageResponse.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
      images.push({ buffer, mimeType, filename: imageUrl.split('/').pop() });
    }

    const result = await runAppraisal({
      images,
      text: images.length ? undefined : title,
      hint: images.length ? [title, platform ? `listed on ${platform}` : null].filter(Boolean).join(' — ') : undefined,
      condition,
    });
    const itemData = result.identification;
    const synthesis = result.pricing;

    const verdict = synthesis
      ? verdictFromPrice(
          askingPrice != null ? Number(askingPrice) : null,
          synthesis.priceLow,
          synthesis.priceHigh,
        )
      : 'unknown';

    let savedId = null;
    if (supabaseAdmin && req.user?.id) {
      const { legacy, v2 } = buildAppraisalRow(result, {
        userId: req.user.id,
        ip: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() || null,
        fingerprint: null,
        inputType: imageUrl ? 'photo' : 'text',
        hint: title || null,
      });
      let { data: saved, error: dbError } = await supabaseAdmin.from('appraisals').insert({ ...legacy, ...v2 }).select('id').single();
      if (dbError && /column|schema cache/i.test(dbError.message || '')) {
        ({ data: saved, error: dbError } = await supabaseAdmin.from('appraisals').insert(legacy).select('id').single());
      }
      if (!dbError && saved?.id) savedId = saved.id;
    }

    const base = FRONTEND_URL.replace(/\/$/, '');
    const appraisalUrl = savedId ? `${base}/#/appraise/results?id=${savedId}` : `${base}/#/`;

    res.json({
      verdict,
      status: result.status,
      message: result.message,
      title: itemData.name || title,
      listingTitle: result.listing?.title || null,
      marketRange: synthesis
        ? { low: synthesis.priceLow, high: synthesis.priceHigh, recommended: synthesis.priceFair }
        : null,
      confidence: synthesis?.confidenceScore ?? 0,
      dataPoints: synthesis?.sourcesCount ?? 0,
      needsInput: result.needsInput,
      appraisalUrl,
    });
  } catch (err) {
    console.error('Extension appraisal error:', err);
    res.status(500).json({ error: 'Appraisal failed' });
  }
});

/**
 * POST /api/appraise/quick
 * Quick estimate: title, askingPrice. Gemini-only, no SerpAPI. Returns verdict + estimatedRange.
 */
router.post('/quick', requireAuth, async (req, res) => {
  try {
    if (!supabaseAdmin) {
      return res.status(503).json({ error: 'Service not configured' });
    }
    // Check monthly usage limit (resets each calendar month)
    const { count, error: countError } = await supabaseAdmin
      .from('appraisals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', startOfMonthIso());
    const usage = count ?? 0;
    if (usage >= FREE_MONTHLY_LIMIT) {
      return res.status(429).json({
        error: 'Monthly limit reached',
        message: `You've used ${usage} of ${FREE_MONTHLY_LIMIT} free appraisals this month. Upgrade to Pro for unlimited.`,
        usage,
        limit: FREE_MONTHLY_LIMIT,
        upgradeUrl: 'https://yardfront.com/#pricing',
      });
    }

    const { title, askingPrice } = req.body || {};
    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    if (!genAI) {
      return res.status(503).json({ error: 'Quick appraisal not configured' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest' });
    const prompt = `Secondhand price range for "${title}" in USD. Return ONLY JSON: {"low":number,"high":number}`;
    const result = await model.generateContent(prompt);
    const rawText = result?.response?.text() || '{}';
    const text = rawText.replace(/```json\n?|```\n?/g, '').trim();
    let range = { low: 0, high: 0 };
    try {
      range = JSON.parse(text);
    } catch (_) {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) try { range = JSON.parse(m[0]); } catch (__) {}
    }
    if (typeof range.low !== 'number') range.low = 0;
    if (typeof range.high !== 'number') range.high = range.low || 100;

    const verdict = verdictFromPrice(
      askingPrice != null ? Number(askingPrice) : null,
      range.low,
      range.high,
    );

    // Record quick appraisal for daily usage count (full + quick combined)
    if (supabaseAdmin && req.user?.id) {
      await supabaseAdmin
        .from('appraisals')
        .insert({
          user_id: req.user.id,
          ip_address: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() || null,
          fingerprint: null,
          is_free: true,
          item_name: title,
          item_brand: null,
          item_category: null,
          item_condition: null,
          item_description: null,
          input_type: 'text',
          price_fair: (range.low + range.high) / 2,
          price_low: range.low,
          price_high: range.high,
          confidence_score: 30,
          sources_summary: 'Quick estimate (Gemini only).',
          sources_count: 0,
          seller_tips: null,
          raw_sources: null,
        });
    }

    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      verdict,
      estimatedRange: { low: range.low, high: range.high },
    });
  } catch (err) {
    console.error('Quick appraisal error:', err);
    res.status(500).json({ error: 'Quick appraisal failed' });
  }
});

/**
 * POST /api/appraise/refine
 * Takes a title + askingPrice, runs SerpAPI Google Shopping (and eBay), returns refined price range and verdict.
 * Called after /quick to upgrade the Gemini estimate with real market data. Does not count toward daily limit.
 */
router.post('/refine', requireAuth, async (req, res) => {
  try {
    const { title, askingPrice } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: 'Title required' });
    }

    const searchQuery = title.substring(0, 100);
    let priceLow = null;
    let priceHigh = null;
    let dataPoints = 0;
    const sources = [];

    const [grounded, ebay] = await Promise.all([fetchGroundedComps(searchQuery), fetchEbaySold(searchQuery)]);
    const comps = [...(ebay.comps || []), ...(grounded.comps || [])].map((c) => ({ ...c, match: 'similar' }));
    const market = computeMarketPrice({ comps, condition: 'Good' });
    if (market) {
      priceLow = market.priceLow;
      priceHigh = market.priceHigh;
      dataPoints = market.sourcesCount;
      if (ebay.comps?.length) sources.push('ebay_sold');
      if (grounded.comps?.length) sources.push('live_market_search');
    }

    if (priceLow === null || priceHigh === null) {
      res.set('Cache-Control', 'public, max-age=3600');
      return res.json({ refined: false, reason: 'No market data found' });
    }

    if (priceLow > priceHigh) [priceLow, priceHigh] = [priceHigh, priceLow];
    if (priceLow === priceHigh) {
      priceLow = Math.round(priceLow * 0.85);
      priceHigh = Math.round(priceHigh * 1.15);
    }

    const verdict = verdictFromPrice(
      askingPrice != null ? Number(askingPrice) : null,
      priceLow,
      priceHigh,
    );
    const confidence = Math.min(95, 40 + dataPoints * 5);

    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      refined: true,
      verdict,
      estimatedRange: { low: priceLow, high: priceHigh },
      marketRange: { low: priceLow, high: priceHigh },
      confidence,
      dataPoints,
      sources,
    });
  } catch (err) {
    console.error('Refine appraisal error:', err);
    res.status(500).json({ error: 'Refinement failed' });
  }
});

export default router;
