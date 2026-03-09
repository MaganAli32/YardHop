/**
 * YardFront for Business — full enterprise landing page.
 * Audience: estate sales, thrift chains, insurance appraisers, buyback programs, pawn, liquidation.
 * Primary CTA: Join the API Waitlist (submits to Supabase business_waitlist).
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const USE_CASES = [
  'Estate sale company',
  'Thrift store / resale chain',
  'Insurance / claims appraisal',
  'Retail buyback program',
  'Pawn shop',
  'Liquidation / auction house',
  'Other',
];

const TIERS = [
  {
    name: 'Starter',
    price: '$99',
    period: '/mo',
    appraisals: '500 appraisals/mo',
    features: [
      'REST API access',
      '5+ pricing sources',
      'JSON responses',
      'Email support',
      '99.5% uptime SLA',
    ],
    cta: 'Join Waitlist',
    highlight: false,
  },
  {
    name: 'Growth',
    price: '$299',
    period: '/mo',
    appraisals: '2,000 appraisals/mo',
    features: [
      'Everything in Starter',
      'Bulk CSV upload',
      'Confidence score breakdowns',
      'Webhook delivery',
      'Priority support',
    ],
    cta: 'Join Waitlist',
    highlight: true,
  },
  {
    name: 'Scale',
    price: '$799',
    period: '/mo',
    appraisals: '7,500 appraisals/mo',
    features: [
      'Everything in Growth',
      'Category-level analytics',
      'Custom confidence thresholds',
      'Dedicated Slack channel',
      '99.9% uptime SLA',
    ],
    cta: 'Join Waitlist',
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    appraisals: 'Unlimited appraisals',
    features: [
      'Everything in Scale',
      'On-premise deployment option',
      'Custom data source integrations',
      'SLA with financial guarantees',
      'Dedicated account manager',
    ],
    cta: 'Contact Us',
    highlight: false,
  },
];

export default function BusinessPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    use_case: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!formData.name || !formData.email || !formData.company) {
      setError('Please fill in all required fields.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      if (!supabase) {
        throw new Error('Database not configured');
      }
      const { error: sbError } = await supabase.from('business_waitlist').insert([formData]);
      if (sbError) throw sbError;
      setSubmitted(true);
    } catch (e) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121C32] text-white">
      {/* ── NAV ───────────────────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <Link to="/" className="flex items-center gap-2 no-underline">
          <span className="text-white font-serif italic text-xl">YardFront</span>
          <span className="text-[#FF6B35] text-xs font-semibold tracking-widest uppercase ml-1">Business</span>
        </Link>
        <div className="flex items-center gap-6">
          <Link to="/" className="text-white/40 text-sm hover:text-white transition-colors no-underline">
            ← Consumer App
          </Link>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="bg-[#FF6B35] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            Join Waitlist
          </button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24">
        <p className="text-[#FF6B35] text-xs font-semibold tracking-[0.2em] uppercase mb-6">
          YardFront API — Now in Private Beta
        </p>
        <h1 className="font-serif italic text-5xl lg:text-7xl leading-[1.05] max-w-4xl mb-8">
          Secondhand price intelligence,{' '}
          <span className="text-[#FF6B35]">at scale.</span>
        </h1>
        <p className="text-white/50 text-xl max-w-2xl leading-relaxed mb-10">
          One API call. A photo or description in, a market-accurate price range out —
          sourced from eBay sold listings, Mercari, Google Shopping, and Craigslist.
          Built for businesses that price hundreds of items a day.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="inline-flex items-center justify-center gap-2 bg-[#FF6B35] text-white px-8 py-4 rounded-full text-base font-medium hover:opacity-90 transition-opacity"
          >
            Join the API Waitlist →
          </button>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center gap-2 border border-white/15 text-white/70 px-8 py-4 rounded-full text-base hover:border-white/40 hover:text-white transition-colors"
          >
            See how it works
          </a>
        </div>
      </section>

      {/* ── SOCIAL PROOF BAR ──────────────────────────────── */}
      <div className="border-y border-white/[0.08] py-8 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-white/[0.25] text-xs font-semibold tracking-widest uppercase text-center mb-6">
            Built for
          </p>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4">
            {[
              'Estate Sale Companies',
              'Thrift Store Chains',
              'Insurance Appraisers',
              'Retail Buyback Programs',
              'Pawn Shop Networks',
              'Liquidation Houses',
            ].map((label) => (
              <span key={label} className="text-white/40 text-sm font-medium">
                {label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── USE CASES ─────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <p className="text-[#FF6B35] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
          Use Cases
        </p>
        <h2 className="font-serif italic text-4xl lg:text-5xl mb-16 max-w-2xl">
          The secondhand economy runs on pricing decisions.
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              eyebrow: 'Estate Sales',
              headline: 'Price 500 items in an afternoon.',
              body: "Your team photographs each item. YardFront returns a price range, confidence score, and comparable sold listings — instantly. No more guessing on grandma's china set.",
              stat: '~500 items/event',
            },
            {
              eyebrow: 'Thrift Chains',
              headline: 'Stop leaving money on the table.',
              body: 'That Nike jacket in your donation bin could be worth $140 on Depop. YardFront flags high-value items at intake, so your team prices them right the first time.',
              stat: '5+ data sources',
            },
            {
              eyebrow: 'Insurance & Claims',
              headline: 'Defensible appraisals, fast.',
              body: 'Market-value estimates sourced from real sold transactions — not sticker prices. Every appraisal is timestamped, traceable, and exportable for claims documentation.',
              stat: '2s response time',
            },
          ].map((card) => (
            <div
              key={card.eyebrow}
              className="border border-white/[0.08] rounded-2xl p-8 hover:border-[#FF6B35]/30 transition-colors group"
            >
              <p className="text-[#FF6B35] text-xs font-semibold tracking-widest uppercase mb-4">
                {card.eyebrow}
              </p>
              <p className="text-white/[0.25] text-3xl font-semibold mb-3">{card.stat}</p>
              <h3 className="text-white font-semibold text-xl mb-3">{card.headline}</h3>
              <p className="text-white/[0.45] text-sm leading-relaxed">{card.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────── */}
      <section id="how-it-works" className="border-t border-white/[0.08] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#FF6B35] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            How It Works
          </p>
          <h2 className="font-serif italic text-4xl lg:text-5xl mb-16 max-w-2xl">
            One request. Five sources. Two seconds.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              {
                step: '01',
                title: 'Send a photo or description',
                body: 'POST to /api/v1/appraise with an image URL, text description, or both.',
              },
              {
                step: '02',
                title: 'AI identifies the item',
                body: 'Gemini Vision extracts item name, brand, model, and condition signals.',
              },
              {
                step: '03',
                title: 'Live market query',
                body: 'We pull real-time sold listings from eBay, Mercari, Google Shopping, and Craigslist.',
              },
              {
                step: '04',
                title: 'Price range returned',
                body: 'You get low, high, and recommended price with a confidence score and source breakdown.',
              },
            ].map((item) => (
              <div key={item.step} className="border border-white/[0.08] rounded-2xl p-6">
                <p className="text-[#FF6B35] text-xs font-mono mb-4">{item.step}</p>
                <h3 className="text-white font-semibold mb-2">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── API PREVIEW ───────────────────────────────────── */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <p className="text-white/30 text-xs font-mono">POST /api/v1/appraise</p>
              <span className="text-[#FF6B35] text-xs font-semibold tracking-widest uppercase">
                Live API
              </span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <p className="text-white/[0.25] text-xs font-mono uppercase tracking-wider mb-3">Request</p>
                <pre className="text-white/70 text-sm font-mono leading-relaxed overflow-x-auto">
{`{
  "image_url": "https://...",
  "condition": "good",
  "category": "electronics"
}`}
                </pre>
              </div>
              <div>
                <p className="text-white/[0.25] text-xs font-mono uppercase tracking-wider mb-3">Response</p>
                <pre className="text-white/70 text-sm font-mono leading-relaxed overflow-x-auto">
{`{
  "item_name": "Canon AE-1 35mm",
  "price_low": 65,
  "price_high": 110,
  "price_recommended": 85,
  "confidence": 8.2,
  "sources": [
    "ebay_sold",
    "mercari",
    "craigslist"
  ]
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────── */}
      <section className="border-t border-white/[0.08] py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-[#FF6B35] text-xs font-semibold tracking-[0.2em] uppercase mb-4">
            Pricing
          </p>
          <h2 className="font-serif italic text-4xl lg:text-5xl mb-4 max-w-2xl">
            Pay for what you use.
          </h2>
          <p className="text-white/40 text-lg mb-16">
            API access is in private beta. Join the waitlist to lock in early pricing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative rounded-2xl p-6 flex flex-col ${
                  tier.highlight
                    ? 'bg-[#FF6B35] text-white'
                    : 'border border-white/[0.08] text-white hover:border-white/20 transition-colors'
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-6 bg-white text-[#FF6B35] text-xs font-bold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                )}
                <p className={`text-sm font-semibold mb-1 ${tier.highlight ? 'text-white/80' : 'text-white/50'}`}>
                  {tier.name}
                </p>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  <span className={`text-sm ${tier.highlight ? 'text-white/70' : 'text-white/40'}`}>
                    {tier.period}
                  </span>
                </div>
                <p className={`text-xs mb-6 ${tier.highlight ? 'text-white/70' : 'text-white/35'}`}>
                  {tier.appraisals}
                </p>
                <ul className="space-y-2 flex-1 mb-6">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`text-sm flex items-start gap-2 ${
                        tier.highlight ? 'text-white/80' : 'text-white/45'
                      }`}
                    >
                      <span className="mt-0.5 shrink-0">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => setFormOpen(true)}
                  className={`w-full py-2.5 rounded-full text-sm font-medium transition-colors ${
                    tier.highlight
                      ? 'bg-white text-[#FF6B35] hover:bg-white/90'
                      : 'border border-white/15 text-white hover:border-white/40'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── WAITLIST FORM ─────────────────────────────────── */}
      {formOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-[#1a2540] border border-white/10 rounded-2xl p-8 w-full max-w-md relative">
            <button
              type="button"
              onClick={() => setFormOpen(false)}
              className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors text-xl leading-none"
              aria-label="Close"
            >
              ×
            </button>

            {submitted ? (
              <div className="text-center py-8">
                <p className="text-[#FF6B35] text-4xl mb-4">✓</p>
                <h3 className="text-white font-serif italic text-2xl mb-2">
                  You&apos;re on the list.
                </h3>
                <p className="text-white/50 text-sm">
                  We&apos;ll reach out with API access details as we onboard early partners.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[#FF6B35] text-xs font-semibold tracking-widest uppercase mb-2">
                  API Waitlist
                </p>
                <h3 className="text-white font-serif italic text-2xl mb-6">
                  Get early access.
                </h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="waitlist-name" className="text-white/40 text-xs font-medium block mb-1.5">
                      Your name *
                    </label>
                    <input
                      id="waitlist-name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#FF6B35]/50"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div>
                    <label htmlFor="waitlist-company" className="text-white/40 text-xs font-medium block mb-1.5">
                      Company *
                    </label>
                    <input
                      id="waitlist-company"
                      type="text"
                      value={formData.company}
                      onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#FF6B35]/50"
                      placeholder="Acme Estate Sales"
                    />
                  </div>
                  <div>
                    <label htmlFor="waitlist-email" className="text-white/40 text-xs font-medium block mb-1.5">
                      Work email *
                    </label>
                    <input
                      id="waitlist-email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder-white/20 focus:outline-none focus:border-[#FF6B35]/50"
                      placeholder="jane@acmeestate.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="waitlist-use-case" className="text-white/40 text-xs font-medium block mb-1.5">
                      Best describes your business
                    </label>
                    <select
                      id="waitlist-use-case"
                      value={formData.use_case}
                      onChange={(e) => setFormData({ ...formData, use_case: e.target.value })}
                      className="w-full bg-[#121C32] border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-[#FF6B35]/50"
                    >
                      <option value="" className="bg-[#121C32]">
                        Select one…
                      </option>
                      {USE_CASES.map((uc) => (
                        <option key={uc} value={uc} className="bg-[#121C32]">
                          {uc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {error && <p className="text-red-400 text-xs mt-3">{error}</p>}

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="w-full mt-6 bg-[#FF6B35] text-white py-3.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {loading ? 'Submitting…' : 'Request API Access →'}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-white/[0.08] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-white/[0.25] text-sm font-serif italic">YardFront</span>
          <div className="flex gap-6">
            <Link to="/" className="text-white/30 text-sm hover:text-white transition-colors no-underline">
              Consumer App
            </Link>
            <Link to="/privacy-policy" className="text-white/30 text-sm hover:text-white transition-colors no-underline">
              Privacy
            </Link>
            <Link to="/terms-of-service" className="text-white/30 text-sm hover:text-white transition-colors no-underline">
              Terms
            </Link>
          </div>
          <p className="text-white/20 text-xs">© {new Date().getFullYear()} YardFront. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
