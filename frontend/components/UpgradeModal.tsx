import React from 'react';
import { X, Check, Zap, Crown, Sparkles } from 'lucide-react';

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTier: string;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose, currentTier }) => {
  if (!isOpen) return null;

  const plans = [
    {
      name: 'Free',
      price: 0,
      scans: 2,
      features: ['2 AI scans/month', 'Basic listing creation', 'Browse marketplace'],
      current: currentTier === 'free',
      icon: Zap,
    },
    {
      name: 'Pro',
      price: 4.99,
      scans: 50,
      features: ['50 AI scans/month', 'Priority support', 'Advanced price analytics', 'Bulk scanning'],
      recommended: true,
      icon: Crown,
    },
    {
      name: 'Unlimited',
      price: 9.99,
      scans: 'Unlimited',
      features: ['Unlimited AI scans', 'Priority support', 'Advanced analytics', 'API access', 'Early features'],
      icon: Sparkles,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-[#121c32]">Upgrade Your Plan</h2>
            <p className="text-slate-500 text-sm">Unlock more AI-powered insights</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-xl border-2 p-6 relative ${
                plan.recommended ? 'border-[#FF6B35] bg-orange-50' : 'border-slate-200'
              } ${plan.current ? 'opacity-60' : ''}`}
            >
              {plan.recommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#FF6B35] text-white text-xs font-bold px-3 py-1 rounded-full">
                  RECOMMENDED
                </div>
              )}

              <plan.icon size={24} className={plan.recommended ? 'text-[#FF6B35]' : 'text-slate-400'} />

              <h3 className="text-xl font-black text-[#121c32] mt-3">{plan.name}</h3>

              <div className="mt-2 mb-4">
                <span className="text-3xl font-black text-[#121c32]">${plan.price}</span>
                <span className="text-slate-500 text-sm">/month</span>
              </div>

              <p className="text-sm font-bold text-[#FF6B35] mb-4">
                {plan.scans} scans/month
              </p>

              <ul className="space-y-2 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-slate-600">
                    <Check size={14} className="text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                disabled={plan.current}
                className={`w-full py-3 rounded-xl font-bold text-sm ${
                  plan.current
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : plan.recommended
                    ? 'bg-[#FF6B35] text-white hover:bg-[#e55a2b]'
                    : 'bg-[#121c32] text-white hover:bg-slate-800'
                }`}
              >
                {plan.current ? 'Current Plan' : plan.price === 0 ? 'Downgrade' : 'Upgrade'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};


