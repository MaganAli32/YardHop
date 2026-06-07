import { useEffect, useRef, useState, useCallback, type CSSProperties } from 'react'
import { landingImages } from '../../lib/landingImages'
import { colors as c, fonts as f } from '../../lib/tokens'

const STEPS = [
  { step: 'Step 01', title: 'Upload' },
  { step: 'Step 02', title: 'Identify' },
  { step: 'Step 03', title: 'Search' },
  { step: 'Step 04', title: 'Synthesize' },
] as const

const HIW_DUR = 5200

const css = `
  .hiw-root {
    background: ${c.chalk};
    padding: 140px 0;
    overflow: hidden;
  }
  .hiw-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .hiw-head {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    align-items: end;
    margin-bottom: 72px;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .hiw-head.vis { opacity: 1; transform: translateY(0); }
  .hiw-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 400;
    color: ${c.bark};
    margin: 0 0 0 0;
  }
  .hiw-headline {
    font-family: ${f.serif};
    font-weight: 300;
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: ${c.ink};
    margin: 20px 0 0;
    font-size: clamp(38px, 4.4vw, 60px);
    text-wrap: balance;
  }
  .hiw-headline em {
    font-style: italic;
    color: ${c.terracotta};
    font-weight: 400;
  }
  .hiw-lede {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 17px;
    line-height: 1.55;
    color: ${c.sage};
    max-width: 52ch;
    margin: 0;
    text-wrap: pretty;
  }
  .hiw-panel {
    display: grid;
    grid-template-columns: 340px 1fr;
    gap: 40px;
    border-top: 0.5px solid ${c.mist};
    padding-top: 40px;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.6s ease 0.15s, transform 0.6s ease 0.15s;
  }
  .hiw-panel.vis { opacity: 1; transform: translateY(0); }
  .hiw-tabs {
    display: flex;
    flex-direction: column;
  }
  .hiw-tab {
    text-align: left;
    background: transparent;
    border: 0;
    padding: 20px 0;
    border-bottom: 0.5px solid ${c.mist};
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 6px;
    position: relative;
    transition: opacity 0.3s;
  }
  .hiw-tab .step-label {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    color: ${c.bark};
    text-transform: uppercase;
  }
  .hiw-tab.active .step-label { color: ${c.terracotta}; }
  .hiw-tab .title-label {
    font-family: ${f.serif};
    font-size: 24px;
    font-weight: 400;
    color: ${c.sage};
  }
  .hiw-tab.active .title-label { color: ${c.ink}; }
  .hiw-tab .progress {
    position: absolute;
    left: 0;
    bottom: -0.5px;
    height: 1px;
    background: ${c.terracotta};
    width: 0%;
  }
  .hiw-tab.active .progress {
    width: var(--tabp, 0%);
    transition: width 0.1s linear;
  }
  .hiw-stage {
    background: ${c.parchment};
    border: 0.5px solid ${c.mist};
    min-height: 420px;
    padding: 40px;
    position: relative;
    overflow: hidden;
  }
  .hiw-stage-inner {
    position: absolute;
    inset: 40px;
  }
  .hiw-slide {
    position: absolute;
    inset: 0;
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.5s ease, transform 0.5s ease;
  }
  .hiw-slide.active {
    opacity: 1;
    transform: none;
  }
  .stage-upload {
    display: grid;
    grid-template-rows: auto 1fr;
    gap: 18px;
    height: 100%;
  }
  .stage-upload .dropzone {
    border: 0.75px dashed ${c.bark};
    padding: 40px;
    text-align: center;
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.18em;
    color: ${c.bark};
    text-transform: uppercase;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 14px;
  }
  .stage-upload .glyph {
    font-family: ${f.serif};
    font-size: 40px;
    color: ${c.terracotta};
    line-height: 1;
  }
  .stage-upload .progress-line {
    height: 2px;
    background: ${c.mist};
    position: relative;
  }
  .stage-upload .progress-line::after {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    background: ${c.terracotta};
    width: 64%;
  }
  .stage-ingest-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin: 0;
  }
  .stage-ident {
    display: grid;
    grid-template-columns: 1fr 1.2fr;
    gap: 24px;
    height: 100%;
  }
  .stage-ident .shot {
    background: ${c.parchment};
    border: 0.5px solid ${c.mist};
    position: relative;
    min-height: 200px;
    overflow: hidden;
  }
  .stage-ident .shot img {
    width: 100%;
    height: 100%;
    min-height: 200px;
    object-fit: cover;
    display: block;
  }
  .stage-ident .shot-caption {
    position: absolute;
    left: 10px;
    bottom: 10px;
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${c.forest};
    background: rgba(240,234,224,0.9);
    padding: 4px 8px;
    border-radius: 2px;
  }
  .stage-ident .ident-list {
    display: flex;
    flex-direction: column;
  }
  .stage-ident .ident-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    border-bottom: 0.5px solid ${c.mist};
    padding: 12px 0;
    font-family: ${f.sans};
    font-weight: 400;
    font-size: 14px;
  }
  .stage-ident .ident-row .k {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  .stage-ident .ident-row .v { color: ${c.ink}; }
  .stage-ident .ident-row .v em { color: ${c.terracotta}; font-style: italic; }
  .stage-search {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;
  }
  .stage-search .row {
    display: grid;
    grid-template-columns: 140px 1fr 80px 70px;
    align-items: center;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 0.5px solid ${c.mist};
    font-family: ${f.mono};
    font-size: 11px;
    color: ${c.sage};
    letter-spacing: 0.04em;
  }
  .stage-search .row .src {
    color: ${c.ink};
    text-transform: uppercase;
    letter-spacing: 0.2em;
    font-size: 10px;
  }
  .stage-search .row .bar {
    height: 2px;
    background: ${c.mist};
    position: relative;
  }
  .stage-search .row .bar::after {
    content: "";
    position: absolute;
    inset: 0 auto 0 0;
    background: ${c.terracotta};
    width: var(--w, 50%);
    transition: width 0.8s ease;
  }
  .stage-search .row .n { color: ${c.forest}; text-align: right; }
  .stage-search .row .s {
    color: ${c.bark};
    text-align: right;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 9px;
  }
  .stage-result {
    height: 100%;
    display: grid;
    grid-template-rows: auto auto 1fr;
    gap: 16px;
  }
  .stage-result .big {
    font-family: ${f.serif};
    font-size: clamp(40px, 6vw, 68px);
    font-weight: 300;
    line-height: 1;
    color: ${c.ink};
    letter-spacing: -0.02em;
  }
  .stage-result .big em { color: ${c.terracotta}; font-style: italic; }
  .stage-result .hist {
    display: grid;
    grid-template-columns: repeat(20, 1fr);
    gap: 2px;
    align-items: end;
    height: 90px;
  }
  .stage-result .hist b {
    background: ${c.bark};
    display: block;
    opacity: 0.45;
  }
  .stage-result .hist b.in { background: ${c.terracotta}; opacity: 1; }
  .stage-result .meta {
    display: flex;
    justify-content: space-between;
    align-items: end;
    flex-wrap: wrap;
    gap: 8px;
    border-top: 0.5px solid ${c.mist};
    padding-top: 14px;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.bark};
  }
  .stage-result-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin: 0 0 10px;
  }
  @media (max-width: 1000px) {
    .hiw-container { padding: 0 24px; }
    .hiw-head { grid-template-columns: 1fr; gap: 28px; align-items: start; }
    .hiw-panel { grid-template-columns: 1fr; }
    .hiw-tabs { flex-direction: row; overflow-x: auto; gap: 0; border-bottom: 0.5px solid ${c.mist}; }
    .hiw-tab { min-width: 140px; border-bottom: none; border-right: 0.5px solid ${c.mist}; padding: 16px 12px; }
    .hiw-tab:last-child { border-right: none; }
    .hiw-tab .progress { bottom: 0; left: 0; right: 0; top: auto; height: 2px; }
    .hiw-stage { min-height: 380px; }
    .stage-ident { grid-template-columns: 1fr; }
    .stage-search .row { grid-template-columns: 72px 1fr 48px 52px; gap: 8px; }
  }
`

