/**
 * YardFront demo store — localStorage-backed listings + try-it usage tracking.
 * Powers the marketplace demo listings, the "list it" flow from the appraiser,
 * and the free-lookup meter. No backend required.
 */

const LS_USAGE = 'yf_tryit_usage'
const LS_LISTINGS = 'yf_demo_listings_v1'

export const FREE_LOOKUP_LIMIT = 100

const img = (name: string) => `/images/landing/${name}`

export type DemoVerdict = 'deal' | 'fair' | 'over'

export interface DemoListing {
  id: string
  title: string
  category: string
  condition: string
  asking_price: number
  images: string[]
  location: string
  /** ms timestamp the listing was posted (used for "x days ago") */
  posted_at: number
  seller: string
  rating: number
  verdict: DemoVerdict
  attrs: string[]
  description: string[]
  price_low: number
  price_high: number
  median: number
  confidence: number
  confidence_label: string
  sample_size: number
  userListed?: boolean
}

const DAY = 86_400_000
const HOUR = 3_600_000

/** Curated seed listings — written to read like real classifieds. */
export const SEED_LISTINGS: DemoListing[] = [
  {
    id: 'lot-7412',
    title: 'Walnut lounge chair & ottoman',
    category: 'Furniture',
    condition: 'Good',
    asking_price: 2950,
    images: [img('eames-lounge-chair.png')],
    location: 'Seattle, WA',
    posted_at: Date.now() - 2 * DAY,
    seller: 'midcentury_archive',
    rating: 4.9,
    verdict: 'fair',
    attrs: ['Mid-century', 'Walnut veneer', 'Aniline leather', 'Authenticated'],
    description: [
      'Herman Miller 670/671 in original walnut and black aniline leather. Down-blend cushions reupholstered once, structurally sound, swivel base true.',
      'Comes with the matching 671 ottoman. Light shelf wear to the veneer consistent with age. Photographed in natural light, no filters.',
    ],
    price_low: 2850,
    price_high: 3420,
    median: 3120,
    confidence: 87,
    confidence_label: 'High',
    sample_size: 142,
  },
  {
    id: 'lot-7413',
    title: 'Leica M6 rangefinder, black paint',
    category: 'Electronics',
    condition: 'Like New',
    asking_price: 3850,
    images: [img('leica-m6.png')],
    location: 'Portland, OR',
    posted_at: Date.now() - 5 * HOUR,
    seller: 'analog_supply_co',
    rating: 5.0,
    verdict: 'over',
    attrs: ['35mm', 'Black paint', 'M-mount', 'Collector grade'],
    description: [
      '1988 Leica M6 classic, black paint with brassing at the edges that collectors love. Meter calibrated, rangefinder patch bright and contrasty.',
      'CLA completed last spring by a Leica-trained technician. Includes original strap and body cap. Glass not included.',
    ],
    price_low: 3600,
    price_high: 4250,
    median: 3940,
    confidence: 91,
    confidence_label: 'High',
    sample_size: 88,
  },
  {
    id: 'lot-7414',
    title: 'Air Jordan 1 Chicago, 2015 retro',
    category: 'Sneakers',
    condition: 'New',
    asking_price: 690,
    images: [img('air-jordan-1-chicago.png')],
    location: 'Chicago, IL',
    posted_at: Date.now() - 1 * DAY,
    seller: 'grail_rotation',
    rating: 4.8,
    verdict: 'deal',
    attrs: ['Size 10.5', 'OG colorway', 'Deadstock', 'Authenticated'],
    description: [
      '2015 retro of the original Chicago colorway. Deadstock, never laced, both shoes tried on carpet only. Box is clean with intact label.',
      'Authenticated through StockX last month — tag and receipt included. No yellowing, no creasing, sole bright white.',
    ],
    price_low: 620,
    price_high: 840,
    median: 730,
    confidence: 82,
    confidence_label: 'High',
    sample_size: 214,
  },
  {
    id: 'lot-7415',
    title: 'Kind of Blue — Columbia first press',
    category: 'Collectibles',
    condition: 'Good',
    asking_price: 1280,
    images: [img('miles-davis-kind-of-blue.png')],
    location: 'Seattle, WA',
    posted_at: Date.now() - 3 * DAY,
    seller: 'vintage_wax_seattle',
    rating: 4.9,
    verdict: 'fair',
    attrs: ['6-eye label', 'Mono', 'VG+', 'First press'],
    description: [
      'Original 1959 Columbia six-eye mono pressing, CL 1355. Side A plays with a few light marks; Side B near silent. Both deep grooves.',
      'Jacket shows ring wear and a split seam at the bottom, repaired from inside with archival tape. A real first press, not a reissue.',
    ],
    price_low: 1200,
    price_high: 1450,
    median: 1320,
    confidence: 76,
    confidence_label: 'Medium',
    sample_size: 38,
  },
  {
    id: 'lot-7418',
    title: 'Danish teak armchair, restored',
    category: 'Furniture',
    condition: 'Like New',
    asking_price: 880,
    images: [img('walnut-chair-4.png')],
    location: 'Minneapolis, MN',
    posted_at: Date.now() - 6 * HOUR,
    seller: 'north_loop_finds',
    rating: 4.7,
    verdict: 'deal',
    attrs: ['Teak frame', '1960s', 'New foam', 'Reupholstered'],
    description: [
      'Solid teak frame, fully stripped and re-oiled. New high-density foam wrapped in oatmeal bouclé. Joints re-glued and pegged.',
      'A clean, comfortable reading chair with sculpted arms. Minor color variation in the wood grain shown honestly in the photos.',
    ],
    price_low: 760,
    price_high: 1040,
    median: 900,
    confidence: 84,
    confidence_label: 'High',
    sample_size: 61,
  },
  {
    id: 'lot-7421',
    title: 'Walnut lounge chair, oatmeal wool',
    category: 'Furniture',
    condition: 'Good',
    asking_price: 1150,
    images: [img('walnut-chair-2.png')],
    location: 'Seattle, WA',
    posted_at: Date.now() - 1 * DAY,
    seller: 'midcentury_archive',
    rating: 4.9,
    verdict: 'fair',
    attrs: ['Walnut frame', 'Wool', '1960s', 'Original'],
    description: [
      'Sculptural walnut frame with the original oatmeal wool cushions, cleaned and deodorized. Cane support intact underneath.',
      'Sits low and deep. A few small dings to the arm tops, otherwise honest and ready to use.',
    ],
    price_low: 980,
    price_high: 1280,
    median: 1120,
    confidence: 80,
    confidence_label: 'High',
    sample_size: 47,
  },
]

