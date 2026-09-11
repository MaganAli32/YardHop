import express from 'express';
import multer from 'multer';
import { optionalAuth } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { fetchAllPricingSources, describePricingSources, computeMarketPrice } from '../services/pricing.js';

// temperature 0 makes identification/synthesis deterministic for a given input.
const DETERMINISTIC_CONFIG = { temperature: 0, topP: 0, topK: 1 };

const router = express.Router();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Guarded init: createClient throws if the service key is missing, which would
// crash the whole server at import time instead of degrading gracefully.
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabase = (process.env.SUPABASE_URL && serviceRoleKey)
  ? createClient(process.env.SUPABASE_URL, serviceRoleKey)
  : null;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 } // match frontend Try It 20MB limit
});

async function identifyItemWithGemini(input) {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: DETERMINISTIC_CONFIG });

  const prompt = `You are an expert appraiser. Analyze this item and return ONLY a JSON object with no markdown, no explanation, just raw JSON.

IMPORTANT: Always return your best guess. If the image is blurry, partial, or the item is generic, still return a plausible identification. Use a generic name (e.g. "Furniture item", "Electronics", "Decorative object") and a broad search query if needed. Never refuse to respond.

Return this exact structure:
{
  "name": "Full item name including brand and model if identifiable, or a short generic description",
  "brand": "Brand name or null",
  "category": "Category (e.g. Electronics, Furniture, Clothing, Musical Instruments, Home Decor)",
  "condition": "One of: Like New, Good, Fair, Poor",
  "searchQuery": "3-5 word search query for eBay (e.g. 'wooden side table', 'vintage lamp')",
  "description": "One sentence describing the item for the appraisal"
}`;

  try {
    let result;

    if (input.type === 'image') {
      result = await model.generateContent([
        prompt,
        {
          inlineData: {
            mimeType: input.mimeType,
            data: input.data
          }
        }
      ]);
    } else {
      result = await model.generateContent(`${prompt}\n\nItem description: ${input.text}`);
    }

    if (!result?.response) {
      console.log('[appraise] Gemini returned no response');
      return null;
    }
    let text;
    try {
      const rawText = result.response.text();
      text = (typeof rawText === 'string' ? rawText : String(rawText)).trim();
    } catch (e) {
      console.log('[appraise] Gemini response.text() failed:', e?.message);
      return null;
    }
    console.log('[appraise] Gemini identification raw response length:', text.length, 'preview:', text.slice(0, 200));

    const clean = text.replace(/```json|```/g, '').trim();
    let parsed = null;
    try {
      parsed = JSON.parse(clean);
    } catch (_) {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (__) {}
      }
    }

    if (!parsed || typeof parsed.name !== 'string') {
      console.log('[appraise] Gemini returned invalid structure:', parsed);
      return null;
    }
    return parsed;
  } catch (err) {
    console.error('[appraise] Gemini identification error:', err.message);
    console.error('[appraise] Gemini error stack:', err.stack);
    return null;
  }
}

