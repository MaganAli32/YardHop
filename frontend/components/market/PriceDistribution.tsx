/**
 * PriceDistribution — a histogram built only from real sold/asking prices
 * pulled from the appraisal's sources. Below MIN_HISTOGRAM_POINTS real data
 * points this renders nothing rather than a fabricated chart — callers
 * should show a plain sentence instead.
 */
import React from 'react';
import { colors as t, fonts as tf } from '../../lib/tokens';
import { buildHistogram, money } from '../../lib/market';

export interface PriceDistributionProps {
  prices: number[];
  fair: number;
}

export default function PriceDistribution({ prices, fair }: PriceDistributionProps) {
  const hist = buildHistogram(prices);
  if (!hist) return null;
  const maxCount = Math.max(1, ...hist.bins.map((b) => b.count));
  const fairBin = Math.min(
    hist.bins.length - 1,
    Math.max(0, Math.floor((fair - hist.min) / hist.binWidth)),
  );

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-4">
        <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: t.sage, fontFamily: tf.mono }}>
          Price distribution
        </div>
        <div className="text-[12px]" style={{ color: t.sage, fontFamily: tf.mono }}>
          {prices.length} sold prices found
        </div>
      </div>
      <div className="flex items-end gap-[3px] h-[96px]">
        {hist.bins.map((b, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[2px] transition-colors"
            title={`${money(b.lo)}–${money(b.hi)} · ${b.count} sold`}
            style={{
              height: `${Math.max(4, (b.count / maxCount) * 100)}%`,
              background: i === fairBin ? t.terracotta : t.forest,
              opacity: i === fairBin ? 1 : 0.7,
            }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[11.5px] tabular-nums" style={{ color: t.sage, fontFamily: tf.mono }}>
        <span>{money(hist.min)}</span>
        <span>{money(hist.max)}</span>
      </div>
    </div>
  );
}
