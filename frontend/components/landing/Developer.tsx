import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { colors as c, fonts as f } from '../../lib/tokens'

const css = `
  .dev-root {
    background: ${c.parchment};
    padding: 140px 0;
    overflow: hidden;
  }
  .dev-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .dev-grid {
    display: grid;
    grid-template-columns: 1fr 1.1fr;
    gap: 64px;
    align-items: start;
  }
  .dev-reveal {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.8s cubic-bezier(0.23, 1, 0.32, 1), transform 0.8s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .dev-reveal.vis { opacity: 1; transform: none; }
  .dev-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 400;
    color: ${c.bark};
    margin: 0;
  }
  .dev-headline {
    font-family: ${f.serif};
    font-weight: 300;
    line-height: 1.08;
    letter-spacing: -0.01em;
    color: ${c.ink};
    margin: 20px 0 0;
    font-size: clamp(38px, 4.4vw, 58px);
    text-wrap: balance;
  }
  .dev-headline em { font-style: italic; color: ${c.terracotta}; font-weight: 400; }
  .dev-rule {
    width: 36px;
    height: 0.5px;
    background: ${c.mist};
    border: 0;
    margin: 20px 0;
  }
  .dev-lede {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 17px;
    line-height: 1.55;
    color: ${c.sage};
    max-width: 52ch;
    margin: 0 0 0 0;
    text-wrap: pretty;
  }
  .dev-feats {
    margin: 32px 0 0;
    padding: 0;
    list-style: none;
  }
  .dev-feats li {
    padding: 12px 0;
    border-bottom: 0.5px solid ${c.mist};
    display: flex;
    gap: 12px;
    font-size: 15px;
    color: ${c.ink};
    opacity: 0;
    transform: translateY(12px);
    transition: opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1), transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .dev-reveal.vis .dev-feats li { opacity: 1; transform: none; }
  .dev-reveal.vis .dev-feats li:nth-child(1) { transition-delay: 0.15s; }
  .dev-reveal.vis .dev-feats li:nth-child(2) { transition-delay: 0.21s; }
  .dev-reveal.vis .dev-feats li:nth-child(3) { transition-delay: 0.27s; }
  .dev-reveal.vis .dev-feats li:nth-child(4) { transition-delay: 0.33s; }
  .dev-feats li::before {
    content: "";
    width: 4px;
    height: 4px;
    background: ${c.terracotta};
    border-radius: 50%;
    margin-top: 9px;
    flex-shrink: 0;
  }
  .dev-actions {
    display: flex;
    gap: 12px;
    margin-top: 32px;
    flex-wrap: wrap;
  }
  .dev-btn-primary {
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 16px 28px;
    background: ${c.forest};
    color: ${c.chalk};
    border: 0;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: background 0.18s ease, transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .dev-btn-primary:hover { background: ${c.terracotta}; }
  .dev-btn-primary:active { transform: scale(0.97); }
  .dev-btn-ghost {
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    padding: 16px 28px;
    background: transparent;
    color: ${c.forest};
    border: 0.5px solid ${c.forest};
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: background 0.18s ease, color 0.18s ease, transform 0.16s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .dev-btn-ghost:hover {
    background: ${c.forest};
    color: ${c.chalk};
  }
  .dev-btn-ghost:active { transform: scale(0.97); }
  .codeblock {
    background: ${c.forest};
    color: #c8d4c9;
    font-family: ${f.mono};
    font-size: 12px;
    line-height: 1.7;
    padding: 24px 28px;
    border-radius: 2px;
    position: relative;
    overflow: hidden;
  }
  .codeblock .cb-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10px;
    letter-spacing: 0.18em;
    color: ${c.forestMuted};
    text-transform: uppercase;
    margin-bottom: 18px;
    border-bottom: 0.5px solid ${c.forestHair};
    padding-bottom: 12px;
  }
  .codeblock .cb-head .copy {
    background: transparent;
    border: 0.5px solid ${c.forestHair};
    color: ${c.forestMuted};
    padding: 4px 10px;
    font-family: ${f.mono};
    font-size: 9px;
    letter-spacing: 0.18em;
    cursor: pointer;
    text-transform: uppercase;
    transition: color 0.15s ease, border-color 0.15s ease, transform 0.15s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .codeblock .cb-head .copy:hover { color: ${c.terracottaWarm}; border-color: ${c.terracottaWarm}; }
  .codeblock .cb-head .copy:active { transform: scale(0.94); }
  .codeblock .cb-head .copy.copied { color: ${c.terracottaWarm}; border-color: ${c.terracottaWarm}; }
  .codeblock .kw { color: #d28f6e; }
  .codeblock .str { color: #b6c9b7; }
  .codeblock .num { color: #e0b26e; }
  .codeblock .dim { color: ${c.forestSoft}; }
  .codeblock pre { margin: 0; white-space: pre; overflow-x: auto; }
  .codeblock pre {
    opacity: 0;
    transform: translateY(10px);
    transition: opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1) 0.25s, transform 0.7s cubic-bezier(0.23, 1, 0.32, 1) 0.25s;
  }
  .dev-reveal.vis .codeblock pre { opacity: 1; transform: none; }
  .dev-response {
    margin-top: 24px;
    background: #112014;
    color: #b4c5b6;
    padding: 20px 24px;
    font-family: ${f.mono};
    font-size: 11px;
    line-height: 1.7;
    border-top: 2px solid ${c.terracotta};
    overflow-x: auto;
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1) 0.55s, transform 0.7s cubic-bezier(0.23, 1, 0.32, 1) 0.55s;
  }
  .dev-reveal.vis .dev-response { opacity: 1; transform: none; }
  .dev-response .l { color: ${c.forestMuted}; }
  .dev-response .s { color: ${c.terracottaWarm}; }
  .dev-response .n { color: #e0b26e; }
  @media (prefers-reduced-motion: reduce) {
    .dev-reveal, .dev-feats li, .codeblock pre, .dev-response {
      transform: none;
      transition: opacity 0.3s ease;
    }
  }
  @media (max-width: 1000px) {
    .dev-container { padding: 0 24px; }
    .dev-grid { grid-template-columns: 1fr; }
  }
`

