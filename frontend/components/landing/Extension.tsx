import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { landingImages } from '../../lib/landingImages'
import { colors as c, fonts as f } from '../../lib/tokens'

const css = `
  .ext-root {
    background: ${c.forest};
    color: ${c.chalk};
    padding: 140px 0;
    overflow: hidden;
  }
  .ext-inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: 80px;
    align-items: center;
  }

  .ext-left {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .ext-left.vis { opacity: 1; transform: translateY(0); }

  .ext-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.forestMuted};
    margin: 0 0 20px;
  }
  .ext-headline {
    font-family: ${f.serif};
    font-size: clamp(38px, 4.4vw, 56px);
    font-weight: 300;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: ${c.chalk};
    margin: 20px 0 0;
  }
  .ext-headline em { font-style: italic; color: ${c.terracottaWarm}; font-weight: 400; }
  .ext-rule {
    width: 32px;
    height: 0.5px;
    background: ${c.forestSoft};
    border: 0;
    margin: 24px 0;
  }
  .ext-body {
    font-family: ${f.sans};
    font-size: 15px;
    font-weight: 300;
    line-height: 1.85;
    color: ${c.forestMuted};
    margin: 0;
    max-width: 52ch;
  }

  .ext-features { margin-top: 32px; }
  .ext-feature {
    display: flex;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 0.5px solid ${c.forestHair};
  }
  .ext-feature::before {
    content: "";
    width: 4px;
    height: 4px;
    background: ${c.terracottaWarm};
    border-radius: 50%;
    margin-top: 9px;
    flex-shrink: 0;
  }
  .ext-feature .ef-t {
    font-family: ${f.sans};
    font-size: 15px;
    color: ${c.chalk};
    font-weight: 400;
    line-height: 1.35;
  }
  .ext-feature .ef-d {
    font-family: ${f.sans};
    font-size: 13px;
    color: ${c.forestMuted};
    margin-top: 4px;
    font-weight: 300;
    line-height: 1.5;
  }

  .ext-cta {
    margin-top: 36px;
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 16px 28px;
    background: ${c.terracotta};
    color: ${c.chalk};
    border: 0;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: opacity 0.2s;
  }
  .ext-cta:hover { opacity: 0.92; }

  .ext-right {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s ease 0.12s, transform 0.7s ease 0.12s;
    position: relative;
  }
  .ext-right.vis { opacity: 1; transform: translateY(0); }

  .listing {
    background: #223424;
    border: 0.5px solid ${c.forestHair};
    padding: 24px;
    position: relative;
  }
  .listing-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 18px;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.18em;
    color: ${c.forestMuted};
    text-transform: uppercase;
  }
  .listing-img {
    aspect-ratio: 4/3;
    background: #1E2F20;
    position: relative;
    border: 0.5px solid ${c.forestHair};
    overflow: hidden;
  }
  .listing-img img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .listing-img-caption {
    position: absolute;
    left: 12px;
    bottom: 12px;
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${c.chalk};
    background: rgba(26,42,28,0.72);
    padding: 4px 8px;
    border-radius: 2px;
  }
  .listing-title {
    font-family: ${f.serif};
    font-size: 22px;
    margin-top: 16px;
    color: ${c.chalk};
    line-height: 1.2;
    font-weight: 400;
  }
  .listing-price {
    font-family: ${f.serif};
    font-size: 32px;
    color: ${c.chalk};
    margin-top: 4px;
    font-weight: 300;
  }
  .listing-price .strike {
    color: ${c.forestMuted};
    text-decoration: line-through;
    font-size: 16px;
    margin-left: 12px;
  }
  .listing-seller {
    margin-top: 14px;
    font-family: ${f.mono};
    font-size: 10px;
    color: ${c.forestMuted};
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .overlay {
    position: absolute;
    right: -28px;
    top: 120px;
    background: ${c.chalk};
    color: ${c.ink};
    width: 280px;
    padding: 18px 20px;
    box-shadow: 0 30px 50px -16px rgba(0,0,0,0.45);
    border-radius: 4px;
    border-top: 3px solid ${c.terracotta};
  }
  .overlay .ov-e {
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.22em;
    color: ${c.bark};
    text-transform: uppercase;
  }
  .overlay .ov-t {
    font-family: ${f.serif};
    font-size: 22px;
    font-weight: 400;
    margin-top: 6px;
    line-height: 1.15;
    color: ${c.ink};
  }
  .overlay .ov-t em {
    color: ${c.terracotta};
    font-style: italic;
    font-weight: 400;
  }
  .overlay .ov-range {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    font-family: ${f.mono};
    font-size: 10px;
    color: ${c.sage};
    letter-spacing: 0.1em;
  }
  .overlay .ov-bar {
    height: 3px;
    background: ${c.mist};
    margin-top: 6px;
    position: relative;
    border-radius: 1px;
  }
  .overlay .ov-bar::after {
    content: "";
    position: absolute;
    inset: 0;
    background: ${c.terracotta};
    width: 78%;
    border-radius: 1px;
  }
  .overlay .ov-verdict {
    margin-top: 12px;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: ${c.terracotta};
    border-top: 0.5px solid ${c.mist};
    padding-top: 10px;
  }

  @media (max-width: 1000px) {
    .ext-inner { grid-template-columns: 1fr; gap: 48px; padding: 0 24px; }
    .overlay {
      position: relative;
      right: auto;
      top: auto;
      width: 100%;
      margin-top: 24px;
    }
  }
`

