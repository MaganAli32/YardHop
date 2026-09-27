/**
 * PriceIntelligenceBox — minimal price section on a marketplace listing: thin
 * separator, range labels, 2px track with orange fill + black dot, key-value
 * rows. Uses the legacy parchment tokens since ListingDetailPage hasn't been
 * migrated to the `ui`/`type` system yet (see lib/tokens.ts).
 */

import React from 'react';
import { colors as t } from '../lib/tokens';
import PriceBadge, { getPriceBadgeType } from './PriceBadge';

export interface PriceIntelligenceBoxProps {
  priceLow: number;
  priceHigh: number;
  priceRecommended?: number;
  confidenceScore: number;
  sourcesCount?: number;
  sources?: string[] | Record<string, unknown> | null;
  askingPrice?: number;
  showConfidenceBar?: boolean;
}

function formatSources(sources: PriceIntelligenceBoxProps['sources']): string {
  if (!sources) return '';
  if (Array.isArray(sources)) {
    return sources
      .map((s) => (typeof s === 'string' ? s : (s as { name?: string })?.name))
      .filter((s): s is string => Boolean(s))
      .map((s) => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()))
      .join(', ');
  }
  if (typeof sources === 'object') {
    return Object.keys(sources)
      .filter((k) => (sources as Record<string, unknown>)[k])
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
  const badgeType = askingPrice != null ? getPriceBadgeType(askingPrice, priceLow, priceHigh) : 'unverified';
  const sourcesStr = formatSources(sources);

  const rangeSpan = priceHigh - priceLow || 1;
  const dotPosition = askingPrice != null ? Math.min(100, Math.max(0, ((askingPrice - priceLow) / rangeSpan) * 100)) : 50;

  return (
    <div className="pt-6 mt-6 border-t" style={{ borderColor: t.mist }}>
      <div className="text-[10px] font-semibold uppercase tracking-[1.5px] mb-4" style={{ color: t.sage }}>
        Price Intelligence
      </div>
      <div className="flex justify-between text-[12px] mb-1.5" style={{ color: t.sage }}>
        <span>${Math.round(priceLow).toLocaleString()}</span>
        {askingPrice != null && (
          <span className="font-semibold" style={{ color: t.ink }}>
            ${Math.round(askingPrice).toLocaleString()}
          </span>
        )}
        <span>${Math.round(priceHigh).toLocaleString()}</span>
      </div>
      <div className="h-0.5 rounded-sm relative mb-1" style={{ background: t.mist }}>
        <div
          className="absolute inset-y-0 left-0 rounded-sm transition-all duration-500"
          style={{ width: `${dotPosition}%`, background: t.terracotta }}
        />
        {askingPrice != null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full -translate-x-1/2"
            style={{ left: `${dotPosition}%`, background: t.ink }}
          />
        )}
      </div>
      {showConfidenceBar && (
        <div className="flex justify-between items-center mt-3.5">
          <span className="text-[11px]" style={{ color: t.sage }}>Confidence</span>
          <span className="text-[11px] font-medium" style={{ color: t.ink }}>{confidenceScore}%</span>
        </div>
      )}
      {sourcesCount != null && sourcesCount > 0 && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px]" style={{ color: t.sage }}>Data points</span>
          <span className="text-[11px] font-medium" style={{ color: t.ink }}>
            {sourcesCount}{sourcesStr ? ` across ${sourcesStr.split(',').length} sources` : ''}
          </span>
        </div>
      )}
      {sourcesStr && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px]" style={{ color: t.sage }}>Sources</span>
          <span className="text-[11px] font-medium text-right" style={{ color: t.ink }}>{sourcesStr}</span>
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