const CODE_SNIPPET = `// TypeScript · @yardfront/sdk
import { YardFront } from "@yardfront/sdk";

const yf = new YardFront({ apiKey: process.env.YF_KEY });

const estimate = await yf.appraise({
  image_url: "https://cdn.acme.com/lot-7412.jpg",
  context: { zip: "98103", condition: "good" },
  marketplaces: ["ebay", "chairish", "1stdibs"],
});

console.log(estimate.range, estimate.confidence);`

export function Developer() {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setVis(true)
      },
      { threshold: 0.08 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(CODE_SNIPPET)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="dev-root" id="pricing" ref={ref}>
        <div className="dev-container">
          <div className="dev-grid">
            <div className={`dev-reveal ${vis ? 'vis' : ''}`}>
              <p className="dev-eyebrow">For developers</p>
              <h2 className="dev-headline">
                One endpoint.
                <br />
                Every&nbsp;<em>category</em>.
              </h2>
              <hr className="dev-rule" />
              <p className="dev-lede">
                POST an image URL, receive a priced, sourced, confidence-scored estimate in under three seconds. Typed SDKs for TypeScript, Python, and Go. Pay per successful lookup.
              </p>
              <ul className="dev-feats">
                <li>REST & streaming endpoints — poll, or subscribe to incremental results as marketplaces return.</li>
                <li>Provenance included — every estimate ships with the underlying sold-for sample it came from.</li>
                <li>Webhook replays — re-run estimates when new comps arrive, no extra charge.</li>
                <li>SOC 2 Type II, GDPR, and rate-limited by keys; enterprise SLAs available.</li>
              </ul>
              <div className="dev-actions">
                <Link to="/developers" className="dev-btn-primary">
                  Read the docs
                </Link>
                <Link to="/developers" className="dev-btn-ghost">
                  Get an API key
                </Link>
              </div>
            </div>

            <div className={`dev-reveal ${vis ? 'vis' : ''}`} style={{ transitionDelay: vis ? '0.1s' : undefined }}>
              <div className="codeblock">
                <div className="cb-head">
                  <span>POST · /v1/appraise</span>
                  <button type="button" className={`copy ${copied ? 'copied' : ''}`} onClick={copyCode}>
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre>
                  <span className="dim">// TypeScript · @yardfront/sdk</span>
                  {'\n'}
                  <span className="kw">import</span> {'{'} YardFront {'}'} <span className="kw">from</span>{' '}
                  <span className="str">&quot;@yardfront/sdk&quot;</span>;{'\n'}
                  {'\n'}
                  <span className="kw">const</span> yf = <span className="kw">new</span> YardFront({'{'} apiKey: process.env.YF_KEY {'}'});{'\n'}
                  {'\n'}
                  <span className="kw">const</span> estimate = <span className="kw">await</span> yf.appraise({'{'}
                  {'\n'}
                  {'  '}image_url: <span className="str">&quot;https://cdn.acme.com/lot-7412.jpg&quot;</span>,{'\n'}
                  {'  '}context: {'{'} zip: <span className="str">&quot;98103&quot;</span>, condition: <span className="str">&quot;good&quot;</span> {'}'},{'\n'}
                  {'  '}marketplaces: [<span className="str">&quot;ebay&quot;</span>, <span className="str">&quot;chairish&quot;</span>,{' '}
                  <span className="str">&quot;1stdibs&quot;</span>],{'\n'}
                  {'}'});{'\n'}
                  {'\n'}
                  console.log(estimate.range, estimate.confidence);
                </pre>
              </div>
              <div className="dev-response">
                <pre style={{ margin: 0 }}>
                  {'{'}
                  {'\n'}
                  {'  '}
                  <span className="l">&quot;lot_id&quot;:</span> <span className="s">&quot;apr_01HX9K2...&quot;</span>,{'\n'}
                  {'  '}
                  <span className="l">&quot;identified&quot;:</span> <span className="s">&quot;Herman Miller 670/671&quot;</span>,{'\n'}
                  {'  '}
                  <span className="l">&quot;range&quot;:</span> [<span className="n">2850</span>, <span className="n">3420</span>],{'\n'}
                  {'  '}
                  <span className="l">&quot;median&quot;:</span> <span className="n">3120</span>,{'\n'}
                  {'  '}
                  <span className="l">&quot;currency&quot;:</span> <span className="s">&quot;USD&quot;</span>,{'\n'}
                  {'  '}
                  <span className="l">&quot;confidence&quot;:</span> <span className="n">0.87</span>,{'\n'}
                  {'  '}
                  <span className="l">&quot;sample_size&quot;:</span> <span className="n">142</span>,{'\n'}
                  {'  '}
                  <span className="l">&quot;resolved_in&quot;:</span> <span className="n">2.41</span>,{'\n'}
                  {'  '}
                  <span className="l">&quot;comps_url&quot;:</span> <span className="s">&quot;/v1/appraise/apr_01HX9K2/comps&quot;</span>
                  {'\n'}
                  {'}'}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Developer
