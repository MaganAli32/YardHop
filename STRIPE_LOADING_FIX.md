# Stripe Loading Fix

## Problem
Stripe was loading on all pages (including login/signup), causing errors:
- `Failed to fetch https://r.stripe.com/b: Failed to fetch`
- `ERR_BLOCKED_BY_CLIENT` (ad blockers blocking Stripe)

## Solution
Stripe is now **lazy-loaded** only when needed (on checkout payment step). This means:
- ✅ Stripe doesn't load on login/signup pages
- ✅ Stripe doesn't load until user reaches payment step
- ✅ No Stripe errors on pages that don't need it
- ✅ Better performance (smaller initial bundle)

## Changes Made
1. **Lazy import Stripe** - Only import `@stripe/stripe-js` when payment step is reached
2. **Conditional loading** - Check if user is on payment step before loading Stripe
3. **Better error handling** - Show helpful messages if Stripe isn't configured

## Testing
1. **Login/Signup pages** - No Stripe errors should appear
2. **Checkout page (before payment step)** - No Stripe loaded
3. **Checkout payment step** - Stripe loads automatically
4. **Without Stripe key** - Shows friendly message instead of errors

## If You Still See Stripe Errors

### On Login/Signup Pages
- Clear browser cache and reload
- Check browser console - Stripe should NOT be in the network tab
- Verify you're on `/login` or `/signup` - not `/checkout`

### On Checkout Page
- If Stripe key is missing, you'll see: "Payment processor not configured"
- This is expected if `VITE_STRIPE_PUBLISHABLE_KEY` is not set
- Set the key in `.env` or `.env.local` (frontend)

## Supabase 500 Error (Separate Issue)

If you're seeing a 500 error from Supabase during signup:

1. **Check Supabase Dashboard**:
   - Go to Authentication → Settings
   - Check if email confirmation is required
   - Verify SMTP settings if email sending is enabled

2. **Check Backend Logs**:
   - Look for errors in your server console
   - Check if there are database trigger errors

3. **Check Database**:
   - Verify RLS policies allow profile creation
   - Check if there's a trigger that creates profiles on signup

4. **Test Signup Directly**:
   ```bash
   curl -X POST http://localhost:3000/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"testpass123","name":"Test User"}'
   ```

5. **Common Causes**:
   - Email confirmation required but SMTP not configured
   - Database trigger failing to create profile
   - RLS policy blocking profile creation
   - Missing required fields in profile table

## Environment Variables

Make sure these are set (but Stripe is optional):

**Frontend** (`.env` or `.env.local`):
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...  # Optional - only for checkout
```

**Backend** (`.env`):
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY_TEST=sk_test_...  # Optional - only for checkout
```

## What Changed

### Before:
```javascript
// Stripe loaded immediately on page load
const stripePromise = loadStripe(publishableKey);
```

### After:
```javascript
// Stripe loaded only when needed (lazy)
const getStripePromise = () => {
  if (stripePromise) return stripePromise;
  return import('@stripe/stripe-js').then(module => 
    module.loadStripe(publishableKey)
  );
};
```

This ensures Stripe is only loaded when the user actually needs it (on checkout payment step).

