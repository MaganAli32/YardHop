/**
 * PriceIntelligenceBox — minimal price section: thin separator, range labels,
 * 2px track with orange fill + black dot, key-value rows. No heavy box.
 */

import React from 'react';
import PriceBadge, { getPriceBadgeType } from './PriceBadge';

export interface PriceIntelligenceBoxProps {
  priceLow: number;
  priceHigh: number;
  priceRecommended?: number;
  confidenceScore: number;
  sourcesCount?: number;
  sources?: string[] | Record<string, unknown>;
  askingPrice?: number;
  showConfidenceBar?: boolean;
}

function formatSources(sources: string[] | Record<string, unknown> | undefined): string {
  if (!sources) return '';
  if (Array.isArray(sources)) return sources.join(', ');
  if (typeof sources === 'object') {
    const keys = Object.keys(sources).filter((k) => sources[k]);
    return keys
      .map((k) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(', ');
  }
  return '';
}

export default function PriceIntelligenceBox({
  priceLow,
  priceHigh,
  confidenceScore,
  sourcesCount,
  sources,
  askingPrice,
  showConfidenceBar = true,
}: PriceIntelligenceBoxProps) {
  const badgeType =
    askingPrice != null
      ? getPriceBadgeType(askingPrice, priceLow, priceHigh)
      : 'unverified';
  const sourcesStr = formatSources(sources);

  // Position of current price on the range (0–100%)
  const rangeSpan = priceHigh - priceLow || 1;
  const dotPosition =
    askingPrice != null
      ? Math.min(100, Math.max(0, ((askingPrice - priceLow) / rangeSpan) * 100))
      : 50;

  return (
    <div className="pt-6 mt-6 border-t border-[#ECECEC]">
      <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#AAA] mb-4">
        Price Intelligence
      </div>
      <div className="flex justify-between text-[12px] text-[#888] mb-1.5">
        <span>${Math.round(priceLow).toLocaleString()}</span>
        {askingPrice != null && (
          <span className="text-[#0A0A0A] font-semibold">
            ${Math.round(askingPrice).toLocaleString()}
          </span>
        )}
        <span>${Math.round(priceHigh).toLocaleString()}</span>
      </div>
      <div className="h-0.5 bg-[#ECECEC] rounded-sm relative mb-1">
        <div
          className="absolute inset-y-0 left-0 bg-[#FF6B35] rounded-sm transition-all duration-500"
          style={{ width: `${dotPosition}%` }}
        />
        {askingPrice != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#0A0A0A] -translate-x-1/2"
            style={{ left: `${dotPosition}%` }}
          />
        )}
      </div>
      <div className="flex justify-between items-center mt-3.5">
        <span className="text-[11px] text-[#888]">Confidence</span>
        <span className="text-[11px] font-medium text-[#666]">
          {confidenceScore}%
        </span>
      </div>
      {sourcesCount != null && sourcesCount > 0 && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px] text-[#888]">Data points</span>
          <span className="text-[11px] font-medium text-[#666]">
            {sourcesCount} {sourcesStr ? `across ${sourcesStr.split(',').length} sources` : ''}
          </span>
        </div>
      )}
      {sourcesStr && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px] text-[#888]">Sources</span>
          <span className="text-[11px] font-medium text-[#666]">
            {sourcesStr}
          </span>
        </div>
      )}
      {askingPrice != null && (
        <div className="mt-2">
          <PriceBadge type={badgeType} size="md" />
        </div>
      )}
    </div>
  );
}
