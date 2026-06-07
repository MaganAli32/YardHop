/**
 * Extension API routes: full appraisal (image URL) and quick appraisal (Gemini-only).
 * Auth: Bearer token required (requireAuth).
 * Does not modify routes/appraise.js; duplicates needed logic here.
 */
import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const supabaseAdmin = process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  : null;

const FRONTEND_URL = process.env.FRONTEND_URL || process.env.VITE_APP_URL || 'http://localhost:5173';

// --- Duplicated helpers (from appraise flow, not importing to avoid touching appraise.js) ---

async function fetchEbaySoldListings(itemName) {
  const encodedItem = encodeURIComponent(itemName);
  const url = `https://svcs.ebay.com/services/search/FindingService/v1` +
    `?OPERATION-NAME=findCompletedItems` +
    `&SERVICE-VERSION=1.0.0` +
    `&SECURITY-APPNAME=${process.env.EBAY_APP_ID}` +
    `&RESPONSE-DATA-FORMAT=JSON` +
    `&keywords=${encodedItem}` +
    `&itemFilter(0).name=SoldItemsOnly` +
    `&itemFilter(0).value=true` +
    `&sortOrder=EndTimeSoonest` +
    `&paginationInput.entriesPerPage=20`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    const items = data?.findCompletedItemsResponse?.[0]?.searchResult?.[0]?.item || [];
    const prices = items
      .map(i => parseFloat(i?.sellingStatus?.[0]?.currentPrice?.[0]?.__value__))
      .filter(p => !isNaN(p) && p > 0);
    if (prices.length === 0) return null;
    return {
      source: 'eBay Sold Listings',
      prices,
      count: prices.length,
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
      low: Math.min(...prices),
      high: Math.max(...prices),
    };
  } catch (err) {
    console.error('Extension eBay API error:', err.message);
    return null;
  }
}

async function fetchGoogleShopping(query) {
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.shopping_results || data.shopping_results.length === 0) return null;
    const prices = data.shopping_results.map(r => parseFloat(r.extracted_price)).filter(p => !isNaN(p));
    if (prices.length === 0) return null;
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    return {
      source: 'google_shopping',
      prices,
      count: prices.length,
      avg,
      low: Math.min(...prices),
      high: Math.max(...prices),
    };
  } catch (err) {
    console.error('Extension Google Shopping error:', err.message);
    return null;
  }
}

async function fetchCraigslistPrices(itemName) {
  const query = encodeURIComponent(itemName);
  const url = `https://www.craigslist.org/search/sss?query=${query}&hasPic=1&postedToday=0&bundleDuplicates=0`;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
    });
    const html = await res.text();
    const priceRegex = /\$[\d,]+/g;
    const matches = html.match(priceRegex) || [];
    const prices = matches
      .map(p => parseFloat(p.replace(/[$,]/g, '')))
      .filter(p => !isNaN(p) && p > 0 && p < 100000);
    if (prices.length === 0) return null;
    const unique = [...new Set(prices)].sort((a, b) => a - b);
    const mid = unique.slice(
      Math.floor(unique.length * 0.1),
      Math.floor(unique.length * 0.9),
    );
    return {
      source: 'Craigslist',
      prices: mid,
      count: mid.length,
      avg: mid.reduce((a, b) => a + b, 0) / mid.length,
      low: Math.min(...mid),
      high: Math.max(...mid),
    };
  } catch (err) {
    console.error('Extension Craigslist error:', err.message);
    return null;
  }
}

async function fetchMercariPrices(itemName) {
  const query = encodeURIComponent(itemName);
  const url = `https://www.mercari.com/search/?keyword=${query}&status=sold_out`;
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    const html = await res.text();
    const priceRegex = /\$[\d,]+(?:\.\d{2})?/g;
    const matches = html.match(priceRegex) || [];
    const prices = matches
      .map(p => parseFloat(p.replace(/[$,]/g, '')))
      .filter(p => !isNaN(p) && p > 0 && p < 50000);
    if (prices.length === 0) return null;
    const sorted = [...new Set(prices)].sort((a, b) => a - b);
    const trimmed = sorted.slice(
      Math.floor(sorted.length * 0.1),
      Math.floor(sorted.length * 0.9),
    );
    return {
      source: 'Mercari',
      prices: trimmed,
      count: trimmed.length,
      avg: trimmed.reduce((a, b) => a + b, 0) / trimmed.length,
      low: Math.min(...trimmed),
      high: Math.max(...trimmed),
    };
  } catch (err) {
    console.error('Extension Mercari error:', err.message);
    return null;
  }
}

