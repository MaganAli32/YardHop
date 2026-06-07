import { useEffect, useRef, useState } from 'react'
import { colors as c, fonts as f } from '../../lib/tokens'

/** Matches YardFront.html `.pq` + shared `.eyebrow`, `.headline`-adjacent quote, `.body-lede`, `.pq-stats` */
const css = `
  .pq-root {
    background: ${c.forest};
    color: ${c.chalk};
    padding: 140px 0;
    overflow: hidden;
  }
  .pq-container {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .pq-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    font-weight: 400;
    color: ${c.forestMuted};
    margin: 0;
  }
  .pq-quote {
    font-family: ${f.serif};
    font-weight: 300;
    font-size: clamp(32px, 4.2vw, 58px);
    line-height: 1.12;
    letter-spacing: -0.01em;
    max-width: 22ch;
    margin: 28px 0 48px;
    color: ${c.chalk};
    text-wrap: balance;
  }
  .pq-quote em {
    font-style: italic;
    color: ${c.terracottaWarm};
    font-weight: 400;
  }
  .pq-rule {
    width: 36px;
    height: 0.5px;
    background: ${c.forestSoft};
    border: 0;
    margin: 0 0 48px;
  }
  .pq-lede {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 17px;
    line-height: 1.55;
    color: ${c.forestMuted};
    max-width: 56ch;
    margin: 0;
    text-wrap: pretty;
  }
  .pq-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 48px;
    margin-top: 72px;
    border-top: 0.5px solid ${c.forestHair};
    padding-top: 40px;
  }
  .pq-stat .n {
    font-family: ${f.serif};
    font-size: 56px;
    font-weight: 300;
    line-height: 1;
    color: ${c.chalk};
  }
  .pq-stat .n em {
    color: ${c.terracottaWarm};
    font-style: italic;
  }
  .pq-stat .l {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.forestMuted};
    margin-top: 12px;
  }
  .pq-stat .d {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 14px;
    color: ${c.forestMuted};
    margin-top: 10px;
    max-width: 28ch;
    line-height: 1.5;
  }
  .pq-reveal {
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .pq-reveal.in {
    opacity: 1;
    transform: none;
  }
  @media (max-width: 900px) {
    .pq-container { padding: 0 24px; }
    .pq-stats { grid-template-columns: 1fr; gap: 40px; }
  }
`

export function PullQuote() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setRevealed(true)
          obs.disconnect()
        }
      },
      { threshold: 0.12 }
    )
    if (rootRef.current) obs.observe(rootRef.current)
    return () => obs.disconnect()
  }, [])

  const inCls = revealed ? 'in' : ''

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="pq-root" id="how" ref={rootRef}>
        <div className="pq-container">
          <p className={`pq-eyebrow pq-reveal ${inCls}`}>The thesis</p>
          <h2 className={`pq-quote pq-reveal ${inCls}`} style={{ transitionDelay: revealed ? '0.06s' : undefined }}>
            Kelley Blue Book, but&nbsp;for <em>everything else</em>.
          </h2>
          <hr className={`pq-rule pq-reveal ${inCls}`} style={{ transitionDelay: revealed ? '0.1s' : undefined }} />
          <p
            className={`pq-lede pq-reveal ${inCls}`}
            style={{ transitionDelay: revealed ? '0.14s' : undefined }}
          >
            Every year, Americans resell about $50B of used goods — mostly by guessing. YardFront turns a single photograph into a defensible number, backed by sales data from the places people actually buy things.
          </p>

          <div className={`pq-stats pq-reveal ${inCls}`} style={{ transitionDelay: revealed ? '0.2s' : undefined }}>
            <div className="pq-stat">
              <div className="n">
                <em>7</em>
              </div>
              <div className="l">Marketplaces, in parallel</div>
              <p className="d">eBay, Mercari, Chairish, StockX, Grailed, GOAT, OfferUp — queried on every lookup.</p>
            </div>
            <div className="pq-stat">
              <div className="n">
                <em>
                  2.4<span style={{ fontSize: 28 }}>s</span>
                </em>
              </div>
              <div className="l">Median response</div>
              <p className="d">From upload to confidence-scored range. Fast enough for a checkout line.</p>
            </div>
            <div className="pq-stat">
              <div className="n">
                <em>142</em>
              </div>
              <div className="l">Comps per estimate, avg.</div>
              <p className="d">Real sold-for prices. Not asking prices — wishful thinking doesn&apos;t count.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default PullQuote
