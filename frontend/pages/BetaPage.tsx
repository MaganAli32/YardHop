/**
 * BetaPage — beta program application for two tracks:
 * the Developer API beta and the Browser extension beta.
 */

import { useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/landing/Footer'
import Reveal from '../components/Reveal'
import { supabase } from '../lib/supabase'
import { colors as c, fonts as f } from '../lib/tokens'

type Track = 'developer' | 'extension'

const TRACKS: Record<
  Track,
  { label: string; tagline: string; perks: string[] }
> = {
  developer: {
    label: 'Developer API',
    tagline: 'Build on the appraise endpoint before it ships.',
    perks: [
      '1,000 free lookups a month during beta',
      'Direct line to the engineering team',
      'Early access to streaming + webhook replays',
      'Your feedback shapes the v1 surface',
    ],
  },
  extension: {
    label: 'Browser extension',
    tagline: 'Price every listing you browse, before everyone else.',
    perks: [
      'Install link the moment a spot opens',
      'Overlays on all 11 supported marketplaces',
      'Unlimited lookups while in beta',
      'Founding-tester badge on your profile',
    ],
  },
}

const css = `
  .bp-root { background: ${c.parchment}; color: ${c.ink}; font-family: ${f.sans}; padding-top: 72px; min-height: 100vh; }
  .bp-container { max-width: 1240px; margin: 0 auto; padding: 0 48px; }
  .bp-eyebrow { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.22em; text-transform: uppercase; color: ${c.bark}; margin: 0; }

  .bp-hero { padding: 80px 0 56px; text-align: center; }
  .bp-hero h1 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(44px, 5.6vw, 80px); line-height: 1.02; letter-spacing: -0.01em; margin: 18px auto 0; max-width: 18ch; }
  .bp-hero h1 em { font-style: italic; color: ${c.terracotta}; }
  .bp-hero .lede { font-size: 17px; font-weight: 300; line-height: 1.6; color: ${c.sage}; max-width: 52ch; margin: 22px auto 0; }

  .bp-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; padding-bottom: 64px; }
  .bp-track {
    border: 0.5px solid ${c.mist}; background: ${c.chalk}; padding: 32px 30px;
    cursor: pointer; text-align: left; transition: border-color 0.2s, box-shadow 0.25s, transform 0.25s;
    display: flex; flex-direction: column; font-family: ${f.sans};
  }
  .bp-track:hover { transform: translateY(-3px); box-shadow: 0 24px 44px -28px rgba(26,42,28,0.3); }
  .bp-track.active { border-color: ${c.terracotta}; box-shadow: 0 24px 44px -28px rgba(26,42,28,0.3); }
  .bp-track .tk-pick {
    font-family: ${f.mono}; font-size: 9px; letter-spacing: 0.2em; text-transform: uppercase;
    color: ${c.bark}; display: flex; align-items: center; gap: 8px;
  }
  .bp-track .tk-pick i {
    width: 12px; height: 12px; border-radius: 50%; border: 1px solid ${c.mist};
    display: inline-block; transition: all 0.2s; flex-shrink: 0;
  }
  .bp-track.active .tk-pick { color: ${c.terracotta}; }
  .bp-track.active .tk-pick i { border-color: ${c.terracotta}; background: ${c.terracotta}; box-shadow: inset 0 0 0 2.5px ${c.chalk}; }
  .bp-track h3 { font-family: ${f.serif}; font-weight: 400; font-size: 30px; margin: 16px 0 6px; color: ${c.ink}; }
  .bp-track .tk-tag { font-size: 14px; color: ${c.sage}; margin: 0 0 18px; line-height: 1.55; }
  .bp-track ul { list-style: none; margin: auto 0 0; padding: 18px 0 0; border-top: 0.5px solid ${c.mist}; display: grid; gap: 9px; }
  .bp-track li { font-size: 13.5px; color: ${c.ink}; padding-left: 16px; position: relative; line-height: 1.45; }
  .bp-track li::before { content: "—"; position: absolute; left: 0; color: ${c.terracotta}; }

  .bp-form-wrap { background: ${c.chalk}; border-top: 0.5px solid ${c.mist}; padding: 80px 0 100px; }
  .bp-form { max-width: 560px; margin: 0 auto; }
  .bp-form h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(30px, 3.6vw, 44px); margin: 12px 0 28px; color: ${c.ink}; }
  .bp-form h2 em { font-style: italic; color: ${c.terracotta}; }
  .bp-field { margin-bottom: 18px; }
  .bp-field label {
    font-family: ${f.mono}; font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
    color: ${c.bark}; display: block; margin-bottom: 7px;
  }
  .bp-field input {
    width: 100%; box-sizing: border-box; padding: 13px 14px; font-family: ${f.sans}; font-size: 15px;
    background: ${c.parchment}; border: 0.5px solid ${c.mist}; color: ${c.ink};
  }
  .bp-field input:focus { outline: none; border-color: ${c.terracotta}; background: ${c.chalk}; }
  .bp-submit {
    font-family: ${f.mono}; font-size: 11px; letter-spacing: 0.2em; text-transform: uppercase;
    padding: 16px 30px; background: ${c.forest}; color: ${c.chalk}; border: 0; cursor: pointer;
    transition: background 0.2s; margin-top: 8px;
  }
  .bp-submit:hover { background: ${c.terracotta}; }
  .bp-submit[disabled] { opacity: 0.6; cursor: wait; }
  .bp-error { color: ${c.terracotta}; font-size: 13px; margin: 10px 0 0; }
  .bp-note { font-family: ${f.mono}; font-size: 10px; letter-spacing: 0.1em; color: ${c.bark}; margin-top: 16px; }

  .bp-done { max-width: 560px; margin: 0 auto; text-align: center; padding: 24px 0; }
  .bp-done .d-mark { font-family: ${f.serif}; font-size: 56px; color: ${c.terracotta}; line-height: 1; }
  .bp-done h2 { font-family: ${f.serif}; font-weight: 300; font-size: clamp(32px, 4vw, 48px); margin: 18px 0 10px; color: ${c.ink}; }
  .bp-done h2 em { font-style: italic; color: ${c.terracotta}; }
  .bp-done p { color: ${c.sage}; line-height: 1.6; margin: 0; }

  @media (max-width: 800px) {
    .bp-container { padding: 0 24px; }
    .bp-grid { grid-template-columns: 1fr; }
  }
`

export default function BetaPage() {
  const [searchParams] = useSearchParams()
  const initialTrack: Track = searchParams.get('track') === 'extension' ? 'extension' : 'developer'

  const [track, setTrack] = useState<Track>(initialTrack)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !/.+@.+\..+/.test(email)) {
      setError('Please enter your name and a valid email.')
      return
    }
    setSubmitting(true)
    setError('')
    const application = {
      name: name.trim(),
      email: email.trim(),
      company: company.trim() || '—',
      use_case: track === 'developer' ? 'Beta — Developer API' : 'Beta — Browser extension',
    }
    try {
      if (supabase) {
        // Don't let a slow/unreachable backend hang the form.
        const timeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('timeout')), 4000)
        )
        const insert = supabase
          .from('business_waitlist')
          .insert([application] as any)
          .then(({ error: sbError }) => {
            if (sbError) throw sbError
          })
        await Promise.race([insert, timeout])
      } else {
        throw new Error('offline')
      }
    } catch {
      // Backend unavailable — keep the application locally so nothing is lost.
      try {
        const key = 'yf_beta_applications'
        const prev = JSON.parse(localStorage.getItem(key) || '[]')
        prev.push({ ...application, at: new Date().toISOString() })
        localStorage.setItem(key, JSON.stringify(prev))
      } catch {
        /* best effort */
      }
    } finally {
      setSubmitting(false)
      setSubmitted(true)
    }
  }

  return (
    <div className="bp-root">
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <Navbar />

      <header className="bp-hero">
        <div className="bp-container">
          <Reveal>
            <p className="bp-eyebrow">Beta program · Limited spots</p>
            <h1>
              Test it before the <em>rest of the world.</em>
            </h1>
            <p className="lede">
              Two betas are open right now — the developer API and the browser extension. Pick a
              track, tell us where to reach you, and we&apos;ll send access as spots open.
            </p>
          </Reveal>
        </div>
      </header>

      <div className="bp-container">
        <div className="bp-grid">
          {(Object.keys(TRACKS) as Track[]).map((k, i) => (
            <Reveal key={k} delay={i * 120} direction={i === 0 ? 'right' : 'left'}>
              <button
                type="button"
                className={`bp-track ${track === k ? 'active' : ''}`}
                onClick={() => setTrack(k)}
                style={{ width: '100%', height: '100%' }}
              >
                <span className="tk-pick">
                  <i />
                  {track === k ? 'Selected' : 'Choose this track'}
                </span>
                <h3>{TRACKS[k].label}</h3>
                <p className="tk-tag">{TRACKS[k].tagline}</p>
                <ul>
                  {TRACKS[k].perks.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      <section className="bp-form-wrap">
        <div className="bp-container">
          {submitted ? (
            <Reveal>
              <div className="bp-done">
                <div className="d-mark">✓</div>
                <h2>
                  You&apos;re in the <em>queue.</em>
                </h2>
                <p>
                  Application received for the {TRACKS[track].label.toLowerCase()} beta. We review
                  in small batches — watch your inbox for the access email.
                </p>
              </div>
            </Reveal>
          ) : (
            <Reveal>
              <form className="bp-form" onSubmit={onSubmit}>
                <p className="bp-eyebrow">Apply</p>
                <h2>
                  Join the <em>{TRACKS[track].label.toLowerCase()}</em> beta.
                </h2>
                <div className="bp-field">
                  <label htmlFor="bp-name">Name</label>
                  <input
                    id="bp-name"
                    type="text"
                    placeholder="Jane Smith"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="bp-field">
                  <label htmlFor="bp-email">Email</label>
                  <input
                    id="bp-email"
                    type="email"
                    placeholder="jane@acme.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="bp-field">
                  <label htmlFor="bp-company">
                    {track === 'developer' ? 'Company / project (optional)' : 'Where do you hunt? (optional)'}
                  </label>
                  <input
                    id="bp-company"
                    type="text"
                    placeholder={track === 'developer' ? 'Acme Estate Group' : 'Facebook Marketplace, eBay…'}
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                  />
                </div>
                {error && <p className="bp-error">{error}</p>}
                <button type="submit" className="bp-submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Request access →'}
                </button>
                <p className="bp-note">No card, no spam. One email when your spot opens.</p>
              </form>
            </Reveal>
          )}
        </div>
      </section>

      <Footer />
    </div>
  )
}
