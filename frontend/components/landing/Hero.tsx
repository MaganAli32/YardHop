import { useCallback, useEffect, useRef, useState } from 'react'
import { landingImages } from '../../lib/landingImages'
import { colors as c, fonts as f } from '../../lib/tokens'

const PRICE_LOW = 2850
const PRICE_HIGH = 3420
const CONF_TARGET = 0.87
const SOURCE_TARGETS = [
  { name: 'eBay', count: 58 },
  { name: 'Chairish', count: 31 },
  { name: '1stDibs', count: 24 },
  { name: 'Mercari', count: 18 },
  { name: 'OfferUp', count: 7 },
  { name: 'Craigslist', count: 4 },
] as const
const COMP_DATA = [
  ['$3,200', 'eBay'],
  ['$2,950', 'Chairish'],
  ['$3,420', '1stDibs'],
  ['$2,890', 'Mercari'],
] as const

const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
/** Scales every Safari mockup demo beat — raise to slow further */
const DEMO_PACE = 1.2
const demoMs = (ms: number) => Math.round(ms * DEMO_PACE)

function fmtMoney(n: number) {
  return `$${Math.round(n).toLocaleString()}`
}

function easeOut(t: number) {
  return 1 - (1 - t) ** 3
}

const css = `
  .yf-hero-root * { box-sizing: border-box; }
  .yf-hero-root {
    background: ${c.parchment};
    padding: 72px 0 100px;
    position: relative;
    font-family: ${f.sans};
  }
  .yf-hero-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .yf-hero-intro {
    min-height: clamp(420px, calc(100svh - 72px - 220px), 620px);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(56px, 10vh, 112px) 0 clamp(32px, 5vh, 64px);
  }
  .yf-reveal {
    opacity: 0;
    transform: translateY(22px) scale(0.98);
    transition: opacity 0.85s ${EASE_OUT}, transform 0.85s ${EASE_OUT};
  }
  .yf-reveal.in { opacity: 1; transform: none; }

  .yf-browser {
    width: 100%;
    max-width: 1080px;
    margin: 0 auto;
    background: #E8E2D6;
    border-radius: 12px 12px 8px 8px;
    box-shadow: 0 40px 80px -30px rgba(26,42,28,0.28), 0 12px 28px -12px rgba(26,42,28,0.18);
    overflow: hidden;
    border: 0.5px solid ${c.mist};
    will-change: transform;
  }
  .yf-browser.is-live {
    animation: yf-browser-lift 7s ease-in-out infinite;
  }
  @keyframes yf-browser-lift {
    0%, 100% {
      box-shadow: 0 40px 80px -30px rgba(26,42,28,0.28), 0 12px 28px -12px rgba(26,42,28,0.18);
      transform: translateY(0);
    }
    50% {
      box-shadow: 0 52px 96px -26px rgba(26,42,28,0.34), 0 18px 36px -10px rgba(26,42,28,0.22);
      transform: translateY(-6px);
    }
  }

  .yf-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 400;
    color: ${c.bark};
    margin: 0 0 24px;
  }
  .yf-rule {
    width: 36px;
    height: 0.5px;
    background: ${c.mist};
    border: 0;
    margin: clamp(20px, 3vh, 32px) auto;
  }
  .yf-headline {
    font-family: ${f.serif};
    font-weight: 500;
    line-height: 1.06;
    letter-spacing: -0.02em;
    color: ${c.ink};
    margin: 0 auto;
    max-width: min(680px, 100%);
    font-size: clamp(44px, 6.8vw, 84px);
    text-wrap: balance;
  }
  .yf-headline em { font-style: italic; color: ${c.terracotta}; font-weight: 500; }
  .yf-subkick {
    font-family: ${f.sans};
    font-weight: 400;
    font-size: clamp(15px, 1.8vw, 18px);
    line-height: 1.6;
    color: ${c.sage};
    max-width: 46ch;
    margin: clamp(18px, 3vh, 28px) auto 0;
    text-wrap: pretty;
  }
  .yf-lede {
    font-weight: 300;
    font-size: 17px;
    line-height: 1.55;
    color: ${c.sage};
    max-width: 70ch;
    margin: 0 auto;
    text-wrap: pretty;
  }
  .yf-editorial {
    text-align: center;
    max-width: 920px;
    width: 100%;
    margin: 0 auto;
  }
  .yf-meta {
    margin-top: clamp(24px, 4vh, 36px);
    display: flex;
    justify-content: center;
    gap: 36px;
    flex-wrap: wrap;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  .yf-meta span::before { content: "— "; color: ${c.terracotta}; }

  .yf-browser-chrome {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px 10px;
    background: linear-gradient(to bottom, #EAE3D4, #DFD6C4);
    border-bottom: 0.5px solid rgba(0,0,0,0.08);
  }
  .yf-traffic { display: flex; gap: 7px; }
  .yf-traffic i {
    width: 11px;
    height: 11px;
    border-radius: 50%;
    display: block;
  }
  .yf-traffic i:nth-child(1) { background: #E2685A; }
  .yf-traffic i:nth-child(2) { background: #E6B640; }
  .yf-traffic i:nth-child(3) { background: #5BB552; }
  .yf-url {
    flex: 1;
    margin: 0 12px;
    background: #F5EFE2;
    border: 0.5px solid rgba(0,0,0,0.08);
    border-radius: 6px;
    padding: 5px 12px;
    font-family: ${f.mono};
    font-size: 11px;
    color: ${c.sage};
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .yf-url svg { width: 10px; height: 10px; opacity: 0.55; flex-shrink: 0; }
  .yf-browser-body { background: ${c.chalk}; min-height: 520px; }

  .yf-app-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 22px;
    border-bottom: 0.5px solid ${c.mist};
  }
  .yf-app-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: ${f.serif};
    font-size: 17px;
    color: ${c.ink};
  }
  .yf-app-brand .dot {
    width: 7px;
    height: 7px;
    background: ${c.terracotta};
    border-radius: 50%;
  }
  .yf-app-nav {
    display: flex;
    gap: 22px;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.sage};
  }
  .yf-app-nav span.active { color: ${c.terracotta}; }
  .yf-app-user {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: ${c.forest};
    color: ${c.chalk};
    display: grid;
    place-items: center;
    font-family: ${f.mono};
    font-size: 10px;
  }

  .yf-app-body {
    display: grid;
    grid-template-columns: 1.05fr 1.3fr;
    gap: 0;
    min-height: 500px;
  }
  .yf-app-left {
    padding: 32px 36px;
    border-right: 0.5px solid ${c.mist};
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .yf-item-photo {
    width: 100%;
    aspect-ratio: 4/3;
    border-radius: 4px;
    background: ${c.parchment};
    position: relative;
    border: 0.5px solid ${c.mist};
    overflow: hidden;
  }
  .yf-photo-scan {
    position: absolute;
    left: 0;
    right: 0;
    height: 38%;
    background: linear-gradient(180deg, transparent, rgba(181,68,25,0.14), transparent);
    opacity: 0;
    transform: translateY(-120%);
    pointer-events: none;
  }
  .yf-photo-scan.on {
    opacity: 1;
    animation: yf-photo-sweep ${1.1 * DEMO_PACE}s ${EASE_OUT} forwards;
  }
  @keyframes yf-photo-sweep {
    0% { transform: translateY(-120%); }
    100% { transform: translateY(320%); }
  }
  .yf-item-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .yf-photo-caption {
    position: absolute;
    left: 12px;
    bottom: 10px;
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${c.forest};
    background: rgba(240,234,224,0.88);
    padding: 4px 8px;
    border-radius: 2px;
  }
  .yf-item-title {
    font-family: ${f.serif};
    font-size: 26px;
    font-weight: 400;
    line-height: 1.15;
    color: ${c.ink};
    margin: 0;
  }
  .yf-item-title em { font-style: italic; color: ${c.terracotta}; }
  .yf-ident-line {
    font-family: ${f.mono};
    font-size: 11px;
    color: ${c.bark};
    letter-spacing: 0.12em;
    margin: 10px 0 0;
    text-transform: uppercase;
    transition: color 0.35s ease, opacity 0.35s ease;
  }
  .yf-ident-line.is-busy { color: ${c.sage}; }
  .yf-ident-line.is-done { color: ${c.forest}; }
  .yf-tag-row { display: flex; flex-wrap: wrap; gap: 6px; }
  .yf-tag {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    padding: 4px 8px;
    background: transparent;
    border: 0.5px solid ${c.mist};
    color: ${c.sage};
    border-radius: 2px;
    opacity: 0;
    transform: translateY(6px) scale(0.96);
    transition: opacity 0.45s ${EASE_OUT}, transform 0.45s ${EASE_OUT};
  }
  .yf-tag.in {
    opacity: 1;
    transform: none;
  }
  .yf-tag.hot { color: ${c.terracotta}; border-color: ${c.terracotta}; }

  .yf-app-right {
    padding: 32px 36px;
    background: linear-gradient(180deg, ${c.chalk}, #FBF6EA);
    display: flex;
    flex-direction: column;
    gap: 22px;
  }
  .yf-price-eyebrow {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  .yf-pill {
    background: ${c.forest};
    color: ${c.chalk};
    padding: 3px 8px;
    border-radius: 2px;
    letter-spacing: 0.14em;
  }
  .yf-pill.is-live {
    animation: yf-live-pulse 2.4s ease-out infinite;
  }
  @keyframes yf-live-pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.82; transform: scale(0.97); }
  }
  .yf-price-range {
    font-family: ${f.serif};
    font-weight: 300;
    font-size: 64px;
    line-height: 1;
    margin: 16px 0 8px;
    letter-spacing: -0.02em;
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }
  .yf-price-range .low { color: ${c.ink}; }
  .yf-price-range .sep { color: ${c.mist}; font-size: 40px; }
  .yf-price-range .high { color: ${c.terracotta}; font-style: italic; }
  .yf-price-range .sep {
    color: ${c.mist};
    font-size: 40px;
    opacity: 0;
    transform: scale(0.92);
    transition: opacity 0.4s ${EASE_OUT}, transform 0.4s ${EASE_OUT};
  }
  .yf-price-range.show-sep .sep { opacity: 1; transform: none; }
  .yf-price-median {
    font-family: ${f.mono};
    font-size: 11px;
    color: ${c.sage};
    letter-spacing: 0.1em;
  }

  .yf-conf-card { border-top: 0.5px solid ${c.mist}; padding-top: 18px; }
  .yf-conf-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }
  .yf-conf-label {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  .yf-conf-value {
    font-family: ${f.serif};
    font-size: 22px;
    font-weight: 400;
    color: ${c.forest};
  }
  .yf-conf-value em { color: ${c.terracotta}; font-style: italic; }
  .yf-conf-bar {
    position: relative;
    height: 4px;
    background: ${c.mist};
    overflow: hidden;
  }
  .yf-conf-bar-fill {
    position: absolute;
    inset: 0 auto 0 0;
    width: 100%;
    background: ${c.terracotta};
    transform: scaleX(var(--conf-scale, 0.87));
    transform-origin: left center;
    transition: transform ${1.2 * DEMO_PACE}s cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .yf-conf-ticks {
    display: flex;
    justify-content: space-between;
    margin-top: 8px;
    font-family: ${f.mono};
    font-size: 9px;
    color: ${c.bark};
    letter-spacing: 0.14em;
  }
  .yf-method {
    margin-top: 14px;
    font-family: ${f.mono};
    font-size: 10px;
    color: ${c.sage};
    letter-spacing: 0.06em;
    line-height: 1.7;
  }
  .yf-method-row {
    display: flex;
    justify-content: space-between;
    padding: 4px 0;
    border-bottom: 0.5px dashed rgba(201,191,169,0.55);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.4s ${EASE_OUT}, transform 0.4s ${EASE_OUT};
  }
  .yf-method-row.in { opacity: 1; transform: none; }
  .yf-method-row:last-child { border-bottom: 0; }

  .yf-comps-head {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 10px;
  }
  .yf-comps-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 8px;
  }
  .yf-comp {
    border: 0.5px solid ${c.mist};
    padding: 8px;
    background: ${c.chalk};
    display: flex;
    flex-direction: column;
    gap: 6px;
    opacity: 0;
    transform: translateY(10px) scale(0.97);
    transition: opacity ${0.5 * DEMO_PACE}s ${EASE_OUT}, transform ${0.5 * DEMO_PACE}s ${EASE_OUT};
  }
  .yf-comp.in {
    opacity: 1;
    transform: none;
  }
  .yf-comp-thumb {
    aspect-ratio: 1/1;
    background: ${c.parchment};
    position: relative;
    overflow: hidden;
  }
  .yf-comp-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .yf-comp-title {
    font-family: ${f.mono};
    font-size: 8px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: ${c.bark};
    line-height: 1.3;
    margin-top: 2px;
  }
  .yf-comp-price {
    font-family: ${f.serif};
    font-size: 18px;
    font-weight: 400;
    color: ${c.ink};
  }
  .yf-comp-meta {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.12em;
    color: ${c.bark};
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
  }
  .yf-comp-meta .sold { color: ${c.forest}; }

  .yf-sources { display: flex; gap: 6px; flex-wrap: wrap; }
  .yf-source-pill {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.14em;
    padding: 3px 7px;
    border: 0.5px solid ${c.mist};
    text-transform: uppercase;
    color: ${c.sage};
    opacity: 0;
    transform: translateY(4px);
    transition: opacity 0.35s ${EASE_OUT}, transform 0.35s ${EASE_OUT};
  }
  .yf-source-pill.in { opacity: 1; transform: none; }
  .yf-source-pill .cnt { color: ${c.terracotta}; margin-left: 4px; }

  @media (prefers-reduced-motion: reduce) {
    .yf-browser.is-live,
    .yf-pill.is-live,
    .yf-photo-scan.on { animation: none !important; }
    .yf-reveal, .yf-tag, .yf-comp, .yf-method-row, .yf-source-pill, .yf-price-range .sep {
      transition-duration: 0.2s !important;
    }
  }

  @media (max-width: 900px) {
    .yf-hero-root { padding: 72px 0 80px; }
    .yf-hero-intro {
      min-height: unset;
      padding: 56px 0 36px;
    }
    .yf-hero-container { padding: 0 24px; }
    .yf-headline { max-width: none; font-size: clamp(38px, 9vw, 52px); }
    .yf-subkick { max-width: none; font-size: 16px; }
    .yf-app-body { grid-template-columns: 1fr; }
    .yf-app-left { border-right: none; border-bottom: 0.5px solid ${c.mist}; }
    .yf-comps-grid { grid-template-columns: repeat(2, 1fr); }
    .yf-app-nav { display: none; }
    .yf-price-range { font-size: clamp(36px, 10vw, 52px); }
    .yf-price-range .sep { font-size: 28px; }
  }
`

