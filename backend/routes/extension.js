/**
 * Extension API routes: full appraisal (image URL) and quick appraisal (Gemini-only).
 * Auth: Bearer token required (requireAuth).
 * Does not modify routes/appraise.js; duplicates needed logic here.
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { fetchAllPricingSources, describePricingSources, computeMarketPrice } from '../services/pricing.js';

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

// temperature 0 makes identification/synthesis deterministic for a given input.
const DETERMINISTIC_CONFIG = { temperature: 0, topP: 0, topK: 1 };
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

// --- Duplicated helpers (from appraise flow, not importing to avoid touching appraise.js) ---

async function identifyItemWithGemini(input) {
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: DETERMINISTIC_CONFIG });
  const prompt = `You are an expert appraiser. Analyze this item and return ONLY a JSON object with no markdown, no explanation, just raw JSON.
Return this exact structure:
{
  "name": "Full item name including brand and model if identifiable",
  "brand": "Brand name or null",
  "category": "Category (e.g. Electronics, Furniture, Clothing)",
  "condition": "One of: Like New, Good, Fair, Poor",
  "searchQuery": "3-5 word search query for eBay",
  "description": "One sentence describing the item"
}`;
  try {
    let result;
    if (input.type === 'image') {
      result = await model.generateContent([
        prompt,
        { inlineData: { mimeType: input.mimeType, data: input.data } },
      ]);
    } else {
      result = await model.generateContent(`${prompt}\n\nItem description: ${input.text}`);
    }
    if (!result?.response) return null;
    const rawText = result.response.text();
    const text = (typeof rawText === 'string' ? rawText : String(rawText)).trim();
    const clean = text.replace(/```json|```/g, '').trim();
    let parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch (_) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) try { parsed = JSON.parse(match[0]); } catch (__) {}
    }
    if (!parsed || typeof parsed.name !== 'string') return null;
    return parsed;
  } catch (err) {
    console.error('Extension Gemini identification error:', err.message);
    return null;
  }
}

async function synthesizeAppraisalWithGemini(itemData, pricingSources) {
  if (!genAI) return null;
  // Prices computed deterministically; LLM only writes summary + tips.
  const computed = computeMarketPrice(pricingSources, itemData.condition);
  if (!computed) return null;

  const defaultSummary = `Based on ${computed.sourcesCount} comparable listing${computed.sourcesCount === 1 ? '' : 's'} from live market search.`;
  const defaultTips = [
    'Use clear, well-lit photos from multiple angles to support your price.',
    'Mention brand, model, and condition details buyers search for.',
    `Price near $${computed.priceFair.toLocaleString()} for a quicker sale.`,
  ];
  const withComputed = (extra) => ({
    priceFair: computed.priceFair,
    priceLow: computed.priceLow,
    priceHigh: computed.priceHigh,
    confidenceScore: computed.confidenceScore,
    sourcesCount: computed.sourcesCount,
    sourcesSummary: defaultSummary,
    sellerTips: defaultTips,
    ...extra,
  });

  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: DETERMINISTIC_CONFIG });
  const sourceSummary = describePricingSources(pricingSources.filter(Boolean));
  const prompt = `The recommended price has ALREADY been computed: fair $${computed.priceFair}, range $${computed.priceLow}–$${computed.priceHigh}, from ${computed.sourcesCount} data points.

Item: ${itemData.name}
Condition: ${itemData.condition}
Category: ${itemData.category}

Comparable listings:
${sourceSummary}

Write ONLY a JSON object, no markdown. Do NOT change the prices:
{
  "sourcesSummary": "One factual sentence about what the estimate is based on.",
  "sellerTips": ["specific tip 1", "tip 2", "tip 3"]
}`;
  try {
    const result = await model.generateContent(prompt);
    if (!result?.response) return withComputed();
    const text = (result.response.text() || '').trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    return withComputed({
      sourcesSummary: typeof parsed?.sourcesSummary === 'string' && parsed.sourcesSummary.trim()
        ? parsed.sourcesSummary.trim()
        : defaultSummary,
      sellerTips: Array.isArray(parsed?.sellerTips) && parsed.sellerTips.length
        ? parsed.sellerTips.slice(0, 3)
        : defaultTips,
    });
  } catch (err) {
    console.error('Extension Gemini synthesis error:', err.message);
    return withComputed();
  }
}

async function synthesizeAppraisalFromKnowledgeOnly(itemData) {
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: DETERMINISTIC_CONFIG });
  const prompt = `You are a secondhand market appraiser. We have NO live pricing data. Estimate a fair resale price.

Item: ${itemData.name}
Category: ${itemData.category}
Condition: ${itemData.condition}

Return ONLY a JSON object:
{
  "priceFair": <number>,
  "priceLow": <number>,
  "priceHigh": <number>,
  "confidenceScore": 30,
  "sourcesSummary": "No market data available; estimate based on general knowledge.",
  "sourcesCount": 0,
  "sellerTips": ["tip 1", "tip 2", "tip 3"]
}
Keep confidenceScore exactly 30.`;
  try {
    const result = await model.generateContent(prompt);
    if (!result?.response) return null;
    const text = (result.response.text() || '').trim().replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.priceFair === 'number') return parsed;
    return null;
  } catch (err) {
    console.error('Extension knowledge-only synthesis error:', err.message);
    return null;
  }
}

const FALLBACK_ITEM = {
  name: 'Unidentified item',
  brand: null,
  category: 'General',
  condition: 'Good',
  searchQuery: 'miscellaneous secondhand',
  description: 'Item could not be fully identified.',
};

const FALLBACK_SYNTHESIS = {
  priceFair: 50,
  priceLow: 25,
  priceHigh: 100,
  confidenceScore: 15,
  sourcesSummary: 'Limited data; estimate based on generic secondhand market.',
  sourcesCount: 0,
  sellerTips: ['Take clear photos.', 'Compare on eBay or Craigslist.', 'Condition affects value.'],
};

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

    const { title, askingPrice, imageUrl, platform } = req.body || {};

    if (!title && !imageUrl) {
      return res.status(400).json({ error: 'Title or image URL required' });
    }

    let itemData = null;

    if (imageUrl) {
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        return res.status(400).json({ error: 'Failed to fetch image from URL' });
      }
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      const base64 = imageBuffer.toString('base64');
      const mimeType = imageResponse.headers.get('content-type') || 'image/jpeg';
      itemData = await identifyItemWithGemini({
        type: 'image',
        mimeType: mimeType.split(';')[0].trim(),
        data: base64,
      });
    } else {
      itemData = await identifyItemWithGemini({
        type: 'text',
        text: title,
      });
    }

    if (!itemData) itemData = { ...FALLBACK_ITEM };
    if (title && !itemData.name) itemData.name = title;

    const query = itemData.searchQuery || itemData.name || title;
    const pricingSources = await fetchAllPricingSources(query);

    let synthesis =
      pricingSources.length > 0
        ? await synthesizeAppraisalWithGemini(itemData, pricingSources)
        : await synthesizeAppraisalFromKnowledgeOnly(itemData);
    if (!synthesis) synthesis = { ...FALLBACK_SYNTHESIS };

    const verdict = verdictFromPrice(
      askingPrice != null ? Number(askingPrice) : null,
      synthesis.priceLow,
      synthesis.priceHigh,
    );

    let savedId = null;
    if (supabaseAdmin && req.user?.id) {
      const { data: saved, error: dbError } = await supabaseAdmin
        .from('appraisals')
        .insert({
          user_id: req.user.id,
          ip_address: (req.headers['x-forwarded-for'] || req.ip || '').toString().split(',')[0].trim() || null,
          fingerprint: null,
          is_free: true,
          item_name: itemData.name,
          item_brand: itemData.brand ?? null,
          item_category: itemData.category ?? null,
          item_condition: itemData.condition ?? null,
          item_description: itemData.description ?? null,
          input_type: imageUrl ? 'photo' : 'text',
          price_fair: synthesis.priceFair,
          price_low: synthesis.priceLow,
          price_high: synthesis.priceHigh,
          confidence_score: synthesis.confidenceScore,
          sources_summary: synthesis.sourcesSummary,
          sources_count: synthesis.sourcesCount,
          seller_tips: synthesis.sellerTips ?? null,
          raw_sources: pricingSources,
        })
        .select('id')
        .single();
      if (!dbError && saved?.id) savedId = saved.id;
    }

    const base = FRONTEND_URL.replace(/\/$/, '');
    const appraisalUrl = savedId ? `${base}/#/appraise/results?id=${savedId}` : `${base}/#/`;

    res.json({
      verdict,
      title: itemData.name || title,
      marketRange: {
        low: synthesis.priceLow,
        high: synthesis.priceHigh,
        recommended: synthesis.priceFair,
      },
      confidence: synthesis.confidenceScore,
      dataPoints: synthesis.sourcesCount ?? 0,
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

    const pricingSources = await fetchAllPricingSources(searchQuery);
    for (const data of pricingSources) {
      if (!data?.prices?.length) continue;
      if (data.comps) {
        // Grounded live-market comps are actual secondhand prices — use directly
        if (priceLow === null || data.low < priceLow) priceLow = Math.round(data.low);
        if (priceHigh === null || data.high > priceHigh) priceHigh = Math.round(data.high);
        sources.push('live_market_search');
      } else {
        // Google Shopping is new retail — apply secondhand factor
        const sorted = [...data.prices].sort((a, b) => a - b);
        const retailLow = sorted[Math.floor(sorted.length * 0.15)] ?? sorted[0];
        const retailHigh = sorted[Math.floor(sorted.length * 0.85)] ?? sorted[sorted.length - 1];
        const usedLow = Math.round(retailLow * 0.3);
        const usedHigh = Math.round(retailHigh * 0.6);
        if (priceLow === null || usedLow < priceLow) priceLow = usedLow;
        if (priceHigh === null || usedHigh > priceHigh) priceHigh = usedHigh;
        sources.push('google_shopping');
      }
      dataPoints += data.prices.length;
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
