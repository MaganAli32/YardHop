/**
 * PriceIntelligenceBox — compact market data for a listing (Level 2: smaller
 * than the full appraisal page, same underlying numbers). Shows the real
 * market-position bar when per-marketplace stats are available; otherwise
 * falls back to the plain range it always showed.
 */

import React from 'react';
import { colors as t, fonts as tf } from '../lib/tokens';
import { combinedPrices, money, type PricingSource } from '../lib/market';
import MarketPosition from './market/MarketPosition';
import PriceBadge, { getPriceBadgeType } from './PriceBadge';

export interface PriceIntelligenceBoxProps {
  priceLow: number;
  priceHigh: number;
  priceRecommended?: number;
  confidenceScore: number;
  sourcesCount?: number;
  /** Either the full per-marketplace stats, or (older rows) just source names. */
  sources?: PricingSource[] | string[] | Record<string, unknown> | null;
  askingPrice?: number;
  showConfidenceBar?: boolean;
}

function isRichSources(sources: PriceIntelligenceBoxProps['sources']): sources is PricingSource[] {
  return Array.isArray(sources) && sources.length > 0 && typeof sources[0] === 'object' && sources[0] !== null && 'avg' in (sources[0] as object);
}

function sourceNames(sources: PriceIntelligenceBoxProps['sources']): string[] {
  if (!sources) return [];
  if (isRichSources(sources)) return sources.map((s) => s.name).filter(Boolean);
  if (Array.isArray(sources)) return sources.filter((s): s is string => typeof s === 'string');
  return Object.keys(sources).filter((k) => (sources as Record<string, unknown>)[k]);
}

function label(name: string): string {
  return name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
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
  const names = sourceNames(sources).map(label);
  const rich = isRichSources(sources) ? sources : null;
  const fair = rich ? Math.round((priceLow + priceHigh) / 2) : null;
  const prices = rich ? combinedPrices(rich) : [];

  return (
    <div className="pt-6 mt-6 border-t" style={{ borderColor: t.mist }}>
      <div className="text-[10px] font-semibold uppercase tracking-[1.5px] mb-4" style={{ color: t.sage, fontFamily: tf.mono }}>
        Price Intelligence
      </div>

      {rich && fair != null && prices.length > 0 ? (
        <MarketPosition fair={fair} low={priceLow} high={priceHigh} prices={prices} askingPrice={askingPrice} />
      ) : (
        <>
          <div className="flex justify-between text-[12px] mb-1.5" style={{ color: t.sage, fontFamily: tf.mono }}>
            <span>{money(priceLow)}</span>
            {askingPrice != null && (
              <span className="font-semibold" style={{ color: t.ink }}>
                {money(askingPrice)}
              </span>
            )}
            <span>{money(priceHigh)}</span>
          </div>
          <div className="h-0.5 rounded-sm relative mb-1" style={{ background: t.mist }}>
            {askingPrice != null && (
              <>
                <div
                  className="absolute inset-y-0 left-0 rounded-sm"
                  style={{ width: `${Math.min(100, Math.max(0, ((askingPrice - priceLow) / Math.max(1, priceHigh - priceLow)) * 100))}%`, background: t.terracotta }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full -translate-x-1/2"
                  style={{ left: `${Math.min(100, Math.max(0, ((askingPrice - priceLow) / Math.max(1, priceHigh - priceLow)) * 100))}%`, background: t.ink }}
                />
              </>
            )}
          </div>
        </>
      )}

      {showConfidenceBar && (
        <div className="flex justify-between items-center mt-3.5">
          <span className="text-[11px]" style={{ color: t.sage }}>Confidence</span>
          <span className="text-[11px] font-medium" style={{ color: t.ink, fontFamily: tf.mono }}>{confidenceScore}%</span>
        </div>
      )}
      {sourcesCount != null && sourcesCount > 0 && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px]" style={{ color: t.sage }}>Data points</span>
          <span className="text-[11px] font-medium" style={{ color: t.ink, fontFamily: tf.mono }}>
            {sourcesCount}{names.length ? ` across ${names.length} sources` : ''}
          </span>
        </div>
      )}
      {names.length > 0 && (
        <div className="flex justify-between items-center mt-2">
          <span className="text-[11px]" style={{ color: t.sage }}>Sources</span>
          <span className="text-[11px] font-medium text-right" style={{ color: t.ink }}>{names.join(', ')}</span>
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