async function identifyItemWithGemini(input) {
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const sourceSummary = pricingSources.length
    ? pricingSources
        .filter(Boolean)
        .map(s => `${s.source}: $${s.low.toFixed(0)}–$${s.high.toFixed(0)} (${s.count} data points, avg $${s.avg.toFixed(0)})`)
        .join('\n')
    : 'No comparable sales data found.';
  const prompt = `You are an expert secondhand market appraiser. Based on the pricing data below, provide a final appraisal.

Item: ${itemData.name}
Condition: ${itemData.condition}
Category: ${itemData.category}

Pricing data found:
${sourceSummary}

Return ONLY a JSON object with no markdown:
{
  "priceFair": <number>,
  "priceLow": <number>,
  "priceHigh": <number>,
  "confidenceScore": <integer 0-100>,
  "sourcesSummary": "One sentence",
  "sourcesCount": <number>,
  "sellerTips": ["tip 1", "tip 2", "tip 3"]
}`;
  try {
    const result = await model.generateContent(prompt);
    if (!result?.response) return null;
    const text = (result.response.text() || '').trim().replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  } catch (err) {
    console.error('Extension Gemini synthesis error:', err.message);
    return null;
  }
}

async function synthesizeAppraisalFromKnowledgeOnly(itemData) {
  if (!genAI) return null;
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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
    // Check daily usage limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error: countError } = await supabaseAdmin
      .from('appraisals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', today.toISOString());
    const dailyLimit = 3;
    const usage = count ?? 0;
    if (usage >= dailyLimit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `You've used ${usage} of ${dailyLimit} free appraisals today. Upgrade to Pro for unlimited.`,
        usage,
        limit: dailyLimit,
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
    const [ebayData, googleData, craigslistData, mercariData] = await Promise.allSettled([
      fetchEbaySoldListings(query),
      fetchGoogleShopping(query),
      fetchCraigslistPrices(query),
      fetchMercariPrices(query),
    ]);

    const pricingSources = [
      ebayData.status === 'fulfilled' ? ebayData.value : null,
      googleData.status === 'fulfilled' ? googleData.value : null,
      craigslistData.status === 'fulfilled' ? craigslistData.value : null,
      mercariData.status === 'fulfilled' ? mercariData.value : null,
    ].filter(Boolean);

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
    // Check daily usage limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count, error: countError } = await supabaseAdmin
      .from('appraisals')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id)
      .gte('created_at', today.toISOString());
    const dailyLimit = 3;
    const usage = count ?? 0;
    if (usage >= dailyLimit) {
      return res.status(429).json({
        error: 'Daily limit reached',
        message: `You've used ${usage} of ${dailyLimit} free appraisals today. Upgrade to Pro for unlimited.`,
        usage,
        limit: dailyLimit,
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

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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

    // Google Shopping via SerpAPI (retail prices → apply secondhand factor)
    const googleData = await fetchGoogleShopping(searchQuery);
    if (googleData && googleData.prices && googleData.prices.length > 0) {
      const sorted = [...googleData.prices].sort((a, b) => a - b);
      const retailLow = sorted[Math.floor(sorted.length * 0.15)] ?? sorted[0];
      const retailHigh = sorted[Math.floor(sorted.length * 0.85)] ?? sorted[sorted.length - 1];
      priceLow = Math.round(retailLow * 0.3);
      priceHigh = Math.round(retailHigh * 0.6);
      dataPoints += googleData.prices.length;
      sources.push('google_shopping');
    }

    // eBay sold listings (actual secondhand prices — use directly)
    const ebayData = await fetchEbaySoldListings(searchQuery);
    if (ebayData && ebayData.prices && ebayData.prices.length > 0) {
      const ebayLow = ebayData.low;
      const ebayHigh = ebayData.high;
      if (priceLow === null || ebayLow < priceLow) priceLow = Math.round(ebayLow);
      if (priceHigh === null || ebayHigh > priceHigh) priceHigh = Math.round(ebayHigh);
      dataPoints += ebayData.prices.length;
      sources.push('ebay');
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
