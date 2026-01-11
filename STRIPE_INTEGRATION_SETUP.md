# Stripe Payment Integration Setup Guide

## Overview
The payment integration has been completed using Stripe Elements for secure card processing. Payments are now required before order creation.

## What Was Implemented

### Backend Changes
1. **Payment Routes** (`routes/payments.js`):
   - `POST /api/payments/create-intent` - Creates a Stripe Payment Intent
   - `POST /api/payments/confirm` - Confirms payment was successful
   - `POST /api/payments/webhook` - Handles Stripe webhooks (mounted in server.js)

2. **Orders Route Updates** (`routes/orders.js`):
   - Now requires `payment_intent_id` before creating orders
   - Verifies payment status with Stripe before order creation
   - Validates payment amount matches order total
   - Stores payment information in order record

3. **Database Migration** (`sql/008_add_payment_fields.sql`):
   - Added payment fields to `orders` table:
     - `payment_intent_id` - Stripe Payment Intent ID
     - `payment_status` - Payment status (pending, succeeded, failed, etc.)
     - `stripe_payment_id` - Stripe Charge ID
     - `stripe_customer_id` - Stripe Customer ID
     - `payment_method_id` - Payment method used
     - `tax_amount` - Calculated tax
     - `shipping_address` - JSONB shipping address
     - `billing_address` - JSONB billing address

4. **Cart API Update** (`routes/cart.js`):
   - Now includes `seller_id` in product selection for checkout

### Frontend Changes
1. **PaymentForm Component** (`frontend/components/PaymentForm.tsx`):
   - Secure card input using Stripe Elements
   - Card validation and error handling
   - Payment confirmation method

2. **CheckoutPage Updates** (`frontend/pages/CheckoutPage.tsx`):
   - Integrated Stripe Elements provider
   - Payment intent creation when user reaches payment step
   - Payment confirmation before order creation
   - Fixed calculation errors (tax, shipping)
   - Payment status tracking

3. **API Client** (`frontend/lib/api.ts`):
   - Added `paymentsApi` with `createIntent` and `confirm` methods

## Environment Variables Required

### Backend (.env)
```bash
# Stripe Secret Key (from Stripe Dashboard)
STRIPE_SECRET_KEY=sk_live_...  # Production
# OR
STRIPE_SECRET_KEY_TEST=sk_test_...  # Development/Testing

# Stripe Webhook Secret (for webhook signature verification)
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Frontend (.env or .env.local)
```bash
# Stripe Publishable Key (from Stripe Dashboard)
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_...  # Production
# OR
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Development/Testing
```

## Stripe Dashboard Setup

1. **Get API Keys**:
   - Go to [Stripe Dashboard](https://dashboard.stripe.com)
   - Navigate to Developers → API keys
   - Copy your Publishable key and Secret key

2. **Configure Webhook**:
   - Go to Developers → Webhooks
   - Click "Add endpoint"
   - Endpoint URL: `https://yourdomain.com/api/payments/webhook`
   - Select events to listen to:
     - `payment_intent.succeeded`
     - `payment_intent.payment_failed`
     - `charge.refunded`
   - Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`

3. **Test Mode**:
   - Use test keys for development
   - Test card: `4242 4242 4242 4242`
   - Any future expiry date
   - Any 3-digit CVC

## Payment Flow

1. **User adds items to cart** → Cart page
2. **User proceeds to checkout** → Shipping info step
3. **User enters payment info** → Payment intent created automatically
4. **User reviews order** → Payment confirmed with Stripe
5. **User confirms order** → Order created with payment verification
6. **Order created** → Payment status stored in database

## Testing

### Test Cards (Stripe Test Mode)
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

### Test Flow
1. Add items to cart
2. Go to checkout
3. Fill shipping information
4. Enter test card details
5. Review order
6. Confirm payment
7. Verify order created with payment status

## Security Notes

- ✅ Card details never touch your server (processed by Stripe)
- ✅ Payment intents are verified before order creation
- ✅ Payment amounts are validated against order totals
- ✅ Webhook signature verification prevents unauthorized requests
- ✅ Payment status stored in database for audit trail

## Troubleshooting

### "Stripe not configured" error
- Check that `VITE_STRIPE_PUBLISHABLE_KEY` is set in frontend
- Check that `STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_TEST` is set in backend

### "Payment not initialized" error
- Payment intent creation may have failed
- Check backend logs for errors
- Verify Stripe secret key is correct

### "Payment confirmation failed" error
- Payment may have been declined
- Check Stripe Dashboard for payment status
- Verify card details are correct

### Webhook not receiving events
- Verify webhook URL is accessible
- Check webhook secret is correct
- Ensure webhook endpoint is mounted before JSON parsing in server.js

## Next Steps

1. Run database migration: `sql/008_add_payment_fields.sql`
2. Set environment variables
3. Test payment flow in test mode
4. Configure production Stripe account
5. Set up webhook endpoint
6. Test end-to-end payment flow

## Files Modified

- `routes/payments.js` (new)
- `routes/orders.js` (updated)
- `routes/cart.js` (updated)
- `server.js` (webhook route added)
- `sql/008_add_payment_fields.sql` (new)
- `frontend/components/PaymentForm.tsx` (new)
- `frontend/pages/CheckoutPage.tsx` (updated)
- `frontend/lib/api.ts` (updated)
- `package.json` (Stripe dependencies added)

## Dependencies Added

- `stripe` - Backend Stripe SDK
- `@stripe/stripe-js` - Frontend Stripe SDK
- `@stripe/react-stripe-js` - React Stripe Elements