async function synthesizeAppraisalWithGemini(itemData, pricingSources) {
  // Prices are computed deterministically in code so reruns are consistent.
  // The LLM only writes the human-facing summary and tips (temperature 0).
  const computed = computeMarketPrice(pricingSources, itemData.condition);
  if (!computed) return null;

  const defaultSummary = `Based on ${computed.sourcesCount} comparable listing${computed.sourcesCount === 1 ? '' : 's'} from live market search.`;
  const defaultTips = [
    'Use clear, well-lit photos from multiple angles to support your price.',
    'Mention brand, model, and condition details buyers search for.',
    `Price near $${computed.priceFair.toLocaleString()} for a quicker sale; list higher only with strong proof of condition.`,
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

  const prompt = `You are an expert secondhand market appraiser. The recommended price has ALREADY been computed: fair $${computed.priceFair}, typical range $${computed.priceLow}–$${computed.priceHigh}, based on ${computed.sourcesCount} data points.

Item: ${itemData.name}
Condition: ${itemData.condition}
Category: ${itemData.category}

Comparable listings:
${sourceSummary}

Write ONLY a JSON object with no markdown, no explanation. Do NOT change the prices:
{
  "sourcesSummary": "One factual sentence describing what the estimate is based on (mention SOLD listings and sites).",
  "sellerTips": ["specific actionable tip 1", "tip 2", "tip 3"]
}`;

  try {
    const result = await model.generateContent(prompt);
    if (!result?.response) return withComputed();
    const rawText = result.response.text();
    const text = (typeof rawText === 'string' ? rawText : String(rawText)).trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return withComputed({
      sourcesSummary: typeof parsed?.sourcesSummary === 'string' && parsed.sourcesSummary.trim()
        ? parsed.sourcesSummary.trim()
        : defaultSummary,
      sellerTips: Array.isArray(parsed?.sellerTips) && parsed.sellerTips.length
        ? parsed.sellerTips.slice(0, 3)
        : defaultTips,
    });
  } catch (err) {
    console.error('Gemini synthesis error:', err.message);
    return withComputed();
  }
}

/** When no pricing sources return data, ask Gemini to estimate from item knowledge only (low confidence). */
async function synthesizeAppraisalFromKnowledgeOnly(itemData) {
  const model = genAI.getGenerativeModel({ model: 'gemini-flash-latest', generationConfig: DETERMINISTIC_CONFIG });
  const prompt = `You are a secondhand market appraiser. We have NO live pricing data for this item. Estimate a fair resale price based only on your knowledge of similar items.

Item: ${itemData.name}
Category: ${itemData.category}
Condition: ${itemData.condition}

Return ONLY a JSON object with no markdown:
{
  "priceFair": <your best guess single number>,
  "priceLow": <lower bound>,
  "priceHigh": <upper bound>,
  "confidenceScore": 30,
  "sourcesSummary": "No market data available; estimate based on general knowledge of similar items.",
  "sourcesCount": 0,
  "sellerTips": ["tip 1", "tip 2", "tip 3"]
}

Keep confidenceScore exactly 30. Be conservative with the range.`;

  try {
    const result = await model.generateContent(prompt);
    if (!result?.response) return null;
    const rawText = result.response.text();
    const text = (typeof rawText === 'string' ? rawText : String(rawText)).trim();
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    if (parsed && typeof parsed.priceFair === 'number') return parsed;
    return null;
  } catch (err) {
    console.error('[appraise] Knowledge-only synthesis error:', err.message);
    return null;
  }
}

const FALLBACK_ITEM = {
  name: 'Unidentified item',
  brand: null,
  category: 'General',
  condition: 'Good',
  searchQuery: 'miscellaneous secondhand',
  description: 'Item could not be fully identified from the image. Appraisal is based on generic market data.'
};

const FALLBACK_SYNTHESIS = {
  priceFair: 50,
  priceLow: 25,
  priceHigh: 100,
  confidenceScore: 15,
  sourcesSummary: 'Limited data; estimate based on generic secondhand market.',
  sourcesCount: 0,
  sellerTips: ['Take clear photos from multiple angles for a better estimate.', 'Try searching similar items on eBay or Craigslist for comparison.', 'Condition and location affect resale value.']
};

const FREE_LIMIT = 3;
const APPRAISAL_TIMEOUT_MS = Number(process.env.APPRAISAL_TIMEOUT_MS || 50000);

// Start of the current calendar month (UTC) — free limit resets monthly.
function startOfMonthIso() {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function withTimeout(promise, ms = APPRAISAL_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Appraisal timed out')), ms)
    ),
  ]);
}

/**
 * Run appraisal for API v1 (image_url or item_description).
 * Returns { item_name, price_low, price_high, price_recommended, confidence, sources }.
 */
export async function runAppraisalForApi(options) {
  return withTimeout((async () => {
    const { image_url, item_description } = options || {};
    if (!image_url && !item_description) {
      throw new Error('Provide at least image_url or item_description');
    }
    let itemData;
    if (image_url) {
      const res = await fetch(image_url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const mimeType = res.headers.get('content-type') || 'image/jpeg';
      itemData = await identifyItemWithGemini({
        type: 'image',
        mimeType: mimeType.split(';')[0].trim(),
        data: buffer.toString('base64'),
      });
    } else {
      itemData = await identifyItemWithGemini({ type: 'text', text: item_description });
    }
    if (!itemData) itemData = { ...FALLBACK_ITEM };
    const query = itemData.searchQuery;
    const pricingSources = await withTimeout(fetchAllPricingSources(query));
    let synthesis;
    if (pricingSources.length > 0) {
      synthesis = await withTimeout(synthesizeAppraisalWithGemini(itemData, pricingSources));
    } else {
      synthesis = await withTimeout(synthesizeAppraisalFromKnowledgeOnly(itemData));
    }
    if (!synthesis) synthesis = { ...FALLBACK_SYNTHESIS };
    const sourceNames = pricingSources.map((s) =>
      s && s.source ? s.source.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '') : 'unknown'
    );
    return {
      item_name: itemData.name,
      price_low: synthesis.priceLow,
      price_high: synthesis.priceHigh,
      price_recommended: synthesis.priceFair,
      confidence: Math.round(synthesis.confidenceScore || 0) / 100,
      sources: sourceNames.length ? sourceNames : ['estimate'],
    };
  })(), APPRAISAL_TIMEOUT_MS);
}

