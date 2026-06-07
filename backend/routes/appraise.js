import express from 'express';
import multer from 'multer';
import { optionalAuth } from '../middleware/auth.js';
import { appendFileSync } from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const DEBUG_LOG = '/Users/maganali/Downloads/yardhop/.cursor/debug.log';
function _log(location, message, data = {}, hypothesisId = '') {
  try {
    appendFileSync(DEBUG_LOG, JSON.stringify({ location, message, data, hypothesisId, timestamp: Date.now() }) + '\n');
  } catch (_) {}
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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
    const items = data?.findCompletedItemsResponse?.[0]
      ?.searchResult?.[0]?.item || [];

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
    console.error('eBay API error:', err.message);
    return null;
  }
}

async function fetchGoogleShopping(query) {
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${process.env.SERPAPI_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('Google Shopping raw response keys:', Object.keys(data));
    console.log('Google Shopping results count:', data.shopping_results?.length || 0);
    if (!data.shopping_results || data.shopping_results.length === 0) return null;
    const prices = data.shopping_results.map(r => parseFloat(r.extracted_price)).filter(p => !isNaN(p));
    if (prices.length === 0) return null;
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    return {
      avg_price: avg,
      listings_found: prices.length,
      source: 'google_shopping',
      prices,
      count: prices.length,
      avg,
      low: Math.min(...prices),
      high: Math.max(...prices),
    };
  } catch (err) {
    console.error('Google Shopping (SerpAPI) error:', err.message);
    return null;
  }
}

async function fetchCraigslistPrices(itemName) {
  const query = encodeURIComponent(itemName);
  const url = `https://www.craigslist.org/search/sss?query=${query}&hasPic=1&postedToday=0&bundleDuplicates=0`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await res.text();

    // Extract prices from Craigslist HTML
    const priceRegex = /\$[\d,]+/g;
    const matches = html.match(priceRegex) || [];
    const prices = matches
      .map(p => parseFloat(p.replace(/[$,]/g, '')))
      .filter(p => !isNaN(p) && p > 0 && p < 100000);

    if (prices.length === 0) return null;

    // Deduplicate and take median range
    const unique = [...new Set(prices)].sort((a, b) => a - b);
    const mid = unique.slice(
      Math.floor(unique.length * 0.1),
      Math.floor(unique.length * 0.9)
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
    console.error('Craigslist scrape error:', err.message);
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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
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
      Math.floor(sorted.length * 0.9)
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
    console.error('Mercari scrape error:', err.message);
    return null;
  }
}

async function identifyItemWithGemini(input) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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

Return ONLY a JSON object with no markdown, no explanation:
{
  "priceFair": <single number, the recommended selling price>,
  "priceLow": <lower bound of typical range>,
  "priceHigh": <upper bound of typical range>,
  "confidenceScore": <integer 0-100 based on data quality and volume>,
  "sourcesSummary": "One sentence like: Based on X sales across eBay, Mercari, and Craigslist",
  "sourcesCount": <total number of data points used>,
  "sellerTips": ["tip 1", "tip 2", "tip 3"]
}

