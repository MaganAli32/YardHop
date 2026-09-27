/**
 * MarketSummary — one horizontal strip of real numbers separated by thin
 * rules. No KPI cards, no invented metrics: every value here comes straight
 * from the appraisal response.
 */
import React from 'react';
import { colors as t, fonts as tf } from '../../lib/tokens';
import { money } from '../../lib/market';

export interface MarketSummaryProps {
  fair: number;
  low: number;
  high: number;
  confidenceScore: number;
  dataPoints?: number;
}

export default function MarketSummary({ fair, low, high, confidenceScore, dataPoints }: MarketSummaryProps) {
  const items: { k: string; v: string }[] = [
    { k: 'Estimated value', v: money(fair) },
    { k: 'Typical range', v: `${money(low)}–${money(high)}` },
    { k: 'Confidence', v: `${Math.round(confidenceScore)}%` },
  ];
  if (dataPoints != null) items.push({ k: 'Data points', v: String(dataPoints) });

  return (
    <div
      className="flex flex-wrap border-y"
      style={{ borderColor: t.mist }}
    >
      {items.map((item, i) => (
        <div
          key={item.k}
          className="flex-1 min-w-[130px] px-5 py-4"
          style={{ borderLeft: i === 0 ? undefined : `1px solid ${t.mist}` }}
        >
          <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: t.sage, fontFamily: tf.mono }}>
            {item.k}
          </div>
          <div className="mt-1.5 text-[19px] font-semibold tracking-[-0.01em] tabular-nums" style={{ color: t.ink, fontFamily: tf.mono }}>
            {item.v}
          </div>
        </div>
      ))}
    </div>
  );
}
