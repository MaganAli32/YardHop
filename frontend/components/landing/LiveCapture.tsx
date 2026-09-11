import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { landingImages } from '../../lib/landingImages'
import { colors as c, fonts as f } from '../../lib/tokens'

type Verdict = 'deal' | 'fair' | 'over'

type Listing = {
  cat: string
  title: string
  loc: string
  ask: number
  img: { src: string; alt: string }
  verdict: Verdict
  median: number
  low: number
  high: number
  n: number
  /** Signed percentage vs. median (negative = under market). */
  delta: number
}

const base = landingImages

// Deterministic, believable comps — mirrors the extension's quick-appraise output.
const LISTINGS: Listing[] = [
  {
    cat: 'Furniture',
    title: 'Eames lounge chair + ottoman, authentic Herman Miller',
    loc: 'Ballard · 4mi',
    ask: 2400,
    img: base.howItWorks.specimen,
    verdict: 'deal',
    median: 2730,
    low: 2350,
    high: 3110,
    n: 82,
    delta: -12,
  },
  {
    cat: 'Furniture',
    title: 'Mid-century walnut lounge chair, restored',
    loc: 'Queen Anne · 4mi',
    ask: 1100,
    img: base.hero.comparables[0],
    verdict: 'over',
    median: 840,
    low: 710,
    high: 975,
    n: 154,
    delta: 31,
  },
  {
    cat: 'Cameras',
    title: 'Leica M6 black paint, 0.72 finder, recently serviced',
    loc: 'Capitol Hill · 2mi',
    ask: 4600,
    img: base.tryItSamples.camera,
    verdict: 'deal',
    median: 5300,
    low: 4800,
    high: 5800,
    n: 46,
    delta: -13,
  },
  {
    cat: 'Sneakers',
    title: 'Air Jordan 1 "Chicago" 2015, size 10, OG box',
    loc: 'U District · 6mi',
    ask: 720,
    img: base.tryItSamples.sneakers,
    verdict: 'fair',
    median: 705,
    low: 570,
    high: 840,
    n: 154,
    delta: 2,
  },
  {
    cat: 'Records',
    title: 'Kind of Blue, original 1959 Columbia six-eye pressing',
    loc: 'Wallingford · 3mi',
    ask: 1600,
    img: base.extension.listing,
    verdict: 'fair',
    median: 1685,
    low: 1400,
    high: 1970,
    n: 79,
    delta: -5,
  },
  {
    cat: 'Furniture',
    title: 'Walnut armchair, beige linen upholstery',
    loc: 'Madrona · 7mi',
    ask: 980,
    img: base.hero.comparables[2],
    verdict: 'over',
    median: 760,
    low: 650,
    high: 870,
    n: 112,
    delta: 29,
  },
]

const VERDICT: Record<Verdict, { label: string; line: (d: number) => string }> = {
  deal: { label: 'Deal', line: (d) => `Likely a deal · ${Math.abs(d)}% under` },
  fair: { label: 'Fair', line: () => 'Priced at market' },
  over: { label: 'Over', line: (d) => `Likely overpriced · ${Math.abs(d)}% over` },
}
const VERDICT_COLOR: Record<Verdict, string> = { deal: '#2E6B3E', fair: '#6B5B33', over: c.terracotta }

const N = LISTINGS.length
const DEALS = LISTINGS.filter((l) => l.verdict === 'deal').length
const FEATURED = 2 // Leica · top row, right — popover stays inside the frame
const STEP_MS = 780
const ARRIVE_MS = 460
const fmt = (n: number) => '$' + Math.round(n).toLocaleString('en-US')

const FEATURES: { t: string; d: string }[] = [
  { t: 'Live verdicts on 11 marketplaces', d: 'A deal/fair/over pill, range, and source count — without leaving the page.' },
  { t: 'Bulk-scan a search results page', d: 'One click reads every card in view; sort by over/underpay to surface the steals.' },
  { t: 'Tap any pill for the full comps', d: 'Range, median, and sample size — synced with your YardFront web account.' },
]

