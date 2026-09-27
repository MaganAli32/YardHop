/**
 * Stage 3 — Comparable sales.
 *
 * Sources, all optional and run in parallel:
 *  - Google-Search-grounded Gemini for SOLD/LISTED comps (two queries: exact
 *    and model-level) — rejected unless grounding metadata proves a search ran.
 *  - SerpAPI eBay engine filtered to sold + completed listings (best signal
 *    when SERPAPI_KEY is set).
 *  - SerpAPI Google Shopping for a new-retail anchor.
 *
 * Then a fast structured call rates each comp's relevance to the identified
 * item so accessories, parts, bundles and look-alikes do not pollute pricing.
 */
import { generate, MODELS } from '../gemini.js';

const CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const cache = new Map();

function cacheGet(key) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  cache.delete(key);
  return undefined;
}
function cacheSet(key, value) {
  if (value) cache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
}
/** Drop cached lookups (tests, or after a config change). */
export function clearCompsCache() {
  cache.clear();
}

const CONDITION_WORDS = ['new', 'like new', 'excellent', 'very good', 'good', 'fair', 'poor', 'used', 'pre-owned', 'refurbished', 'for parts'];

/** Parse "COMP:" lines. Accepts 4 or 5 pipe-separated fields. */
export function parseCompLines(text, query) {
  if (!text) return [];
  const out = [];
  const re = /^\s*(?:[-*•]\s*)?COMP:\s*\$?\s*([\d,]+(?:\.\d{1,2})?)\s*\|\s*([^|\n]+?)\s*\|\s*(SOLD|LISTED)\s*\|\s*(.+)$/gim;
  for (const m of text.matchAll(re)) {
    const price = parseFloat(m[1].replace(/,/g, ''));
    if (!Number.isFinite(price) || price <= 0 || price >= 1_000_000) continue;
    const rest = m[4].split('|').map((s) => s.trim()).filter(Boolean);
    let condition = null;
    let title;
    if (rest.length >= 2 && CONDITION_WORDS.some((w) => rest[0].toLowerCase().includes(w)) && rest[0].length <= 24) {
      condition = rest[0];
      title = rest.slice(1).join(' | ');
    } else {
      title = rest.join(' | ');
    }
    if (!title) continue;
    out.push({
      price,
      site: m[2].trim(),
      sold: m[3].toUpperCase() === 'SOLD',
      condition,
      title: title.slice(0, 160),
      source: 'grounded_search',
      query,
    });
  }
  return out;
}

export async function fetchGroundedComps(query, { timeoutMs = 25000, label = 'comps' } = {}) {
  if (!process.env.GEMINI_API_KEY || !query) return { comps: [], grounded: false };
  const key = `grounded:${query.toLowerCase().trim()}`;
  const cached = cacheGet(key);
  if (cached) return cached;

  // Question-form phrasing reliably triggers the search tool.
  const prompt = `What have "${query}" recently sold for on the secondhand market? Search eBay sold/completed listings first, then Mercari, Grailed, StockX, Chrono24, Reverb, OfferUp or Facebook Marketplace as relevant. Find as many real, recent listings for this exact item as you can (aim for 8–15).

Report every listing you found, one per line, in exactly this format:
COMP: $<price> | <site> | <SOLD or LISTED> | <condition if stated, else Unknown> | <listing title>

Rules: only listings that appear in your search results — never invent or estimate. Prices in USD, item only (exclude shipping). Include a listing even if it is a slightly different variant, but copy the title exactly so the variant is visible. If you truly find nothing, write NONE.`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await generate({
        model: MODELS.fast,
        parts: [{ text: prompt }],
        search: true,
        temperature: 0,
        thinking: 'low',
        timeoutMs,
        label,
      });
      if (!res.grounded) {
        console.warn(`[appraisal] ${label}: model skipped web search (attempt ${attempt})`);
        continue;
      }
      const comps = parseCompLines(res.text, query);
      const value = { comps, grounded: true, searchQueries: res.searchQueries, sources: res.sources.slice(0, 10) };
      if (comps.length) cacheSet(key, value);
      return value;
    } catch (err) {
      console.error(`[appraisal] ${label} error:`, err.message);
      return { comps: [], grounded: false, error: err.message };
    }
  }
  return { comps: [], grounded: false };
}

function serpKey() {
  const key = process.env.SERPAPI_KEY;
  if (!key || key.length < 32) return null;
  return key;
}

/** eBay sold + completed listings via SerpAPI. */
export async function fetchEbaySold(query, { timeoutMs = 15000 } = {}) {
  const key = serpKey();
  if (!key || !query) return { comps: [], skipped: true };
  const cacheKey = `ebay:${query.toLowerCase().trim()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  try {
    const url = `https://serpapi.com/search.json?engine=ebay&_nkw=${encodeURIComponent(query)}&LH_Sold=1&LH_Complete=1&_ipg=60&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const rows = data.organic_results || [];
    const comps = rows
      .map((r) => {
        const price = r.price?.extracted ?? r.price?.from?.extracted ?? null;
        if (!price || price <= 0) return null;
        return {
          price,
          site: 'eBay',
          sold: true,
          condition: r.condition || null,
          title: String(r.title || '').slice(0, 160),
          url: r.link || null,
          source: 'ebay_sold',
          query,
        };
      })
      .filter(Boolean);
    const value = { comps };
    if (comps.length) cacheSet(cacheKey, value);
    return value;
  } catch (err) {
    console.error('[appraisal] eBay sold (SerpAPI) error:', err.message);
    return { comps: [], error: err.message };
  }
}

