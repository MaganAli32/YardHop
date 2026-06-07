import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PriceBadge, { getPriceBadgeType } from '../components/PriceBadge';
import PriceIntelligenceBox from '../components/PriceIntelligenceBox';
import { marketplaceApi } from '../lib/api';
import { MapPin, Package, Clock } from 'lucide-react';

function formatTimeAgo(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return '1 day ago';
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

export default function ListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    marketplaceApi
      .get(id)
      .then((data) => {
        if (!cancelled) setListing(data);
      })
      .catch(() => {
        if (!cancelled) setError('Listing not found');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading || !listing) {
    return (
      <div className="min-h-screen bg-[#F0EAE0] flex items-center justify-center">
        <p className="text-[#6B7A6D]">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#F0EAE0]">
        <Navbar />
        <div className="pt-24 px-6 text-center">
          <p className="text-[18px] text-[#6B6B6B]">{error}</p>
          <Link
            to="/marketplace"
            className="inline-block mt-4 text-[#FF6B35] font-semibold hover:underline"
          >
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const appraisal = listing.appraisal;
  const images = listing.images || [];
  const badgeType = appraisal
    ? getPriceBadgeType(
        listing.asking_price,
        appraisal.price_low,
        appraisal.price_high
      )
    : 'unverified';

  return (
    <div className="min-h-screen bg-[#F0EAE0] text-[#1A1A1A] font-sans antialiased">
      <Navbar />
      <div className="pt-28 pb-28 px-6 md:px-[56px] max-w-[1220px] mx-auto">
        <Link
          to="/marketplace"
          className="inline-flex items-center gap-1 text-[12px] text-[#8D8478] no-underline mt-8 mb-6 hover:text-[#1A1A18]"
        >
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          Marketplace
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-14">
          {/* Left column */}
          <div>
            <div className="w-full aspect-[4/3] rounded-sm overflow-hidden bg-[#EDE4D7] border border-[#DED3C3]">
              {images[0] ? (
                <img src={images[0]} alt={listing.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#888]">No image</div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-1.5 mt-1.5">
                {images.map((url: string, i: number) => (
                  <button key={i} type="button" className="w-16 h-16 rounded-sm overflow-hidden shrink-0 opacity-60 hover:opacity-100 focus:opacity-100 transition-opacity bg-[#EDE4D7] border border-[#DED3C3]">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {listing.description && (
              <div className="mt-10">
                <div className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#9E8B6F] mb-3">Description</div>
                <p className="text-[15px] leading-[1.8] text-[#6B7A6D] whitespace-pre-wrap">
                  {listing.description}
                </p>
              </div>
            )}

            {listing.seller && (
              <div className="mt-8 flex items-center gap-3">
                {listing.seller.avatar_url ? (
                  <img src={listing.seller.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-[#ECECEC] flex items-center justify-center text-[13px] font-semibold text-[#666]">
                    {(listing.seller.name || 'U')[0]}
                  </div>
                )}
                <div>
                  <p className="text-[13px] font-semibold text-[#0A0A0A]">{listing.seller.name || 'Seller'}</p>
                  <p className="text-[11px] text-[#888]">
                    Member since {listing.seller.member_since ? new Date(listing.seller.member_since).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—'} · {listing.seller.listing_count ?? 0} listings
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right column — sticky, no box */}
          <div className="lg:sticky lg:top-24 lg:self-start rounded-sm border border-[#DED3C3] bg-[#FAF7F2] p-6">
            <h1 className="font-['Cormorant_Garamond'] text-[42px] font-light text-[#1A1A18] leading-[0.95] tracking-[-0.02em]">
              {listing.title}
            </h1>
            <p className="text-[12px] text-[#8D8478] mt-2">
              {listing.condition} · {listing.category}
            </p>

            <div className="mt-6">
              <div className="text-[44px] font-semibold text-[#1A1A18] tracking-[-0.04em]">
                ${Math.round(listing.asking_price).toLocaleString()}
              </div>
              <div className="text-[13px] font-semibold mt-1">
                <PriceBadge type={badgeType} size="md" />
              </div>
            </div>

            {appraisal ? (
              <PriceIntelligenceBox
                priceLow={appraisal.price_low}
                priceHigh={appraisal.price_high}
                priceRecommended={appraisal.price_recommended}
                confidenceScore={appraisal.confidence_score ?? 0}
                sourcesCount={appraisal.sources_count ?? (Array.isArray(appraisal.sources) ? appraisal.sources.length : Object.keys(appraisal.sources || {}).length)}
                sources={appraisal.sources}
                askingPrice={listing.asking_price}
              />
            ) : (
              <div className="pt-6 mt-6 border-t border-[#DED3C3]">
                <p className="text-[14px] text-[#6B7A6D] mb-3">Price not verified</p>
                <Link to="/#try" className="inline-block py-2 px-4 rounded-sm bg-[#1A2A1C] text-[#F0EAE0] text-[12px] uppercase tracking-[0.08em] font-semibold hover:opacity-90 no-underline">
                  Request an Appraisal
                </Link>
              </div>
            )}

            <div className="mt-7 pt-6 border-t border-[#DED3C3] flex flex-col gap-2.5">
              {listing.location && (
                <div className="flex items-center gap-2 text-[13px] text-[#666]">
                  <MapPin className="w-3.5 h-3.5 text-[#AAA]" />
                  {listing.location}
                </div>
              )}
              <div className="flex items-center gap-2 text-[13px] text-[#666]">
                <Package className="w-3.5 h-3.5 text-[#AAA]" />
                {listing.shipping === 'local' ? 'Local pickup only' : listing.shipping === 'shipping' ? 'Will ship' : 'Local pickup or shipping'}
              </div>
              <div className="flex items-center gap-2 text-[13px] text-[#666]">
                <Clock className="w-3.5 h-3.5 text-[#AAA]" />
                Listed {formatTimeAgo(listing.created_at)}
              </div>
            </div>

            <div className="mt-7 flex flex-col gap-2">
              <button type="button" className="w-full py-3.5 rounded-sm bg-[#1A2A1C] text-[#F0EAE0] text-[12px] uppercase tracking-[0.08em] font-semibold hover:opacity-90">
                Message Seller
              </button>
              <button type="button" className="w-full py-3 rounded-sm border border-[#D4C9B9] text-[12px] uppercase tracking-[0.08em] font-semibold text-[#1A1A18] hover:border-[#A49A8C]">
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