/** Quick appraisal: title + askingPrice only, no auth. Returns whether asking price is fair/high/low vs market. */
router.post('/quick', async (req, res) => {
  try {
    const { title, askingPrice } = req.body || {};
    if (!title || askingPrice == null) {
      return res.status(400).json({ error: 'Missing title or askingPrice' });
    }
    const numPrice = Number(askingPrice);
    if (isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ error: 'askingPrice must be a non-negative number' });
    }

    const [market] = await fetchAllPricingSources(title);
    if (!market || market.count === 0) {
      return res.json({
        title,
        askingPrice: numPrice,
        verdict: 'unknown',
        message: 'No comparable sold listings found for this item.',
        market: null,
      });
    }

    let verdict = 'fair';
    if (numPrice > market.high * 1.1) verdict = 'high';
    else if (numPrice < market.low * 0.9) verdict = 'low';

    res.json({
      title,
      askingPrice: numPrice,
      verdict,
      market: {
        low: market.low,
        high: market.high,
        avg: market.avg,
        count: market.count,
        source: market.source,
      },
    });
  } catch (err) {
    console.error('[appraise/quick] error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', optionalAuth, upload.single('image'), async (req, res) => {
  try {
    if (!supabase) {
      return res.status(503).json({ error: 'Service not configured' });
    }
    console.log('=== APPRAISE ENDPOINT HIT ===');
    console.log('File received:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');

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

    let itemData = null;
    let inputType = 'text';

    console.log('[appraise] POST: req.file exists=', !!req.file, 'size=', req.file?.size ?? 0, 'mimetype=', req.file?.mimetype);

    // Step 1: Identify the item
    if (req.file) {
      inputType = 'photo';
      const buffer = req.file.buffer;
      const base64 = buffer.toString('base64');
      console.log('[appraise] Image: buffer length=', buffer?.length, 'base64 length=', base64?.length);
      itemData = await withTimeout(identifyItemWithGemini({
        type: 'image',
        mimeType: req.file.mimetype,
        data: base64
      }));
    } else if (req.body.description || req.body.item_description) {
      const descriptionText = req.body.description || req.body.item_description;
      itemData = await withTimeout(identifyItemWithGemini({
        type: 'text',
        text: descriptionText
      }));
    } else {
      return res.status(400).json({ error: 'No image or description provided' });
    }

    if (!itemData) {
      console.log('[appraise] Gemini returned null; using fallback item');
      itemData = { ...FALLBACK_ITEM };
    }

    console.log('=== GEMINI IDENTIFICATION ===');
    console.log('Result:', JSON.stringify(itemData, null, 2));

    // Step 2: Fetch pricing sources in parallel (grounded live market search + Google Shopping)
    const query = itemData.searchQuery;
    console.log('=== QUERYING SOURCES (grounded search + Google Shopping) ===');
    const pricingSources = await withTimeout(fetchAllPricingSources(query));

    console.log('[appraise] Pricing sources that returned data:', pricingSources.length, pricingSources.map(s => s?.source));

    // Step 3: Synthesize with Gemini (or estimate from knowledge when no sources)
    let synthesis = null;
    if (pricingSources.length > 0) {
      synthesis = await withTimeout(synthesizeAppraisalWithGemini(itemData, pricingSources));
    } else {
      console.log('[appraise] No pricing data from any source; asking Gemini to estimate from item knowledge only.');
      synthesis = await withTimeout(synthesizeAppraisalFromKnowledgeOnly(itemData));
    }

    if (!synthesis) {
      console.log('[appraise] Synthesis failed; using fallback appraisal.');
      synthesis = { ...FALLBACK_SYNTHESIS };
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Step 4: Save to Supabase
    const { data: saved, error: dbError } = await supabase
      .from('appraisals')
      .insert({
        user_id: userId,
        ip_address: ip,
        fingerprint: fingerprint,
        is_free: true,
        item_name: itemData.name,
        item_brand: itemData.brand,
        item_category: itemData.category,
        item_condition: itemData.condition,
        item_description: itemData.description,
        input_type: inputType,
        price_fair: synthesis.priceFair,
        price_low: synthesis.priceLow,
        price_high: synthesis.priceHigh,
        confidence_score: synthesis.confidenceScore,
        sources_summary: synthesis.sourcesSummary,
        sources_count: synthesis.sourcesCount,
        seller_tips: synthesis.sellerTips,
        raw_sources: pricingSources,
      })
      .select('id')
      .single();

    if (dbError) console.error('DB save error:', dbError.message);

    // Step 5: Return full appraisal to frontend
    res.json({
      appraisalId: saved?.id || null,
      item: itemData,
      pricing: {
        fair: synthesis.priceFair,
        low: synthesis.priceLow,
        high: synthesis.priceHigh,
        confidenceScore: synthesis.confidenceScore,
        sourcesSummary: synthesis.sourcesSummary,
        sourcesCount: synthesis.sourcesCount,
      },
      sellerTips: synthesis.sellerTips,
      elapsedSeconds: elapsed,
    });

  } catch (err) {
    console.log('=== APPRAISE CRASH ===');
    console.error(err);
    if (err?.message === 'Appraisal timed out') {
      return res.status(504).json({ error: 'Appraisal timed out. Please try again with a clearer image.' });
    }
    console.error('Appraise endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
