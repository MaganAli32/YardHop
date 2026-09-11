/**
 * ExtensionPage — standalone brand page for the YardFront browser extension.
 * Hero with annotated listing mock, how-it-works, features, coverage strip, CTA.
 */

import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'
import Reveal from '../components/Reveal'
import { scrollToSection } from '../lib/scrollToSection'
import { colors as c, fonts as f } from '../lib/tokens'

const css = `
  .xp-root { background: ${c.parchment}; color: ${c.ink}; font-family: ${f.sans}; padding-top: 72px; }
  .xp-container { max-width: 1240px; margin: 0 auto; padding: 0 48px; }
  .xp-eyebrow { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: ${c.bark}; margin: 0; }
  .xp-btn-primary {
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    padding: 16px 28px; background: ${c.forest}; color: ${c.chalk}; border: 0; cursor: pointer;
    text-decoration: none; display: inline-block; transition: background 0.2s;
  }
  .xp-btn-primary:hover { background: ${c.terracotta}; }
  .xp-btn-ghost {
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    padding: 16px 28px; background: transparent; color: ${c.forest}; border: 0.5px solid ${c.forest};
    cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s;
  }
  .xp-btn-ghost:hover { background: ${c.forest}; color: ${c.chalk}; }

  /* hero */
  .xp-hero { padding: 80px 0; }
  .xp-hero-grid { display: grid; grid-template-columns: 1fr 1.05fr; gap: 72px; align-items: center; }
  .xp-badge { display: inline-flex; align-items: center; gap: 8px; font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: ${c.forestSoft}; margin-bottom: 22px; }
  .xp-badge i { width: 6px; height: 6px; border-radius: 50%; background: ${c.terracotta}; }
  .xp-hero h1 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(48px, 6vw, 86px); line-height: 1; letter-spacing: -0.01em; margin: 0; color: ${c.ink}; }
  .xp-hero h1 em { font-style: italic; color: ${c.terracotta}; }
  .xp-lede { font-weight: 300; font-size: 18px; line-height: 1.6; color: ${c.sage}; max-width: 46ch; margin: 26px 0 0; }
  .xp-cta-row { display: flex; gap: 12px; margin-top: 34px; flex-wrap: wrap; }
  .xp-meta { display: flex; gap: 34px; margin-top: 34px; font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.16em; text-transform: uppercase; color: ${c.bark}; flex-wrap: wrap; }
  .xp-meta span::before { content: "— "; color: ${c.terracotta}; }

  /* listing mock */
  .xp-mock { position: relative; }
  .xp-listing { background: ${c.chalk}; border: 0.5px solid ${c.mist}; box-shadow: 0 34px 60px -34px rgba(26,42,28,0.32); }
  .xp-listing-bar { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 0.5px solid ${c.mist}; font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.1em; text-transform: uppercase; color: ${c.sage}; }
  .xp-listing-bar .pin { color: ${c.terracotta}; }
  .xp-listing-img { width: 100%; aspect-ratio: 16/10; object-fit: cover; background: ${c.parchment}; display: block; }
  .xp-listing-pad { padding: 20px 22px 24px; }
  .xp-listing-title { font-family: ${f.serif}; font-size: 24px; line-height: 1.15; color: ${c.ink}; }
  .xp-listing-price { font-family: ${f.serif}; font-size: 36px; margin-top: 10px; color: ${c.ink}; }
  .xp-listing-price .strike { font-size: 18px; color: ${c.bark}; text-decoration: line-through; margin-left: 12px; }
  .xp-listing-seller { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.12em; text-transform: uppercase; color: ${c.forestMuted}; margin-top: 14px; }
  .xp-overlay { position: absolute; right: -28px; bottom: 40px; width: 260px; background: ${c.forest}; color: ${c.chalk}; padding: 18px 20px; box-shadow: 0 28px 50px -22px rgba(26,42,28,0.5); }
  .xp-overlay .e { font-family: ${f.mono}; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: ${c.forestMuted}; display: flex; align-items: center; gap: 7px; }
  .xp-overlay .e i { width: 6px; height: 6px; border-radius: 50%; background: ${c.terracotta}; }
  .xp-overlay .big { font-family: ${f.serif}; font-size: 30px; font-weight: 300; margin: 12px 0 6px; white-space: nowrap; }
  .xp-overlay .big em { color: ${c.terracottaWarm}; font-style: italic; }
  .xp-overlay .sub { display: flex; justify-content: space-between; font-family: ${f.mono}; font-size: 10px; color: ${c.forestMuted}; }
  .xp-overlay .bar { height: 3px; background: ${c.forestHair}; margin: 14px 0; position: relative; }
  .xp-overlay .bar i { position: absolute; inset: 0 30% 0 0; background: ${c.terracotta}; }
  .xp-overlay .verdict { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: ${c.terracottaWarm}; }

  /* how it works */
  .xp-how { background: ${c.chalk}; border-top: 0.5px solid ${c.mist}; border-bottom: 0.5px solid ${c.mist}; padding: 96px 0; }
  .xp-how-head { max-width: 620px; margin-bottom: 56px; }
  .xp-how-head h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(34px, 4vw, 52px); line-height: 1.05; margin: 16px 0 0; color: ${c.ink}; }
  .xp-how-head h2 em { font-style: italic; color: ${c.terracotta}; }
  .xp-how-steps { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 2px solid ${c.ink}; }
  .xp-how-step { padding: 32px 28px 0; border-right: 0.5px solid ${c.mist}; }
  .xp-how-step:last-child { border-right: 0; }
  .xp-how-step .n { font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; color: ${c.terracotta}; }
  .xp-how-step h3 { font-family: ${f.serif}; font-weight: 400; font-size: 26px; margin: 18px 0 10px; color: ${c.ink}; }
  .xp-how-step p { font-size: 14px; line-height: 1.6; color: ${c.sage}; margin: 0; }

  /* features */
  .xp-feat { padding: 96px 0; }
  .xp-feat h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(32px, 4vw, 52px); margin: 8px 0 56px; color: ${c.ink}; }
  .xp-feat h2 em { font-style: italic; color: ${c.terracotta}; }
  .xp-feat-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 56px 80px; }
  .xp-feat-item { border-top: 0.5px solid ${c.mist}; padding-top: 22px; }
  .xp-feat-item .t { font-family: ${f.serif}; font-size: 26px; font-weight: 400; color: ${c.ink}; }
  .xp-feat-item .t em { font-style: italic; color: ${c.terracotta}; }
  .xp-feat-item p { font-size: 14px; line-height: 1.6; color: ${c.sage}; margin: 12px 0 0; }

  /* coverage strip */
  .xp-strip { background: ${c.forest}; color: ${c.chalk}; padding: 70px 0; }
  .xp-strip .xp-eyebrow { color: ${c.forestMuted}; }
  .xp-strip h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(30px, 3.4vw, 44px); margin: 16px 0 36px; max-width: 18ch; }
  .xp-strip h2 em { font-style: italic; color: ${c.terracottaWarm}; }
  .xp-strip-list { display: flex; flex-wrap: wrap; gap: 10px; }
  .xp-strip-list span { font-family: ${f.mono}; font-size: 12px; letter-spacing: 0.06em; padding: 10px 16px; border: 0.5px solid ${c.forestHair}; color: ${c.chalk}; }

  /* CTA */
  .xp-cta { padding: 110px 0; text-align: center; }
  .xp-cta h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(40px, 5vw, 72px); line-height: 1; color: ${c.ink}; margin: 16px 0 0; }
  .xp-cta h2 em { font-style: italic; color: ${c.terracotta}; }
  .xp-cta p { color: ${c.sage}; max-width: 44ch; margin: 22px auto 0; }
  .xp-cta .row { display: flex; gap: 12px; justify-content: center; margin-top: 34px; flex-wrap: wrap; }

  @media (max-width: 900px) {
    .xp-container { padding: 0 24px; }
    .xp-hero-grid, .xp-feat-grid { grid-template-columns: 1fr; gap: 48px; }
    .xp-how-steps { grid-template-columns: 1fr; }
    .xp-how-step { border-right: 0; border-bottom: 0.5px solid ${c.mist}; padding-bottom: 28px; }
    .xp-overlay { right: 12px; }
  }
`

