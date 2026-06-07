import { useEffect, useRef, useState } from 'react'
import { colors as c, fonts as f } from '../../lib/tokens'

const css = `
  .clo-root {
    background: ${c.chalk};
    padding: 180px 0;
    overflow: hidden;
    text-align: center;
  }
  .clo-inner {
    max-width: 800px;
    margin: 0 auto;
    padding: 0 48px;
    opacity: 0;
    transform: translateY(22px);
    transition: opacity 0.8s ease, transform 0.8s ease;
  }
  .clo-inner.vis { opacity: 1; transform: translateY(0); }
  .clo-eyebrow {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.bark};
    margin: 0 0 28px;
  }
  .clo-headline {
    font-family: ${f.serif};
    font-size: clamp(48px, 7vw, 100px);
    font-weight: 300;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: ${c.ink};
    margin: 28px 0 0;
    max-width: 18ch;
    margin-left: auto;
    margin-right: auto;
  }
  .clo-headline em {
    font-style: italic;
    color: ${c.terracotta};
    display: block;
  }
  .clo-rule {
    width: 36px;
    height: 0.5px;
    background: ${c.mist};
    border: 0;
    margin: 40px auto;
  }
  .clo-sub {
    font-family: ${f.sans};
    font-size: 17px;
    font-weight: 300;
    line-height: 1.55;
    color: ${c.sage};
    margin: 0 auto 40px;
    max-width: 52ch;
  }
  .clo-btns {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 14px;
    flex-wrap: wrap;
  }
  .clo-btn-primary {
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${c.chalk};
    background: ${c.forest};
    padding: 16px 28px;
    border: 0;
    cursor: pointer;
    text-decoration: none;
    transition: background 0.2s;
  }
  .clo-btn-primary:hover { background: ${c.terracotta}; }
  .clo-btn-ghost {
    font-family: ${f.mono};
    font-size: 11px;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: ${c.forest};
    background: transparent;
    border: 0.5px solid ${c.forest};
    padding: 16px 28px;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
  }
  .clo-btn-ghost:hover {
    background: ${c.forest};
    color: ${c.chalk};
  }
  @media (max-width: 600px) {
    .clo-inner { padding: 0 24px; }
    .clo-btns { flex-direction: column; }
  }
`

export function Closing() {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setVis(true) },
      { threshold: 0.2 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <section className="clo-root">
        <div ref={ref} className={`clo-inner ${vis ? 'vis' : ''}`}>
          <p className="clo-eyebrow">Take a photograph</p>
          <h2 className="clo-headline">
            Know what it&apos;s <em>actually worth.</em>
          </h2>
          <hr className="clo-rule" />
          <p className="clo-sub">
            Free for the first hundred lookups. No card until you start loving it.
          </p>
          <div className="clo-btns">
            <a href="/app" className="clo-btn-primary">Try it free</a>
            <a href="/business" className="clo-btn-ghost">Talk to sales</a>
          </div>
        </div>
      </section>
    </>
  )
}

export default Closing
