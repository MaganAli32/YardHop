import { useEffect, useRef, useState, type RefObject } from 'react'
import { colors as c, fonts as f } from '../../lib/tokens'

const css = `
  .wif-root {
    background: ${c.terracotta};
    color: ${c.terracottaCream};
    padding: 160px 0;
    overflow: hidden;
  }
  .wif-inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .wif-header {
    margin-bottom: 0;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .wif-header.vis { opacity: 1; transform: translateY(0); }
  .wif-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.terracottaSoft};
    margin: 0 0 20px;
  }
  .wif-headline {
    font-family: ${f.serif};
    font-size: clamp(42px, 5vw, 68px);
    font-weight: 300;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: ${c.terracottaCream};
    margin: 20px 0 72px;
    max-width: 20ch;
  }
  .wif-headline em {
    font-style: italic;
    color: ${c.forest};
  }
  .wif-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 80px;
    border-top: 0.5px solid rgba(255,248,243,0.25);
    padding-top: 56px;
  }
  .wif-col {
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s ease, transform 0.7s ease;
  }
  .wif-col:first-child { transition-delay: 0.05s; }
  .wif-col:last-child { transition-delay: 0.12s; }
  .wif-col.vis { opacity: 1; transform: translateY(0); }
  .wif-col h3 {
    font-family: ${f.serif};
    font-weight: 300;
    font-size: 36px;
    color: ${c.terracottaCream};
    margin: 0 0 8px;
    line-height: 1.15;
  }
  .wif-col .sub {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.terracottaSoft};
    margin: 0;
  }
  .wif-col .desc {
    margin: 20px 0 32px;
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 16px;
    line-height: 1.55;
    color: ${c.terracottaSoft};
    max-width: 38ch;
  }
  .wif-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .wif-item {
    display: flex;
    gap: 14px;
    padding: 14px 0;
    border-bottom: 0.5px solid rgba(255,248,243,0.2);
    font-size: 15px;
    color: ${c.terracottaCream};
  }
  .wif-item::before {
    content: "";
    width: 4px;
    height: 4px;
    background: ${c.forest};
    border-radius: 50%;
    margin-top: 9px;
    flex-shrink: 0;
  }
  .wif-item em {
    color: ${c.forest};
    font-style: italic;
    font-family: ${f.serif};
    font-weight: 400;
    font-size: 17px;
  }
  @media (max-width: 900px) {
    .wif-inner { padding: 0 24px; }
    .wif-cols { grid-template-columns: 1fr; gap: 48px; }
  }
`

export function WhoItsFor() {
  const headerRef = useRef<HTMLDivElement>(null)
  const colsRef = useRef<HTMLDivElement>(null)
  const [hVis, setHVis] = useState(false)
  const [cVis, setCVis] = useState(false)

  useEffect(() => {
    const obs = (ref: RefObject<HTMLDivElement | null>, cb: () => void) => {
      const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) cb() }, { threshold: 0.1 })
      if (ref.current) o.observe(ref.current)
      return o
    }
    const o1 = obs(headerRef, () => setHVis(true))
    const o2 = obs(colsRef, () => setCVis(true))
    return () => {
      o1.disconnect()
      o2.disconnect()
    }
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="wif-root" id="who">
        <div className="wif-inner">
          <div ref={headerRef} className={`wif-header ${hVis ? 'vis' : ''}`}>
            <p className="wif-eyebrow">Audience</p>
            <h2 className="wif-headline">
              For people who
              <br />
              don&apos;t want to <em>guess</em>.
            </h2>
          </div>

          <div ref={colsRef} className="wif-cols">
            <div className={`wif-col ${cVis ? 'vis' : ''}`}>
              <p className="sub">For consumers</p>
              <h3>Before you list, buy, or give away.</h3>
              <p className="desc">
                A photo is cheaper than regret. Check what your thing is worth before the garage sale, before the lowball offer, before you hand it to the thrift store.
              </p>
              <ul className="wif-list">
                <li className="wif-item">
                  <div>
                    <em>Estate cleanouts.</em> — Price a house full of belongings in an afternoon.
                  </div>
                </li>
                <li className="wif-item">
                  <div>
                    <em>Moving sales.</em> — Know which piece of furniture is the $40 one and which is the $1,400 one.
                  </div>
                </li>
                <li className="wif-item">
                  <div>
                    <em>Thrift & resell.</em> — Scan shelves in-store; surface the arbitrage.
                  </div>
                </li>
                <li className="wif-item">
                  <div>
                    <em>Inherited collections.</em> — Cameras, records, coins, watches — without becoming an expert.
                  </div>
                </li>
              </ul>
            </div>

            <div className={`wif-col ${cVis ? 'vis' : ''}`}>
              <p className="sub">For businesses</p>
              <h3>A single API. Every category.</h3>
              <p className="desc">
                One REST endpoint returns a priced, confidence-scored estimate for any item your customers or operators photograph. Fair pricing, at scale, without a category specialist on payroll.
              </p>
              <ul className="wif-list">
                <li className="wif-item">
                  <div>
                    <em>Estate sale companies.</em> — Price entire inventories overnight, consistently.
                  </div>
                </li>
                <li className="wif-item">
                  <div>
                    <em>Thrift chains.</em> — Replace guesswork at the intake counter with a number.
                  </div>
                </li>
                <li className="wif-item">
                  <div>
                    <em>Insurance appraisers.</em> — Back every claim with comparable sales, not a spreadsheet.
                  </div>
                </li>
                <li className="wif-item">
                  <div>
                    <em>Resale platforms.</em> — Suggest fair list prices the moment a seller uploads.
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default WhoItsFor
