/**
 * Statistics derived from REAL comps returned by the appraisal pipeline.
 *
 * Everything in this file is computed from data the backend actually produces,
 * so these numbers are true. Anything the backend cannot yet supply lives in
 * `appraisalFixtures.ts` instead and is labelled in the UI.
 *
 * Pure functions only — no React, no fetching.
 */

import type { AppraisalComp } from './appraisalSession'

export type Comp = AppraisalComp

export const money = (n: number): string =>
  '$' + Math.round(n).toLocaleString('en-US')

/** Signed money, for a delta against the estimate. */
export const signedMoney = (n: number): string => {
  if (Math.round(n) === 0) return 'At estimate'
  return (n > 0 ? '+' : '−') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US')
}

/** Round to a readable increment so small comp shifts do not jitter the label. */
export const roundNice = (n: number): number => {
  if (n < 100) return Math.round(n)
  if (n < 1000) return Math.round(n / 5) * 5
  if (n < 10000) return Math.round(n / 10) * 10
  return Math.round(n / 50) * 50
}

/** Linear-interpolated percentile over an unsorted array. */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const a = [...values].sort((x, y) => x - y)
  if (a.length === 1) return a[0]
  const i = (a.length - 1) * p
  const lo = Math.floor(i)
  const hi = Math.ceil(i)
  return lo === hi ? a[lo] : a[lo] + (a[hi] - a[lo]) * (i - lo)
}

export const median = (values: number[]): number => percentile(values, 0.5)

/**
 * Axis bounds for the distribution chart.
 *
 * Clipped to the 2nd/98th percentile rather than min/max: a single junk comp
 * (a $400 "for parts" listing beside $7k watches) would otherwise stretch the
 * axis and squash every real bar into the right-hand quarter. Out-of-range
 * comps are not dropped — `histogram` clamps them into the end bins.
 *
 * `mustInclude` keeps the estimate and its range on-canvas even if they sit
 * outside the clipped band.
 */
export function axisBounds(prices: number[], mustInclude: number[] = []): { min: number; max: number } {
  if (prices.length === 0) return { min: 0, max: 100 }
  let lo = prices.length >= 8 ? percentile(prices, 0.02) : Math.min(...prices)
  let hi = prices.length >= 8 ? percentile(prices, 0.98) : Math.max(...prices)
  for (const v of mustInclude) {
    if (!Number.isFinite(v)) continue
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  const span = hi - lo || Math.max(hi * 0.2, 10)
  const pad = span * 0.08
  const step = span > 4000 ? 500 : span > 1500 ? 250 : span > 400 ? 50 : span > 100 ? 10 : 5
  return {
    min: Math.max(0, Math.floor((lo - pad) / step) * step),
    max: Math.ceil((hi + pad) / step) * step,
  }
}

export interface Bin {
  index: number
  lo: number
  hi: number
  all: Comp[]
  /** Comps whose condition matches the appraised item, for the stacked fill. */
  matching: Comp[]
}

/** Bucket comps into evenly spaced price bins across the axis. */
export function histogram(
  comps: Comp[],
  min: number,
  max: number,
  binCount: number,
  isMatching: (c: Comp) => boolean = () => false,
): Bin[] {
  const width = (max - min) / binCount || 1
  const bins: Bin[] = Array.from({ length: binCount }, (_, i) => ({
    index: i,
    lo: min + i * width,
    hi: min + (i + 1) * width,
    all: [],
    matching: [],
  }))
  for (const c of comps) {
    const raw = Math.floor((c.price - min) / width)
    const i = Math.max(0, Math.min(binCount - 1, raw))
    bins[i].all.push(c)
    if (isMatching(c)) bins[i].matching.push(c)
  }
  return bins
}

export interface SourceRow {
  name: string
  count: number
  median: number
  /** Share of the widest source, for the bar width. */
  share: number
  soldCount: number
}

/** Group comps by marketplace, ordered by how many each contributed. */
export function sourceBreakdown(comps: Comp[]): SourceRow[] {
  const groups = new Map<string, Comp[]>()
  for (const c of comps) {
    const name = (c.site || 'Unknown source').trim()
    const list = groups.get(name)
    if (list) list.push(c)
    else groups.set(name, [c])
  }
  const rows = [...groups.entries()].map(([name, list]) => ({
    name,
    count: list.length,
    median: roundNice(median(list.map((c) => c.price))),
    soldCount: list.filter((c) => c.sold).length,
    share: 0,
  }))
  rows.sort((a, b) => b.count - a.count)
  const widest = rows.length ? rows[0].count : 1
  for (const r of rows) r.share = r.count / widest
  return rows
}

/** Percent of comps priced below the estimate. */
export function percentileOf(prices: number[], value: number): number {
  if (prices.length === 0) return 50
  return Math.round((prices.filter((p) => p < value).length / prices.length) * 100)
}

/**
 * Match strength as a 0-100 score.
 *
 * The pipeline returns a coarse label, not a number, so this maps the label and
 * nudges it by whether the sale actually closed. It is an ordering aid for the
 * comps table, not a precision claim, which is why the UI shows a word
 * ("Strong match") beside it rather than the bare figure.
 */
export function matchScore(c: Comp): number {
  const base = c.match === 'exact' ? 92 : c.match === 'similar' ? 74 : 68
  return Math.min(98, base + (c.sold ? 4 : 0))
}

export const matchLabel = (score: number): string =>
  score >= 88 ? 'Strong match' : score >= 72 ? 'Good match' : 'Loose match'

/** Normalise the free-text condition on a comp into a short display string. */
export function tidyCondition(raw: string | null | undefined): string {
  const s = (raw || '').trim()
  if (!s) return '\u2014'
  const l = s.toLowerCase()
  if (l.includes('like new') || l.includes('mint') || l.includes('unworn')) return 'Like new'
  if (l.includes('excellent')) return 'Excellent'
  if (l.includes('very good')) return 'Very good'
  if (l.includes('refurb')) return 'Refurbished'
  if (l.includes('new')) return 'New'
  if (l.includes('good')) return 'Good'
  if (l.includes('fair')) return 'Fair'
  if (l.includes('poor') || l.includes('parts')) return 'Poor'
  if (l.includes('pre-own') || l.includes('preowned') || l.includes('used')) return 'Pre-owned'
  return s.length > 14 ? s.slice(0, 13) + '\u2026' : s.charAt(0).toUpperCase() + s.slice(1)
}
