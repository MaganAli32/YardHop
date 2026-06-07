/**
 * API Developer Dashboard — API key, usage, recent calls, quick start.
 * Requires auth; redirects to /login if not authenticated.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import UpgradeModal from '../components/UpgradeModal';
import Navbar from '../components/Navbar';

const PLAN_LIMITS: Record<string, number> = {
  free: 25,
  starter: 500,
  growth: 2000,
  scale: 7500,
  enterprise: Infinity,
};

const PLAN_NEXT: Record<string, { name: string; price: string }> = {
  free: { name: 'Starter', price: '$99/mo' },
  starter: { name: 'Growth', price: '$299/mo' },
  growth: { name: 'Scale', price: '$799/mo' },
  scale: { name: 'Enterprise', price: 'Custom' },
  enterprise: { name: '', price: '' },
};

interface ApiKey {
  id: string;
  key: string;
  plan: string;
  monthly_limit: number;
  created_at: string;
  last_used_at: string | null;
}

interface UsageLog {
  id: string;
  item_name: string | null;
  price_low: number | null;
  price_high: number | null;
  confidence: number | null;
  status: string;
  created_at: string;
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [apiKey, setApiKey] = useState<ApiKey | null>(null);
  const [usageCount, setUsageCount] = useState(0);
  const [recentLogs, setRecentLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({ data: { user: u }, error }) => {
      if (error || !u) {
        navigate('/login', { state: { returnTo: '/dashboard' } });
        return;
      }
      setUser({ id: u.id, email: u.email ?? undefined });
      loadDashboard(u.id);
    });
  }, [navigate]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('upgrade') === 'success') {
      window.history.replaceState({}, '', '/#/dashboard');
      supabase?.auth.getUser().then(({ data: { user: u } }) => {
        if (u) loadDashboard(u.id);
      });
    }
  }, []);

  const loadDashboard = async (userId: string) => {
    setLoading(true);
    try {
      if (!supabase) return;

      const { data: keyData, error: keyError } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (keyError) {
        console.error('api_keys fetch error:', keyError);
        setLoading(false);
        return;
      }
      setApiKey(keyData || null);

      if (keyData) {
        const { data: usageData } = await supabase
          .from('api_usage_this_month')
          .select('usage_count')
          .eq('api_key_id', keyData.id)
          .maybeSingle();
        setUsageCount(usageData?.usage_count ?? 0);

        const { data: logs } = await supabase
          .from('api_usage')
          .select('id, item_name, price_low, price_high, confidence, status, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .limit(10);
        setRecentLogs(logs || []);
      } else {
        setUsageCount(0);
        setRecentLogs([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const copyKey = () => {
    if (!apiKey) return;
    navigator.clipboard.writeText(apiKey.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateKey = async () => {
    if (!confirm('Regenerate your API key? Your current key will stop working immediately.')) return;
    setRegenerating(true);
    try {
      const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const res = await fetch('/api/user/regenerate-key', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      });
      const data = await res.json().catch(() => ({}));
      if (data.key && apiKey) {
        setApiKey((prev) => (prev ? { ...prev, key: data.key } : prev));
      }
    } finally {
      setRegenerating(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate('/');
  };

  const openBillingPortal = async () => {
    const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
    const res = await fetch('/api/stripe/create-portal', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
    });
    const data = await res.json().catch(() => ({}));
    if (data.url) window.open(data.url, '_blank');
  };

  const limitDisplay = apiKey?.monthly_limit;
  const isUnlimited = limitDisplay == null || apiKey?.plan === 'enterprise' || (typeof limitDisplay === 'number' && limitDisplay > 100000);
  const usagePct = apiKey && !isUnlimited && limitDisplay
    ? Math.min((usageCount / limitDisplay) * 100, 100)
    : 0;

  const maskedKey = apiKey
    ? apiKey.key.slice(0, 12) + '••••••••••••••••'
    : '';

  if (loading && !apiKey) {
    return (
      <div className="min-h-screen bg-[#F0EAE0] flex items-center justify-center font-['Manrope']">
        <div className="w-6 h-6 border-2 border-[#1A2A1C] border-t-transparent rounded-sm animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EAE0] text-[#1A1A18] font-['Manrope'] antialiased">
      <Navbar />

      <div className="pt-28 pb-28 px-6 md:px-[56px] max-w-[1220px] mx-auto">
        {/* ── PAGE HEADER ───────────────────────────────── */}
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#9E8B6F] mb-3">
              API dashboard
            </p>
            <h1 className="font-['Cormorant_Garamond'] text-[clamp(34px,4.5vw,48px)] font-light text-[#1A1A18] leading-tight tracking-[-0.02em]">
              Your pricing engine.
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[12px] text-[#6B7A6D] hidden sm:block">{user?.email}</p>
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#9E8B6F] hover:text-[#B54419] transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* ── TOP GRID: Key + Usage ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* API Key Card */}
          <div className="bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[#5c665f] text-xs font-semibold tracking-widest uppercase">
                API Key
              </p>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-sm capitalize border border-[#DCCFBE] ${
                  apiKey?.plan === 'free'
                    ? 'bg-[#EFE8DD] text-[#5c665f]'
                    : 'bg-[#2C4A3E]/10 text-[#2C4A3E]'
                }`}
              >
                {apiKey?.plan ?? 'free'} plan
              </span>
            </div>

            {!apiKey ? (
              <p className="text-[#5c665f] text-sm">No API key found. Sign out and sign back in to generate one.</p>
            ) : (
              <>
                <div className="bg-[#EFE8DD] border border-[#DCCFBE] rounded-sm px-4 py-3 font-mono text-sm text-[#2C4A3E] mb-4 flex items-center justify-between gap-3">
                  <span className="truncate">
                    {keyVisible ? apiKey.key : maskedKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => setKeyVisible(!keyVisible)}
                    className="text-[#5c665f] hover:text-[#2C4A3E] transition-colors text-xs shrink-0"
                  >
                    {keyVisible ? 'hide' : 'show'}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={copyKey}
                    className="flex-1 py-2.5 rounded-sm bg-[#2C4A3E] text-[#F0EAE0] text-sm font-medium hover:bg-[#3a5f50] transition-colors"
                  >
                    {copied ? 'Copied ✓' : 'Copy Key'}
                  </button>
                  <button
                    type="button"
                    onClick={regenerateKey}
                    disabled={regenerating}
                    className="flex-1 py-2.5 rounded-sm border border-[#2C4A3E] text-[#2C4A3E] text-sm hover:bg-[#2C4A3E]/5 transition-colors disabled:opacity-40"
                  >
                    {regenerating ? 'Regenerating…' : 'Regenerate'}
                  </button>
                </div>
                {apiKey.plan !== 'free' && (
                  <button
                    type="button"
                    onClick={openBillingPortal}
                    className="w-full mt-2 py-2.5 rounded-sm border border-[#DCCFBE] text-[#5c665f] text-sm hover:border-[#2C4A3E] hover:text-[#2C4A3E] transition-colors"
                  >
                    Manage Billing
                  </button>
                )}

                <p className="text-[#5c665f]/80 text-xs mt-3">
                  Include as <span className="font-mono text-[#2C4A3E]">x-api-key</span> header in all requests.
                </p>
              </>
            )}
          </div>

          {/* Usage Card */}
          <div className="bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm p-6 shadow-sm">
            <p className="text-[#5c665f] text-xs font-semibold tracking-widest uppercase mb-4">
              Usage This Month
            </p>

            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-bold text-[#1A1A18] font-mono">{usageCount}</span>
              <span className="text-[#5c665f] text-lg mb-1.5 font-mono">
                / {isUnlimited ? '∞' : apiKey?.monthly_limit ?? 25}
              </span>
            </div>
            <p className="text-[#5c665f] text-sm mb-5">appraisals</p>

            {!isUnlimited && (
              <>
                <div className="h-2 bg-[#DCCFBE] rounded-sm overflow-hidden mb-2">
                  <div
                    className="h-full rounded-sm transition-all duration-500"
                    style={{
                      width: `${usagePct}%`,
                      backgroundColor: usagePct > 80 ? '#C4622D' : '#2C4A3E',
                    }}
                  />
                </div>
                <p className="text-[#5c665f]/70 text-xs">
                  Resets on the 1st of each month
                </p>
              </>
            )}

            {apiKey && apiKey.plan !== 'enterprise' && usagePct > 60 && !isUnlimited && (
              <div className="mt-5 border border-[#DCCFBE] bg-[#EFE8DD] rounded-sm p-4">
                <p className="text-[#2C4A3E] text-sm mb-2">
                  Running low? Upgrade to{' '}
                  <span className="text-[#C4622D] font-semibold">
                    {PLAN_NEXT[apiKey.plan]?.name ?? 'Starter'}
                  </span>{' '}
                  for {PLAN_NEXT[apiKey.plan]?.price ?? '$99/mo'}.
                </p>
                <button
                  type="button"
                  onClick={() => setUpgradeOpen(true)}
                  className="text-[#2C4A3E] text-sm font-medium underline underline-offset-2 hover:text-[#C4622D]"
                >
                  Upgrade now →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── RECENT APPRAISAL LOG ───────────────────────── */}
        <div className="bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm p-6 shadow-sm">
          <p className="text-[#5c665f] text-xs font-semibold tracking-widest uppercase mb-6">
            Recent API Calls
          </p>

          {recentLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[#5c665f] text-sm mb-2">No API calls yet.</p>
              <p className="text-[#5c665f]/70 text-xs">
                Make your first request to <span className="font-mono text-[#2C4A3E]">POST /api/v1/appraise</span>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#DCCFBE]">
                    <th className="text-left text-[#5c665f] font-medium pb-3 pr-6">Item</th>
                    <th className="text-left text-[#5c665f] font-medium pb-3 pr-6">Price Range</th>
                    <th className="text-left text-[#5c665f] font-medium pb-3 pr-6">Confidence</th>
                    <th className="text-left text-[#5c665f] font-medium pb-3 pr-6">Status</th>
                    <th className="text-left text-[#5c665f] font-medium pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-[#DCCFBE]/60 hover:bg-[#EFE8DD]/80 transition-colors">
                      <td className="py-3 pr-6 text-[#2C4A3E] max-w-[180px] truncate">
                        {log.item_name ?? <span className="text-[#5c665f] italic">Unknown</span>}
                      </td>
                      <td className="py-3 pr-6 text-[#5c665f] font-mono text-xs">
                        {log.price_low != null && log.price_high != null
                          ? `$${log.price_low} – $${log.price_high}`
                          : <span className="text-[#C9B8A0]">—</span>}
                      </td>
                      <td className="py-3 pr-6">
                        {log.confidence != null ? (
                          <span
                            className={`text-xs font-medium font-mono ${
                              log.confidence >= 7 ? 'text-[#2C4A3E]' : log.confidence >= 4 ? 'text-[#C4622D]' : 'text-red-700'
                            }`}
                          >
                            {log.confidence}/10
                          </span>
                        ) : (
                          <span className="text-[#C9B8A0]">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-6">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-sm border ${
                            log.status === 'success'
                              ? 'border-[#DCCFBE] bg-[#EFE8DD] text-[#2C4A3E]'
                              : 'border-red-200 bg-red-50 text-red-800'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-[#5c665f] text-xs font-mono">
                        {new Date(log.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── QUICK START ───────────────────────────────── */}
        <div className="mt-4 bg-[#FAF7F2] border border-[#DCCFBE] rounded-sm p-6 shadow-sm">
          <p className="text-[#5c665f] text-xs font-semibold tracking-widest uppercase mb-4">
            Quick Start
          </p>
          <pre className="text-[#2C4A3E] text-sm font-mono leading-relaxed overflow-x-auto bg-[#EFE8DD] border border-[#DCCFBE] rounded-sm p-4">
            {`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/appraise \\
  -H "x-api-key: ${apiKey?.key ?? 'your_api_key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/item.jpg",
    "condition": "good"
  }'`}
          </pre>
        </div>
        <UpgradeModal
          isOpen={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          currentPlan={apiKey?.plan || 'free'}
        />
      </div>
    </div>
  );
}