const MARKETPLACES = [
  'eBay', 'Facebook Marketplace', 'Craigslist', 'Mercari', 'OfferUp',
  'Chairish', '1stDibs', 'StockX', 'GOAT', 'Grailed', 'Etsy',
]

export default function ExtensionPage() {
  const navigate = useNavigate()

  const goToTryIt = () => {
    navigate('/')
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToSection('try'))
    })
  }

  return (
    <div className="xp-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Navbar />

      {/* Hero */}
      <header className="xp-hero">
        <div className="xp-container">
          <div className="xp-hero-grid">
            <Reveal direction="right" distance={36}>
              <div className="xp-badge">
                <i />
                Browser extension · Beta
              </div>
              <h1>
                A second opinion on <em>every listing.</em>
              </h1>
              <p className="xp-lede">
                Install once, then browse Facebook Marketplace, Craigslist, or eBay the way you
                already do. YardFront quietly annotates each listing with what the item actually
                sold for — everywhere else.
              </p>
              <div className="xp-cta-row">
                <button
                  type="button"
                  className="xp-btn-primary"
                  onClick={() => scrollToSection('get')}
                >
                  Add to Chrome →
                </button>
                <button type="button" className="xp-btn-ghost" onClick={goToTryIt}>
                  Try the web app
                </button>
              </div>
              <div className="xp-meta">
                <span>11 marketplaces</span>
                <span>Zero clicks</span>
                <span>Free in beta</span>
              </div>
            </Reveal>

            <Reveal className="xp-mock" direction="left" distance={36} delay={140}>
              <div className="xp-listing">
                <div className="xp-listing-bar">
                  <span className="pin">● facebook marketplace · seattle</span>
                  <span>Posted 3d ago</span>
                </div>
                <img
                  className="xp-listing-img"
                  src="/images/landing/miles-davis-kind-of-blue.png"
                  alt="Marketplace listing for a Miles Davis Kind of Blue record"
                />
                <div className="xp-listing-pad">
                  <div className="xp-listing-title">
                    Miles Davis — Kind of Blue, original 1959 Columbia pressing
                  </div>
                  <div className="xp-listing-price">
                    $1,600<span className="strike">$2,000</span>
                  </div>
                  <div className="xp-listing-seller">Seller: vintage_wax_seattle · ★ 4.9</div>
                </div>
              </div>
              <div className="xp-overlay">
                <div className="e">
                  <i />
                  YardFront · Market value
                </div>
                <div className="big">
                  <em>$1,200</em> – $1,450
                </div>
                <div className="sub">
                  <span>Median $1,320</span>
                  <span>n = 38</span>
                </div>
                <div className="bar">
                  <i />
                </div>
                <div className="verdict">▲ Likely overpriced · 18% over</div>
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="xp-how">
        <div className="xp-container">
          <Reveal className="xp-how-head">
            <p className="xp-eyebrow">How it works</p>
            <h2>
              Three steps. Then it just <em>lives</em> in your browser.
            </h2>
          </Reveal>
          <div className="xp-how-steps">
            <Reveal className="xp-how-step" delay={0}>
              <div className="n">01</div>
              <h3>Install the extension</h3>
              <p>
                Add YardFront to Chrome, Edge, or Brave. Sign in once. No configuration, no
                per-site setup.
              </p>
            </Reveal>
            <Reveal className="xp-how-step" delay={130}>
              <div className="n">02</div>
              <h3>Browse like normal</h3>
              <p>
                Scroll any supported marketplace. Each listing gets a quiet value pill in the
                corner — deal, fair, or over.
              </p>
            </Reveal>
            <Reveal className="xp-how-step" delay={260}>
              <div className="n">03</div>
              <h3>Scan the whole page</h3>
              <p>
                One click prices every listing on a search results page, then sorts by how far
                each sits from market.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="xp-feat">
        <div className="xp-container">
          <Reveal>
            <p className="xp-eyebrow">What's inside</p>
            <h2>
              Built to stay out of the <em>way</em>.
            </h2>
          </Reveal>
          <div className="xp-feat-grid">
            <Reveal className="xp-feat-item" direction="right" distance={26} delay={0}>
              <div className="t">
                Live overlays on <em>11 marketplaces</em>
              </div>
              <p>
                Verdict pill, value range, and source count rendered inline — without ever leaving
                the page you're on.
              </p>
            </Reveal>
            <Reveal className="xp-feat-item" direction="left" distance={26} delay={100}>
              <div className="t">
                Bulk-scan a <em>results page</em>
              </div>
              <p>
                Price an entire search at once and sort by overpay / underpay to surface the real
                deals in seconds.
              </p>
            </Reveal>
            <Reveal className="xp-feat-item" direction="right" distance={26} delay={60}>
              <div className="t">
                One-click <em>watchlists</em>
              </div>
              <p>
                Save anything for later. Watchlists sync straight to your YardFront web account and
                the marketplace.
              </p>
            </Reveal>
            <Reveal className="xp-feat-item" direction="left" distance={26} delay={160}>
              <div className="t">
                Private by <em>default</em>
              </div>
              <p>
                Pages are priced locally against our index. We never see your browsing history or
                store the listings you view.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Coverage */}
      <section className="xp-strip">
        <div className="xp-container">
          <Reveal>
            <p className="xp-eyebrow">Coverage</p>
            <h2>
              Works where you already <em>hunt</em>.
            </h2>
          </Reveal>
          <Reveal delay={120}>
            <div className="xp-strip-list">
              {MARKETPLACES.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="xp-cta" id="get">
        <div className="xp-container">
          <Reveal>
            <p className="xp-eyebrow">Free during beta</p>
            <h2>
              Put a price on <em>every tab.</em>
            </h2>
            <p>Join the beta and we'll send the install link the moment your spot opens up.</p>
            <div className="row">
              <Link to="/beta?track=extension" className="xp-btn-primary">
                Request beta access →
              </Link>
              <button type="button" className="xp-btn-ghost" onClick={goToTryIt}>
                Try the appraiser
              </button>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
