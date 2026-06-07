import { useEffect, useRef, useState } from 'react'
import { landingImages } from '../../lib/landingImages'
import { colors as c, fonts as f } from '../../lib/tokens'

const css = `
  .yf-hero-root * { box-sizing: border-box; }
  .yf-hero-root {
    background: ${c.parchment};
    padding: 140px 0 100px;
    min-height: 100vh;
    position: relative;
    font-family: ${f.sans};
  }
  .yf-hero-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .yf-reveal {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .yf-reveal.in { opacity: 1; transform: none; }

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
    margin: 28px auto;
  }
  .yf-headline {
    font-family: ${f.serif};
    font-weight: 300;
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: ${c.ink};
    margin: 0;
    font-size: clamp(44px, 6.2vw, 84px);
    text-wrap: balance;
  }
  .yf-headline em { font-style: italic; color: ${c.terracotta}; font-weight: 400; }
  .yf-lede {
    font-weight: 300;
    font-size: 17px;
    line-height: 1.55;
    color: ${c.sage};
    max-width: 52ch;
    margin: 0 auto;
    text-wrap: pretty;
  }
  .yf-editorial {
    text-align: center;
    max-width: 920px;
    margin: 0 auto;
  }
  .yf-meta {
    margin-top: 28px;
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

  .yf-browser {
    width: 100%;
    max-width: 1080px;
    margin: 72px auto 0;
    background: #E8E2D6;
    border-radius: 12px 12px 8px 8px;
    box-shadow: 0 40px 80px -30px rgba(26,42,28,0.28), 0 12px 28px -12px rgba(26,42,28,0.18);
    overflow: hidden;
    border: 0.5px solid ${c.mist};
  }
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
  }
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
    background: ${c.terracotta};
    width: var(--conf, 87%);
    transition: width 1.2s cubic-bezier(0.2, 0.7, 0.2, 1);
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
  }
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
  }
  .yf-source-pill .cnt { color: ${c.terracotta}; margin-left: 4px; }

  @media (max-width: 900px) {
    .yf-hero-root { min-height: unset; padding: 120px 0 80px; }
    .yf-hero-container { padding: 0 24px; }
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
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setVis(true)
          io.disconnect()
        }
      },
      { threshold: 0.08 }
    )
    if (rootRef.current) io.observe(rootRef.current)
    return () => io.disconnect()
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="yf-hero-root" ref={rootRef}>
        <div className="yf-hero-container">
          <div className={`yf-editorial yf-reveal ${vis ? 'in' : ''}`}>
            <p className="yf-eyebrow">Volume 01 · Issue 04 · Price intelligence</p>
            <h1 className="yf-headline">
              What&apos;s it <em>actually</em> worth?
              <br />
              Photograph it. We&apos;ll tell you.
            </h1>
            <hr className="yf-rule" />
            <p className="yf-lede">
              YardFront identifies any secondhand item from a single photo, then searches seven marketplaces at once to return a defensible price range — with the comparable sales to back it up.
            </p>
            <div className="yf-meta">
              <span>7 marketplaces</span>
              <span>Median 2.4s</span>
              <span>Confidence per estimate</span>
            </div>
          </div>

          <div className={`yf-browser yf-reveal ${vis ? 'in' : ''}`} style={{ transitionDelay: '0.12s' }}>
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
                      <span className="yf-photo-caption">{landingImages.hero.main.title}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="yf-item-title">
                      Walnut <em>lounge chair</em> &amp; ottoman, c. 1958
                    </h3>
                    <p className="yf-ident-line">Identified — 94% match</p>
                  </div>
                  <div>
                    <p className="yf-eyebrow" style={{ marginBottom: 10 }}>Attributes</p>
                    <div className="yf-tag-row">
                      <span className="yf-tag">Mid-century</span>
                      <span className="yf-tag">Walnut veneer</span>
                      <span className="yf-tag">Aniline leather</span>
                      <span className="yf-tag hot">Authenticated</span>
                    </div>
                  </div>
                </div>

                <div className="yf-app-right">
                  <div>
                    <div className="yf-price-eyebrow">
                      <span>Estimated resale value</span>
                      <span className="yf-pill">LIVE</span>
                    </div>
                    <div className="yf-price-range">
                      <span className="low">$2,850</span>
                      <span className="sep">/</span>
                      <span className="high">$3,420</span>
                    </div>
                    <div className="yf-price-median">Median $3,120 · 142 comparable sales, past 90 days</div>
                  </div>

                  <div className="yf-conf-card">
                    <div className="yf-conf-head">
                      <span className="yf-conf-label">Confidence</span>
                      <span className="yf-conf-value">
                        <em>High</em> · 87%
                      </span>
                    </div>
                    <div className="yf-conf-bar">
                      <div className="yf-conf-bar-fill" style={{ ['--conf' as string]: '87%' }} />
                    </div>
                    <div className="yf-conf-ticks">
                      <span>Speculative</span>
                      <span>Defensible</span>
                      <span>Ironclad</span>
                    </div>
                    <div className="yf-method">
                      <div className="yf-method-row">
                        <span>Image clarity</span>
                        <span>Excellent</span>
                      </div>
                      <div className="yf-method-row">
                        <span>Brand signals</span>
                        <span>Herman Miller, Eames</span>
                      </div>
                      <div className="yf-method-row">
                        <span>Condition cues</span>
                        <span>Light patina</span>
                      </div>
                      <div className="yf-method-row">
                        <span>Sample size</span>
                        <span>n = 142</span>
                      </div>
                      <div className="yf-method-row">
                        <span>Price dispersion</span>
                        <span>σ = $184</span>
                      </div>
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
                      {(
                        [
                          ['$3,200', 'eBay'],
                          ['$2,950', 'Chairish'],
                          ['$3,420', '1stDibs'],
                          ['$2,890', 'Mercari'],
                        ] as const
                      ).map(([price, source], i) => {
                        const img = landingImages.hero.comparables[i]
                        return (
                          <div className="yf-comp" key={source}>
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
                    <span className="yf-source-pill">
                      eBay <span className="cnt">58</span>
                    </span>
                    <span className="yf-source-pill">
                      Chairish <span className="cnt">31</span>
                    </span>
                    <span className="yf-source-pill">
                      1stDibs <span className="cnt">24</span>
                    </span>
                    <span className="yf-source-pill">
                      Mercari <span className="cnt">18</span>
                    </span>
                    <span className="yf-source-pill">
                      OfferUp <span className="cnt">7</span>
                    </span>
                    <span className="yf-source-pill">
                      Craigslist <span className="cnt">4</span>
                    </span>
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
