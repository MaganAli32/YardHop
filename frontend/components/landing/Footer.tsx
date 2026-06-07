import { colors as c, fonts as f } from '../../lib/tokens'

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
  .ft-col a {
    display: block;
    padding: 6px 0;
    font-size: 14px;
    color: ${c.chalk};
    opacity: 0.78;
    text-decoration: none;
    transition: all 0.2s;
  }
  .ft-col a:hover {
    color: ${c.terracottaWarm};
    opacity: 1;
  }
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
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <footer className="ft-root">
        <div className="ft-inner">
          <div className="ft-grid">
            <div>
              <a href="/" className="ft-brand">
                <span className="dot" />
                YardFront
              </a>
              <div className="ft-tag">
                Price intelligence for the $50B secondhand market. One photograph in. A defensible number out.
              </div>
              <div className="ft-est">Est. 2025 · Seattle</div>
            </div>
            <div className="ft-col">
              <h5>Product</h5>
              <a href="/app">Appraise</a>
              <a href="/extension">Chrome extension</a>
              <a href="/marketplace">Marketplace</a>
              <a href="/#pricing">Pricing</a>
            </div>
            <div className="ft-col">
              <h5>Developers</h5>
              <a href="/business">API docs</a>
              <a href="/business">SDKs</a>
              <a href="/dashboard">Status</a>
              <a href="/business">Changelog</a>
            </div>
            <div className="ft-col">
              <h5>Company</h5>
              <a href="/about">About</a>
              <a href="/about">Manifesto</a>
              <a href="/business">Careers</a>
              <a href="/business#contact">Contact</a>
            </div>
          </div>
          <div className="ft-legal">
            <span>© 2026 YardFront, Inc.</span>
            <span>Privacy · Terms · Responsible sourcing</span>
          </div>
        </div>
      </footer>
    </>
  )
}

export default Footer
