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
    <div className="fixed inset-0 bg-[#1A1A18]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-['Manrope']">
      <div className="bg-[#FAF7F2] border border-[#E8E2D9] rounded-sm w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-sm">
        <div className="p-6 border-b border-[#E8E2D9]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#C4622D] text-xs font-semibold tracking-widest uppercase mb-1">
                Upgrade Plan
              </p>
              <h2 className="text-[#1A1A18] text-2xl italic" style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}>
                Scale your pricing engine.
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-[#5c665f] hover:text-[#2C4A3E] transition-colors text-2xl leading-none ml-4"
              aria-label="Close"
            >
              ×
            </button>
          </div>
        </div>

        {!clientSecret && (
          <div className="p-6">
            <div className="flex items-center justify-center gap-2 mb-8">
              <button
                type="button"
                onClick={() => setBilling('monthly')}
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors ${
                  billing === 'monthly'
                    ? 'bg-[#2C4A3E] text-[#F5F0E8]'
                    : 'text-[#5c665f] hover:text-[#2C4A3E] border border-[#E8E2D9]'
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setBilling('annual')}
                className={`px-4 py-2 rounded-sm text-sm font-medium transition-colors flex items-center gap-2 border ${
                  billing === 'annual'
                    ? 'bg-[#2C4A3E] text-[#F5F0E8] border-[#2C4A3E]'
                    : 'text-[#5c665f] border-[#E8E2D9] hover:border-[#2C4A3E]'
                }`}
              >
                Annual
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-sm ${
                    billing === 'annual' ? 'bg-[#F5F0E8]/20 text-[#F5F0E8]' : 'bg-[#F5F0E8] text-[#2C4A3E]'
                  }`}
                >
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
                    className={`relative text-left p-5 rounded-sm border transition-all ${
                      isCurrent
                        ? 'border-[#E8E2D9] opacity-40 cursor-not-allowed bg-[#F5F0E8]'
                        : selectedPlan === plan.id && loading
                        ? 'border-[#2C4A3E] bg-[#2C4A3E]/5'
                        : plan.popular
                        ? 'border-[#C4622D]/40 hover:border-[#C4622D] hover:bg-[#F5F0E8]'
                        : 'border-[#E8E2D9] hover:border-[#2C4A3E]/40 hover:bg-[#F5F0E8]/80'
                    }`}
                  >
                    {plan.popular && (
                      <span className="absolute -top-2.5 left-4 bg-[#C4622D] text-[#FAF7F2] text-xs font-bold px-2 py-0.5 rounded-sm">
                        Popular
                      </span>
                    )}
                    {isCurrent && (
                      <span className="absolute -top-2.5 left-4 bg-[#E8E2D9] text-[#5c665f] text-xs font-medium px-2 py-0.5 rounded-sm">
                        Current
                      </span>
                    )}
                    <p className="text-[#1A1A18] font-semibold mb-1">{plan.name}</p>
                    <div className="flex items-baseline gap-1 mb-1 font-mono">
                      <span className="text-2xl font-bold text-[#2C4A3E]">${price}</span>
                      <span className="text-[#5c665f] text-xs">/mo</span>
                    </div>
                    <p className="text-[#5c665f] text-xs">{plan.limit}</p>

                    {selectedPlan === plan.id && loading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-sm bg-[#FAF7F2]/90">
                        <div className="w-4 h-4 border-2 border-[#2C4A3E] border-t-transparent rounded-sm animate-spin" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {error && <p className="text-red-700 text-sm text-center mt-2">{error}</p>}
            {billing === 'annual' && (
              <p className="text-[#5c665f]/70 text-xs text-center mt-3">
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
              className="text-[#5c665f] text-sm hover:text-[#2C4A3E] transition-colors mb-4 flex items-center gap-1"
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
