/**
 * DevelopersPage — standalone brand page for the YardFront API.
 * Hero + multi-language code panel, quickstart, endpoint reference, pricing, CTA.
 */

import { useState, type ReactElement } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'
import Reveal from '../components/Reveal'
import { scrollToSection } from '../lib/scrollToSection'
import { colors as c, fonts as f } from '../lib/tokens'

type Lang = 'ts' | 'py' | 'go'

const css = `
  .dvp-root { background: ${c.parchment}; color: ${c.ink}; font-family: ${f.sans}; padding-top: 72px; }
  .dvp-container { max-width: 1240px; margin: 0 auto; padding: 0 48px; }
  .dvp-eyebrow { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: ${c.bark}; margin: 0; }
  .dvp-btn-primary {
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    padding: 16px 28px; background: ${c.forest}; color: ${c.chalk}; border: 0; cursor: pointer;
    text-decoration: none; display: inline-block; transition: background 0.2s;
  }
  .dvp-btn-primary:hover { background: ${c.terracotta}; }
  .dvp-btn-ghost {
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    padding: 16px 28px; background: transparent; color: ${c.forest}; border: 0.5px solid ${c.forest};
    cursor: pointer; text-decoration: none; display: inline-block; transition: all 0.2s;
  }
  .dvp-btn-ghost:hover { background: ${c.forest}; color: ${c.chalk}; }

  /* hero */
  .dvp-hero { padding: 80px 0; }
  .dvp-hero-grid { display: grid; grid-template-columns: 1fr 1.1fr; gap: 64px; align-items: center; }
  .dvp-hero h1 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(46px, 6vw, 84px); line-height: 0.98; letter-spacing: -0.01em; margin: 18px 0 0; color: ${c.ink}; }
  .dvp-hero h1 em { font-style: italic; color: ${c.terracotta}; }
  .dvp-lede { font-size: 18px; font-weight: 300; line-height: 1.6; color: ${c.sage}; max-width: 46ch; margin: 24px 0 0; }
  .dvp-endpoint { margin-top: 30px; font-family: ${f.mono}; font-size: 12px; color: ${c.forestSoft}; display: flex; align-items: center; gap: 10px; }
  .dvp-endpoint .m { background: ${c.forest}; color: ${c.chalk}; padding: 4px 9px; letter-spacing: 0.08em; }
  .dvp-cta-row { display: flex; gap: 12px; margin-top: 32px; flex-wrap: wrap; }

  /* code panel */
  .dvp-panel { background: ${c.forest}; box-shadow: 0 36px 64px -34px rgba(26,42,28,0.46); }
  .dvp-tabs { display: flex; border-bottom: 0.5px solid ${c.forestHair}; }
  .dvp-tab { font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.1em; padding: 14px 18px; color: ${c.forestMuted}; background: none; border: 0; border-bottom: 1px solid transparent; cursor: pointer; }
  .dvp-tab.active { color: ${c.chalk}; border-bottom-color: ${c.terracotta}; }
  .dvp-panel-body { padding: 22px 24px; overflow-x: auto; }
  .dvp-panel pre { margin: 0; font-family: ${f.mono}; font-size: 12.5px; line-height: 1.7; color: #DCE6DC; white-space: pre; }
  .dvp-panel pre .kw { color: #E59A6C; }
  .dvp-panel pre .str { color: #A9C7A0; }
  .dvp-panel pre .dim { color: ${c.forestMuted}; }
  .dvp-panel pre .fn { color: #EAD9A0; }
  .dvp-resp { background: #16241A; border-top: 0.5px solid ${c.forestHair}; padding: 20px 24px; overflow-x: auto; }
  .dvp-resp pre { font-size: 12px; margin: 0; font-family: ${f.mono}; line-height: 1.7; }
  .dvp-resp .l { color: ${c.forestMuted}; }
  .dvp-resp .s { color: #A9C7A0; }
  .dvp-resp .n { color: #E59A6C; }

  /* quickstart */
  .dvp-quick { background: ${c.chalk}; border-top: 0.5px solid ${c.mist}; border-bottom: 0.5px solid ${c.mist}; padding: 90px 0; }
  .dvp-quick h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(32px, 4vw, 52px); margin: 12px 0 48px; color: ${c.ink}; }
  .dvp-quick h2 em { font-style: italic; color: ${c.terracotta}; }
  .dvp-quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border-top: 2px solid ${c.ink}; }
  .dvp-qstep { padding: 30px 26px 0; border-right: 0.5px solid ${c.mist}; }
  .dvp-qstep:last-child { border-right: 0; }
  .dvp-qstep .n { font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; color: ${c.terracotta}; }
  .dvp-qstep h3 { font-family: ${f.serif}; font-weight: 400; font-size: 24px; margin: 16px 0 10px; color: ${c.ink}; }
  .dvp-qstep p { font-size: 14px; line-height: 1.6; color: ${c.sage}; margin: 0; }
  .dvp-qstep code { font-family: ${f.mono}; font-size: 11px; background: ${c.parchment}; padding: 2px 6px; color: ${c.terracotta}; }

  /* endpoints */
  .dvp-endpoints { padding: 90px 0; }
  .dvp-endpoints h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(30px, 3.6vw, 46px); margin: 12px 0 40px; color: ${c.ink}; }
  .dvp-endpoints h2 em { font-style: italic; color: ${c.terracotta}; }
  .dvp-ep-table { border-top: 2px solid ${c.ink}; }
  .dvp-ep-row { display: grid; grid-template-columns: 110px 1fr 1.4fr; gap: 24px; padding: 20px 0; border-bottom: 0.5px solid ${c.mist}; align-items: baseline; }
  .dvp-ep-row .m { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.06em; }
  .dvp-ep-row .m.get { color: ${c.forestSoft}; }
  .dvp-ep-row .m.post { color: ${c.terracotta}; }
  .dvp-ep-row .path { font-family: ${f.mono}; font-size: 13px; color: ${c.ink}; }
  .dvp-ep-row .desc { font-size: 14px; color: ${c.sage}; }

  /* pricing */
  .dvp-pricing { background: ${c.forest}; color: ${c.chalk}; padding: 96px 0; }
  .dvp-pricing .dvp-eyebrow { color: ${c.forestMuted}; }
  .dvp-pricing h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(32px, 4vw, 52px); margin: 14px 0 48px; }
  .dvp-pricing h2 em { font-style: italic; color: ${c.terracottaWarm}; }
  .dvp-tiers { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .dvp-tier { border: 0.5px solid ${c.forestHair}; padding: 30px 28px; display: flex; flex-direction: column; }
  .dvp-tier.hot { border-color: ${c.terracotta}; }
  .dvp-tier .nm { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${c.forestMuted}; }
  .dvp-tier.hot .nm { color: ${c.terracottaWarm}; }
  .dvp-tier .pr { font-family: ${f.serif}; font-size: 52px; font-weight: 300; line-height: 1; margin: 18px 0 4px; }
  .dvp-tier .pr small { font-size: 15px; color: ${c.forestMuted}; }
  .dvp-tier .note { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.08em; color: ${c.forestMuted}; text-transform: uppercase; }
  .dvp-tier ul { list-style: none; padding: 22px 0 0; margin: 20px 0 0; border-top: 0.5px solid ${c.forestHair}; display: grid; gap: 11px; flex: 1; }
  .dvp-tier li { font-size: 13.5px; color: #C8D6C8; padding-left: 18px; position: relative; line-height: 1.4; }
  .dvp-tier li::before { content: "—"; position: absolute; left: 0; color: ${c.terracottaWarm}; }
  .dvp-tier-btn {
    margin-top: 26px; text-align: center; font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em;
    text-transform: uppercase; padding: 15px 20px; background: ${c.terracotta}; color: ${c.chalk};
    border: 0; cursor: pointer; text-decoration: none; display: block; transition: background 0.2s;
  }
  .dvp-tier-btn:hover { background: ${c.terracottaWarm}; }

  /* cta */
  .dvp-cta { padding: 110px 0; text-align: center; }
  .dvp-cta h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(40px, 5vw, 72px); line-height: 1; color: ${c.ink}; margin: 16px 0 0; }
  .dvp-cta h2 em { font-style: italic; color: ${c.terracotta}; }
  .dvp-cta p { color: ${c.sage}; max-width: 46ch; margin: 22px auto 0; }
  .dvp-cta .row { display: flex; gap: 12px; justify-content: center; margin-top: 34px; flex-wrap: wrap; }

  @media (max-width: 900px) {
    .dvp-container { padding: 0 24px; }
    .dvp-hero-grid { grid-template-columns: 1fr; gap: 44px; }
    .dvp-quick-grid, .dvp-tiers { grid-template-columns: 1fr; }
    .dvp-qstep { border-right: 0; border-bottom: 0.5px solid ${c.mist}; padding-bottom: 26px; }
    .dvp-ep-row { grid-template-columns: 80px 1fr; }
    .dvp-ep-row .desc { grid-column: 1 / -1; }
  }
`

const CODE: Record<Lang, ReactElement> = {
  ts: (
    <pre>
      <span className="dim">{'// npm i @yardfront/sdk'}</span>
      {'\n'}
      <span className="kw">import</span> {'{ YardFront }'} <span className="kw">from</span>{' '}
      <span className="str">"@yardfront/sdk"</span>;{'\n\n'}
      <span className="kw">const</span> yf = <span className="kw">new</span>{' '}
      <span className="fn">YardFront</span>({'{ apiKey: process.env.YF_KEY }'});{'\n\n'}
      <span className="kw">const</span> est = <span className="kw">await</span> yf.
      <span className="fn">appraise</span>({'{'}
      {'\n'}
      {'  '}image_url: <span className="str">"https://cdn.acme.com/lot-7412.jpg"</span>,{'\n'}
      {'  '}context: {'{'} zip: <span className="str">"98103"</span>, condition:{' '}
      <span className="str">"good"</span> {'}'},{'\n'}
      {'}'});{'\n\n'}
      console.<span className="fn">log</span>(est.range, est.confidence);
    </pre>
  ),
  py: (
    <pre>
      <span className="dim"># pip install yardfront</span>
      {'\n'}
      <span className="kw">from</span> yardfront <span className="kw">import</span> YardFront{'\n\n'}
      yf = <span className="fn">YardFront</span>(api_key=os.environ[
      <span className="str">"YF_KEY"</span>]){'\n\n'}
      est = yf.<span className="fn">appraise</span>({'\n'}
      {'    '}image_url=<span className="str">"https://cdn.acme.com/lot-7412.jpg"</span>,{'\n'}
      {'    '}context={'{'}
      <span className="str">"zip"</span>: <span className="str">"98103"</span>,{' '}
      <span className="str">"condition"</span>: <span className="str">"good"</span>
      {'}'},{'\n'}){'\n\n'}
      <span className="fn">print</span>(est.range, est.confidence)
    </pre>
  ),
  go: (
    <pre>
      <span className="dim">{'// go get github.com/yardfront/go'}</span>
      {'\n'}
      client := yardfront.<span className="fn">New</span>(os.<span className="fn">Getenv</span>(
      <span className="str">"YF_KEY"</span>)){'\n\n'}
      est, err := client.<span className="fn">Appraise</span>(ctx, &yardfront.Request{'{'}
      {'\n'}
      {'    '}ImageURL: <span className="str">"https://cdn.acme.com/lot-7412.jpg"</span>,{'\n'}
      {'    '}Context:  yardfront.Ctx{'{'}Zip: <span className="str">"98103"</span>
      {'}'},{'\n'}
      {'}'}){'\n\n'}
      fmt.<span className="fn">Println</span>(est.Range, est.Confidence)
    </pre>
  ),
}

