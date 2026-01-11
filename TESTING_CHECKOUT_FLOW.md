# Testing Checkout Flow Guide

## Overview
This guide will help you test the complete checkout flow from browsing products to completing payment.

## Prerequisites
1. **You must be logged in** - Sign in at `/login` or create an account at `/signup`
2. **Stripe must be configured** - See `STRIPE_INTEGRATION_SETUP.md` for setup instructions
3. **Backend must be running** - Make sure your server is running on the configured port

## Testing Flow

### Step 1: Browse/Search for Products

**Option A: Use Search Page**
1. Navigate to `/search` in your browser
2. Browse available products
3. Click on any product to view details

**Option B: Use Navigation**
1. Click "Search" or "Browse" in the navigation menu
2. Find a product you want to purchase
3. Click on the product card to view details

**Option C: Direct Product URL**
1. If you know a product ID, navigate to `/product/{product-id}`
2. Example: `http://localhost:5173/product/123`

### Step 2: Add Product to Cart

1. On the product detail page (`/product/{id}`)
2. Look for the **"Add to Cart"** button (orange button with shopping cart icon)
3. Click the button
4. You should see:
   - Button changes to "Adding to Cart..." (with spinner)
   - Then changes to "Added to Cart!" (green checkmark)
   - Button resets after 3 seconds

**Note:** If you're not logged in, clicking "Add to Cart" will redirect you to the login page.

### Step 3: View Cart

1. After adding items to cart, you can:
   - Click the cart icon in the navigation (if available)
   - Navigate to `/cart` directly
   - Or wait for automatic redirect (if implemented)

2. On the cart page, you should see:
   - List of items you added
   - Quantity controls (increase/decrease)
   - Remove item buttons
   - Order summary with subtotal, shipping, tax, and total
   - **"Proceed to Checkout"** button

### Step 4: Checkout Process

1. Click **"Proceed to Checkout"** on the cart page
2. You'll be taken to `/checkout` with 3 steps:

   **Step 1: Shipping Information**
   - Fill in your shipping details:
     - Full Name
     - Email Address
     - Phone Number
     - Street Address
     - City, State, ZIP
   - Click **"Proceed to Payment"**

   **Step 2: Payment Information**
   - Enter cardholder name
   - Enter card details using Stripe Elements (secure card input)
   - Check "Billing address same as shipping" if applicable
   - Click **"Review Order"**
   - Payment will be processed automatically

   **Step 3: Review Order**
   - Review shipping information (can edit)
   - Review payment information (can edit)
   - Review items in your order
   - Click **"Confirm & Buy Treasures"**
   - Order will be created after payment confirmation

### Step 5: Order Confirmation

1. After confirming order, you should see:
   - Success message: "Order Confirmed!"
   - Redirect to `/orders` after 3 seconds
   - Order will appear in your orders list

## Test Cards (Stripe Test Mode)

When testing with Stripe in test mode, use these test cards:

### Success Card
- **Card Number:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/25`)
- **CVV:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

### Decline Card
- **Card Number:** `4000 0000 0000 0002`
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **ZIP:** Any 5 digits

### 3D Secure Card
- **Card Number:** `4000 0025 0000 3155`
- **Expiry:** Any future date
- **CVV:** Any 3 digits
- **ZIP:** Any 5 digits

## Troubleshooting

### "Add to Cart" Button Not Showing
- **Check:** Are you on a product detail page? (`/product/{id}`)
- **Check:** Is the product loaded? Look for product title and price
- **Check:** Browser console for errors

### "Add to Cart" Button Disabled
- **Check:** Are you logged in? Button is disabled if not authenticated
- **Check:** Has item already been added? Button shows "Added to Cart!" if already in cart

### Can't Find Products to Add
- **Check:** Navigate to `/search` - are products displayed?
- **Check:** Is the backend API running? Products come from `/api/products`
- **Check:** Browser console for API errors

### Cart is Empty
- **Check:** Did you successfully add items? Look for success message
- **Check:** Are you logged in with the same account that added items?
- **Check:** Browser console for errors when adding to cart

### Checkout Page Shows "Cart is Empty"
- **Check:** Did you navigate to `/checkout` directly without items in cart?
- **Check:** Cart page should redirect to cart if empty
- **Check:** Add items to cart first, then go to checkout

### Payment Form Not Loading
- **Check:** Is `VITE_STRIPE_PUBLISHABLE_KEY` set in your frontend `.env` file?
- **Check:** Browser console for Stripe initialization errors
- **Check:** Is Stripe publishable key valid?

### Payment Fails
- **Check:** Are you using a test card? (see Test Cards above)
- **Check:** Is `STRIPE_SECRET_KEY` or `STRIPE_SECRET_KEY_TEST` set in backend `.env`?
- **Check:** Backend logs for payment errors
- **Check:** Stripe Dashboard for payment attempts

### Order Creation Fails
- **Check:** Was payment successful? Check payment status in Stripe Dashboard
- **Check:** Backend logs for order creation errors
- **Check:** Is database migration `008_add_payment_fields.sql` run?
- **Check:** Are required fields (seller_id, payment_intent_id) present?

## Quick Test Checklist

- [ ] User can browse/search for products
- [ ] User can view product details
- [ ] User can add product to cart (when logged in)
- [ ] User is redirected to login if not authenticated
- [ ] Cart page displays added items
- [ ] Cart page shows correct totals (subtotal, tax, total)
- [ ] User can proceed to checkout from cart
- [ ] Shipping form validates inputs
- [ ] Payment form loads with Stripe Elements
- [ ] User can enter card details
- [ ] Payment processes successfully
- [ ] Order is created after payment
- [ ] User is redirected to orders page
- [ ] Order appears in orders list

## Common Issues

### No Products Available
If you can't find any products to add to cart:

1. **Check if products exist in database:**
   - Go to Supabase Dashboard
   - Check `products` table
   - Verify there are products with `status = 'active'`

2. **Create test product:**
   ```sql
   INSERT INTO products (
     seller_id,
     title,
     description,
     price,
     location,
     status,
     quantity
   ) VALUES (
     '<your-user-id>',
     'Test Product',
     'This is a test product',
     29.99,
     'Austin, TX',
     'active',
     1
   );
   ```

3. **Check API endpoint:**
   - Test: `GET http://localhost:3000/api/products`
   - Should return list of products

### Backend Not Running
If checkout doesn't work:

1. **Start backend server:**
   ```bash
   npm start
   # or
   npm run dev:server
   ```

2. **Check backend logs:**
   - Look for errors in console
   - Verify database connection
   - Verify Stripe configuration

### Stripe Not Configured
If payment form doesn't load:

1. **Frontend:** Add to `.env` or `.env.local`:
   ```
   VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

2. **Backend:** Add to `.env`:
   ```
   STRIPE_SECRET_KEY_TEST=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

3. **Get keys from Stripe Dashboard:**
   - Go to https://dashboard.stripe.com
   - Developers → API keys
   - Copy Test keys

## Next Steps After Testing

Once checkout flow is working:

1. **Test with real products** (if you have them)
2. **Test payment failures** (use decline card)
3. **Test order cancellation**
4. **Test refund process** (in Stripe Dashboard)
5. **Set up production Stripe account** (when ready)
6. **Configure production webhooks**

## Need Help?

If you're still having issues:

1. Check browser console for errors
2. Check backend logs for errors
3. Check Stripe Dashboard for payment attempts
4. Verify all environment variables are set
5. Verify database migrations are run
6. Check network tab for API errors

