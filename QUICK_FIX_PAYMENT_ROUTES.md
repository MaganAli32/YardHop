# Quick Fix: Payment Routes 404 Error

## The Issue
Your server is running but was started **before** the payment routes were added. The payment routes aren't registered in the running server.

## Quick Fix (2 steps)

### Step 1: Restart the Server

**Option A: If using npm start**
```bash
# Stop the server (press Ctrl+C in the terminal where it's running)
# OR kill the process:
lsof -ti:3000 | xargs kill

# Then restart:
cd /Users/maganali/Downloads/yardhop
npm start
```

**Option B: If using PM2**
```bash
cd /Users/maganali/Downloads/yardhop
npm run pm2:restart
# OR
pm2 restart yardfront
```

**Option C: Quick restart**
```bash
cd /Users/maganali/Downloads/yardhop
# Stop and start in one command
pkill -f "node server.js" && sleep 2 && npm start
```

### Step 2: Verify It Works

After restarting, the server should show:
```
✅ Server running on http://localhost:3000
✅ API available at http://localhost:3000/api
```

Then test the payment route:
```bash
curl -X POST http://localhost:3000/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"amount":10}'
```

Expected responses:
- **401 Unauthorized** = Route exists! ✅ (just needs valid token)
- **503 Service Unavailable** = Route exists! ✅ (Stripe not configured)
- **400 Validation Error** = Route exists! ✅ (invalid amount)
- **200 Success** = Everything works! ✅

If you still get **404**, check:
1. Server logs for errors
2. That `routes/payments.js` exists
3. That `app.use('/api/payments', paymentRoutes)` is in server.js

## About Stripe Errors

The Stripe errors (`r.stripe.com/b: Failed to fetch`) are expected if:
1. **Stripe isn't configured** - Set `VITE_STRIPE_PUBLISHABLE_KEY` in frontend `.env`
2. **Ad blocker is blocking** - Stripe domain is often blocked by ad blockers

These errors should only appear on the checkout payment step. If they appear elsewhere, it's a bundling issue (not critical).

## After Restart

Once the server is restarted with the payment routes:
1. ✅ Payment intent creation should work
2. ✅ Checkout flow should work
3. ✅ You can test the full checkout process

## Current Status

- ✅ Payment routes code is correct
- ✅ Routes are properly exported
- ✅ Server.js has routes mounted
- ⚠️ **Server needs restart** to register routes

Restart the server and the 404 error should be fixed!

