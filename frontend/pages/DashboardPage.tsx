/**
 * API Developer Dashboard — API key, usage, recent calls, quick start.
 * Requires auth; redirects to /login if not authenticated.
 */

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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
      <div className="min-h-screen bg-[#0f1929] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1929] text-white">
      {/* ── NAV ───────────────────────────────────────────── */}
      <nav className="border-b border-white/[0.08] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-white font-serif italic text-xl no-underline">
              YardFront
            </Link>
            <span className="text-white/20 text-sm">/</span>
            <span className="text-white/50 text-sm">Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/30 text-sm hidden sm:block">
              {user?.email}
            </span>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-white/30 text-sm hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* ── PAGE HEADER ───────────────────────────────── */}
        <div className="mb-10">
          <p className="text-[#FF6B35] text-xs font-semibold tracking-widest uppercase mb-2">
            API Dashboard
          </p>
          <h1 className="font-serif italic text-4xl text-white">
            Your pricing engine.
          </h1>
        </div>

        {/* ── TOP GRID: Key + Usage ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
          {/* API Key Card */}
          <div className="bg-[#1a2540] border border-white/[0.08] rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">
                API Key
              </p>
              <span
                className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                  apiKey?.plan === 'free'
                    ? 'bg-white/[0.08] text-white/50'
                    : 'bg-[#FF6B35]/15 text-[#FF6B35]'
                }`}
              >
                {apiKey?.plan ?? 'free'} plan
              </span>
            </div>

            {!apiKey ? (
              <p className="text-white/40 text-sm">No API key found. Sign out and sign back in to generate one.</p>
            ) : (
              <>
                <div className="bg-black/20 border border-white/[0.08] rounded-xl px-4 py-3 font-mono text-sm text-white/70 mb-4 flex items-center justify-between gap-3">
                  <span className="truncate">
                    {keyVisible ? apiKey.key : maskedKey}
                  </span>
                  <button
                    type="button"
                    onClick={() => setKeyVisible(!keyVisible)}
                    className="text-white/30 hover:text-white transition-colors text-xs shrink-0"
                  >
                    {keyVisible ? 'hide' : 'show'}
                  </button>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={copyKey}
                    className="flex-1 py-2.5 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    {copied ? 'Copied ✓' : 'Copy Key'}
                  </button>
                  <button
                    type="button"
                    onClick={regenerateKey}
                    disabled={regenerating}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/50 text-sm hover:border-white/25 hover:text-white transition-colors disabled:opacity-40"
                  >
                    {regenerating ? 'Regenerating…' : 'Regenerate'}
                  </button>
                </div>

                <p className="text-white/20 text-xs mt-3">
                  Include as <span className="font-mono text-white/35">x-api-key</span> header in all requests.
                </p>
              </>
            )}
          </div>

          {/* Usage Card */}
          <div className="bg-[#1a2540] border border-white/[0.08] rounded-2xl p-6">
            <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">
              Usage This Month
            </p>

            <div className="flex items-end gap-2 mb-2">
              <span className="text-5xl font-bold text-white">{usageCount}</span>
              <span className="text-white/30 text-lg mb-1.5">
                / {isUnlimited ? '∞' : apiKey?.monthly_limit ?? 25}
              </span>
            </div>
            <p className="text-white/30 text-sm mb-5">appraisals</p>

            {!isUnlimited && (
              <>
                <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${usagePct}%`,
                      backgroundColor: usagePct > 80 ? '#FF6B35' : '#22c55e',
                    }}
                  />
                </div>
                <p className="text-white/20 text-xs">
                  Resets on the 1st of each month
                </p>
              </>
            )}

            {apiKey && apiKey.plan !== 'enterprise' && usagePct > 60 && !isUnlimited && (
              <div className="mt-5 border border-[#FF6B35]/20 bg-[#FF6B35]/5 rounded-xl p-4">
                <p className="text-white/70 text-sm mb-2">
                  Running low? Upgrade to{' '}
                  <span className="text-[#FF6B35] font-semibold">
                    {PLAN_NEXT[apiKey.plan]?.name ?? 'Starter'}
                  </span>{' '}
                  for {PLAN_NEXT[apiKey.plan]?.price ?? '$99/mo'}.
                </p>
                <Link
                  to="/business#pricing"
                  className="text-[#FF6B35] text-sm font-medium hover:underline no-underline"
                >
                  View plans →
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* ── RECENT APPRAISAL LOG ───────────────────────── */}
        <div className="bg-[#1a2540] border border-white/[0.08] rounded-2xl p-6">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-6">
            Recent API Calls
          </p>

          {recentLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/20 text-sm mb-2">No API calls yet.</p>
              <p className="text-white/15 text-xs">
                Make your first request to <span className="font-mono">POST /api/v1/appraise</span>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left text-white/[0.25] font-medium pb-3 pr-6">Item</th>
                    <th className="text-left text-white/[0.25] font-medium pb-3 pr-6">Price Range</th>
                    <th className="text-left text-white/[0.25] font-medium pb-3 pr-6">Confidence</th>
                    <th className="text-left text-white/[0.25] font-medium pb-3 pr-6">Status</th>
                    <th className="text-left text-white/[0.25] font-medium pb-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLogs.map((log) => (
                    <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-6 text-white/70 max-w-[180px] truncate">
                        {log.item_name ?? <span className="text-white/20 italic">Unknown</span>}
                      </td>
                      <td className="py-3 pr-6 text-white/50 font-mono text-xs">
                        {log.price_low != null && log.price_high != null
                          ? `$${log.price_low} – $${log.price_high}`
                          : <span className="text-white/20">—</span>}
                      </td>
                      <td className="py-3 pr-6">
                        {log.confidence != null ? (
                          <span
                            className={`text-xs font-medium ${
                              log.confidence >= 7 ? 'text-green-400' : log.confidence >= 4 ? 'text-yellow-400' : 'text-red-400'
                            }`}
                          >
                            {log.confidence}/10
                          </span>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>
                      <td className="py-3 pr-6">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            log.status === 'success'
                              ? 'bg-green-500/10 text-green-400'
                              : 'bg-red-500/10 text-red-400'
                          }`}
                        >
                          {log.status}
                        </span>
                      </td>
                      <td className="py-3 text-white/[0.25] text-xs">
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
        <div className="mt-4 bg-[#1a2540] border border-white/[0.08] rounded-2xl p-6">
          <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">
            Quick Start
          </p>
          <pre className="text-white/60 text-sm font-mono leading-relaxed overflow-x-auto bg-black/20 rounded-xl p-4">
            {`curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/appraise \\
  -H "x-api-key: ${apiKey?.key ?? 'your_api_key'}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "image_url": "https://example.com/item.jpg",
    "condition": "good"
  }'`}
          </pre>
        </div>
      </div>
    </div>
  );
}