const ENDPOINTS = [
  { m: 'POST', path: '/v1/appraise', desc: 'Identify an item from an image and return a priced, confidence-scored estimate.' },
  { m: 'GET', path: '/v1/appraise/:id', desc: 'Retrieve a prior appraisal, including its full result and metadata.' },
  { m: 'GET', path: '/v1/appraise/:id/comps', desc: 'List the underlying sold-for comparables used for an estimate.' },
  { m: 'POST', path: '/v1/webhooks', desc: 'Subscribe to replays — re-run estimates automatically as new comps arrive.' },
  { m: 'GET', path: '/v1/usage', desc: 'Current period usage, remaining quota, and per-key breakdown.' },
]

export default function DevelopersPage() {
  const [lang, setLang] = useState<Lang>('ts')

  return (
    <div className="dvp-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Navbar />

      {/* Hero */}
      <header className="dvp-hero">
        <div className="dvp-container">
          <div className="dvp-hero-grid">
            <Reveal direction="right" distance={36}>
              <p className="dvp-eyebrow">For developers</p>
              <h1>
                One endpoint.
                <br />
                Every <em>category</em>.
              </h1>
              <p className="dvp-lede">
                POST an image, receive a priced, sourced, confidence-scored estimate in under three
                seconds. Typed SDKs for TypeScript, Python, and Go. Pay per successful lookup —
                nothing else.
              </p>
              <div className="dvp-endpoint">
                <span className="m">POST</span> api.yardfront.com/v1/appraise
              </div>
              <div className="dvp-cta-row">
                <Link to="/signup" className="dvp-btn-primary">
                  Get an API key →
                </Link>
                <button
                  type="button"
                  className="dvp-btn-ghost"
                  onClick={() => scrollToSection('endpoints')}
                >
                  Read the docs
                </button>
              </div>
            </Reveal>

            <Reveal direction="left" distance={36} delay={140}>
              <div className="dvp-panel">
                <div className="dvp-tabs">
                  {(['ts', 'py', 'go'] as Lang[]).map((l) => (
                    <button
                      key={l}
                      type="button"
                      className={`dvp-tab ${lang === l ? 'active' : ''}`}
                      onClick={() => setLang(l)}
                    >
                      {l === 'ts' ? 'TypeScript' : l === 'py' ? 'Python' : 'Go'}
                    </button>
                  ))}
                </div>
                <div className="dvp-panel-body">{CODE[lang]}</div>
                <div className="dvp-resp">
                  <pre>
                    {'{'}
                    {'\n  '}
                    <span className="l">"lot_id":</span>{'      '}
                    <span className="s">"apr_01HX9K2..."</span>,{'\n  '}
                    <span className="l">"identified":</span>{'  '}
                    <span className="s">"Herman Miller 670/671"</span>,{'\n  '}
                    <span className="l">"range":</span>{'       '}[<span className="n">2850</span>,{' '}
                    <span className="n">3420</span>],{'\n  '}
                    <span className="l">"median":</span>{'      '}
                    <span className="n">3120</span>,{'\n  '}
                    <span className="l">"confidence":</span>{'  '}
                    <span className="n">0.87</span>,{'\n  '}
                    <span className="l">"sample_size":</span>{' '}
                    <span className="n">142</span>,{'\n  '}
                    <span className="l">"resolved_in":</span>{' '}
                    <span className="n">2.41</span>
                    {'\n}'}
                  </pre>
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </header>

      {/* Quickstart */}
      <section className="dvp-quick">
        <div className="dvp-container">
          <Reveal>
            <p className="dvp-eyebrow">Quickstart</p>
            <h2>
              From key to first estimate in <em>five minutes</em>.
            </h2>
          </Reveal>
          <div className="dvp-quick-grid">
            <Reveal className="dvp-qstep" delay={0}>
              <div className="n">01</div>
              <h3>Get a key</h3>
              <p>
                Create an account and generate a key from the dashboard. Test keys are free and
                rate-limited.
              </p>
            </Reveal>
            <Reveal className="dvp-qstep" delay={130}>
              <div className="n">02</div>
              <h3>Install the SDK</h3>
              <p>
                Run <code>npm i @yardfront/sdk</code> — or call the REST endpoint directly with any
                HTTP client.
              </p>
            </Reveal>
            <Reveal className="dvp-qstep" delay={260}>
              <div className="n">03</div>
              <h3>POST an image</h3>
              <p>
                Send an <code>image_url</code>. Get back a range, median, confidence, and the comps
                behind it.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Endpoint reference */}
      <section className="dvp-endpoints" id="endpoints">
        <div className="dvp-container">
          <Reveal>
            <p className="dvp-eyebrow">Reference</p>
            <h2>
              A small, <em>honest</em> surface.
            </h2>
          </Reveal>
          <div className="dvp-ep-table">
            {ENDPOINTS.map((ep, i) => (
              <Reveal className="dvp-ep-row" key={ep.path + ep.m} direction="right" distance={22} delay={i * 70}>
                <span className={`m ${ep.m.toLowerCase()}`}>{ep.m}</span>
                <span className="path">{ep.path}</span>
                <span className="desc">{ep.desc}</span>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="dvp-pricing" id="pricing">
        <div className="dvp-container">
          <Reveal>
            <p className="dvp-eyebrow">Pricing</p>
            <h2>
              Pay per <em>successful</em> lookup.
            </h2>
          </Reveal>
          <div className="dvp-tiers">
            <Reveal className="dvp-tier" delay={0}>
              <div className="nm">Starter</div>
              <div className="pr">$0</div>
              <div className="note">100 lookups / month</div>
              <ul>
                <li>Full appraise endpoint</li>
                <li>TypeScript, Python & Go SDKs</li>
                <li>Comps included on every call</li>
                <li>Community support</li>
              </ul>
              <Link to="/signup" className="dvp-tier-btn">
                Start free
              </Link>
            </Reveal>
            <Reveal className="dvp-tier hot" delay={130}>
              <div className="nm">Scale</div>
              <div className="pr">
                $0.04<small> / lookup</small>
              </div>
              <div className="note">Volume tiers from 10k</div>
              <ul>
                <li>Everything in Starter</li>
                <li>Streaming + webhook replays</li>
                <li>99.9% uptime SLA</li>
                <li>Priority support</li>
              </ul>
              <Link to="/signup" className="dvp-tier-btn">
                Get an API key
              </Link>
            </Reveal>
            <Reveal className="dvp-tier" delay={260}>
              <div className="nm">Enterprise</div>
              <div className="pr">Custom</div>
              <div className="note">Annual commit</div>
              <ul>
                <li>Dedicated index slices</li>
                <li>SOC 2 Type II · GDPR</li>
                <li>On-prem & VPC options</li>
                <li>Solutions engineer</li>
              </ul>
              <Link to="/business" className="dvp-tier-btn">
                Contact sales
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="dvp-cta">
        <div className="dvp-container">
          <Reveal>
          <p className="dvp-eyebrow">Ship it</p>
          <h2>
            Price anything your users <em>photograph.</em>
          </h2>
          <p>
            A hundred lookups free, no card. Wire it into intake, listing flows, or your own app.
          </p>
          <div className="row">
            <Link to="/signup" className="dvp-btn-primary">
              Get an API key →
            </Link>
            <Link to="/beta?track=developer" className="dvp-btn-ghost">
              Join the developer beta
            </Link>
          </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  )
}