const IDENT_ROWS: [string, string][] = [
  ['Category', 'Furniture · Seating'],
  ['Form', 'Lounge chair + ottoman'],
  ['Likely maker', '<em>Herman Miller</em> · Eames 670/671'],
  ['Materials', 'Rosewood shell · aniline leather'],
  ['Period', 'c. 1956 – 1971'],
  ['Condition', 'Honest, age-appropriate'],
  ['Match confidence', '<em>94%</em>'],
]

const SEARCH_ROWS: [string, string, string][] = [
  ['eBay', '88%', '58', 'sold'],
  ['Chairish', '72%', '31', 'sold'],
  ['1stDibs', '64%', '24', 'sold'],
  ['Mercari', '48%', '18', 'sold'],
  ['Grailed', '28%', '9', 'active'],
  ['OfferUp', '22%', '7', 'active'],
  ['Craigslist', '12%', '4', 'active'],
]

const HIST_BARS: { h: string; on?: boolean }[] = [
  { h: '22%' }, { h: '34%' }, { h: '44%' },
  { h: '58%', on: true }, { h: '72%', on: true }, { h: '85%', on: true },
  { h: '96%', on: true }, { h: '92%', on: true }, { h: '78%', on: true },
  { h: '68%', on: true }, { h: '54%', on: true }, { h: '44%', on: true },
  { h: '38%' }, { h: '28%' }, { h: '20%' },
  { h: '18%' }, { h: '14%' }, { h: '10%' },
  { h: '8%' }, { h: '6%' },
]

