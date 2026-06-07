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
      <div className="min-h-screen bg-[#F5F0E8] font-['Manrope']">
        <Navbar />
        <div className="pt-24 flex items-center justify-center">
          <p className="text-[#5c665f]">Loading...</p>
        </div>
      </div>
    );
  }

  const { item, pricing, sellerTips } = data;

  return (
    <div className="min-h-screen bg-[#F5F0E8] text-[#1A1A18] font-['Manrope']">
      <Navbar />
      <div className="max-w-[1200px] mx-auto px-6 py-12 md:py-20">
        <div className="pt-16 max-w-2xl mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#5c665f] hover:text-[#2C4A3E] mb-10"
          >
            ← Back to home
          </Link>

          <div className="bg-[#FAF7F2] border border-[#E8E2D9] rounded-sm shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-[#E8E2D9] bg-[#F5F0E8]/80">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
                <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
                <span className="w-2 h-2 rounded-full bg-[#28C840]" />
              </div>
              <span className="text-[13px] text-[#5c665f] ml-2">Appraisal</span>
              <span className="ml-auto text-xs font-semibold text-[#2C4A3E] bg-[#2C4A3E]/10 px-2 py-0.5 rounded-sm border border-[#E8E2D9]">
                Complete
              </span>
            </div>

            <div className="p-6 md:p-8">
              <h1
                className="text-[22px] md:text-3xl text-[#1A1A18] mb-1 italic"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}
              >
                {item.name}
              </h1>
              {item.description && (
                <p className="text-[13px] text-[#5c665f] mb-6">
                  {item.description}
                </p>
              )}

              <p className="text-[36px] font-semibold text-[#1A1A18] mb-1 font-mono tracking-tight">
                ${Math.round(pricing.fair).toLocaleString()}
              </p>
              <p className="text-[14px] text-[#5c665f] mb-6 font-mono">
                ${Math.round(pricing.low).toLocaleString()} – $
                {Math.round(pricing.high).toLocaleString()}
              </p>

              <div className="mb-6">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-[#5c665f] font-medium">Confidence</span>
                  <span className="font-semibold text-[#2C4A3E] font-mono">
                    {pricing.confidenceScore}%
                  </span>
                </div>
                <div className="h-1 w-full bg-[#E8E2D9] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-[#2C4A3E] rounded-sm transition-all duration-[1.8s] ease-[cubic-bezier(0.25,1,0.5,1)]"
                    style={{ width: `${pricing.confidenceScore}%` }}
                  />
                </div>
              </div>

              {pricing.sourcesSummary && (
                <p className="text-[14px] text-[#5c665f] mb-6">
                  {pricing.sourcesSummary}
                </p>
              )}

              {sellerTips && sellerTips.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-[#1A1A18] mb-3">
                    Seller tips
                  </h3>
                  <ul className="space-y-2">
                    {sellerTips.map((tip, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-[14px] text-[#5c665f]"
                      >
                        <Check
                          className="shrink-0 mt-0.5 text-[#2C4A3E]"
                          size={16}
                        />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

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
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto bg-[#2C4A3E] text-[#F5F0E8] font-semibold text-[15px] py-3.5 px-6 rounded-sm hover:bg-[#3a5f50] transition-colors"
                >
                  List on YardFront
                  <ArrowRight size={18} strokeWidth={2.5} />
                </button>
                <Link
                  to="/"
                  state={{ scrollTo: 'upload' }}
                  className="inline-flex items-center justify-center gap-2 w-full md:w-auto border border-[#2C4A3E] text-[#2C4A3E] font-semibold text-[15px] py-3.5 px-6 rounded-sm hover:bg-[#2C4A3E]/5 transition-colors no-underline"
                >
                  Try Another Appraisal
                  <ArrowRight size={18} strokeWidth={2.5} />
                </Link>
              </div>

              <div className="mt-8 p-4 bg-[#F5F0E8] border border-[#E8E2D9] rounded-sm text-center">
                <p className="text-[14px] text-[#5c665f]">
                  Want comparable listings and more data sources?{' '}
                  <Link to="/" state={{ scrollTo: 'pricing' }} className="text-[#2C4A3E] font-semibold hover:text-[#C4622D] underline underline-offset-2">
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