/** New-retail anchor from Google Shopping via SerpAPI. */
export async function fetchRetailPrices(query, { timeoutMs = 15000 } = {}) {
  const key = serpKey();
  if (!key || !query) return null;
  const cacheKey = `shopping:${query.toLowerCase().trim()}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  try {
    const url = `https://serpapi.com/search.json?engine=google_shopping&q=${encodeURIComponent(query)}&api_key=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const prices = (data.shopping_results || [])
      .map((r) => parseFloat(r.extracted_price))
      .filter((p) => Number.isFinite(p) && p > 0);
    if (!prices.length) return null;
    const value = { source: 'google_shopping', prices, count: prices.length };
    cacheSet(cacheKey, value);
    return value;
  } catch (err) {
    console.error('[appraisal] Google Shopping (SerpAPI) error:', err.message);
    return null;
  }
}

function dedupe(comps) {
  const seen = new Set();
  const out = [];
  for (const c of comps) {
    const k = `${c.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 60)}|${Math.round(c.price)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(c);
  }
  return out;
}

/**
 * Run every comp source for the given queries.
 * @param {{exact: string, model?: string}} queries
 * @returns {Promise<{comps: Array, retail: object|null, diagnostics: object}>}
 */
export async function gatherComps(queries, { timeoutMs = 25000 } = {}) {
  const exact = queries.exact;
  const model = queries.model && queries.model.toLowerCase() !== exact.toLowerCase() ? queries.model : null;

  const jobs = [
    ['grounded_exact', fetchGroundedComps(exact, { timeoutMs, label: 'comps:exact' })],
    ['ebay_sold', fetchEbaySold(exact, { timeoutMs: Math.min(timeoutMs, 15000) })],
    ['retail', fetchRetailPrices(exact, { timeoutMs: Math.min(timeoutMs, 15000) })],
  ];
  if (model) jobs.push(['grounded_model', fetchGroundedComps(model, { timeoutMs, label: 'comps:model' })]);

  const settled = await Promise.allSettled(jobs.map((j) => j[1]));
  const diagnostics = {};
  let comps = [];
  let retail = null;
  settled.forEach((r, i) => {
    const name = jobs[i][0];
    if (r.status !== 'fulfilled' || !r.value) {
      diagnostics[name] = { ok: false, error: r.reason?.message || 'no data' };
      return;
    }
    const v = r.value;
    if (name === 'retail') {
      retail = v;
      diagnostics[name] = { ok: true, count: v.count };
    } else {
      comps = comps.concat(v.comps || []);
      diagnostics[name] = { ok: (v.comps || []).length > 0, count: (v.comps || []).length, grounded: v.grounded, skipped: v.skipped, error: v.error };
    }
  });
  return { comps: dedupe(comps), retail, diagnostics };
}

const FILTER_SCHEMA = {
  type: 'OBJECT',
  properties: {
    ratings: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          i: { type: 'INTEGER' },
          match: { type: 'STRING', enum: ['exact', 'similar', 'unrelated'] },
          partial: { type: 'BOOLEAN' },
        },
        required: ['i', 'match', 'partial'],
      },
    },
  },
  required: ['ratings'],
};

/**
 * Rate comps against the identified item. Returns comps annotated with
 * `match` ('exact' | 'similar') — unrelated, accessory, parts-only and
 * bundle listings are dropped. On any failure the input is returned with
 * match 'similar' so pricing can still proceed.
 */
export async function filterComps(item, comps, { timeoutMs = 15000 } = {}) {
  if (!comps.length) return [];
  const fallback = comps.map((c) => ({ ...c, match: 'similar' }));
  try {
    const itemDesc = [
      `Item: ${item.name}`,
      item.brand ? `Brand: ${item.brand}` : null,
      item.model ? `Model: ${item.model}` : null,
      item.variant ? `Variant: ${item.variant}` : null,
      item.referenceNumber ? `Reference: ${item.referenceNumber}` : null,
      item.size ? `Size: ${item.size}` : null,
      item.includedItems?.length ? `Included: ${item.includedItems.join(', ')}` : null,
    ].filter(Boolean).join('\n');
    const list = comps.map((c, i) => `${i}. $${c.price} | ${c.sold ? 'SOLD' : 'LISTED'} | ${c.condition || '?'} | ${c.title}`).join('\n');
    const prompt = `We are pricing this secondhand item:
${itemDesc}

Rate each candidate listing below.
match = "exact" when the listing is the same product (same model and variant/size if the item has one); "similar" when it is the same model but a different variant, size, colorway, generation or a close substitute buyers would compare; "unrelated" when it is a different product, an accessory, a strap/band/case/charger only, a box only, a replica, or a lot/bundle whose price does not represent one unit.
partial = true when the listing is for parts/not working, damaged, or missing key components.

Candidates:
${list}

Return JSON: {"ratings": [{"i": index, "match": "...", "partial": bool}, ...]} covering every index.`;

    const res = await generate({
      model: MODELS.fast,
      parts: [{ text: prompt }],
      schema: FILTER_SCHEMA,
      temperature: 0,
      thinking: 'low',
      timeoutMs,
      label: 'filter-comps',
    });
    const ratings = res.json?.ratings;
    if (!Array.isArray(ratings) || !ratings.length) return fallback;
    const byIndex = new Map(ratings.map((r) => [Number(r.i), r]));
    const kept = [];
    comps.forEach((c, i) => {
      const r = byIndex.get(i);
      if (!r) { kept.push({ ...c, match: 'similar' }); return; }
      if (r.match === 'unrelated' || r.partial) return;
      kept.push({ ...c, match: r.match === 'exact' ? 'exact' : 'similar' });
    });
    return kept;
  } catch (err) {
    console.warn('[appraisal] filter-comps failed, keeping all comps:', err.message);
    return fallback;
  }
}
