import { useEffect, useRef, useState, type RefObject } from 'react'
import { colors as c, fonts as f } from '../../lib/tokens'

const css = `
  .wif-root {
    background: ${c.forest};
    color: ${c.terracottaCream};
    padding: 168px 0;
    position: relative;
    overflow: hidden;
  }
  .wif-root::before {
    content: "";
    position: absolute; inset: 0;
    background:
      radial-gradient(115% 70% at 88% -8%, rgba(198,90,47,0.16), transparent 58%),
      radial-gradient(90% 60% at 6% 108%, rgba(122,154,124,0.10), transparent 60%);
    pointer-events: none;
  }
  .wif-inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
    position: relative;
  }

  .wif-head {
    max-width: 760px;
    margin: 0 auto 92px;
    text-align: center;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1), transform 0.7s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .wif-head.vis { opacity: 1; transform: translateY(0); }
  .wif-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.forestMuted};
    margin: 0 0 22px;
  }
  .wif-headline {
    font-family: ${f.serif};
    font-weight: 300;
    font-size: clamp(40px, 5vw, 70px);
    color: ${c.terracottaCream};
    line-height: 1.06;
    letter-spacing: -0.01em;
    margin: 0;
    text-wrap: balance;
  }
  .wif-headline em { color: ${c.terracottaWarm}; font-style: italic; font-weight: 400; }
  .wif-lede {
    margin: 26px auto 0;
    max-width: 48ch;
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 17px;
    line-height: 1.6;
    color: ${c.forestMuted};
    text-wrap: pretty;
  }

  .wif-cols {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    border: 0.5px solid ${c.forestHair};
    border-radius: 7px;
    overflow: hidden;
    background: rgba(255,253,247,0.014);
  }
  .wif-col {
    padding: 60px 56px;
    display: flex;
    flex-direction: column;
    position: relative;
    opacity: 0;
    transform: translateY(20px);
    transition: opacity 0.7s cubic-bezier(0.23, 1, 0.32, 1), transform 0.7s cubic-bezier(0.23, 1, 0.32, 1), background 0.25s ease;
  }
  .wif-col:first-child { transition-delay: 0.05s; }
  .wif-col:last-child { transition-delay: 0.12s; }
  .wif-col.vis { opacity: 1; transform: translateY(0); }
  @media (hover: hover) and (pointer: fine) {
    .wif-col.vis:hover { background: rgba(255,253,247,0.02); }
    .wif-col.vis:hover .ix::after { transform: scaleX(1.5); }
  }
  .wif-col + .wif-col { border-left: 0.5px solid ${c.forestHair}; }

  .wif-col .ix {
    font-family: ${f.serif};
    font-style: italic;
    font-weight: 400;
    font-size: 26px;
    color: ${c.terracottaWarm};
    line-height: 1;
    margin-bottom: 30px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
  }
  .wif-col .ix::after {
    content: "";
    width: 40px;
    height: 0.5px;
    background: ${c.forestHair};
    display: inline-block;
    transform-origin: left center;
    transition: transform 0.3s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .wif-col .sub {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: ${c.forestMuted};
    margin: 0 0 14px;
  }
  .wif-col h3 {
    font-family: ${f.serif};
    font-weight: 300;
    font-size: 32px;
    color: ${c.terracottaCream};
    margin: 0 0 18px;
    line-height: 1.14;
    letter-spacing: -0.01em;
    max-width: 17ch;
  }
  .wif-col .desc {
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 15.5px;
    line-height: 1.62;
    color: ${c.forestMuted};
    max-width: 42ch;
    margin: 0 0 44px;
  }
  .wif-list { margin: auto 0 0; padding: 0; list-style: none; }
  .wif-item {
    padding: 22px 0;
    border-top: 0.5px solid ${c.forestHair};
    display: block;
    opacity: 0;
    transform: translateY(14px);
    transition: opacity 0.6s cubic-bezier(0.23, 1, 0.32, 1), transform 0.6s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .wif-col.vis .wif-item { opacity: 1; transform: none; }
  .wif-col.vis .wif-item:nth-child(1) { transition-delay: 0.28s; }
  .wif-col.vis .wif-item:nth-child(2) { transition-delay: 0.34s; }
  .wif-col.vis .wif-item:nth-child(3) { transition-delay: 0.4s; }
  .wif-col:last-child.vis .wif-item:nth-child(1) { transition-delay: 0.35s; }
  .wif-col:last-child.vis .wif-item:nth-child(2) { transition-delay: 0.41s; }
  .wif-col:last-child.vis .wif-item:nth-child(3) { transition-delay: 0.47s; }
  .wif-item:last-child { border-bottom: 0.5px solid ${c.forestHair}; }
  .wif-term {
    display: block;
    font-family: ${f.serif};
    font-style: italic;
    font-weight: 400;
    font-size: 21px;
    color: ${c.terracottaCream};
    margin-bottom: 6px;
    transition: transform 0.25s cubic-bezier(0.23, 1, 0.32, 1);
  }
  .wif-note {
    display: block;
    font-family: ${f.sans};
    font-weight: 300;
    font-size: 14px;
    line-height: 1.5;
    color: ${c.forestMuted};
  }
  @media (hover: hover) and (pointer: fine) {
    .wif-item:hover .wif-term { transform: translateX(10px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .wif-head, .wif-col, .wif-item {
      transform: none;
      transition: opacity 0.3s ease;
    }
    .wif-item:hover .wif-term { transform: none; }
    .wif-col.vis:hover .ix::after { transform: none; }
  }

  @media (max-width: 860px) {
    .wif-root { padding: 120px 0; }
    .wif-inner { padding: 0 24px; }
    .wif-cols { grid-template-columns: 1fr; }
    .wif-col { padding: 48px 36px; }
    .wif-col + .wif-col { border-left: 0; border-top: 0.5px solid ${c.forestHair}; }
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
          <div ref={headerRef} className={`wif-head ${hVis ? 'vis' : ''}`}>
            <p className="wif-eyebrow">Audience</p>
            <h2 className="wif-headline">
              For people who
              <br />
              don&apos;t want to <em>guess</em>.
            </h2>
            <p className="wif-lede">
              Whether it&apos;s a single inherited box or a warehouse intake line, YardFront turns one
              photograph into a defensible number.
            </p>
          </div>

          <div ref={colsRef} className="wif-cols">
            <div className={`wif-col ${cVis ? 'vis' : ''}`}>
              <span className="ix">01</span>
              <p className="sub">For individuals</p>
              <h3>Before you list, sell, or give it away.</h3>
              <p className="desc">
                A photo is cheaper than regret. Know what something is worth before the garage sale,
                the lowball offer, or the donation bin.
              </p>
              <ul className="wif-list">
                <li className="wif-item">
                  <span className="wif-term">Estate cleanouts</span>
                  <span className="wif-note">Price a house full of belongings in a single afternoon.</span>
                </li>
                <li className="wif-item">
                  <span className="wif-term">Moving sales</span>
                  <span className="wif-note">Tell the $40 dresser from the $1,400 one at a glance.</span>
                </li>
                <li className="wif-item">
                  <span className="wif-term">Thrift &amp; resale</span>
                  <span className="wif-note">Scan shelves in-store and surface the arbitrage on the spot.</span>
                </li>
              </ul>
            </div>

            <div className={`wif-col ${cVis ? 'vis' : ''}`}>
              <span className="ix">02</span>
              <p className="sub">For businesses</p>
              <h3>One API. Every category.</h3>
              <p className="desc">
                A single endpoint returns a priced, confidence-scored estimate for anything your
                customers or operators photograph — no category specialist on payroll.
              </p>
              <ul className="wif-list">
                <li className="wif-item">
                  <span className="wif-term">Estate-sale companies</span>
                  <span className="wif-note">Price entire inventories overnight, consistently.</span>
                </li>
                <li className="wif-item">
                  <span className="wif-term">Thrift chains</span>
                  <span className="wif-note">Replace intake-counter guesswork with a real number.</span>
                </li>
                <li className="wif-item">
                  <span className="wif-term">Resale platforms</span>
                  <span className="wif-note">Suggest fair list prices the moment a seller uploads.</span>
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
