import React, { useCallback, useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from '@stripe/react-stripe-js';
import { supabase } from '../lib/supabase';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    monthly: 99,
    annual: 79,
    limit: '500 appraisals/mo',
  },
  {
    id: 'growth',
    name: 'Growth',
    monthly: 299,
    annual: 239,
    limit: '2,000 appraisals/mo',
    popular: true,
  },
  {
    id: 'scale',
    name: 'Scale',
    monthly: 799,
    annual: 639,
    limit: '7,500 appraisals/mo',
  },
];

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
}

export default function UpgradeModal({ isOpen, onClose, currentPlan }: UpgradeModalProps) {
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setSelectedPlan(null);
      setClientSecret(null);
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  const handleSelectPlan = async (planId: string) => {
    setSelectedPlan(planId);
    setLoading(true);
    setError('');

    try {
      const { data: { session } } = await supabase?.auth.getSession() ?? { data: { session: null } };
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ plan: planId, billing_period: billing }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Checkout failed');
      setClientSecret(data.clientSecret);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setSelectedPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchClientSecret = useCallback(() => Promise.resolve(clientSecret || ''), [clientSecret]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#1a2540] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <div className="p-6 border-b border-white/[0.08]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#FF6B35] text-xs font-semibold tracking-widest uppercase mb-1">
                Upgrade Plan
              </p>
              <h2 className="text-white font-serif italic text-2xl">
                Scale your pricing engine.
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-white/30 hover:text-white transition-colors text-2xl leading-none ml-4"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {!clientSecret && (
          <div className="p-6">
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  billing === 'monthly'
                    ? 'bg-[#FF6B35] text-white'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                  billing === 'annual'
                    ? 'bg-[#FF6B35] text-white'
                    : 'text-white/40 hover:text-white'
                }`}
              >
                Annual
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  billing === 'annual'
                    ? 'bg-white/20 text-white'
                    : 'bg-green-500/20 text-green-400'
                }`}>
                  Save 20%
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {PLANS.map((plan) => {
                const isCurrent = plan.id === currentPlan;
                const price = billing === 'annual' ? plan.annual : plan.monthly;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => !isCurrent && handleSelectPlan(plan.id)}
                    disabled={isCurrent || loading}
                    className={`relative text-left p-5 rounded-xl border transition-all ${
                      isCurrent
                        ? 'border-white/10 opacity-40 cursor-not-allowed'
                        : selectedPlan === plan.id && loading
                        ? 'border-[#FF6B35] bg-[#FF6B35]/10'
                        : plan.popular
                        ? 'border-[#FF6B35]/50 hover:border-[#FF6B35] hover:bg-[#FF6B35]/5'
                        : 'border-white/10 hover:border-white/25 hover:bg-white/[0.03]'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-4 bg-[#FF6B35] text-white text-xs font-bold px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute -top-2.5 left-4 bg-white/20 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                        Current
                      </span>
                    )}
                    <p className="text-white font-semibold mb-1">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mb-1">
                      <span className="text-2xl font-bold text-white">${price}</span>
                      <span className="text-white/30 text-xs">/mo</span>
                    </div>
                    <p className="text-white/35 text-xs">{plan.limit}</p>

                    {selectedPlan === plan.id && loading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[#1a2540]/80">
                        <div className="w-4 h-4 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-400 text-sm text-center mt-2">{error}</p>}
            {billing === 'annual' && (
              <p className="text-white/25 text-xs text-center mt-3">
                Billed annually. Cancel anytime.
              </p>
            )}
          </div>
        )}

        {clientSecret && (
          <div className="p-6">
            <button
              type="button"
              onClick={() => { setClientSecret(null); setSelectedPlan(null); }}
              className="text-white/30 text-sm hover:text-white transition-colors mb-4 flex items-center gap-1"
            >
              ← Back to plans
            </button>
            <EmbeddedCheckoutProvider
              stripe={stripePromise}
              options={{ fetchClientSecret }}
            >
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          </div>
        )}
      </div>
    </div>
  );
}