export function Hero() {
  const rootRef = useRef<HTMLElement>(null)
  const browserRef = useRef<HTMLDivElement>(null)
  const timers = useRef<number[]>([])
  const raf = useRef<number | null>(null)
  const reduced = useRef(false)
  const playedOnce = useRef(false)

  const [vis, setVis] = useState(false)
  const [demoStatus, setDemoStatus] = useState<'waiting' | 'running' | 'done'>('waiting')
  const [scanOn, setScanOn] = useState(false)
  const [identText, setIdentText] = useState('Ready to appraise')
  const [identBusy, setIdentBusy] = useState(false)
  const [priceLow, setPriceLow] = useState(0)
  const [priceHigh, setPriceHigh] = useState(0)
  const [showSep, setShowSep] = useState(false)
  const [sampleN, setSampleN] = useState(0)
  const [confScale, setConfScale] = useState(0)
  const [visibleTags, setVisibleTags] = useState(4)
  const [visibleComps, setVisibleComps] = useState(0)
  const [visibleMethods, setVisibleMethods] = useState(0)
  const [sourceCounts, setSourceCounts] = useState(() => SOURCE_TARGETS.map(() => 0))
  const [visibleSources, setVisibleSources] = useState(0)

  const clearTimers = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t))
    timers.current = []
    if (raf.current != null) {
      cancelAnimationFrame(raf.current)
      raf.current = null
    }
  }, [])

  const at = useCallback((ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }, [])

  const animatePrices = useCallback(() => {
    const start = performance.now()
    const duration = demoMs(900)
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const e = easeOut(t)
      setPriceLow(PRICE_LOW * e)
      setPriceHigh(PRICE_HIGH * e)
      setSampleN(Math.round(142 * e))
      if (t < 1) raf.current = requestAnimationFrame(tick)
      else raf.current = null
    }
    raf.current = requestAnimationFrame(tick)
  }, [])

  const setFinalState = useCallback(() => {
    setScanOn(false)
    setIdentText('Identified — 94% match')
    setIdentBusy(false)
    setPriceLow(PRICE_LOW)
    setPriceHigh(PRICE_HIGH)
    setShowSep(true)
    setSampleN(142)
    setConfScale(CONF_TARGET)
    setVisibleTags(4)
    setVisibleComps(4)
    setVisibleMethods(5)
    setSourceCounts(SOURCE_TARGETS.map((s) => s.count))
    setVisibleSources(SOURCE_TARGETS.length)
  }, [])

  const playDemoOnce = useCallback(() => {
    clearTimers()

    if (reduced.current) {
      setFinalState()
      setDemoStatus('done')
      return
    }

    setDemoStatus('running')
    setScanOn(false)
    setIdentText('Analyzing photo…')
    setIdentBusy(true)
    setPriceLow(0)
    setPriceHigh(0)
    setShowSep(false)
    setSampleN(0)
    setConfScale(0)
    setVisibleTags(4)
    setVisibleComps(0)
    setVisibleMethods(0)
    setSourceCounts(SOURCE_TARGETS.map(() => 0))
    setVisibleSources(0)

    at(demoMs(80), () => setScanOn(true))
    at(demoMs(820), () => {
      setScanOn(false)
      setIdentText('Searching marketplaces…')
    })
    at(demoMs(1380), () => {
      setIdentText('Identified — 94% match')
      setIdentBusy(false)
    })
    at(demoMs(1560), () => {
      setShowSep(true)
      animatePrices()
    })
    at(demoMs(2360), () => setConfScale(CONF_TARGET))
    at(demoMs(2560), () => setVisibleMethods(5))
    at(demoMs(2760), () => setVisibleComps(1))
    at(demoMs(2880), () => setVisibleComps(2))
    at(demoMs(3000), () => setVisibleComps(3))
    at(demoMs(3120), () => setVisibleComps(4))
    at(demoMs(3260), () => {
      setVisibleSources(SOURCE_TARGETS.length)
      SOURCE_TARGETS.forEach((source, i) => {
        at(demoMs(i * 60), () => {
          setSourceCounts((prev) => {
            const next = [...prev]
            next[i] = source.count
            return next
          })
        })
      })
    })
    at(demoMs(3900), () => {
      setFinalState()
      setDemoStatus('done')
    })
  }, [animatePrices, at, clearTimers, setFinalState])

  useEffect(() => {
    reduced.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true)
      },
      { threshold: 0.08 }
    )
    if (rootRef.current) io.observe(rootRef.current)
    return () => io.disconnect()
  }, [])

  useEffect(() => {
    const el = browserRef.current
    if (!el) return

    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting || playedOnce.current) return
        playedOnce.current = true
        playDemoOnce()
      },
      { threshold: 0.05, rootMargin: '0px 0px 18% 0px' }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      clearTimers()
    }
  }, [clearTimers, playDemoOnce])

  const tags = ['Mid-century', 'Walnut veneer', 'Aniline leather', 'Authenticated'] as const

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="yf-hero-root" ref={rootRef}>
        <div className="yf-hero-container">
          <div className="yf-hero-intro">
            <div className={`yf-editorial yf-reveal ${vis ? 'in' : ''}`}>
              <h1 className="yf-headline" style={{ transitionDelay: vis ? '0ms' : undefined }}>
                Know the value of anything you own.
              </h1>
              <p
                className="yf-subkick yf-reveal"
                style={{
                  opacity: vis ? 1 : 0,
                  transform: vis ? 'none' : 'translateY(14px)',
                  transition: `opacity 0.85s ${EASE_OUT} 0.08s, transform 0.85s ${EASE_OUT} 0.08s`,
                }}
              >
                Photograph any item and get its real market value — sourced from six major marketplaces in seconds.
              </p>
              <div
                className="yf-meta"
                style={{
                  opacity: vis ? 1 : 0,
                  transform: vis ? 'none' : 'translateY(10px)',
                  transition: `opacity 0.85s ${EASE_OUT} 0.16s, transform 0.85s ${EASE_OUT} 0.16s`,
                }}
              >
                <span>6 marketplaces</span>
              </div>
            </div>
          </div>

          <div
            ref={browserRef}
            className={`yf-browser yf-reveal ${vis ? 'in' : ''} ${demoStatus === 'running' ? 'is-live' : ''}`}
            style={{ transitionDelay: '0.12s' }}
          >
            <div className="yf-browser-chrome">
              <div className="yf-traffic">
                <i />
                <i />
                <i />
              </div>
              <div className="yf-url">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <rect x="5" y="11" width="14" height="9" rx="1" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
                yardfront.app/appraise/lot-7412
              </div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: c.sage, letterSpacing: '0.14em' }}>⟵ ⟶ ⟲</div>
            </div>
            <div className="yf-browser-body">
              <div className="yf-app-top">
                <div className="yf-app-brand">
                  <span className="dot" />
                  YardFront
                </div>
                <div className="yf-app-nav">
                  <span className="active">Appraise</span>
                  <span>History</span>
                  <span>Collections</span>
                  <span>API</span>
                </div>
                <div className="yf-app-user">MA</div>
              </div>

              <div className="yf-app-body">
                <div className="yf-app-left">
                  <div>
                    <p className="yf-eyebrow" style={{ marginBottom: 0 }}>Lot 7412 · uploaded 14:22</p>
                    <div className="yf-item-photo" style={{ marginTop: 14 }}>
                      <img
                        src={landingImages.hero.main.src}
                        alt={landingImages.hero.main.alt}
                        loading="lazy"
                        decoding="async"
                      />
                      <div className={`yf-photo-scan ${scanOn ? 'on' : ''}`} aria-hidden />
                      <span className="yf-photo-caption">{landingImages.hero.main.title}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="yf-item-title">
                      Walnut <em>lounge chair</em> &amp; ottoman, c. 1958
                    </h3>
                    <p className={`yf-ident-line ${identBusy ? 'is-busy' : 'is-done'}`}>{identText}</p>
                  </div>
                  <div>
                    <p className="yf-eyebrow" style={{ marginBottom: 10 }}>Attributes</p>
                    <div className="yf-tag-row">
                      {tags.map((tag, i) => (
                        <span
                          key={tag}
                          className={`yf-tag ${i < visibleTags ? 'in' : ''} ${tag === 'Authenticated' ? 'hot' : ''}`}
                          style={{ transitionDelay: i < visibleTags ? `${i * demoMs(60)}ms` : undefined }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="yf-app-right">
                  <div>
                    <div className="yf-price-eyebrow">
                      <span>Estimated resale value</span>
                      <span className={`yf-pill ${demoStatus === 'running' ? 'is-live' : ''}`}>LIVE</span>
                    </div>
                    <div className={`yf-price-range ${showSep ? 'show-sep' : ''}`}>
                      {demoStatus === 'waiting' ? (
                        <>
                          <span className="low" style={{ opacity: 0.45 }}>—</span>
                          <span className="sep" style={{ opacity: 0.35 }}>/</span>
                          <span className="high" style={{ opacity: 0.45 }}>—</span>
                        </>
                      ) : (
                        <>
                          <span className="low">{fmtMoney(priceLow)}</span>
                          <span className="sep">/</span>
                          <span className="high">{fmtMoney(priceHigh)}</span>
                        </>
                      )}
                    </div>
                    <div className="yf-price-median">
                      {demoStatus === 'waiting'
                        ? 'Comparing six marketplaces for comparable sales…'
                        : sampleN > 0
                          ? `Median ${fmtMoney((priceLow + priceHigh) / 2)} · ${sampleN} comparable sales, past 90 days`
                          : 'Searching comparable sales across six marketplaces…'}
                    </div>
                  </div>

                  <div className="yf-conf-card">
                    <div className="yf-conf-head">
                      <span className="yf-conf-label">Confidence</span>
                      <span className="yf-conf-value">
                        <em>{confScale >= 0.75 ? 'High' : confScale > 0 ? 'Building' : '—'}</em>
                        {confScale > 0 ? ` · ${Math.round(confScale * 100)}%` : ''}
                      </span>
                    </div>
                    <div className="yf-conf-bar">
                      <div
                        className="yf-conf-bar-fill"
                        style={{ ['--conf-scale' as string]: String(confScale) }}
                      />
                    </div>
                    <div className="yf-conf-ticks">
                      <span>Speculative</span>
                      <span>Defensible</span>
                      <span>Ironclad</span>
                    </div>
                    <div className="yf-method">
                      {(
                        [
                          ['Image clarity', 'Excellent'],
                          ['Brand signals', 'Herman Miller, Eames'],
                          ['Condition cues', 'Light patina'],
                          ['Sample size', `n = ${sampleN || '—'}`],
                          ['Price dispersion', sampleN > 0 ? 'σ = $184' : '—'],
                        ] as const
                      ).map(([label, value], i) => (
                        <div
                          key={label}
                          className={`yf-method-row ${i < visibleMethods ? 'in' : ''}`}
                          style={{ transitionDelay: i < visibleMethods ? `${i * demoMs(50)}ms` : undefined }}
                        >
                          <span>{label}</span>
                          <span>{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="yf-comps-head">
                      <span className="yf-conf-label">Recent comparables</span>
                      <span className="yf-conf-label" style={{ color: c.sage }}>
                        Last 90 days
                      </span>
                    </div>
                    <div className="yf-comps-grid">
                      {COMP_DATA.map(([price, source], i) => {
                        const img = landingImages.hero.comparables[i]
                        return (
                          <div
                            className={`yf-comp ${i < visibleComps ? 'in' : ''}`}
                            key={source}
                            style={{ transitionDelay: i < visibleComps ? `${i * demoMs(70)}ms` : undefined }}
                          >
                            <div className="yf-comp-thumb">
                              <img src={img.src} alt={img.alt} loading="lazy" decoding="async" />
                            </div>
                            <div className="yf-comp-title">{img.title}</div>
                            <div className="yf-comp-price">{price}</div>
                            <div className="yf-comp-meta">
                              <span>{source}</span>
                              <span className="sold">Sold</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="yf-sources">
                    {SOURCE_TARGETS.map((source, i) => (
                      <span
                        key={source.name}
                        className={`yf-source-pill ${i < visibleSources ? 'in' : ''}`}
                        style={{ transitionDelay: i < visibleSources ? `${i * demoMs(40)}ms` : undefined }}
                      >
                        {source.name} <span className="cnt">{sourceCounts[i]}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Hero