Rules:
- priceFair should be a realistic selling price, not the average — account for condition
- confidenceScore should be lower if fewer than 5 data points, or if sources disagree widely
- sellerTips should be specific and actionable, not generic
- If data is insufficient, still return a best estimate with low confidence score`;

  try {
    const result = await model.generateContent(prompt);
    if (!result?.response) return null;
    const rawText = result.response.text();
    const text = (typeof rawText === 'string' ? rawText : String(rawText)).trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error('Gemini synthesis error:', err.message);
    return null;
  }
}

/** When no pricing sources return data, ask Gemini to estimate from item knowledge only (low confidence). */
async function synthesizeAppraisalFromKnowledgeOnly(itemData) {
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
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

// #region agent log
const _dbg = (location, message, data, hypothesisId) => { _log(location, message, data, hypothesisId); fetch('http://127.0.0.1:7244/ingest/7dbf980e-7204-430f-9fda-369640789db7', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location, message, data: data || {}, timestamp: Date.now(), hypothesisId }) }).catch(() => {}); };
// #endregion

const FREE_LIMIT = 3;
const APPRAISAL_TIMEOUT_MS = Number(process.env.APPRAISAL_TIMEOUT_MS || 25000);

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
    const [ebayData, googleData, craigslistData, mercariData] = await withTimeout(Promise.allSettled([
      fetchEbaySoldListings(query),
      fetchGoogleShopping(query),
      fetchCraigslistPrices(query),
      fetchMercariPrices(query),
    ]));
    const pricingSources = [
      ebayData.status === 'fulfilled' ? ebayData.value : null,
      googleData.status === 'fulfilled' ? googleData.value : null,
      craigslistData.status === 'fulfilled' ? craigslistData.value : null,
      mercariData.status === 'fulfilled' ? mercariData.value : null,
    ].filter(Boolean);
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
      confidence: Math.round((synthesis.confidenceScore || 0) * 10) / 100,
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

    const market = await fetchEbaySoldListings(title);
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
    console.log('=== APPRAISE ENDPOINT HIT ===');
    console.log('File received:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'NO FILE');

    const startTime = Date.now();
    const userId = req.user?.id || null;
    const ip = (req.headers['x-forwarded-for'] || req.ip || 'unknown').toString().split(',')[0].trim();
    const fingerprint = req.headers['x-fingerprint'] || null;

    // Usage check — block if free limit reached
    let count = 0;
    if (userId) {
      const { count: dbCount } = await supabase
        .from('appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_free', true);
      count = dbCount ?? 0;
    } else {
      let query = supabase
        .from('appraisals')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', ip)
        .eq('is_free', true);
      if (fingerprint) query = query.eq('fingerprint', fingerprint);
      const { count: dbCount } = await query;
      count = dbCount ?? 0;
    }
    if (count >= FREE_LIMIT) {
      return res.status(403).json({
        error: 'free_limit_reached',
        message: "You've used all 3 free appraisals. Upgrade to Pro for unlimited appraisals.",
        used: count,
        limit: FREE_LIMIT,
      });
    }

    let itemData = null;
    let inputType = 'text';

    // #region agent log
    _dbg('appraise.js:POST:entry', 'POST /api/appraise received', { codeVersion: 'no-422-fallback-v1', hasFile: !!req.file, fileSize: req.file?.size ?? 0, mimetype: req.file?.mimetype }, 'H2');
    // #endregion
    console.log('[appraise] POST: req.file exists=', !!req.file, 'size=', req.file?.size ?? 0, 'mimetype=', req.file?.mimetype);

    // Step 1: Identify the item
    if (req.file) {
      inputType = 'photo';
      const buffer = req.file.buffer;
      const base64 = buffer.toString('base64');
      // #region agent log
      _dbg('appraise.js:before-gemini', 'Calling Gemini with image', { bufferLength: buffer?.length, base64Length: base64?.length }, 'H2');
      // #endregion
      console.log('[appraise] Image: buffer length=', buffer?.length, 'base64 length=', base64?.length);
      itemData = await withTimeout(identifyItemWithGemini({
        type: 'image',
        mimeType: req.file.mimetype,
        data: base64
      }));
      // #region agent log
      _dbg('appraise.js:after-gemini', 'Gemini identification returned', { itemDataNull: itemData == null, itemName: itemData?.name }, 'H3');
      // #endregion
    } else if (req.body.description || req.body.item_description) {
      const descriptionText = req.body.description || req.body.item_description;
      itemData = await withTimeout(identifyItemWithGemini({
        type: 'text',
        text: descriptionText
      }));
      // #region agent log
      _dbg('appraise.js:after-gemini-text', 'Gemini identification returned (text)', { itemDataNull: itemData == null }, 'H3');
      // #endregion
    } else {
      // #region agent log
      _dbg('appraise.js:400-no-input', 'Sending 400: no image or description', {}, 'H2');
      // #endregion
      return res.status(400).json({ error: 'No image or description provided' });
    }

    if (!itemData) {
      // #region agent log
      _dbg('appraise.js:using-fallback', 'Using fallback item (no 422)', {}, 'H1');
      // #endregion
      console.log('[appraise] Gemini returned null; using fallback item');
      itemData = { ...FALLBACK_ITEM };
    }

    console.log('=== GEMINI IDENTIFICATION ===');
    console.log('Result:', JSON.stringify(itemData, null, 2));

    // Step 2: Fetch pricing from all sources in parallel (each failure is isolated via Promise.allSettled)
    const query = itemData.searchQuery;
    console.log('=== QUERYING SOURCES ===');
    console.log('Querying eBay...');
    console.log('Querying Google Shopping...');
    console.log('Querying Craigslist...');
    console.log('Querying Mercari...');

    const [ebayData, googleData, craigslistData, mercariData] = await withTimeout(Promise.allSettled([
      fetchEbaySoldListings(query).catch(err => { console.log('[appraise] eBay failed:', err?.message); return null; }),
      fetchGoogleShopping(query).catch(err => { console.log('[appraise] Google Shopping failed:', err?.message); return null; }),
      fetchCraigslistPrices(query).catch(err => { console.log('[appraise] Craigslist failed:', err?.message); return null; }),
      fetchMercariPrices(query).catch(err => { console.log('[appraise] Mercari failed:', err?.message); return null; }),
    ]));

    const results = [ebayData, googleData, craigslistData, mercariData];
    console.log('=== SOURCE RESULTS ===');
    results.forEach((r, i) => console.log(`Source ${i}:`, r.status, r.status === 'rejected' ? r.reason?.message : 'OK'));

    if (ebayData.status === 'rejected') console.log('[appraise] eBay rejected:', ebayData.reason?.message);
    if (googleData.status === 'rejected') console.log('[appraise] Google Shopping rejected:', googleData.reason?.message);
    if (craigslistData.status === 'rejected') console.log('[appraise] Craigslist rejected:', craigslistData.reason?.message);
    if (mercariData.status === 'rejected') console.log('[appraise] Mercari rejected:', mercariData.reason?.message);

    const pricingSources = [
      ebayData.status === 'fulfilled' ? ebayData.value : null,
      googleData.status === 'fulfilled' ? googleData.value : null,
      craigslistData.status === 'fulfilled' ? craigslistData.value : null,
      mercariData.status === 'fulfilled' ? mercariData.value : null,
    ].filter(Boolean);

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
    // #region agent log
    _dbg('appraise.js:200-success', 'Sending 200 with appraisal', { itemName: itemData.name }, 'H1');
    // #endregion
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
    // #region agent log
    _dbg('appraise.js:catch', 'Appraise endpoint exception', { message: err.message }, 'H5');
    // #endregion
    console.error('Appraise endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
