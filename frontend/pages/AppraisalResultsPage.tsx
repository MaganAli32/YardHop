/**
 * Appraisal Results — displays result from POST /api/appraise
 * Loads JSON from sessionStorage and the original photo from IndexedDB / memory.
 *
 * Market-intelligence redesign: real per-marketplace data (when the backend
 * found any) drives a market-position bar, a price-distribution histogram
 * and a source breakdown, instead of a single confidence progress bar.
 * Nothing here is fabricated — components below MIN_HISTOGRAM_POINTS real
 * prices simply don't render (see lib/market.ts).
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import MarketSummary from '../components/market/MarketSummary';
import MarketPosition from '../components/market/MarketPosition';
import PriceDistribution from '../components/market/PriceDistribution';
import ComparableSources from '../components/market/ComparableSources';
import { colors as t, fonts as tf } from '../lib/tokens';
import { combinedPrices, money } from '../lib/market';
import { ArrowRight, Check } from 'lucide-react';
import { loadAppraisalResult, type AppraisalResult } from '../lib/appraisalSession';

const AppraisalResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AppraisalResult | null>(null);
  const [activeSourceIndex, setActiveSourceIndex] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const parsed = await loadAppraisalResult();
      if (cancelled) return;
      if (!parsed?.item?.name || parsed?.pricing == null) {
        navigate('/', { replace: true });
        return;
      }
      setData(parsed);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const sources = data?.pricing.sources ?? [];
  const activeSource = activeSourceIndex != null ? sources[activeSourceIndex] : null;
  const distributionPrices = useMemo(
    () => (activeSource ? (activeSource.prices ?? []) : combinedPrices(sources)),
    [activeSource, sources],
  );

  if (data === null) {
    return (
      <div className="min-h-screen font-['Manrope']" style={{ background: t.parchment }}>
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <p style={{ color: t.sage }}>Loading...</p>
        </div>
      </div>
    );
  }

  const { item, pricing, sellerTips } = data;

  return (
    <div className="min-h-screen font-['Manrope']" style={{ background: t.parchment, color: t.ink }}>
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-20">
        <div className="pt-16 max-w-2xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium mb-10 no-underline"
            style={{ color: t.sage }}
          >
            ← Back to home
          </Link>

          <div className="rounded-sm shadow-sm overflow-hidden border" style={{ background: t.chalk, borderColor: t.mist }}>
            <div className="flex items-center gap-2 px-6 py-4 border-b" style={{ borderColor: t.mist, background: `${t.parchment}CC` }}>
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                <span className="w-2 h-2 rounded-full bg-[#28C840]" />
              </div>
              <span className="text-[13px] ml-2" style={{ color: t.sage }}>Appraisal</span>
              <span
                className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-sm border"
                style={{ color: t.forest, background: `${t.forest}1A`, borderColor: t.mist }}
              >
                Complete
              </span>
            </div>

            <div className="p-6 md:p-8">
              {/* ITEM */}
              {data.imageUrls?.[0] && (
                <div className="mb-6 aspect-[4/3] max-h-[280px] rounded-sm overflow-hidden border" style={{ borderColor: t.mist, background: t.mist }}>
                  <img src={data.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                </div>
              )}
              <h1
                className="text-[22px] md:text-3xl mb-1 italic"
                style={{ fontFamily: tf.serif, fontWeight: 400, color: t.ink }}
              >
                {item.name}
              </h1>
              {item.description && (
                <p className="text-[13px] mb-6" style={{ color: t.sage }}>{item.description}</p>
              )}

              {/* ESTIMATED VALUE */}
              <p className="text-[36px] font-semibold mb-1 tracking-tight tabular-nums" style={{ fontFamily: tf.mono, color: t.ink }}>
                {money(pricing.fair)}
              </p>
              <p className="text-[14px] mb-6 tabular-nums" style={{ fontFamily: tf.mono, color: t.sage }}>
                {money(pricing.low)} – {money(pricing.high)}
              </p>

              {pricing.sourcesSummary && (
                <p className="text-[14px] mb-6" style={{ color: t.sage }}>{pricing.sourcesSummary}</p>
              )}

              {/* MARKET CONTEXT */}
              <div className="mb-8">
                <MarketSummary
                  fair={pricing.fair}
                  low={pricing.low}
                  high={pricing.high}
                  confidenceScore={pricing.confidenceScore}
                  dataPoints={pricing.sourcesCount}
                />
              </div>

              <div className="mb-8">
                <MarketPosition
                  fair={pricing.fair}
                  low={pricing.low}
                  high={pricing.high}
                  prices={combinedPrices(sources)}
                />
              </div>

              {/* EVIDENCE */}
              {distributionPrices.length > 0 && (
                <div className="mb-8 pt-6 border-t" style={{ borderColor: t.mist }}>
                  <PriceDistribution prices={distributionPrices} fair={pricing.fair} />
                </div>
              )}

              {sources.length > 0 && (
                <div className="mb-8 pt-6 border-t" style={{ borderColor: t.mist }}>
                  <ComparableSources sources={sources} activeIndex={activeSourceIndex} onSelect={setActiveSourceIndex} />
                </div>
              )}

              {sellerTips && sellerTips.length > 0 && (
                <div className="mb-8 pt-6 border-t" style={{ borderColor: t.mist }}>
                  <h3 className="text-sm font-semibold mb-3" style={{ color: t.ink }}>Seller tips</h3>
                  <ul className="space-y-2">
                    {sellerTips.map((tip, i) => (
                      <li key={i} className="flex items-start gap-2 text-[14px]" style={{ color: t.sage }}>
                        <Check className="shrink-0 mt-0.5" style={{ color: t.forest }} size={16} />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CREATE LISTING */}
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => {
                    navigate('/marketplace/new', {
                      state: {
                        fromAppraisal: true,
                        appraisalId: data.appraisalId,
                        title: item.name,
                        description: item.description || '',
                        category: item.category || '',
                        condition: item.condition || '',
                        recommendedPrice: pricing.fair,
                        priceLow: pricing.low,
                        priceHigh: pricing.high,
                        confidenceScore: pricing.confidenceScore,
                        sourcesCount: pricing.sourcesCount,
                        imageUrls: data.imageUrls ?? [],
                      },
                    });
                  }}
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto font-semibold text-[15px] py-3.5 px-6 rounded-sm transition-colors"
                  style={{ background: t.forest, color: t.parchment }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = t.terracotta; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = t.forest; }}
                >
                  List on YardFront
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
                <Link
                  to="/"
                  state={{ scrollTo: 'upload' }}
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto font-semibold text-[15px] py-3.5 px-6 rounded-sm border no-underline transition-colors"
                  style={{ borderColor: t.forest, color: t.forest }}
                >
                  Try Another Appraisal
                  <ArrowRight size={18} strokeWidth={2.5} />
                </Link>
              </div>

              <div className="mt-8 p-4 rounded-sm text-center border" style={{ background: t.parchment, borderColor: t.mist }}>
                <p className="text-[14px]" style={{ color: t.sage }}>
                  Want comparable listings and more data sources?{' '}
                  <Link to="/" state={{ scrollTo: 'pricing' }} className="font-semibold underline underline-offset-2" style={{ color: t.forest }}>
                    Upgrade to Pro
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppraisalResultsPage;
