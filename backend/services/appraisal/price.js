/**
 * Stage 4 — Pricing. Pure functions: identical inputs always give identical
 * numbers. No model call happens here.
 *
 * Priority of evidence:
 *   1. Relevant comps (sold ×2, exact-match ×2, listed/similar ×1)
 *   2. New-retail prices (Google Shopping) scaled to resale
 *   3. Known MSRP × category depreciation × condition
 * When none exist the function returns null and the caller reports
 * "insufficient data" instead of inventing a number.
 */

export const CONDITION_FACTORS = {
  new: 1.05,
  'like new': 1.0,
  good: 0.9,
  fair: 0.75,
  poor: 0.55,
};

// Typical resale-as-fraction-of-MSRP for a Good-condition item by category.
const CATEGORY_RETENTION = [
  [/watch|jewel/i, 0.7],
  [/sneaker|shoe|footwear/i, 0.6],
  [/dj|audio|instrument|music|camera|lens/i, 0.6],
  [/phone|tablet|laptop|computer|console|electronic|wearable|fitness/i, 0.45],
  [/furniture|home|decor/i, 0.4],
  [/tool|sport|outdoor|bike/i, 0.5],
  [/cloth|apparel|fashion|bag|accessor/i, 0.35],
  [/toy|game|book|media|collect/i, 0.5],
];
const DEFAULT_RETENTION = 0.45;

export function roundPrice(n) {
  if (!Number.isFinite(n)) return 0;
  if (n < 20) return Math.round(n);
  if (n < 100) return Math.round(n);
  if (n < 500) return Math.round(n / 5) * 5;
  if (n < 2000) return Math.round(n / 10) * 10;
  return Math.round(n / 25) * 25;
}

export function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function conditionFactor(condition) {
  return CONDITION_FACTORS[(condition || '').toLowerCase().trim()] ?? 0.9;
}

function retentionFor(category) {
  for (const [re, v] of CATEGORY_RETENTION) if (re.test(category || '')) return v;
  return DEFAULT_RETENTION;
}

function weightedPoints(comps) {
  const points = [];
  for (const c of comps) {
    if (!Number.isFinite(c.price) || c.price <= 0) continue;
    let w = 1;
    if (c.sold) w *= 2;
    if (c.match === 'exact') w *= 2;
    for (let i = 0; i < w; i++) points.push(c.price);
  }
  return points;
}

function statsFrom(points) {
  const sorted = [...points].sort((a, b) => a - b);
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);
  const iqr = q3 - q1;
  const trimmed = sorted.filter((p) => p >= q1 - 1.5 * iqr && p <= q3 + 1.5 * iqr);
  const use = trimmed.length >= 3 ? trimmed : sorted;
  const mean = use.reduce((a, b) => a + b, 0) / use.length;
  const variance = use.reduce((a, b) => a + (b - mean) ** 2, 0) / use.length;
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1;
  return {
    low: percentile(use, 0.25),
    median: percentile(use, 0.5),
    high: percentile(use, 0.75),
    cv,
    unique: new Set(use).size,
  };
}

/**
 * @param {object} input
 * @param {Array}  input.comps       filtered comps with {price, sold, match}
 * @param {object} [input.retail]    { prices: number[] } new-retail anchor
 * @param {string} [input.condition]
 * @param {string} [input.category]
 * @param {number} [input.msrp]
 * @param {boolean}[input.collectible]
 * @returns {object|null}
 */
export function computeMarketPrice(input) {
  const { comps = [], retail = null, condition, category, msrp = null, collectible = false } = input;
  const factor = conditionFactor(condition);
  const exactCount = comps.filter((c) => c.match === 'exact').length;
  const soldCount = comps.filter((c) => c.sold).length;

  // 1a. A single comp is evidence, but thin: wide band, low confidence.
  if (comps.length === 1 && Number.isFinite(comps[0].price) && comps[0].price > 0) {
    let fair = comps[0].price * factor;
    if (msrp && !collectible) fair = Math.min(fair, msrp * 1.1);
    return {
      priceLow: roundPrice(fair * 0.8),
      priceHigh: roundPrice(fair * 1.2),
      priceFair: roundPrice(fair),
      confidenceScore: 35,
      sourcesCount: 1,
      method: 'comps',
      basis: `1 comparable ${comps[0].sold ? 'sale' : 'listing'} (${comps[0].match === 'exact' ? 'exact match' : 'similar item'})`,
    };
  }

  // 1b. Comps
  const points = weightedPoints(comps);
  if (comps.length >= 2 && points.length >= 2) {
    const s = statsFrom(points);
    let low = s.low;
    let high = s.high;
    // Comps already reflect market condition mix; nudge fair by seller condition.
    let fair = Math.min(Math.max(s.median * factor, low), high);

    // Sanity: a non-collectible item should not resell above retail.
    if (msrp && !collectible) {
      const cap = msrp * 1.1;
      if (high > cap) high = cap;
      if (fair > cap) fair = cap;
      if (low > cap) low = cap * 0.85;
    }
    if (high < low) [low, high] = [high, low];
    if (high === low) { low *= 0.9; high *= 1.1; }

    const distinct = comps.length;
    let confidence = 40 + Math.min(30, distinct * 3) + Math.min(15, exactCount * 3) + Math.min(10, soldCount * 2) - Math.round(s.cv * 40);
    confidence = Math.max(30, Math.min(95, confidence));

    return {
      priceLow: roundPrice(low),
      priceHigh: roundPrice(high),
      priceFair: roundPrice(fair),
      confidenceScore: confidence,
      sourcesCount: distinct,
      method: 'comps',
      basis: `${distinct} comparable listing${distinct === 1 ? '' : 's'} (${soldCount} sold, ${exactCount} exact match)`,
    };
  }

  // 2. Retail anchor → resale
  if (retail?.prices?.length) {
    const s = statsFrom(retail.prices);
    const retention = retentionFor(category);
    const fair = s.median * retention * factor;
    return {
      priceLow: roundPrice(fair * 0.8),
      priceHigh: roundPrice(fair * 1.2),
      priceFair: roundPrice(fair),
      confidenceScore: 40,
      sourcesCount: retail.prices.length,
      method: 'retail',
      basis: `${retail.prices.length} current retail prices scaled to typical ${category || 'secondhand'} resale`,
    };
  }

  // 3. MSRP depreciation
  if (msrp) {
    const retention = collectible ? 1.0 : retentionFor(category);
    const fair = msrp * retention * factor;
    return {
      priceLow: roundPrice(fair * 0.75),
      priceHigh: roundPrice(collectible ? fair * 1.5 : fair * 1.2),
      priceFair: roundPrice(fair),
      confidenceScore: 35,
      sourcesCount: 0,
      method: 'msrp',
      basis: `original retail price of $${roundPrice(msrp).toLocaleString()} depreciated for ${condition || 'Good'} condition`,
    };
  }

  return null;
}

/**
 * Final confidence shown to the user: a price is only as good as the
 * identification it was built on.
 */
export function overallConfidence(identityConfidence, priceConfidence, identityLevel) {
  const levelCap = { exact: 100, model: 85, brand: 60, category: 45, unknown: 20 }[identityLevel] ?? 45;
  const combined = Math.round(Math.min(identityConfidence, priceConfidence, levelCap));
  return Math.max(10, Math.min(95, combined));
}
