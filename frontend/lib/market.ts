/**
 * Market-intelligence helpers — shared by the appraisal results page and the
 * compact price-insight box on listings.
 *
 * Everything here works only from real numbers the backend already computed
 * (per-marketplace sold-price stats saved as `raw_sources`). Nothing here
 * invents data: with fewer than MIN_HISTOGRAM_POINTS real prices, callers
 * should show a plain-text fallback instead of a chart.
 */

export interface PricingSource {
  /** Marketplace name, e.g. "eBay Sold Listings". */
  name: string;
  count: number;
  avg: number;
  low: number;
  high: number;
  /** Individual sold/asking prices behind this source's stats, when available. */
  prices?: number[];
}

export const MIN_HISTOGRAM_POINTS = 5;

/** Every individual real price point across all sources, deduped of junk values. */
export function combinedPrices(sources?: PricingSource[] | null): number[] {
  if (!sources || !sources.length) return [];
  return sources
    .flatMap((s) => s.prices ?? [])
    .filter((p): p is number => typeof p === 'number' && isFinite(p) && p > 0);
}

export interface Histogram {
  min: number;
  max: number;
  binWidth: number;
  bins: { lo: number; hi: number; count: number; prices: number[] }[];
}

/** Bins real sold prices into a small number of buckets. Returns null when there isn't enough data. */
export function buildHistogram(prices: number[], binCount = 12): Histogram | null {
  if (prices.length < MIN_HISTOGRAM_POINTS) return null;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = Math.max(1, max - min);
  const binWidth = span / binCount;
  const bins: Histogram['bins'] = Array.from({ length: binCount }, (_, i) => ({
    lo: min + i * binWidth,
    hi: min + (i + 1) * binWidth,
    count: 0,
    prices: [],
  }));
  prices.forEach((p) => {
    const idx = Math.min(binCount - 1, Math.max(0, Math.floor((p - min) / binWidth)));
    bins[idx].count += 1;
    bins[idx].prices.push(p);
  });
  return { min, max, binWidth, bins };
}

export const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

/** Position (0-100) of a value along a [min, max] axis, clamped. */
export function positionOf(value: number, min: number, max: number): number {
  if (max <= min) return 50;
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
}
