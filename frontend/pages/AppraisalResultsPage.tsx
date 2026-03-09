/**
 * Appraisal Results — displays result from POST /api/appraise
 * Reads sessionStorage key `appraisalResult`; redirects to / if missing.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowRight, Check } from 'lucide-react';

interface AppraisalResult {
  appraisalId?: string | null;
  item: {
    name: string;
    brand?: string | null;
    category?: string;
    condition?: string;
    description?: string;
  };
  pricing: {
    fair: number;
    low: number;
    high: number;
    confidenceScore: number;
    sourcesSummary?: string;
    sourcesCount?: number;
  };
  sellerTips?: string[];
  elapsedSeconds?: string;
}

const AppraisalResultsPage: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<AppraisalResult | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('appraisalResult');
    if (!raw) {
      navigate('/', { replace: true });
      return;
    }
    try {
      const parsed = JSON.parse(raw) as AppraisalResult;
      if (!parsed?.item?.name || parsed?.pricing == null) {
        navigate('/', { replace: true });
        return;
      }
      setData(parsed);
    } catch {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  if (data === null) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] font-sans">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <p className="text-[#6B6B6B]">Loading...</p>
        </div>
      </div>
    );
  }

  const { item, pricing, sellerTips } = data;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#0A0A0A] font-sans">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-12 md:py-16">
        {/* Back / Home */}
        <div className="pt-16" />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#6B6B6B] hover:text-[#0A0A0A] mb-10"
        >
          ← Back to home
        </Link>

        {/* Card */}
        <div className="bg-white border border-[#E0E0E0] rounded-[20px] shadow-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-6 py-4 border-b border-[#E0E0E0] bg-[#F2F2F2]/50">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
              <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
              <span className="w-2 h-2 rounded-full bg-[#28C840]" />
            </div>
            <span className="text-[13px] text-[#6B6B6B] ml-2">Appraisal</span>
            <span className="ml-auto text-xs font-semibold text-[#28C840] bg-[#28C840]/10 px-2 py-0.5 rounded-full">
              Complete
            </span>
          </div>

          <div className="p-6 md:p-8">
            {/* Item name */}
            <h1 className="font-serif text-[22px] md:text-2xl text-[#0A0A0A] mb-1">
              {item.name}
            </h1>
            {item.description && (
              <p className="text-[13px] text-[#9A9A9A] mb-6">
                {item.description}
              </p>
            )}

            {/* Price */}
            <p className="text-[36px] font-bold text-[#0A0A0A] mb-1">
              ${Math.round(pricing.fair).toLocaleString()}
            </p>
            <p className="text-[14px] text-[#9A9A9A] mb-6">
              ${Math.round(pricing.low).toLocaleString()} – $
              {Math.round(pricing.high).toLocaleString()}
            </p>

            {/* Confidence */}
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-1.5">
                <span className="text-[#6B6B6B] font-medium">Confidence</span>
                <span className="font-semibold text-[#0A0A0A]">
                  {pricing.confidenceScore}%
                </span>
              </div>
              <div className="h-1 w-full bg-[#F2F2F2] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#FF6B35] rounded-full transition-all duration-[1.8s] ease-[cubic-bezier(0.25,1,0.5,1)]"
                  style={{ width: `${pricing.confidenceScore}%` }}
                />
              </div>
            </div>

            {/* Sources summary */}
            {pricing.sourcesSummary && (
              <p className="text-[14px] text-[#6B6B6B] mb-6">
                {pricing.sourcesSummary}
              </p>
            )}

            {/* Seller tips */}
            {sellerTips && sellerTips.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-[#0A0A0A] mb-3">
                  Seller tips
                </h3>
                <ul className="space-y-2">
                  {sellerTips.map((tip, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-[14px] text-[#6B6B6B]"
                    >
                      <Check
                        className="shrink-0 mt-0.5 text-[#16A34A]"
                        size={16}
                      />
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* CTAs */}
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
                    },
                  });
                }}
                className="inline-flex items-center justify-center gap-2 w-full md:w-auto bg-[#0A0A0A] text-white font-semibold text-[15px] py-3.5 px-6 rounded-[100px] hover:opacity-90 transition"
              >
                List on YardFront
                <ArrowRight size={18} strokeWidth={2.5} />
              </button>
              <Link
                to="/"
                state={{ scrollTo: 'upload' }}
                className="inline-flex items-center justify-center gap-2 w-full md:w-auto border border-[#E0E0E0] text-[#0A0A0A] font-semibold text-[15px] py-3.5 px-6 rounded-[100px] hover:border-[#FF6B35] hover:text-[#FF6B35] transition no-underline"
              >
                Try Another Appraisal
                <ArrowRight size={18} strokeWidth={2.5} />
              </Link>
            </div>

            {/* Upsell banner */}
            <div className="mt-8 p-4 bg-[#F2F2F2] rounded-xl text-center">
              <p className="text-[14px] text-[#6B6B6B]">
                Want comparable listings and more data sources?{' '}
                <Link to="/" state={{ scrollTo: 'pricing' }} className="text-[#FF6B35] font-semibold hover:underline">
                  Upgrade to Pro
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppraisalResultsPage;
