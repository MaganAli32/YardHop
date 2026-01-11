/**
 * PaymentForm Component
 * Secure payment form using Stripe Elements
 * NOTE: This component must be wrapped in Stripe Elements provider
 */

import React, { useState, useImperativeHandle, forwardRef } from 'react';
// These imports are safe - they only work when wrapped in Elements provider
// They won't cause Stripe to connect until the component is rendered
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

interface PaymentFormProps {
  clientSecret: string | null;
  cardName: string;
  onCardNameChange: (name: string) => void;
  billingAddressSame: boolean;
  onBillingAddressSameChange: (same: boolean) => void;
  onPaymentReady: (ready: boolean) => void;
  error?: string;
}

export interface PaymentFormHandle {
  confirmPayment: (billingAddress?: any) => Promise<{ success: boolean; error?: string }>;
}

const PaymentForm = forwardRef<PaymentFormHandle, PaymentFormProps>(({
  clientSecret,
  cardName,
  onCardNameChange,
  billingAddressSame,
  onBillingAddressSameChange,
  onPaymentReady,
  error: externalError,
}, ref) => {
  const stripe = useStripe();
  const elements = useElements();
  const [cardError, setCardError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  useImperativeHandle(ref, () => ({
    confirmPayment: async (billingAddress?: any) => {
      if (!stripe || !elements || !clientSecret) {
        return { success: false, error: 'Stripe not initialized' };
      }

      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        return { success: false, error: 'Card element not found' };
      }

      setIsProcessing(true);
      setCardError('');

      try {
        const { error: confirmError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: {
              name: cardName,
              address: billingAddress ? {
                line1: billingAddress.address,
                city: billingAddress.city,
                state: billingAddress.state,
                postal_code: billingAddress.zipCode,
                country: billingAddress.country === 'United States' ? 'US' : billingAddress.country,
              } : undefined,
            },
          },
        });

        if (confirmError) {
          setCardError(confirmError.message || 'Payment failed');
          setIsProcessing(false);
          return { success: false, error: confirmError.message || 'Payment failed' };
        }

        if (paymentIntent?.status !== 'succeeded') {
          const errorMsg = `Payment status: ${paymentIntent?.status}`;
          setCardError(errorMsg);
          setIsProcessing(false);
          return { success: false, error: errorMsg };
        }

        setIsProcessing(false);
        return { success: true };
      } catch (err: any) {
        const errorMsg = err.message || 'Payment confirmation failed';
        setCardError(errorMsg);
        setIsProcessing(false);
        return { success: false, error: errorMsg };
      }
    },
  }));

  const handleCardChange = (event: any) => {
    if (event.error) {
      setCardError(event.error.message);
      onPaymentReady(false);
    } else {
      setCardError('');
      onPaymentReady(event.complete);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#121c32',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSmoothing: 'antialiased',
        '::placeholder': {
          color: '#94a3b8',
        },
      },
      invalid: {
        color: '#ef4444',
        iconColor: '#ef4444',
      },
    },
    hidePostalCode: true,
  };

  return (
    <div className="space-y-8">
      {/* Cardholder Name */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Cardholder Name
        </label>
        <input
          type="text"
          value={cardName}
          onChange={(e) => onCardNameChange(e.target.value)}
          placeholder="Name on Card"
          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-slate-900 font-bold focus:ring-4 focus:ring-primary/10 transition-all"
        />
      </div>

      {/* Stripe Card Element */}
      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Card Details
        </label>
        <div className="px-6 py-4 bg-slate-50 border-none rounded-2xl focus-within:ring-4 focus-within:ring-primary/10 transition-all">
          <CardElement
            options={cardElementOptions}
            onChange={handleCardChange}
          />
        </div>
        {(cardError || externalError) && (
          <p className="text-sm text-red-500 font-medium mt-2">
            {cardError || externalError}
          </p>
        )}
      </div>

      {/* Billing Address Checkbox */}
      <div className="pt-6 border-t border-slate-50">
        <label className="flex items-center gap-3 cursor-pointer group">
          <input
            type="checkbox"
            checked={billingAddressSame}
            onChange={(e) => onBillingAddressSameChange(e.target.checked)}
            className="size-5 rounded-lg border-slate-200 text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-slate-500 group-hover:text-slate-900 transition-colors">
            Billing address same as shipping
          </span>
        </label>
      </div>

      {/* Security Notice */}
      <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-2xl">
        <div className="size-6 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            Secure Payment
          </p>
          <p className="text-xs text-slate-600 font-medium leading-relaxed">
            Your payment information is encrypted and processed securely by Stripe. We never store your card details.
          </p>
        </div>
      </div>
    </div>
  );
});

PaymentForm.displayName = 'PaymentForm';

export default PaymentForm;

