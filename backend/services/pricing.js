/**
 * Shared market-pricing data layer for appraisals.
 *
 * Sources (no scrapers, no marketplace API keys needed):
 *  1. fetchGroundedComps  — Gemini + Google Search grounding. Google fetches live
 *     listings (eBay sold, Mercari, OfferUp, Facebook Marketplace) server-side and
 *     the model returns structured comps. Results are rejected unless the response
 *     contains grounding metadata proving a real web search happened.
 *  2. fetchGoogleShopping — SerpAPI (optional; skipped when no real key is set).
 *
 * Results are cached in-memory for CACHE_TTL_MS per normalized query.
 */

const GEMINI_MODEL = 'gemini-flash-latest';
const GROUNDING_TIMEOUT_MS = Number(process.env.GROUNDING_TIMEOUT_MS || 28000);
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const cache = new Map(); // query -> { expires, value }

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  cache.delete(key);
  return undefined;
}

function cacheSet(key, value) {
  // Cache successful lookups only; failures should retry next time
  if (value) cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
}

function statsFromPrices(prices) {
  return {
    count: prices.length,
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    low: Math.min(...prices),
    high: Math.max(...prices),
  };
}

// Round to sensible increments so tiny comp differences don't jitter the result.
function roundPrice(n) {
  if (n < 100) return Math.round(n);
  if (n < 500) return Math.round(n / 5) * 5;
  if (n < 2000) return Math.round(n / 10) * 10;
  return Math.round(n / 25) * 25;
}

// Linear-interpolated percentile over an ascending-sorted array.
function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

// Condition multiplier applied to the recommended (fair) price only.
const CONDITION_FACTORS = {
  new: 1.05,
  'like new': 1.0,
  good: 0.9,
  fair: 0.75,
  poor: 0.6,
};

/**
 * Deterministically derive a price range from comps. Pure function of its
 * inputs: identical comps always yield identical numbers (no LLM, no RNG).
 *
 * - SOLD comps are weighted 2x vs. active listings.
 * - Google Shopping (new retail, no `comps` array) is scaled to resale (x0.5).
 * - Outliers are trimmed via the IQR rule before computing percentiles.
 * - low/high are the 25th/75th percentiles; fair is the median x condition factor.
 *
 * Returns { priceLow, priceHigh, priceFair, confidenceScore, sourcesCount } or null.
 */
