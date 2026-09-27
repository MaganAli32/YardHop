/**
 * ============================================================================
 * PLACEHOLDER DATA — NOT REAL. Delete this file when the backend can supply it.
 * ============================================================================
 *
 * The redesign shows several panels the appraisal pipeline does not yet produce.
 * Rather than scatter fake numbers through the page, every one lives here.
 *
 * Each panel the UI renders from this file is tagged `isSample: true`, and the
 * page puts a "Sample" chip on it so a visitor is never told a fabricated number
 * is a measurement.
 *
 * WHAT IS MISSING AND WHY
 *
 *   priceHistory     Needs monthly medians going back a year. Nothing stores a
 *                    sale date today, so there is no series to compute. Fix:
 *                    capture `soldDate` per comp, then aggregate by month.
 *
 *   conditionTiers   Needs the item priced at all four condition grades. The
 *                    pipeline assesses one grade and prices that one. Fix: run
 *                    the price stage per grade, or model a grade multiplier.
 *
 *   sellThrough      Needs unsold listings to divide by. The comps feed only
 *                    returns closed sales. Fix: capture active listings too.
 *
 *   daysToSell       Needs listing duration (listed date to sold date). Not
 *                    collected. Fix: same as sellThrough.
 *
 *   marketSignal     A composite of the three above plus price spread. Only the
 *                    spread term is real today.
 *
 * TO GO LIVE: replace each builder below with the real series, drop `isSample`,
 * and the chips disappear on their own. Nothing else in the page changes.
 */

export interface SampleFlagged {
  /** Drives the "Sample" chip. Set false once the field is real. */
  isSample: boolean
}

export interface ConditionTier extends SampleFlagged {
  label: string
  estimate: number
  sellThrough: number
  daysToSell: number
}

export interface HistoryPoint {
  label: string
  median: number
  count: number
}

export interface PriceHistory extends SampleFlagged {
  points: HistoryPoint[]
}

export interface MarketSignal extends SampleFlagged {
  score: number
  label: string
  parts: Array<{ key: string; value: number; real: boolean }>
}

const CONDITION_LABELS = ['Fair', 'Good', 'Very good', 'Excellent'] as const

/** Multipliers against the appraised grade, so tiers track the real estimate. */
const TIER_FACTOR: Record<string, number> = {
  Fair: 0.81,
  Good: 0.9,
  'Very good': 1.0,
  Excellent: 1.11,
}

const round10 = (n: number) => Math.round(n / 10) * 10

/** Map a free-text condition from the pipeline onto the four-tier scale. */
export function tierIndexFor(condition: string | null | undefined): number {
  const c = (condition || '').toLowerCase()
  if (c.includes('poor') || c.includes('fair')) return 0
  if (c.includes('excellent') || c.includes('like new') || c.includes('new')) return 3
  if (c.includes('very good')) return 2
  if (c.includes('good')) return 1
  return 2
}

/**
 * Four condition tiers scaled off the real estimate, so the grid is plausible
 * and moves with the appraisal instead of sitting at a hardcoded price.
 */
export function buildConditionTiers(estimate: number, appraisedTier: number): ConditionTier[] {
  const base = estimate / (TIER_FACTOR[CONDITION_LABELS[appraisedTier]] || 1)
  return CONDITION_LABELS.map((label, i) => ({
    label,
    estimate: round10(base * TIER_FACTOR[label]),
    sellThrough: [79, 85, 88, 91][i],
    daysToSell: [31, 27, 24, 21][i],
    isSample: true,
  }))
}

/**
 * Twelve months of medians drifting up to the real current estimate, so the
 * chart ends where the appraisal actually sits.
 */
export function buildPriceHistory(estimate: number): PriceHistory {
  const now = new Date()
  const drift = [-0.088, -0.081, -0.075, -0.079, -0.062, -0.054, -0.045, -0.036, -0.019, -0.026, -0.009, 0]
  const counts = [4, 3, 5, 4, 6, 5, 6, 5, 9, 8, 11, 8]
  const points = drift.map((d, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (drift.length - 1 - i), 1)
    return {
      label: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      median: round10(estimate * (1 + d)),
      count: counts[i],
    }
  })
  return { points, isSample: true }
}

/**
 * Composite market score. `priceStability` is computed from real comp spread;
 * the other three are placeholders, flagged per-part so the UI can mark them.
 */
export function buildMarketSignal(
  compPrices: number[],
  sellThrough: number,
  compCount: number,
): MarketSignal {
  const mean = compPrices.length
    ? compPrices.reduce((a, b) => a + b, 0) / compPrices.length
    : 0
  const variance = compPrices.length
    ? compPrices.reduce((a, b) => a + (b - mean) ** 2, 0) / compPrices.length
    : 0
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 1
  const stability = Math.max(0, Math.min(100, Math.round(100 - cv * 220)))
  const depth = Math.min(100, Math.round((compCount / 40) * 100))
  const recency = 72

  const score = Math.round(depth * 0.3 + sellThrough * 0.3 + stability * 0.2 + recency * 0.2)
  return {
    score,
    label: score >= 80 ? 'Strong market' : score >= 60 ? 'Balanced market' : 'Soft market',
    parts: [
      { key: 'Data depth', value: depth, real: true },
      { key: 'Price stability', value: stability, real: true },
      { key: 'Sell-through', value: sellThrough, real: false },
      { key: 'Recency', value: recency, real: false },
    ],
    isSample: true,
  }
}

/**
 * Plausible sale dates spread across a 90-day window, ordered so higher-match
 * comps read as more recent. Purely cosmetic until comps carry a real date.
 */
export function sampleSoldDate(index: number, total: number): { label: string; daysAgo: number } {
  const daysAgo = Math.round(4 + (index / Math.max(1, total - 1)) * 86)
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  return {
    label: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    daysAgo,
  }
}