export function HowItWorks() {
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const [headVis, setHeadVis] = useState(false)
  const [panelVis, setPanelVis] = useState(false)
  const [active, setActive] = useState(0)
  const [tabProgress, setTabProgress] = useState(0)
  const [panelInView, setPanelInView] = useState(false)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setHeadVis(true)
      },
      { threshold: 0.08 }
    )
    if (rootRef.current) obs.observe(rootRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => setPanelInView(e.isIntersecting),
      { threshold: 0.25 }
    )
    if (panelRef.current) obs.observe(panelRef.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (headVis) {
      const t = requestAnimationFrame(() => setPanelVis(true))
      return () => cancelAnimationFrame(t)
    }
  }, [headVis])

  const clearTick = useCallback(() => {
    if (tickRef.current) {
      clearInterval(tickRef.current)
      tickRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!panelInView) {
      clearTick()
      return
    }
    setTabProgress(0)
    clearTick()
    tickRef.current = setInterval(() => {
      setTabProgress((p) => {
        const next = p + (60 / HIW_DUR) * 100
        if (next >= 100) {
          setActive((i) => (i + 1) % STEPS.length)
          return 0
        }
        return next
      })
    }, 60)
    return clearTick
  }, [panelInView, clearTick])

  const onTabClick = (i: number) => {
    setActive(i)
    setTabProgress(0)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="hiw-root" id="how-it-works" ref={rootRef}>
        <div className="hiw-container">
          <div className={`hiw-head ${headVis ? 'vis' : ''}`}>
            <div>
              <p className="hiw-eyebrow">Method · 00 / 04</p>
              <h2 className="hiw-headline">
                Four steps,
                <br />
                one <em>defensible</em> number.
              </h2>
            </div>
            <p className="hiw-lede">
              Every lookup runs the same pipeline — identification first, then parallel market search, then synthesis. No black boxes; each step shows its work.
            </p>
          </div>

          <div className={`hiw-panel ${panelVis ? 'vis' : ''}`} ref={panelRef}>
            <div className="hiw-tabs">
              {STEPS.map((s, i) => (
                <button
                  key={s.step}
                  type="button"
                  className={`hiw-tab ${active === i ? 'active' : ''}`}
                  style={
                    active === i
                      ? ({ '--tabp': `${tabProgress}%` } as CSSProperties)
                      : undefined
                  }
                  onClick={() => onTabClick(i)}
                >
                  <span className="step-label">{s.step}</span>
                  <span className="title-label">{s.title}</span>
                  <span className="progress" />
                </button>
              ))}
            </div>

            <div className="hiw-stage">
              <div className="hiw-stage-inner">
                <div className={`hiw-slide ${active === 0 ? 'active' : ''}`}>
                  <div className="stage-upload">
                    <div className="dropzone">
                      <div className="glyph">＋</div>
                      <div>Drop a photograph, paste a URL, or tap to browse</div>
                      <div style={{ fontSize: 9, letterSpacing: '0.3em', color: c.mist }}>JPG · PNG · HEIC · MAX 20MB</div>
                    </div>
                    <div>
                      <p className="stage-ingest-eyebrow">Ingesting · 1 of 1 · 1.8 MB</p>
                      <div className="progress-line" style={{ marginTop: 10 }} />
                    </div>
                  </div>
                </div>

                <div className={`hiw-slide ${active === 1 ? 'active' : ''}`}>
                  <div className="stage-ident">
                    <div className="shot">
                      <img
                        src={landingImages.howItWorks.specimen.src}
                        alt={landingImages.howItWorks.specimen.alt}
                        loading="lazy"
                        decoding="async"
                      />
                      <span className="shot-caption">{landingImages.howItWorks.specimen.title}</span>
                    </div>
                    <div className="ident-list">
                      {IDENT_ROWS.map(([k, v]) => (
                        <div key={k} className="ident-row">
                          <span className="k">{k}</span>
                          <span className="v" dangerouslySetInnerHTML={{ __html: v }} />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className={`hiw-slide ${active === 2 ? 'active' : ''}`}>
                  <div className="stage-search">
                    {SEARCH_ROWS.map(([src, w, n, st]) => (
                      <div key={src} className="row">
                        <span className="src">{src}</span>
                        <span className="bar" style={{ '--w': w } as CSSProperties} />
                        <span className="n">{n}</span>
                        <span className="s">{st}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className={`hiw-slide ${active === 3 ? 'active' : ''}`}>
                  <div className="stage-result">
                    <div>
                      <p className="stage-result-eyebrow">Estimated range · past 90d</p>
                      <div className="big">
                        $2,850<span style={{ color: c.mist, margin: '0 6px' }}>/</span>
                        <em>$3,420</em>
                      </div>
                    </div>
                    <div className="hist">
                      {HIST_BARS.map((bar, idx) => (
                        <b key={idx} className={bar.on ? 'in' : undefined} style={{ height: bar.h }} />
                      ))}
                    </div>
                    <div className="meta">
                      <span>Median · $3,120</span>
                      <span>n = 142</span>
                      <span>σ = $184</span>
                      <span>Confidence · 87%</span>
                    </div>
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

export default HowItWorks