export function computeMarketPrice(pricingSources, condition) {
  const points = [];
  for (const s of pricingSources) {
    if (!s) continue;
    if (s.comps?.length) {
      for (const c of s.comps) {
        const weight = c.sold ? 2 : 1;
        for (let i = 0; i < weight; i++) points.push(c.price);
      }
    } else if (s.prices?.length) {
      for (const p of s.prices) points.push(p * 0.5); // new retail → resale
    }
  }
  if (points.length === 0) return null;

  const sorted = [...points].sort((a, b) => a - b);

  // IQR outlier trim (keeps the range robust to bundle/parts-only listings).
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const trimmed = sorted.filter((p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
  const use = trimmed.length >= 3 ? trimmed : sorted;

  const low = percentile(use, 0.25);
  const high = percentile(use, 0.75);
  const median = percentile(use, 0.5);

  const factor = CONDITION_FACTORS[(condition || '').toLowerCase().trim()] ?? 1.0;
  const fair = Math.min(Math.max(median * factor, low), high);

  // Deterministic confidence: more distinct comps + tighter spread = higher.
  const mean = use.reduce((a, b) => a + b, 0) / use.length;
  const variance = use.reduce((a, b) => a + (b - mean) ** 2, 0) / use.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  const uniqueCount = new Set(use).size;
  const confidence = Math.max(30, Math.min(95, 45 + uniqueCount * 4 - Math.round(cv * 40)));

  return {
    priceLow: roundPrice(low),
    priceHigh: roundPrice(high),
    priceFair: roundPrice(fair),
    confidenceScore: confidence,
    sourcesCount: pricingSources.reduce((n, s) => n + (s?.count || 0), 0),
  };
}

/**
 * Live comps via Gemini Google Search grounding.
 * Returns { source, prices, count, avg, low, high, comps } or null.
 */
export async function fetchGroundedComps(query) {
  if (!process.env.GEMINI_API_KEY || !query) return null;

  const cacheKey = `grounded:${query.toLowerCase().trim()}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  // Question-form phrasing reliably triggers the search tool; imperative or
  // JSON-output prompts make the model answer from memory instead.
  const prompt = `What are current asking and sold prices for "${query}" on the secondhand market (eBay sold listings, Mercari, OfferUp, Facebook Marketplace)? Find real current listings. Then report each listing you found, one per line, in exactly this format:
COMP: $<price> | <site> | <SOLD or LISTED> | <listing title>
Only report listings that appear in the search results — never invent listings. Prices in USD.`;

  // The model occasionally answers from memory instead of searching; retry once.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0, topP: 0, thinkingConfig: { thinkingLevel: 'low' } },
          }),
          signal: AbortSignal.timeout(GROUNDING_TIMEOUT_MS),
        },
      );

      if (!res.ok) {
        console.error('[pricing] Grounded comps HTTP error:', res.status, (await res.text()).slice(0, 200));
        return null;
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const grounding = candidate?.groundingMetadata;
      const searched =
        (grounding?.webSearchQueries?.length || 0) > 0 ||
        (grounding?.groundingChunks?.length || 0) > 0;

      // No grounding metadata means the model answered from memory — discard to
      // avoid passing hallucinated "listings" downstream as market data.
      if (!searched) {
        console.warn(`[pricing] Grounded comps: model skipped web search (attempt ${attempt})`);
        continue;
      }

      const text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join('') || '';
      const comps = [...text.matchAll(/^COMP:\s*\$?([\d,]+(?:\.\d{1,2})?)\s*\|\s*([^|]+?)\s*\|\s*(SOLD|LISTED)\s*\|\s*(.+)$/gim)]
        .map((m) => ({
          price: parseFloat(m[1].replace(/,/g, '')),
          source: m[2].trim(),
          sold: m[3].toUpperCase() === 'SOLD',
          title: m[4].trim(),
        }))
        .filter((c) => !isNaN(c.price) && c.price > 0 && c.price < 1000000);

      if (comps.length === 0) return null;

      const result = {
        source: 'Live market search (eBay, Mercari, OfferUp, FB Marketplace)',
        prices: comps.map((c) => c.price),
        ...statsFromPrices(comps.map((c) => c.price)),
        comps,
      };
      cacheSet(cacheKey, result);
      return result;
    } catch (err) {
      console.error('[pricing] Grounded comps error:', err.message);
      return null;
    }
  }
  return null;
}

/**
 * Google Shopping via SerpAPI (new-retail price anchor).
 * Skipped unless a plausible real key is configured.
 */
export async function fetchGoogleShopping(query) {
  const key = process.env.SERPAPI_KEY;
  // Real SerpAPI keys are 64 hex chars; skip obvious placeholders
  if (!key || key.length < 32 || !query) return null;

  const cacheKey = `shopping:${query.toLowerCase().trim()}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) return cached;

  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    const data = await res.json();
    if (!data.shopping_results?.length) return null;

    const prices = data.shopping_results
      .map((r) => parseFloat(r.extracted_price))
      .filter((p) => !isNaN(p) && p > 0);
    if (prices.length === 0) return null;

    const result = {
      source: 'Google Shopping (new retail)',
      prices,
      ...statsFromPrices(prices),
    };
    cacheSet(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[pricing] Google Shopping (SerpAPI) error:', err.message);
    return null;
  }
}

/** Fetch all pricing sources in parallel; failures are isolated. Returns non-null sources. */
export async function fetchAllPricingSources(query) {
  const results = await Promise.allSettled([
    fetchGroundedComps(query),
    fetchGoogleShopping(query),
  ]);
  return results
    .map((r) => (r.status === 'fulfilled' ? r.value : null))
    .filter(Boolean);
}

/**
 * Human-readable summary of sources for synthesis prompts, including individual
 * comp listings when available so the model anchors on real sales.
 */
export function describePricingSources(pricingSources) {
  if (!pricingSources.length) return 'No comparable sales data found.';
  return pricingSources
    .map((s) => {
      let line = `${s.source}: $${s.low.toFixed(0)}–$${s.high.toFixed(0)} (${s.count} data points, avg $${s.avg.toFixed(0)})`;
      if (s.comps?.length) {
        line += '\n' + s.comps
          .slice(0, 12)
          .map((c) => `  - ${c.sold ? '[SOLD] ' : '[listed] '}$${c.price} — ${c.title} (${c.source})`)
          .join('\n');
      }
      return line;
    })
    .join('\n');
}
