/**
 * ListingCard — minimal marketplace card: image, badge, name, condition/location, price + range
 * No border, no save button, no footer row.
 */

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
      <div className="relative w-full aspect-square bg-[#F7F7F7] rounded-xl overflow-hidden">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#AAA]">
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
      <div className="pt-3 px-0.5">
        <h3 className="text-[14px] font-medium text-[#0A0A0A] leading-snug line-clamp-1">
          {listing.title}
        </h3>
        {subText && (
          <p className="text-[12px] text-[#888] mt-0.5">
            {subText}
          </p>
        )}
        <div className="flex items-baseline gap-2 mt-2">
          <span className="text-[17px] font-semibold text-[#0A0A0A] tracking-[-0.03em]">
            ${Math.round(listing.asking_price).toLocaleString()}
          </span>
          {priceLow != null && priceHigh != null ? (
            <span className="text-[11px] text-[#AAA]">
              ${Math.round(priceLow).toLocaleString()} – $
              {Math.round(priceHigh).toLocaleString()}
            </span>
          ) : (
            <span className="text-[11px] text-[#AAA] italic">No data</span>
          )}
        </div>
      </div>
    </Link>
  );
}
