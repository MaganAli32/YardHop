/**
 * Appraisal Results — pipeline v2. Loads the response saved by TryIt from
 * sessionStorage (+ the original photo from IndexedDB/memory), and renders
 * it as: ITEM → ESTIMATED VALUE → MARKET CONTEXT → EVIDENCE → CREATE LISTING.
 *
 * Real vs. sample data: the distribution, market position, and source
 * breakdown are built from the pipeline's actual `comps` array
 * (lib/appraisalDerive.ts). Condition tiers, price history and the market
 * signal score are NOT things the backend computes yet — they come from
 * lib/appraisalFixtures.ts and carry a visible "Sample" chip so nothing here
 * is presented as a real measurement it isn't.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowRight, Check, AlertCircle, ExternalLink } from 'lucide-react';
import AppHeader from '../components/AppHeader';
import { ui, type, radius, space } from '../lib/tokens';
import {
  loadAppraisalResult,
  type AppraisalSession,
  type AppraisalComp,
} from '../lib/appraisalSession';
import {
  money,
  signedMoney,
  axisBounds,
  histogram,
  sourceBreakdown,
  percentileOf,
  matchScore,
  matchLabel,
  tidyCondition,
} from '../lib/appraisalDerive';
import {
  buildConditionTiers,
  buildPriceHistory,
  buildMarketSignal,
  tierIndexFor,
} from '../lib/appraisalFixtures';

const BIN_COUNT = 18;

const STATUS_BANNER: Record<string, { tone: 'warn' | 'info'; title: string }> = {
  low_confidence: { tone: 'warn', title: 'Less certain than usual' },
  insufficient_data: { tone: 'info', title: 'Identified, but not enough market data to price it' },
  unidentified: { tone: 'info', title: "We couldn't identify this item" },
};

/** Small "Sample" chip for panels lib/appraisalFixtures.ts builds. */
function SampleChip() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '.06em',
        textTransform: 'uppercase',
        color: ui.faint,
        border: `1px solid ${ui.border}`,
        borderRadius: radius.pill,
        padding: '2px 8px',
      }}
    >
      Sample
    </span>
  );
}