function read<T>(key: string, fallback: T): T {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : (JSON.parse(v) as T)
  } catch {
    return fallback
  }
}

function write(key: string, val: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(val))
  } catch {
    /* storage full or unavailable — demo data is best-effort */
  }
}

/* ---------------- usage tracking ---------------- */

export function getTryItUsage(): { used: number; limit: number; remaining: number } {
  const used = read<number>(LS_USAGE, 0)
  return { used, limit: FREE_LOOKUP_LIMIT, remaining: Math.max(0, FREE_LOOKUP_LIMIT - used) }
}

export function trackTryItUse(): { used: number; limit: number; remaining: number } {
  const used = read<number>(LS_USAGE, 0) + 1
  write(LS_USAGE, used)
  try {
    document.dispatchEvent(new CustomEvent('yf:usage', { detail: used }))
  } catch {
    /* no-op */
  }
  return { used, limit: FREE_LOOKUP_LIMIT, remaining: Math.max(0, FREE_LOOKUP_LIMIT - used) }
}

/* ---------------- demo listings ---------------- */

export function isDemoListingId(id: string | undefined | null): boolean {
  return !!id && (id.startsWith('lot-') || id.startsWith('usr-'))
}

export function getUserDemoListings(): DemoListing[] {
  return read<DemoListing[]>(LS_LISTINGS, [])
}

export function getAllDemoListings(): DemoListing[] {
  return [...getUserDemoListings(), ...SEED_LISTINGS]
}

export function getDemoListingById(id: string): DemoListing | null {
  return getAllDemoListings().find((l) => l.id === id) ?? null
}

export function addDemoListing(
  listing: Omit<DemoListing, 'id' | 'posted_at' | 'userListed'>
): DemoListing {
  const full: DemoListing = {
    ...listing,
    id: `usr-${Date.now().toString(36)}`,
    posted_at: Date.now(),
    userListed: true,
  }
  const user = getUserDemoListings()
  user.unshift(full)
  write(LS_LISTINGS, user)
  return full
}

export function removeDemoListing(id: string) {
  write(
    LS_LISTINGS,
    getUserDemoListings().filter((l) => l.id !== id)
  )
}

/* ---------------- helpers ---------------- */

export function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'Just now'
  if (mins < 60) return `${mins} minutes ago`
  const hours = Math.floor(diff / HOUR)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(diff / DAY)
  if (days === 1) return '1 day ago'
  if (days < 7) return `${days} days ago`
  return new Date(ts).toLocaleDateString()
}

export function fmtUsd(n: number): string {
  return `$${Math.round(n).toLocaleString('en-US')}`
}