export function Extension() {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="ext-root" id="extension" ref={ref}>
        <div className="ext-inner">
          <div className={`ext-left ${vis ? 'vis' : ''}`}>
            <p className="ext-eyebrow">Browser extension · Beta</p>
            <h2 className="ext-headline">
              A <em>second opinion</em>
              <br />
              on every listing.
            </h2>
            <hr className="ext-rule" />
            <p className="ext-body">
              Install once, then scroll Facebook Marketplace, Craigslist, or eBay the way you already do. YardFront quietly annotates each listing with what the item actually sold for — everywhere else.
            </p>
            <div className="ext-features">
              <div className="ext-feature">
                <div>
                  <div className="ef-t">Live overlays on 11 marketplaces</div>
                  <div className="ef-d">Verdict pill, range, and source count, without leaving the page.</div>
                </div>
              </div>
              <div className="ext-feature">
                <div>
                  <div className="ef-t">Bulk scan a search results page</div>
                  <div className="ef-d">Sort by overpay/underpay to surface the deals fast.</div>
                </div>
              </div>
              <div className="ext-feature">
                <div>
                  <div className="ef-t">One-click &quot;save for later&quot;</div>
                  <div className="ef-d">Watchlists sync with your YardFront web account.</div>
                </div>
              </div>
            </div>
            <Link to="/business#waitlist" className="ext-cta">
              Request beta access
            </Link>
          </div>

          <div className={`ext-right ${vis ? 'vis' : ''}`}>
            <div className="listing">
              <div className="listing-header">
                <span>facebook marketplace · seattle</span>
                <span>Posted 3d ago</span>
              </div>
              <div className="listing-img">
                <img
                  src={landingImages.extension.listing.src}
                  alt={landingImages.extension.listing.alt}
                  loading="lazy"
                  decoding="async"
                />
                <span className="listing-img-caption">{landingImages.extension.listing.title}</span>
              </div>
              <div className="listing-title">Miles Davis — Kind of Blue, original 1959 Columbia pressing</div>
              <div className="listing-price">
                $1,600<span className="strike">$2,000</span>
              </div>
              <div className="listing-seller">Seller: vintage_wax_seattle · ★ 4.9</div>
            </div>
            <div className="overlay">
              <div className="ov-e">YardFront · Market value</div>
              <div className="ov-t">
                <em>$1,200</em> – $1,450
              </div>
              <div className="ov-range">
                <span>Median $1,320</span>
                <span>n = 38</span>
              </div>
              <div className="ov-bar" aria-hidden />
              <div className="ov-verdict">Likely overpriced · 18%</div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Extension