function SectionHeading({ title, sub, right }: { title: string; sub?: string; right?: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, letterSpacing: '-.01em', color: ui.ink }}>{title}</h2>
        {sub && <div style={{ marginTop: 4, fontSize: 13, color: ui.subtle }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

const AppraisalResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AppraisalSession | null>(null);
  const [hoverBin, setHoverBin] = useState<number | null>(null);
  const [activeSource, setActiveSource] = useState<string | null>(null);
  const [showAllComps, setShowAllComps] = useState(false);
  const [conditionIdx, setConditionIdx] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const parsed = await loadAppraisalResult();
      if (cancelled) return;
      if (!parsed?.item?.name) {
        navigate('/', { replace: true });
        return;
      }
      setData(parsed);
      setConditionIdx(tierIndexFor(parsed.item.condition));
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const comps = data?.comps ?? [];
  const pool = useMemo(
    () => (activeSource ? comps.filter((c) => (c.site || 'Unknown source') === activeSource) : comps),
    [comps, activeSource],
  );
  const compPrices = useMemo(() => pool.map((c) => c.price).filter((p) => Number.isFinite(p)), [pool]);
  const sources = useMemo(() => sourceBreakdown(comps), [comps]);
  const fair = data?.pricing?.fair;
  const bounds = useMemo(
    () => axisBounds(compPrices, fair != null ? [fair, data?.pricing?.low ?? fair, data?.pricing?.high ?? fair] : []),
    [compPrices, fair, data],
  );
  const bins = useMemo(
    () => histogram(pool, bounds.min, bounds.max, BIN_COUNT, (c) => c.condition === data?.item.condition),
    [pool, bounds, data],
  );
  const conditionTiers = useMemo(
    () => (fair != null ? buildConditionTiers(fair, tierIndexFor(data?.item.condition)) : []),
    [fair, data],
  );
  const priceHistory = useMemo(() => (fair != null ? buildPriceHistory(fair) : null), [fair]);
  const marketSignal = useMemo(
    () =>
      fair != null
        ? buildMarketSignal(compPrices, conditionTiers[conditionIdx ?? 2]?.sellThrough ?? 85, data?.pricing?.sourcesCount ?? comps.length)
        : null,
    [fair, compPrices, conditionTiers, conditionIdx, data, comps.length],
  );

  if (data === null) {
    return (
      <div style={{ minHeight: '100vh', background: ui.bg, fontFamily: type.sans }}>
        <AppHeader />
        <div style={{ paddingTop: 96, display: 'flex', justifyContent: 'center' }}>
          <p style={{ color: ui.subtle }}>Loading…</p>
        </div>
      </div>
    );
  }

  const { item, pricing, listing, needsInput, status, message } = data;
  const banner = status ? STATUS_BANNER[status] : null;
  const shownComps = showAllComps ? pool : pool.slice(0, 10);
  const est = pricing?.fair ?? 0;
  const percentile = pricing ? percentileOf(compPrices.length ? compPrices : [est], est) : 0;

  const startListing = () => {
    navigate('/marketplace/new', {
      state: {
        fromAppraisal: true,
        appraisalId: data.appraisalId,
        title: listing?.title || item.name,
        description: listing?.description || item.description || '',
        category: item.category || '',
        condition: item.condition || '',
        recommendedPrice: pricing?.fair,
        priceLow: pricing?.low,
        priceHigh: pricing?.high,
        confidenceScore: pricing?.confidenceScore,
        sourcesCount: pricing?.sourcesCount,
        imageUrls: data.imageUrls ?? [],
      },
    });
  };

  return (
    <div style={{ minHeight: '100vh', background: ui.bg, color: ui.ink, fontFamily: type.sans }}>
      <AppHeader />
      <main style={{ maxWidth: space.maxWidth, margin: '0 auto', padding: `0 clamp(16px,4vw,32px) 96px` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16, padding: '18px 0', fontSize: 13, color: ui.subtle }}>
          <div>
            Appraisals <span style={{ color: ui.borderControl }}>/</span> <span style={{ color: ui.ink }}>{item.name}</span>
          </div>
          {item.verified && <div style={{ color: ui.positive }}>✓ Identity verified by web lookup</div>}
        </div>

        {banner && (
          <div
            style={{
              display: 'flex',
              gap: 12,
              alignItems: 'flex-start',
              padding: '14px 16px',
              borderRadius: radius.lg,
              background: ui.surface,
              border: `1px solid ${ui.border}`,
              marginBottom: 24,
            }}
          >
            <AlertCircle size={18} style={{ color: ui.accent, flex: 'none', marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{banner.title}</div>
              {message && <div style={{ marginTop: 2, fontSize: 13.5, color: ui.body }}>{message}</div>}
              {needsInput && needsInput.length > 0 && (
                <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 13.5, color: ui.body }}>
                  {needsInput.slice(0, 4).map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* ITEM */}
        <section style={{ display: 'flex', flexWrap: 'wrap', gap: 56, alignItems: 'flex-start', padding: '8px 0 40px' }}>
          <div style={{ flex: '1 1 320px', minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start' }}>
              {data.imageUrls?.[0] ? (
                <div style={{ width: 168, height: 168, flex: 'none', borderRadius: radius.lg, overflow: 'hidden', background: ui.placeholder }}>
                  <img src={data.imageUrls[0]} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ) : null}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: ui.subtle }}>Identified item</div>
                <h1 style={{ margin: '6px 0 0', fontSize: 26, fontWeight: 600, lineHeight: 1.15, letterSpacing: '-.02em' }}>{item.name}</h1>
                {(item.brand || item.model) && (
                  <div style={{ marginTop: 6, fontSize: 15, color: ui.muted }}>
                    {[item.brand, item.model, item.variant].filter(Boolean).join(' · ')}
                  </div>
                )}
                {item.identityConfidence != null && (
                  <div style={{ marginTop: 14, fontSize: 13, color: ui.subtle }}>
                    Match confidence {item.identityConfidence}%{item.identityLevel ? ` · ${item.identityLevel} match` : ''}
                  </div>
                )}
              </div>
            </div>
            <dl style={{ margin: '26px 0 0', borderBottom: `1px solid ${ui.borderSoft}` }}>
              {[
                item.brand && ['Brand', item.brand],
                item.model && ['Model', item.model],
                item.referenceNumber && ['Reference', item.referenceNumber],
                item.condition && ['Condition', item.condition],
                item.year && ['Year', String(item.year)],
                item.msrp && ['Original MSRP', money(item.msrp)],
              ]
                .filter((r): r is [string, string] => Boolean(r))
                .map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 0', borderTop: `1px solid ${ui.borderSoft}`, fontSize: 14 }}>
                    <dt style={{ color: ui.subtle }}>{k}</dt>
                    <dd style={{ margin: 0, fontWeight: 500, textAlign: 'right' }}>{v}</dd>
                  </div>
                ))}
            </dl>
          </div>

          {/* ESTIMATED VALUE */}
          <div style={{ flex: '1 1 470px', minWidth: 0 }}>
            {pricing ? (
              <>
                <div style={{ fontSize: 13, color: ui.subtle }}>Estimated local value</div>
                <div style={{ marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 'clamp(52px,7vw,74px)', fontWeight: 600, letterSpacing: '-.04em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
                    {money(pricing.fair)}
                  </span>
                  {item.condition && <span style={{ fontSize: 14, color: ui.subtle }}>in {item.condition.toLowerCase()} condition</span>}
                </div>
                <div style={{ marginTop: 16, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 13, color: ui.subtle }}>Likely selling range</span>
                  <span style={{ fontSize: 20, fontWeight: 500, letterSpacing: '-.01em', fontVariantNumeric: 'tabular-nums' }}>
                    {money(pricing.low)}–{money(pricing.high)}
                  </span>
                </div>
                {pricing.sourcesSummary && <p style={{ margin: '18px 0 0', fontSize: 16, lineHeight: 1.55, color: ui.body, maxWidth: '52ch' }}>{pricing.sourcesSummary}</p>}
              </>
            ) : (
              <p style={{ fontSize: 15, color: ui.subtle, maxWidth: '48ch' }}>
                {message || 'We could not produce a confident price for this item.'}
              </p>
            )}

            {conditionTiers.length > 0 && (
              <div style={{ marginTop: 26 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 }}>
                  <span style={{ fontSize: 13, color: ui.subtle }}>Condition</span>
                  <SampleChip />
                </div>
                <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(102px,1fr))', gap: 8 }}>
                  {conditionTiers.map((tier, i) => {
                    const on = i === conditionIdx;
                    return (
                      <button
                        key={tier.label}
                        type="button"
                        onClick={() => setConditionIdx(i)}
                        style={{
                          textAlign: 'left',
                          padding: '10px 12px 11px',
                          border: on ? `1.5px solid ${ui.ink}` : `1px solid ${ui.borderControl}`,
                          borderRadius: radius.lg,
                          background: on ? ui.surface : ui.bg,
                          cursor: 'pointer',
                        }}
                      >
                        <div style={{ fontSize: 12.5, color: on ? ui.ink : ui.subtle }}>{tier.label}</div>
                        <div style={{ marginTop: 4, fontSize: 17, fontWeight: 600, letterSpacing: '-.015em', fontVariantNumeric: 'tabular-nums' }}>
                          {money(tier.estimate)}
                        </div>
                        <div style={{ marginTop: 3, fontSize: 11.5, color: ui.faint, fontVariantNumeric: 'tabular-nums' }}>
                          {on ? 'Selected' : signedMoney(tier.estimate - (fair ?? 0))}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ marginTop: 22, display: 'flex', gap: 20, fontSize: 14 }}>
              {comps.length > 0 && (
                <a href="#comparables" style={{ color: ui.accent, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                  See {comps.length} comparable sales
                </a>
              )}
            </div>
          </div>
        </section>

        {pricing && (
          <>
            {/* MARKET SUMMARY */}
            <section style={{ borderTop: `1px solid ${ui.border}`, borderBottom: `1px solid ${ui.border}`, overflow: 'hidden' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', margin: '-1px 0 0 -1px' }}>
                {([
                  { k: 'Estimated value', v: money(pricing.fair), sub: item.condition || '' },
                  { k: 'Typical range', v: `${money(pricing.low)}–${money(pricing.high)}`, sub: 'from comparable sales' },
                  { k: 'Comps used', v: String(pricing.sourcesCount ?? comps.length), sub: `${comps.filter((c) => c.sold).length} sold` },
                  { k: 'Confidence', v: `${pricing.confidenceScore}%`, sub: pricing.method || '' },
                  marketSignal && { k: 'Market signal', v: `${marketSignal.score}/100`, sub: marketSignal.label, sample: true },
                ].filter(Boolean) as { k: string; v: string; sub: string; sample?: boolean }[])
                  .map((m) => (
                    <div key={m.k} style={{ flex: '1 1 142px', padding: '20px 22px', borderLeft: `1px solid ${ui.borderSoft}`, borderTop: `1px solid ${ui.borderSoft}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: ui.subtle }}>
                        {m.k}
                        {m.sample && <SampleChip />}
                      </div>
                      <div style={{ marginTop: 6, fontSize: 21, fontWeight: 600, letterSpacing: '-.02em', fontVariantNumeric: 'tabular-nums' }}>{m.v}</div>
                      <div style={{ marginTop: 3, fontSize: 11.5, color: ui.faint }}>{m.sub}</div>
                    </div>
                  ))}
              </div>
            </section>

            {/* MARKET POSITION */}
            {compPrices.length > 0 && (
              <section style={{ paddingTop: 40 }}>
                <SectionHeading title="Market position" sub={`${compPrices.length} comparable prices`} />
                <div style={{ position: 'relative', marginTop: 40, height: 72 }}>
                  <div style={{ position: 'absolute', inset: '0 0 auto 0', top: 22, height: 26 }}>
                    {compPrices.map((p, i) => (
                      <span
                        key={i}
                        style={{
                          position: 'absolute',
                          left: `${((p - bounds.min) / (bounds.max - bounds.min || 1)) * 100}%`,
                          bottom: 0,
                          width: 1,
                          height: 10,
                          background: ui.ink,
                          opacity: 0.18,
                        }}
                      />
                    ))}
                  </div>
                  <div style={{ position: 'absolute', inset: '48px 0 auto 0', height: 1, background: ui.borderControl }} />
                  <div style={{ position: 'absolute', left: 0, top: 56, fontSize: 12, color: ui.subtle, fontVariantNumeric: 'tabular-nums' }}>{money(bounds.min)}</div>
                  <div style={{ position: 'absolute', right: 0, top: 56, fontSize: 12, color: ui.subtle, fontVariantNumeric: 'tabular-nums' }}>{money(bounds.max)}</div>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${((est - bounds.min) / (bounds.max - bounds.min || 1)) * 100}%`,
                      top: 38,
                      transform: 'translateX(-50%)',
                      width: 2,
                      height: 22,
                      background: ui.accent,
                    }}
                  />
                </div>
                <p style={{ margin: '16px 0 0', fontSize: 15, lineHeight: 1.5, color: ui.body, maxWidth: '58ch' }}>
                  At {money(est)} you would be priced {percentile >= 50 ? 'above' : 'below'} {percentile >= 50 ? percentile : 100 - percentile}% of comparable sales.
                </p>
              </section>
            )}

            {/* PRICE DISTRIBUTION */}
            {pool.length > 0 && (
              <section style={{ marginTop: 44, borderTop: `1px solid ${ui.border}`, paddingTop: 26 }}>
                <SectionHeading title="Price distribution" sub={`${pool.length} comparable listings${activeSource ? ` · ${activeSource}` : ''}`} />
                <div style={{ position: 'relative', marginTop: 24, height: 200 }}>
                  <div style={{ position: 'absolute', inset: 0, bottom: 30, display: 'flex', alignItems: 'flex-end', gap: 2 }}>
                    {bins.map((b) => {
                      const maxCount = Math.max(1, ...bins.map((x) => x.all.length));
                      const hovered = hoverBin === b.index;
                      return (
                        <div
                          key={b.index}
                          onMouseEnter={() => setHoverBin(b.index)}
                          onMouseLeave={() => setHoverBin(null)}
                          style={{ flex: 1, height: '100%', display: 'flex', alignItems: 'flex-end', cursor: 'default' }}
                          title={b.all.length ? `${money(b.lo)}–${money(b.hi)} · ${b.all.length} listings` : undefined}
                        >
                          <div
                            style={{
                              width: '100%',
                              height: b.all.length ? `${Math.max(6, (b.all.length / maxCount) * 100)}%` : 2,
                              background: b.all.length ? (hovered ? ui.chartInk : ui.chartMute) : ui.chartEmpty,
                              borderRadius: '2px 2px 0 0',
                              display: 'flex',
                              alignItems: 'flex-end',
                            }}
                          >
                            <div
                              style={{
                                width: '100%',
                                height: b.all.length ? `${(b.matching.length / b.all.length) * 100}%` : '0%',
                                background: ui.chartInk,
                                borderRadius: '2px 2px 0 0',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div
                    style={{
                      position: 'absolute',
                      left: `${((est - bounds.min) / (bounds.max - bounds.min || 1)) * 100}%`,
                      top: 0,
                      bottom: 30,
                      width: 2,
                      background: ui.accent,
                    }}
                  />
                  <div style={{ position: 'absolute', inset: 'auto 0 0 0', height: 30, borderTop: `1px solid ${ui.border}` }}>
                    <span style={{ position: 'absolute', left: 0, top: 9, fontSize: 12, color: ui.subtle }}>{money(bounds.min)}</span>
                    <span style={{ position: 'absolute', right: 0, top: 9, fontSize: 12, color: ui.subtle }}>{money(bounds.max)}</span>
                  </div>
                </div>
                <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: '10px 24px', fontSize: 12.5, color: ui.muted }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 11, height: 11, background: ui.chartInk, borderRadius: 2 }} /> {item.condition || 'Matching condition'}
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 11, height: 11, background: ui.chartMute, borderRadius: 2 }} /> Other conditions
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 2, height: 12, background: ui.accent }} /> Estimate
                  </span>
                </div>
              </section>
            )}

            {/* SOURCE BREAKDOWN */}
            {sources.length > 0 && (
              <section style={{ marginTop: 40, borderTop: `1px solid ${ui.border}`, paddingTop: 26 }}>
                <SectionHeading
                  title="Where these comparables came from"
                  sub="Click a source to filter the chart and table below"
                  right={
                    activeSource && (
                      <button
                        type="button"
                        onClick={() => setActiveSource(null)}
                        style={{ background: 'none', border: 0, padding: 0, fontSize: 13, color: ui.accent, textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        Clear
                      </button>
                    )
                  }
                />
                <div style={{ marginTop: 18, borderBottom: `1px solid ${ui.borderSoft}` }}>
                  {sources.map((s) => {
                    const on = activeSource === s.name;
                    return (
                      <div
                        key={s.name}
                        onClick={() => setActiveSource(on ? null : s.name)}
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'minmax(0,1.1fr) minmax(120px,1.6fr) 60px 90px',
                          gap: 18,
                          alignItems: 'center',
                          padding: '12px 0',
                          borderTop: `1px solid ${ui.borderSoft}`,
                          cursor: 'pointer',
                        }}
                      >
                        <span style={{ fontSize: 14, fontWeight: on ? 600 : 400 }}>{s.name}</span>
                        <span style={{ height: 6, background: ui.chartEmpty, borderRadius: 2, overflow: 'hidden' }}>
                          <span style={{ display: 'block', height: '100%', width: `${s.share * 100}%`, background: on ? ui.accent : ui.chartInk }} />
                        </span>
                        <span style={{ textAlign: 'right', fontSize: 13.5, fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
                        <span style={{ textAlign: 'right', fontSize: 13.5, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{money(s.median)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* PRICE HISTORY (sample) */}
            {priceHistory && (
              <section style={{ marginTop: 40, borderTop: `1px solid ${ui.border}`, paddingTop: 26 }}>
                <SectionHeading title="Price history" sub="Median sold price by month" right={<SampleChip />} />
                <div style={{ marginTop: 20, display: 'flex', alignItems: 'flex-end', gap: 4, height: 90 }}>
                  {priceHistory.points.map((pt) => {
                    const max = Math.max(...priceHistory.points.map((x) => x.median));
                    const min = Math.min(...priceHistory.points.map((x) => x.median));
                    const h = ((pt.median - min) / (max - min || 1)) * 70 + 12;
                    return (
                      <div key={pt.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        <div style={{ width: '100%', height: h, background: ui.chartMute, borderRadius: '2px 2px 0 0' }} />
                        <span style={{ fontSize: 10, color: ui.faint, whiteSpace: 'nowrap' }}>{pt.label.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* LISTING COPY / WHY THIS PRICE */}
            {(listing?.highlights?.length || listing?.conditionSummary) && (
              <section style={{ marginTop: 40, borderTop: `1px solid ${ui.border}`, paddingTop: 26 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Why this price</h2>
                {listing?.conditionSummary && <p style={{ margin: '10px 0 0', fontSize: 15, color: ui.body, maxWidth: '60ch' }}>{listing.conditionSummary}</p>}
                {listing?.highlights && listing.highlights.length > 0 && (
                  <ul style={{ margin: '14px 0 0', padding: 0, listStyle: 'none' }}>
                    {listing.highlights.map((h) => (
                      <li key={h} style={{ display: 'flex', gap: 8, padding: '8px 0', borderTop: `1px solid ${ui.borderSoft}`, fontSize: 14 }}>
                        <Check size={16} style={{ color: ui.positive, flex: 'none', marginTop: 2 }} />
                        <span>{h}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {/* COMPARABLE SALES */}
            {comps.length > 0 && (
              <section id="comparables" style={{ marginTop: 40, borderTop: `1px solid ${ui.border}`, paddingTop: 26 }}>
                <SectionHeading
                  title="Comparable sales"
                  sub={`${pool.length}${activeSource ? ` of ${comps.length}` : ''} matching listings`}
                />
                <div style={{ marginTop: 16, overflowX: 'auto' }}>
                  <div style={{ minWidth: 760 }}>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '120px minmax(0,1fr) 90px 100px 90px 24px',
                        gap: 14,
                        padding: '0 4px 10px',
                        borderBottom: `1px solid ${ui.border}`,
                        fontSize: 12.5,
                        color: ui.subtle,
                      }}
                    >
                      <span>Source</span>
                      <span>Listing</span>
                      <span>Match</span>
                      <span>Condition</span>
                      <span style={{ textAlign: 'right' }}>Price</span>
                      <span />
                    </div>
                    {shownComps.map((c: AppraisalComp, i) => {
                      const m = matchScore(c);
                      return (
                        <div
                          key={i}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '120px minmax(0,1fr) 90px 100px 90px 24px',
                            gap: 14,
                            alignItems: 'center',
                            padding: '14px 4px',
                            borderBottom: `1px solid ${ui.borderSoft}`,
                          }}
                        >
                          <span style={{ fontSize: 13, color: ui.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.site || 'Unknown'}{c.sold && <span style={{ color: ui.faint }}> · sold</span>}
                          </span>
                          <span style={{ minWidth: 0, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {c.title || '—'}
                          </span>
                          <span>
                            <span style={{ display: 'block', fontSize: 13, fontWeight: 500 }}>{m}%</span>
                            <span style={{ display: 'block', fontSize: 11, color: ui.faint }}>{matchLabel(m)}</span>
                          </span>
                          <span style={{ fontSize: 13, color: ui.subtle }}>{tidyCondition(c.condition)}</span>
                          <span style={{ textAlign: 'right', fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{money(c.price)}</span>
                          <span style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            {c.url && (
                              <a href={c.url} target="_blank" rel="noreferrer noopener" aria-label="View listing" style={{ color: ui.faint }}>
                                <ExternalLink size={14} />
                              </a>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                {pool.length > 10 && (
                  <button
                    type="button"
                    onClick={() => setShowAllComps(!showAllComps)}
                    style={{ marginTop: 14, background: 'none', border: 0, padding: 0, fontSize: 13.5, color: ui.accent, textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    {showAllComps ? 'Show fewer' : `Show all ${pool.length}`}
                  </button>
                )}
              </section>
            )}
          </>
        )}

        {/* SELLER TIPS */}
        {listing?.sellerTips && listing.sellerTips.length > 0 && (
          <section style={{ marginTop: 40, borderTop: `1px solid ${ui.border}`, paddingTop: 26 }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Seller tips</h3>
            <ul style={{ margin: '12px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {listing.sellerTips.map((tip) => (
                <li key={tip} style={{ display: 'flex', gap: 8, fontSize: 14, color: ui.body }}>
                  <Check size={16} style={{ color: ui.positive, flex: 'none', marginTop: 2 }} />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* CREATE LISTING */}
        <section style={{ marginTop: 56, borderTop: `1px solid ${ui.border}`, paddingTop: 36, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <button
            type="button"
            onClick={startListing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: radius.md,
              background: ui.ink,
              color: '#fff',
              border: 0,
              padding: '13px 20px',
              fontSize: 15,
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            {pricing ? 'List on YardFront' : 'List anyway'}
            <ArrowRight size={18} strokeWidth={2.5} />
          </button>
          <Link
            to="/"
            state={{ scrollTo: 'try' }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: radius.md,
              border: `1px solid ${ui.ink}`,
              color: ui.ink,
              padding: '13px 20px',
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
            }}
          >
            Try Another Appraisal
            <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
        </section>
      </main>
    </div>
  );
};

export default AppraisalResultsPage;
