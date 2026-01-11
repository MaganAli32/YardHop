# Payment Route 404 Error - Fix Instructions

## Problem
Getting 404 error when trying to create payment intent:
```
POST /api/payments/create-intent
404: API route POST / not found
```

## Root Cause
The server was started **before** the payment routes were added to `server.js`. The running server process doesn't have the payment routes registered.

## Solution

### Step 1: Restart the Backend Server

The server needs to be restarted to load the new payment routes:

**Option A: If using PM2:**
```bash
cd /Users/maganali/Downloads/yardhop
npm run pm2:restart
# OR
pm2 restart yardfront
```

**Option B: If running directly with node:**
1. Stop the current server (Ctrl+C or kill the process)
2. Start it again:
```bash
cd /Users/maganali/Downloads/yardhop
npm start
# OR
node server.js
```

**Option C: Manual restart:**
```bash
# Find and kill the server process
lsof -ti:3000 | xargs kill

# Wait a moment, then restart
npm start
```

### Step 2: Verify Routes Are Registered

After restarting, test the route:
```bash
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount":10}'
```

You should get:
- **401 Unauthorized** if token is invalid (route is working!)
- **503 Service Unavailable** if Stripe is not configured (route is working!)
- **400 Validation Error** if amount is invalid (route is working!)
- **200 Success** with `clientSecret` if everything is configured correctly

If you still get 404, check:
1. Server logs for errors
2. Verify `routes/payments.js` exists
3. Verify `app.use('/api/payments', paymentRoutes)` is in server.js

### Step 3: Check Server Logs

After restarting, check the server output for:
```
✅ Server running on http://localhost:3000
✅ API available at http://localhost:3000/api
```

If you see errors about missing routes or modules, fix those first.

## Why This Happened

The payment routes were added to `server.js` AFTER the server was already running. Node.js/Express servers don't hot-reload route changes - they need to be restarted.

## Files Changed

The following files were added/modified but require a server restart:
- `routes/payments.js` (NEW) - Payment route handlers
- `server.js` (MODIFIED) - Added `app.use('/api/payments', paymentRoutes)`

## Stripe Errors

The Stripe errors (`r.stripe.com/b: Failed to fetch`) are expected if:
1. Stripe is not configured (missing `VITE_STRIPE_PUBLISHABLE_KEY`)
2. Ad blockers are blocking Stripe

These are handled by the lazy-loading code - Stripe only loads when you reach the payment step in checkout.

## Testing After Restart

1. **Restart server** (see Step 1 above)
2. **Go to checkout page** - should load without errors
3. **Add items to cart** - should work
4. **Go to checkout** - should work
5. **Proceed to payment step** - Stripe should load (if configured) or show friendly message
6. **Create payment intent** - should work (if server restarted)

## Quick Fix

If you just want to test quickly, restart the server:

```bash
# Stop current server
pkill -f "node server.js"

# Start again
cd /Users/maganali/Downloads/yardhop
npm start
```

Then try the checkout flow again.

