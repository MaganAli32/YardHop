/**
 * ComparableSources — where the estimate's sold-price data actually came
 * from. Clicking a marketplace filters the distribution above it to that
 * source's own prices.
 */
import React from 'react';
import { colors as t, fonts as tf } from '../../lib/tokens';
import { money, type PricingSource } from '../../lib/market';

export interface ComparableSourcesProps {
  sources: PricingSource[];
  activeIndex: number | null;
  onSelect: (index: number | null) => void;
}

export default function ComparableSources({ sources, activeIndex, onSelect }: ComparableSourcesProps) {
  const maxCount = Math.max(1, ...sources.map((s) => s.count));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-4 mb-3">
        <div className="text-[11px] uppercase tracking-[0.12em]" style={{ color: t.sage, fontFamily: tf.mono }}>
          Where this data came from
        </div>
        {activeIndex !== null && (
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-[12px] underline underline-offset-2"
            style={{ color: t.terracotta, fontFamily: tf.mono }}
          >
            Clear
          </button>
        )}
      </div>
      <div className="border-t" style={{ borderColor: t.mist }}>
        {sources.map((s, i) => {
          const on = activeIndex === i;
          return (
            <button
              key={s.name + i}
              type="button"
              onClick={() => onSelect(on ? null : i)}
              className="w-full flex items-center gap-4 py-2.5 border-b text-left transition-colors"
              style={{ borderColor: t.mist, background: on ? t.terracottaCream : 'transparent' }}
            >
              <span className="text-[13.5px] flex-[1_1_180px] truncate" style={{ color: t.ink, fontWeight: on ? 600 : 400 }}>
                {s.name}
              </span>
              <span className="h-1.5 flex-1 rounded-sm overflow-hidden" style={{ background: `${t.mist}66` }}>
                <span
                  className="block h-full"
                  style={{ width: `${(s.count / maxCount) * 100}%`, background: on ? t.terracotta : t.forest }}
                />
              </span>
              <span className="text-[12.5px] tabular-nums text-right w-[52px]" style={{ color: t.sage, fontFamily: tf.mono }}>
                {s.count}
              </span>
              <span className="text-[13px] font-medium tabular-nums text-right w-[76px]" style={{ color: t.ink, fontFamily: tf.mono }}>
                {money(s.avg)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