const css = `
  .lc-root {
    background: ${c.chalk};
    color: ${c.ink};
    padding: 140px 0;
    overflow: hidden;
    position: relative;
  }
  .lc-container { max-width: 1240px; margin: 0 auto; padding: 0 48px; }

  .lc-head {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: end;
    margin-bottom: 56px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .lc-head.vis { opacity: 1; transform: translateY(0); }
  .lc-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin: 0;
  }
  .lc-headline {
    font-family: ${f.serif};
    font-weight: 300;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: ${c.ink};
    margin: 20px 0 0;
    font-size: clamp(38px, 4.4vw, 58px);
    text-wrap: balance;
  }
  .lc-headline em { font-style: italic; color: ${c.terracotta}; font-weight: 400; }
  .lc-lede {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 16px;
    line-height: 1.7;
    color: ${c.sage};
    max-width: 52ch;
    margin: 0;
    text-wrap: pretty;
  }
  .lc-lede b { color: ${c.ink}; font-weight: 500; }

  /* ---- faux browser ---- */
  .lc-browser {
    position: relative;
    border: 0.5px solid ${c.forestHair};
    border-radius: 12px;
    overflow: hidden;
    background: #E6DFD2;
    box-shadow: 0 40px 80px -32px rgba(26,42,28,0.34), 0 8px 24px -12px rgba(26,42,28,0.22);
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.7s ease 0.1s, transform 0.7s ease 0.1s;
  }
  .lc-browser.vis { opacity: 1; transform: translateY(0); }

  .lc-bz-bar { background: #DFD8C9; border-bottom: 0.5px solid ${c.mist}; padding: 10px 16px 0; }
  .lc-bz-tabs { display: flex; align-items: center; gap: 8px; }
  .lc-traffic { display: flex; gap: 7px; margin-right: 8px; }
  .lc-traffic i { width: 11px; height: 11px; border-radius: 50%; background: ${c.mist}; display: block; }
  .lc-traffic i:first-child { background: ${c.terracottaWarm}; }
  .lc-tab {
    background: ${c.parchment};
    border: 0.5px solid ${c.mist};
    border-bottom: 0;
    border-radius: 7px 7px 0 0;
    padding: 8px 14px;
    font-size: 12px;
    font-family: ${f.sans};
    color: ${c.ink};
    display: flex; gap: 8px; align-items: center;
  }
  .lc-tab .fav { width: 8px; height: 8px; border-radius: 2px; background: ${c.terracotta}; }
  .lc-toolbar { display: flex; align-items: center; gap: 12px; padding: 9px 0 11px; }
  .lc-navs { display: flex; gap: 12px; color: ${c.sage}; font-size: 15px; }
  .lc-omni {
    flex: 1;
    background: ${c.chalk};
    border: 0.5px solid ${c.mist};
    border-radius: 100px;
    padding: 7px 16px;
    font-family: ${f.mono};
    font-size: 12px;
    color: ${c.sage};
    display: flex; align-items: center; gap: 8px;
    overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
  }
  .lc-omni .lock { width: 8px; height: 8px; border-radius: 2px; border: 1.5px solid ${c.forestMuted}; flex-shrink: 0; }
  .lc-omni b { color: ${c.ink}; font-weight: 500; }
  .lc-bz-ext {
    width: 30px; height: 30px; border-radius: 7px; flex-shrink: 0;
    background: ${c.forest}; color: ${c.chalk};
    font-family: ${f.serif}; font-size: 15px;
    display: flex; align-items: center; justify-content: center;
  }

  /* ---- marketplace page ---- */
  .lc-mp { padding: 26px 24px 30px; background: #ECE5D8; }
  .lc-mp-head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 18px; }
  .lc-mp-head h3 { font-family: ${f.serif}; font-weight: 400; font-size: 26px; margin: 0; letter-spacing: -0.01em; color: ${c.ink}; }
  .lc-mp-sub { font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: ${c.sage}; }

  .lc-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
  .lc-card {
    position: relative;
    background: ${c.chalk};
    border: 0.5px solid ${c.mist};
    border-radius: 8px;
    overflow: hidden;
  }
  .lc-thumb { position: relative; aspect-ratio: 4/3; overflow: hidden; border-bottom: 0.5px solid ${c.mist}; background: #E8E1D3; }
  .lc-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .lc-cat {
    position: absolute; right: 10px; bottom: 10px;
    font-family: ${f.mono}; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase;
    color: ${c.sage}; background: rgba(255,253,247,0.85); padding: 4px 7px; border-radius: 3px;
  }
  .lc-body { padding: 12px 13px 14px; }
  .lc-price { font-family: ${f.serif}; font-size: 22px; font-weight: 500; display: block; line-height: 1; color: ${c.ink}; }
  .lc-card-title { font-family: ${f.sans}; font-weight: 400; font-size: 13px; margin: 7px 0 0; line-height: 1.35; color: ${c.ink};
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .lc-card-meta { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.08em; color: ${c.sage}; margin-top: 8px; text-transform: uppercase; }

  /* ---- scan ring + sweep ---- */
  .lc-ring {
    position: absolute; inset: -2px; z-index: 6; pointer-events: none;
    border: 1px solid ${c.terracotta}; border-radius: 8px;
    box-shadow: 0 0 0 3px rgba(181,68,25,0.12), 0 14px 30px -16px rgba(26,42,28,0.4);
    opacity: 0; overflow: hidden; transition: opacity 0.25s ease;
  }
  .lc-ring.on { opacity: 1; }
  .lc-sweep {
    position: absolute; left: 0; right: 0; height: 36%; top: -40%;
    background: linear-gradient(180deg, rgba(181,68,25,0) 0%, rgba(181,68,25,0.18) 50%, rgba(181,68,25,0) 100%);
    border-top: 1px solid rgba(181,68,25,0.55);
  }
  .lc-ring.on .lc-sweep { animation: lc-sweep 0.62s ease-in-out; }
  @keyframes lc-sweep { 0% { top: -40%; } 100% { top: 110%; } }

  /* ---- verdict pill ---- */
  .lc-pill {
    position: absolute; top: 8px; left: 8px; z-index: 7;
    display: inline-flex; align-items: center; gap: 7px;
    padding: 5px 9px 5px 8px; border-radius: 5px;
    background: ${c.chalk}; border: 0.5px solid rgba(42,40,34,0.12);
    box-shadow: 0 10px 22px -10px rgba(26,42,28,0.45);
    font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.08em; line-height: 1; color: ${c.ink};
    white-space: nowrap; cursor: pointer;
    transform: scale(0.82) translateY(-4px); opacity: 0;
    transition: transform 0.32s cubic-bezier(0.2,0.8,0.2,1), opacity 0.32s ease;
  }
  .lc-pill.on { transform: scale(1) translateY(0); opacity: 1; }
  .lc-pill:hover { box-shadow: 0 14px 26px -10px rgba(26,42,28,0.55); }
  .lc-pill .dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .lc-pill .verdict { text-transform: uppercase; font-weight: 500; }
  .lc-pill .val {
    font-family: ${f.serif}; font-size: 13px; letter-spacing: 0; color: ${c.ink};
    border-left: 0.5px solid rgba(42,40,34,0.14); padding-left: 7px;
  }
  .lc-pill--deal { border-top: 2px solid #2E6B3E; }
  .lc-pill--deal .dot, .lc-pill--deal .verdict { color: #2E6B3E; }
  .lc-pill--deal .dot { background: #2E6B3E; }
  .lc-pill--fair { border-top: 2px solid #6B5B33; }
  .lc-pill--fair .dot, .lc-pill--fair .verdict { color: #6B5B33; }
  .lc-pill--fair .dot { background: #6B5B33; }
  .lc-pill--over { border-top: 2px solid ${c.terracotta}; }
  .lc-pill--over .dot, .lc-pill--over .verdict { color: ${c.terracotta}; }
  .lc-pill--over .dot { background: ${c.terracotta}; }

  /* ---- detail popover ---- */
  .lc-pop {
    position: absolute; z-index: 30; width: 244px;
    padding: 16px 18px 15px;
    background: ${c.chalk}; color: ${c.ink};
    border-radius: 6px; border-top: 3px solid ${c.terracotta};
    box-shadow: 0 30px 56px -18px rgba(0,0,0,0.5);
    opacity: 0; transform: translateY(6px);
    transition: opacity 0.2s ease, transform 0.2s ease;
    pointer-events: none;
  }
  .lc-pop.on { opacity: 1; transform: translateY(0); }
  .lc-pop .pe { font-family: ${f.mono}; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase; color: ${c.sage}; }
  .lc-pop .pt { font-family: ${f.serif}; font-size: 24px; font-weight: 400; margin-top: 6px; line-height: 1.1; color: ${c.ink}; }
  .lc-pop .pt em { font-style: italic; color: ${c.terracotta}; }
  .lc-pop .prow { display: flex; justify-content: space-between; margin-top: 10px; font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.08em; color: ${c.sage}; }
  .lc-pop .pbar { height: 3px; border-radius: 2px; background: ${c.mist}; margin-top: 8px; position: relative; overflow: hidden; }
  .lc-pop .pbar i { position: absolute; inset: 0; width: 50%; background: ${c.terracotta}; border-radius: 2px; }
  .lc-pop .pv { margin-top: 12px; padding-top: 10px; border-top: 0.5px solid ${c.mist}; font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; }

  /* ---- animated cursor ---- */
  .lc-cursor {
    position: absolute; top: 0; left: 0; width: 26px; height: 26px; z-index: 22;
    pointer-events: none; opacity: 0;
    transform: translate(-60px, -60px);
    transition: transform 0.5s cubic-bezier(0.34,0.65,0.24,1), opacity 0.3s ease;
    filter: drop-shadow(0 4px 8px rgba(26,42,28,0.45));
  }
  .lc-cursor.on { opacity: 1; }
  .lc-cursor svg { width: 100%; height: 100%; display: block; }
  .lc-ripple {
    position: absolute; left: 3px; top: 3px; width: 9px; height: 9px;
    border-radius: 50%; border: 1.5px solid ${c.terracotta}; opacity: 0;
  }
  .lc-cursor.tap .lc-ripple { animation: lc-ripple 0.55s ease-out; }
  @keyframes lc-ripple { 0% { opacity: 0.9; transform: scale(0.4); } 100% { opacity: 0; transform: scale(4.5); } }

  /* ---- launcher ---- */
  .lc-launcher {
    position: absolute; right: 22px; bottom: 22px; z-index: 24;
    display: flex; align-items: center; gap: 12px;
    padding: 12px 17px 12px 15px;
    background: ${c.forest}; color: ${c.chalk};
    border: 0.5px solid ${c.forestHair}; border-radius: 100px;
    box-shadow: 0 22px 44px -18px rgba(26,42,28,0.62), 0 6px 16px -8px rgba(26,42,28,0.4);
    cursor: pointer;
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.16em; text-transform: uppercase; line-height: 1;
    opacity: 0; transform: translateY(8px);
    transition: opacity 0.45s ease, transform 0.45s cubic-bezier(0.2,0.7,0.2,1), background 0.2s ease;
  }
  .lc-launcher.in { opacity: 1; transform: translateY(0); }
  .lc-launcher:hover { background: #21331f; }
  .lc-launcher .mark {
    position: relative; display: flex; align-items: center; justify-content: center;
    width: 22px; height: 22px; border-radius: 50%; background: ${c.terracotta};
    font-family: ${f.serif}; font-size: 13px; color: ${c.chalk}; flex-shrink: 0;
  }
  .lc-launcher .label b { font-weight: 500; color: ${c.chalk}; }
  .lc-launcher .count {
    font-family: ${f.mono}; font-size: 10px; color: ${c.forestMuted};
    border-left: 0.5px solid ${c.forestHair}; padding-left: 10px; margin-left: 2px; white-space: nowrap;
  }
  .lc-launcher.scanning .mark::after {
    content: ""; position: absolute; inset: -4px; border-radius: 50%;
    border: 1.5px solid transparent; border-top-color: ${c.chalk};
    animation: lc-spin 0.7s linear infinite;
  }
  @keyframes lc-spin { to { transform: rotate(360deg); } }

  /* ---- HUD ---- */
  .lc-hud {
    position: absolute; left: 50%; bottom: 22px; z-index: 23;
    transform: translateX(-50%) translateY(14px);
    display: flex; align-items: center; gap: 16px;
    padding: 11px 18px;
    background: rgba(26,42,28,0.96); color: ${c.chalk};
    border: 0.5px solid ${c.forestHair}; border-radius: 100px;
    box-shadow: 0 22px 44px -18px rgba(26,42,28,0.62);
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.1em;
    backdrop-filter: blur(6px);
    opacity: 0; pointer-events: none;
    transition: opacity 0.4s ease, transform 0.4s ease;
  }
  .lc-hud.on { opacity: 1; transform: translateX(-50%) translateY(0); }
  .lc-hud .status { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
  .lc-hud .live {
    width: 7px; height: 7px; border-radius: 50%; background: ${c.terracottaWarm};
    box-shadow: 0 0 0 0 rgba(198,90,47,0.6); animation: lc-pulse 1.4s ease-out infinite;
  }
  @keyframes lc-pulse { 0% { box-shadow: 0 0 0 0 rgba(198,90,47,0.55); } 100% { box-shadow: 0 0 0 8px rgba(198,90,47,0); } }
  .lc-hud .prog { width: 120px; height: 3px; border-radius: 2px; background: ${c.forestHair}; position: relative; overflow: hidden; }
  .lc-hud .prog i { position: absolute; left: 0; top: 0; bottom: 0; width: 0%; background: ${c.terracottaWarm}; border-radius: 2px; transition: width 0.35s ease; }
  .lc-hud .tag { color: ${c.forestMuted}; white-space: nowrap; border-left: 0.5px solid ${c.forestHair}; padding-left: 16px; }

  /* ---- footer: features + cta ---- */
  .lc-foot {
    margin-top: 48px;
    display: grid;
    grid-template-columns: repeat(3, 1fr) auto;
    gap: 32px;
    align-items: start;
    opacity: 0;
    transform: translateY(16px);
    transition: opacity 0.7s ease 0.2s, transform 0.7s ease 0.2s;
  }
  .lc-foot.vis { opacity: 1; transform: translateY(0); }
  .lc-feature { padding-top: 18px; border-top: 0.5px solid ${c.mist}; }
  .lc-feature::before { content: ""; display: block; width: 4px; height: 4px; background: ${c.terracotta}; border-radius: 50%; margin-bottom: 12px; }
  .lc-feature .ef-t { font-family: ${f.sans}; font-size: 15px; color: ${c.ink}; font-weight: 400; line-height: 1.35; }
  .lc-feature .ef-d { font-family: ${f.sans}; font-size: 13px; color: ${c.sage}; margin-top: 6px; font-weight: 300; line-height: 1.55; }
  .lc-cta-wrap { padding-top: 18px; border-top: 0.5px solid ${c.mist}; }
  .lc-cta {
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    padding: 16px 28px; background: ${c.terracotta}; color: ${c.chalk};
    border: 0; cursor: pointer; text-decoration: none; display: inline-block; white-space: nowrap;
    transition: opacity 0.2s;
  }
  .lc-cta:hover { opacity: 0.92; }

  @media (max-width: 1000px) {
    .lc-container { padding: 0 24px; }
    .lc-head { grid-template-columns: 1fr; gap: 24px; align-items: start; }
    .lc-grid { grid-template-columns: repeat(2, 1fr); }
    .lc-hud .tag { display: none; }
    .lc-foot { grid-template-columns: 1fr 1fr; }
    .lc-cta-wrap { grid-column: span 2; }
  }
  @media (max-width: 560px) {
    .lc-grid { grid-template-columns: 1fr; }
    .lc-mp-head h3 { font-size: 22px; }
    .lc-foot { grid-template-columns: 1fr; }
    .lc-cta-wrap { grid-column: auto; }
  }
  @media (prefers-reduced-motion: reduce) {
    .lc-cursor, .lc-launcher, .lc-pill, .lc-sweep { transition: opacity 0.2s ease !important; animation: none !important; }
  }
`

