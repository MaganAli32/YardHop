/**
 * MarketPosition — "where does this price sit in the market?" Every real
 * sold price behind the appraisal is a tick; the typical (low–high) range is
 * a light band; the estimate is the one terracotta marker. Optionally shows
 * where an asking price sits too (for listings, not just fresh appraisals).
 */
import React from 'react';
import { colors as t, fonts as tf } from '../../lib/tokens';
import { money, positionOf } from '../../lib/market';

export interface MarketPositionProps {
  fair: number;
  low: number;
  high: number;
  /** Real individual sold prices, when available — rendered as ticks. */
  prices?: number[];
  /** An asking/listing price to also mark, distinct from the estimate. */
  askingPrice?: number;
}

export default function MarketPosition({ fair, low, high, prices = [], askingPrice }: MarketPositionProps) {
  const all = [...prices, fair, low, high, ...(askingPrice != null ? [askingPrice] : [])];
  const axisLow = Math.min(...all);
  const axisHigh = Math.max(...all);
  const pOf = (v: number) => positionOf(v, axisLow, axisHigh);

  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.12em] mb-6" style={{ color: t.sage, fontFamily: tf.mono }}>
        Market position
      </div>
      <div className="relative h-[64px]">
        <div
          className="absolute top-[18px] h-[20px]"
          style={{
            left: `${pOf(low)}%`,
            width: `${pOf(high) - pOf(low)}%`,
            background: t.terracottaSoft,
            opacity: 0.5,
          }}
        />
        <div className="absolute inset-x-0 top-[18px] h-[20px]">
          {prices.map((p, i) => (
            <span
              key={i}
              className="absolute bottom-0 w-px"
              style={{ left: `${pOf(p)}%`, height: 12, background: t.forest, opacity: 0.28 }}
            />
          ))}
        </div>
        <div className="absolute inset-x-0 top-[38px] h-px" style={{ background: t.mist }} />
        <div className="absolute left-0 top-[46px] text-[11.5px] tabular-nums" style={{ color: t.sage, fontFamily: tf.mono }}>
          {money(axisLow)}
        </div>
        <div className="absolute right-0 top-[46px] text-[11.5px] tabular-nums" style={{ color: t.sage, fontFamily: tf.mono }}>
          {money(axisHigh)}
        </div>
        {askingPrice != null && (
          <div
            className="absolute top-[22px] w-2 h-2 -translate-x-1/2 rounded-full"
            style={{ left: `${pOf(askingPrice)}%`, background: t.ink, border: `2px solid ${t.chalk}` }}
            aria-label={`Asking price ${money(askingPrice)}`}
          />
        )}
        <div
          className="absolute top-[14px] w-0.5 h-[28px] -translate-x-1/2"
          style={{ left: `${pOf(fair)}%`, background: t.terracotta }}
        />
        <div
          className="absolute top-0 -translate-x-1/2 whitespace-nowrap text-[12.5px] font-semibold tabular-nums"
          style={{ left: `${pOf(fair)}%`, color: t.terracotta, fontFamily: tf.mono }}
        >
          {money(fair)}
        </div>
      </div>
    </div>
  );
}
