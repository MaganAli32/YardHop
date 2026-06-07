import React from 'react';
import { Link } from 'react-router-dom';
import PriceBadge, { getPriceBadgeType } from './PriceBadge';

export interface ListingCardData {
  id: string;
  title: string;
  condition: string;
  category: string;
  asking_price: number;
  images: string[];
  location?: string;
  created_at: string;
  appraisal?: {
    price_low: number;
    price_high: number;
    confidence_score?: number;
  } | null;
}

export interface ListingCardProps {
  listing: ListingCardData;
  className?: string;
  animationDelay?: number;
}

export default function ListingCard({
  listing,
  className = '',
  animationDelay = 0,
}: ListingCardProps) {
  const { appraisal } = listing;
  const priceLow = appraisal?.price_low ?? null;
  const priceHigh = appraisal?.price_high ?? null;
  const badgeType = getPriceBadgeType(
    listing.asking_price,
    priceLow,
    priceHigh
  );
  const imageUrl = listing.images?.[0] || '';
  const subText = [listing.condition, listing.location].filter(Boolean).join(' · ');

  return (
    <Link
      to={`/marketplace/${listing.id}`}
      className={`block group ${className}`}
      style={{
        animationDelay: animationDelay ? `${animationDelay}ms` : undefined,
      }}
    >
      <article className="rounded-sm border border-[#E2D8C8] bg-[#FAF7F2] overflow-hidden shadow-[0_1px_0_rgba(26,26,24,0.03)] transition-all duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_24px_rgba(26,26,24,0.08)]">
      <div className="relative w-full aspect-square bg-[#EFE8DD] overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#A49A8C]">
            <svg
              className="w-14 h-14"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                x="2"
                y="6"
                width="20"
                height="12"
                rx="2"
                strokeWidth={1.5}
              />
              <path d="M12 12h.01" strokeWidth={1.5} />
            </svg>
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5">
          <PriceBadge type={badgeType} size="sm" />
        </div>
      </div>
      <div className="px-4 py-3.5">
        <h3 className="font-['Cormorant_Garamond'] text-[24px] leading-[1.05] text-[#1A1A18] line-clamp-1">
          {listing.title}
        </h3>
        {subText && (
          <p className="text-[12px] text-[#7A7268] mt-1">
            {subText}
          </p>
        )}
        <div className="flex items-baseline gap-2 mt-2.5">
          <span className="text-[19px] font-semibold text-[#1A1A18] tracking-[-0.02em]">
            ${Math.round(listing.asking_price).toLocaleString()}
          </span>
          {priceLow != null && priceHigh != null ? (
            <span className="text-[11px] text-[#9E8B6F]">
              ${Math.round(priceLow).toLocaleString()} – $
              {Math.round(priceHigh).toLocaleString()}
            </span>
          ) : (
            <span className="text-[11px] text-[#9E8B6F] italic">No data</span>
          )}
        </div>
      </div>
      </article>
    </Link>
  );
}
