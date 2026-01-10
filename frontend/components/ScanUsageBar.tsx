import React, { useEffect, useState } from 'react';
import { aiApi } from '../lib/api';

interface UsageData {
  tier: string;
  usage: {
    current: number;
    limit: number | string;
    remaining: number | string;
    percentage: number;
  };
  resetsAt: string;
}

interface ScanUsageBarProps {
  onUpgradeClick?: () => void;
}

export const ScanUsageBar: React.FC<ScanUsageBarProps> = ({ onUpgradeClick }) => {
  const [usage, setUsage] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsage = async () => {
      try {
        const data = await aiApi.getUsage();
        setUsage(data);
      } catch (error) {
        console.error('Failed to fetch usage:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsage();
  }, []);

  if (loading || !usage) return null;

  const isLimitReached = usage.usage.remaining === 0;
  const isLowScans = typeof usage.usage.remaining === 'number' && usage.usage.remaining <= 1;
  const remaining = typeof usage.usage.remaining === 'number' ? usage.usage.remaining : 0;
  const limit = typeof usage.usage.limit === 'number' ? usage.usage.limit : 10;
  const used = usage.usage.current;

  // Calculate how many bars to show (max 10 bars)
  const maxBars = 10;
  const barsToShow = Math.min(maxBars, limit);
  const filledBars = Math.min(barsToShow, Math.ceil((used / limit) * barsToShow));

  return (
    <div className={`flex items-center justify-between bg-[#121c32] text-white px-5 py-3 rounded-md mb-8 shadow-[0_10px_28px_rgba(18,28,50,0.15)] ${
      isLimitReached ? 'ring-2 ring-red-500/50' : ''
    }`}>
      <div className="flex items-center gap-4">
        {/* Visual Progress Bars */}
        <div className="flex gap-1.5">
          {Array.from({ length: barsToShow }).map((_, i) => (
            <div 
              key={i} 
              className={`h-1 w-5 rounded-sm transition-colors ${
                i < filledBars 
                  ? isLimitReached 
                    ? 'bg-red-500' 
                    : isLowScans 
                      ? 'bg-orange-400' 
                      : 'bg-[#FF6B35]'
                  : 'bg-white/20'
              }`} 
            />
          ))}
        </div>
        
        {/* Usage Text */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold tracking-wide uppercase">
            {isLimitReached 
              ? 'Limit reached' 
              : `${remaining} of ${limit} free scan${remaining !== 1 ? 's' : ''} remaining`
            }
          </span>
          {!isLimitReached && usage.resetsAt && (
            <span className="text-[10px] text-white/60 font-medium">
              Resets {new Date(usage.resetsAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      
      {/* Upgrade Button */}
      <button 
        onClick={onUpgradeClick}
        className={`text-[10px] font-bold py-1.5 px-3 rounded-sm tracking-widest uppercase transition-colors ${
          isLimitReached
            ? 'bg-white text-[#121c32] hover:bg-slate-100'
            : 'bg-white/10 text-white hover:bg-white/20 border border-white/20'
        }`}
      >
        {isLimitReached ? 'Upgrade' : usage.tier === 'free' ? 'Upgrade' : 'Manage'}
      </button>
    </div>
  );
};

