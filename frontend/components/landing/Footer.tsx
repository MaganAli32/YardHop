import { Link, useNavigate } from 'react-router-dom'
import { colors as c, fonts as f } from '../../lib/tokens'
import { scrollToSection } from '../../lib/scrollToSection'

const css = `
  .ft-root {
    background: ${c.forest};
    color: ${c.forestMuted};
    padding: 80px 0 40px;
  }
  .ft-inner {
    max-width: 1240px;
    margin: 0 auto;
    padding: 0 48px;
  }
  .ft-grid {
    display: grid;
    grid-template-columns: 1.3fr 1fr 1fr 1fr;
    gap: 64px;
    padding-bottom: 56px;
    border-bottom: 0.5px solid ${c.forestHair};
  }
  .ft-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    font-family: ${f.serif};
    font-size: 26px;
    color: ${c.chalk};
    font-weight: 300;
    text-decoration: none;
  }
  .ft-brand .dot {
    width: 9px;
    height: 9px;
    background: ${c.terracotta};
    border-radius: 50%;
    flex-shrink: 0;
  }
  .ft-tag {
    margin-top: 14px;
    font-size: 13px;
    max-width: 32ch;
    line-height: 1.55;
    color: ${c.forestMuted};
  }
  .ft-est {
    margin-top: 24px;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.forestSoft};
  }
  .ft-col h5 {
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: ${c.forestMuted};
    margin: 0 0 18px;
    font-weight: 400;
  }
  .ft-col a,
  .ft-col button {
    display: block;
    padding: 6px 0;
    font-size: 14px;
    font-family: ${f.sans};
    color: ${c.chalk};
    opacity: 0.78;
    text-decoration: none;
    transition: color 0.18s ease, opacity 0.18s ease, transform 0.18s cubic-bezier(0.23, 1, 0.32, 1);
    background: none;
    border: 0;
    cursor: pointer;
    text-align: left;
  }
  .ft-col a:hover,
  .ft-col button:hover {
    color: ${c.terracottaWarm};
    opacity: 1;
  }
  @media (hover: hover) and (pointer: fine) {
    .ft-col a:hover,
    .ft-col button:hover { transform: translateX(3px); }
  }
  @media (prefers-reduced-motion: reduce) {
    .ft-col a:hover,
    .ft-col button:hover { transform: none; }
  }
  .ft-legal a {
    color: ${c.forestMuted};
    text-decoration: none;
    transition: color 0.2s;
  }
  .ft-legal a:hover { color: ${c.terracottaWarm}; }
  .ft-legal {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 16px;
    padding-top: 28px;
    font-family: ${f.mono};
    font-size: 10px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: ${c.forestMuted};
  }
  @media (max-width: 900px) {
    .ft-grid { grid-template-columns: 1fr 1fr; }
    .ft-inner { padding: 0 24px; }
  }
  @media (max-width: 520px) {
    .ft-grid { grid-template-columns: 1fr; }
  }
`

export function Footer() {
  const navigate = useNavigate()

  /** Navigate to a route, then smooth-scroll to an in-page section once it mounts. */
  const goTo = (path: string, sectionId?: string) => {
    navigate(path)
    if (sectionId) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollToSection(sectionId))
      })
    }
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <footer className="ft-root">
        <div className="ft-inner">
          <div className="ft-grid">
            <div>
              <Link to="/" className="ft-brand">
                <span className="dot" />
                YardFront
              </Link>
              <div className="ft-tag">
                Price intelligence for the $50B secondhand market. One photograph in. A defensible number out.
              </div>
              <div className="ft-est">Est. 2025 · Seattle</div>
            </div>
            <div className="ft-col">
              <h5>Product</h5>
              <button type="button" onClick={() => goTo('/', 'try')}>Appraise</button>
              <Link to="/extension">Chrome extension</Link>
              <Link to="/marketplace">Marketplace</Link>
              <button type="button" onClick={() => goTo('/developers', 'pricing')}>Pricing</button>
              <Link to="/beta">Join the beta</Link>
            </div>
            <div className="ft-col">
              <h5>Developers</h5>
              <button type="button" onClick={() => goTo('/developers', 'endpoints')}>API docs</button>
              <Link to="/developers">SDKs</Link>
              <Link to="/dashboard">Status</Link>
              <Link to="/developers">Changelog</Link>
            </div>
            <div className="ft-col">
              <h5>Company</h5>
              <Link to="/about">About</Link>
              <Link to="/about">Manifesto</Link>
              <Link to="/business">Careers</Link>
              <Link to="/business">Contact</Link>
            </div>
          </div>
          <div className="ft-legal">
            <span>© 2026 YardFront, Inc.</span>
            <span>
              <Link to="/privacy-policy">Privacy</Link> · <Link to="/terms-of-service">Terms</Link> · Responsible sourcing
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer
