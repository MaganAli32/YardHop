/**
 * PriceBadge — text-only price intelligence label (no emojis, no boxes)
 * Fair Price | Great Deal | Above Market | Overpriced | Unverified
 */

import React from 'react';

export type PriceBadgeType =
  | 'great_deal'
  | 'fair_price'
  | 'above_market'
  | 'overpriced'
  | 'unverified';

export interface PriceBadgeProps {
  type: PriceBadgeType;
  className?: string;
  size?: 'sm' | 'md';
}

const BADGE_CONFIG: Record<
  PriceBadgeType,
  { label: string; className: string }
> = {
  great_deal: {
    label: 'Great Deal',
    className: 'text-[#1A8B4F]',
  },
  fair_price: {
    label: 'Fair Price',
    className: 'text-[#1A8B4F]',
  },
  above_market: {
    label: 'Above Market',
    className: 'text-[#B8860B]',
  },
  overpriced: {
    label: 'Overpriced',
    className: 'text-[#C0392B]',
  },
  unverified: {
    label: 'Unverified',
    className: 'text-[#888]',
  },
};

/**
 * Compute badge type from asking price vs appraisal range
 */
export function getPriceBadgeType(
  askingPrice: number,
  priceLow: number | null,
  priceHigh: number | null
): PriceBadgeType {
  if (priceLow == null || priceHigh == null) return 'unverified';

  if (askingPrice < priceLow * 0.85) return 'great_deal';
  if (askingPrice >= priceLow * 0.85 && askingPrice <= priceHigh)
    return 'fair_price';
  if (askingPrice > priceHigh && askingPrice <= priceHigh * 1.15)
    return 'above_market';
  if (askingPrice > priceHigh * 1.15) return 'overpriced';
  return 'unverified';
}

export default function PriceBadge({
  type,
  className = '',
  size = 'sm',
}: PriceBadgeProps) {
  const config = BADGE_CONFIG[type];
  const sizeClass = size === 'sm' ? 'text-[11px]' : 'text-[13px]';

  return (
    <span
      className={`inline-block font-semibold tracking-[0.05em] ${config.className} ${sizeClass} ${className}`}
    >
      {config.label}
    </span>
  );
}