export function LiveCapture() {
  const rootRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const cardRefs = useRef<(HTMLElement | null)[]>([])
  const pillRefs = useRef<(HTMLElement | null)[]>([])
  const timers = useRef<number[]>([])
  const reduced = useRef(false)
  const startedRef = useRef(false)

  const [headVis, setHeadVis] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'done'>('idle')
  const [activeIndex, setActiveIndex] = useState(-1)
  const [stamped, setStamped] = useState<boolean[]>(() => Array(N).fill(false))
  const [progress, setProgress] = useState(0)
  const [hudText, setHudText] = useState('Reading the page…')
  const [scanCount, setScanCount] = useState(0)
  const [pop, setPop] = useState<{ i: number; left: number; top: number } | null>(null)
  const [cursor, setCursor] = useState<{ x: number; y: number; on: boolean; tap: boolean }>({
    x: -60,
    y: -60,
    on: false,
    tap: false,
  })

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => clearTimeout(t))
    timers.current = []
  }, [])

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  const cardCenter = useCallback((i: number) => {
    const frame = frameRef.current
    const card = cardRefs.current[i]
    if (!frame || !card) return null
    const fr = frame.getBoundingClientRect()
    const cr = card.getBoundingClientRect()
    return {
      x: cr.left - fr.left + cr.width * 0.5 - 6,
      y: cr.top - fr.top + Math.min(cr.height * 0.32, 78),
    }
  }, [])

  const openPopover = useCallback((i: number) => {
    const pill = pillRefs.current[i]
    const root = rootRef.current
    if (!pill || !root) return
    const pr = pill.getBoundingClientRect()
    const rr = root.getBoundingClientRect()
    let left = pr.left - rr.left
    const top = pr.top - rr.top + pr.height + 8
    const maxLeft = root.clientWidth - 244 - 16
    if (left > maxLeft) left = maxLeft
    if (left < 16) left = 16
    setPop({ i, left, top })
  }, [])

  // Move the on-card cursor whenever the active (scanning) card changes.
  useEffect(() => {
    if (activeIndex < 0) return
    const id = requestAnimationFrame(() => {
      const pos = cardCenter(activeIndex)
      if (pos) setCursor((prev) => ({ ...prev, x: pos.x, y: pos.y }))
    })
    return () => cancelAnimationFrame(id)
  }, [activeIndex, cardCenter])

  const play = useCallback(() => {
    clearTimers()
    setStamped(Array(N).fill(false))
    setProgress(0)
    setActiveIndex(-1)
    setPop(null)
    setScanCount(0)

    if (reduced.current) {
      setPhase('done')
      setStamped(Array(N).fill(true))
      setProgress(1)
      setHudText(`${N} listings checked · ${DEALS} deals`)
      return
    }

    setPhase('scanning')
    setHudText('Reading the page…')
    const frame = frameRef.current
    if (frame) {
      const fr = frame.getBoundingClientRect()
      setCursor({ x: fr.width - 64, y: fr.height - 70, on: true, tap: false })
    } else {
      setCursor((prev) => ({ ...prev, on: true }))
    }

    let t = 460
    LISTINGS.forEach((_, i) => {
      at(t, () => {
        setActiveIndex(i)
        setHudText(`Reading listing ${i + 1} of ${N}`)
      })
      at(t + ARRIVE_MS, () => {
        setCursor((prev) => ({ ...prev, tap: true }))
        setStamped((prev) => {
          const next = [...prev]
          next[i] = true
          return next
        })
        setProgress((i + 1) / N)
        setScanCount(i + 1)
      })
      at(t + ARRIVE_MS + 130, () => setCursor((prev) => ({ ...prev, tap: false })))
      t += STEP_MS
    })

    // Finish the run, then auto-open one card's detail popover to show it off.
    at(t, () => {
      setPhase('done')
      setActiveIndex(-1)
      setHudText(`${N} listings checked · ${DEALS} deals`)
    })
    at(t + 480, () => {
      const pos = cardCenter(FEATURED)
      if (pos) setCursor((prev) => ({ ...prev, x: pos.x, y: pos.y, on: true }))
    })
    at(t + 980, () => setCursor((prev) => ({ ...prev, tap: true })))
    at(t + 1080, () => {
      setCursor((prev) => ({ ...prev, tap: false }))
      openPopover(FEATURED)
    })
    at(t + 1700, () => setCursor((prev) => ({ ...prev, on: false })))
    at(t + 4200, () => {
      setPop(null)
      play()
    })
  }, [at, clearTimers, cardCenter, openPopover])

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = rootRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setHeadVis(true)
          if (!startedRef.current) {
            startedRef.current = true
            at(500, () => play())
          }
        } else {
          startedRef.current = false
          clearTimers()
          setPhase('idle')
          setActiveIndex(-1)
          setStamped(Array(N).fill(false))
          setProgress(0)
          setPop(null)
          setScanCount(0)
          setCursor((prev) => ({ ...prev, on: false }))
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => {
      obs.disconnect()
      clearTimers()
    }
  }, [at, clearTimers, play])

  const onPillClick = (i: number) => {
    if (pop?.i === i) {
      setPop(null)
    } else {
      openPopover(i)
    }
  }

  const launcherLabel = phase === 'scanning' ? 'Scanning…' : phase === 'done' ? 'Scan again' : 'Scan this page'
  const launcherCount =
    phase === 'scanning' ? `${scanCount}/${N}` : phase === 'done' ? `${N} checked` : `${N} on page`
  const popItem = pop ? LISTINGS[pop.i] : null
  const popPct = popItem
    ? Math.max(6, Math.min(98, ((popItem.ask - popItem.low) / Math.max(1, popItem.high - popItem.low)) * 100))
    : 50

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="lc-root" id="extension" ref={rootRef}>
        <div className="lc-container">
          <div className={`lc-head ${headVis ? 'vis' : ''}`}>
            <div>
              <p className="lc-eyebrow">Browser extension · Beta</p>
              <h2 className="lc-headline">
                A <em>second opinion</em>
                <br />
                on every listing.
              </h2>
            </div>
            <p className="lc-lede">
              Install once, then browse Facebook Marketplace, Craigslist, or eBay the way you already
              do. One click reads <b>every listing on the page</b> and stamps each with what it&apos;s
              truly worth — deal, fair, or over. Tap any verdict for the comps behind it.
            </p>
          </div>

          <div className={`lc-browser ${headVis ? 'vis' : ''}`} ref={frameRef}>
            <div className="lc-bz-bar">
              <div className="lc-bz-tabs">
                <div className="lc-traffic">
                  <i />
                  <i />
                  <i />
                </div>
                <div className="lc-tab">
                  <span className="fav" />
                  Marketplace · Seattle
                </div>
              </div>
              <div className="lc-toolbar">
                <div className="lc-navs">
                  <span>‹</span>
                  <span>›</span>
                  <span>⟳</span>
                </div>
                <div className="lc-omni">
                  <span className="lock" />
                  <b>facebook.com</b>/marketplace/seattle/search?q=mid-century
                </div>
                <div className="lc-bz-ext">Y</div>
              </div>
            </div>

            <div className="lc-mp">
              <div className="lc-mp-head">
                <h3>Today&apos;s finds near Seattle</h3>
                <span className="lc-mp-sub">Showing {N} of 240</span>
              </div>
              <div className="lc-grid">
                {LISTINGS.map((item, i) => {
                  const v = VERDICT[item.verdict]
                  return (
                    <article
                      key={item.title}
                      className="lc-card"
                      ref={(el) => {
                        cardRefs.current[i] = el
                      }}
                    >
                      <div className="lc-thumb">
                        <img src={item.img.src} alt={item.img.alt} loading="lazy" decoding="async" />
                        <span className="lc-cat">{item.cat}</span>
                        <div className={`lc-ring ${activeIndex === i ? 'on' : ''}`} aria-hidden>
                          <span className="lc-sweep" />
                        </div>
                        <button
                          type="button"
                          ref={(el) => {
                            pillRefs.current[i] = el
                          }}
                          className={`lc-pill lc-pill--${item.verdict} ${stamped[i] ? 'on' : ''}`}
                          onClick={() => onPillClick(i)}
                          tabIndex={stamped[i] ? 0 : -1}
                          aria-hidden={!stamped[i]}
                        >
                          <span className="dot" />
                          <span className="verdict">{v.label}</span>
                          <span className="val">{fmt(item.median)}</span>
                        </button>
                      </div>
                      <div className="lc-body">
                        <span className="lc-price">{fmt(item.ask)}</span>
                        <h4 className="lc-card-title">{item.title}</h4>
                        <div className="lc-card-meta">{item.loc}</div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </div>

            <div
              className={`lc-cursor ${cursor.on ? 'on' : ''} ${cursor.tap ? 'tap' : ''}`}
              style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` } as CSSProperties}
              aria-hidden
            >
              <svg viewBox="0 0 24 24">
                <path
                  d="M5 2 L5 19 L9.4 14.7 L12.6 21 L15.1 19.9 L11.9 13.7 L18.4 13.6 Z"
                  fill={c.chalk}
                  stroke={c.forest}
                  strokeWidth="1.2"
                  strokeLinejoin="round"
                />
              </svg>
              <span className="lc-ripple" />
            </div>

            <div className={`lc-hud ${phase !== 'idle' ? 'on' : ''}`} aria-hidden>
              <div className="status">
                <span className="live" />
                {hudText}
              </div>
              <div className="prog">
                <i style={{ width: `${Math.round(progress * 100)}%` }} />
              </div>
              <div className="tag">YardFront · live capture</div>
            </div>

            <button
              type="button"
              className={`lc-launcher ${headVis ? 'in' : ''} ${phase === 'scanning' ? 'scanning' : ''}`}
              onClick={() => play()}
            >
              <span className="mark">Y</span>
              <span className="label">
                <b>{launcherLabel}</b>
              </span>
              <span className="count">{launcherCount}</span>
            </button>
          </div>

          {popItem && pop && (
            <div
              className={`lc-pop on`}
              style={{ left: pop.left, top: pop.top } as CSSProperties}
              aria-hidden
            >
              <div className="pe">YardFront · Market value</div>
              <div className="pt">
                <em>{fmt(popItem.low)}</em> – {fmt(popItem.high)}
              </div>
              <div className="prow">
                <span>Median {fmt(popItem.median)}</span>
                <span>n = {popItem.n}</span>
              </div>
              <div className="pbar">
                <i style={{ width: `${popPct}%` }} />
              </div>
              <div className="pv" style={{ color: VERDICT_COLOR[popItem.verdict] }}>
                {VERDICT[popItem.verdict].line(popItem.delta)}
              </div>
            </div>
          )}

          <div className={`lc-foot ${headVis ? 'vis' : ''}`}>
            {FEATURES.map((feat) => (
              <div className="lc-feature" key={feat.t}>
                <div className="ef-t">{feat.t}</div>
                <div className="ef-d">{feat.d}</div>
              </div>
            ))}
            <div className="lc-cta-wrap">
              <Link to="/extension" className="lc-cta">
                Explore the extension
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default LiveCapture
