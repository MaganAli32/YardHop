# Database Migration Guide

Follow these steps to run the required SQL migrations in your Supabase database.

## 📋 Migrations to Run

1. **Payment Integration** - `sql/008_add_payment_fields.sql`
2. **Garage Sale Images Fix** - `sql/007_fix_garage_sale_images.sql`

---

## 🚀 Step-by-Step Instructions

### Step 1: Open Supabase Dashboard

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign in to your account
3. Select your YardFront project

### Step 2: Open SQL Editor

1. Click on **"SQL Editor"** in the left sidebar
2. Click **"New query"** button (top right)

### Step 3: Run Payment Integration Migration

1. Copy the entire contents of `sql/008_add_payment_fields.sql` (shown below)
2. Paste it into the SQL Editor
3. Click **"Run"** button (or press `Ctrl/Cmd + Enter`)
4. You should see: **"Success. No rows returned"** or **"Success"**

**Migration 1 SQL:**
```sql
-- Add payment fields to orders table
-- This migration adds Stripe payment integration fields to support secure payment processing

-- Add payment-related columns to orders table
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS payment_intent_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS payment_status TEXT CHECK (payment_status IN ('pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded')) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS payment_method_id TEXT,
  ADD COLUMN IF NOT EXISTS shipping_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS delivery_method TEXT CHECK (delivery_method IN ('pickup', 'shipping', 'local_dropoff')) DEFAULT 'pickup',
  ADD COLUMN IF NOT EXISTS shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS billing_address JSONB,
  ADD COLUMN IF NOT EXISTS payment_failure_reason TEXT;

-- Create index for faster payment status queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment ON orders(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN orders.payment_intent_id IS 'Stripe Payment Intent ID for this order';
COMMENT ON COLUMN orders.payment_status IS 'Current status of the payment (pending, processing, succeeded, failed, etc.)';
COMMENT ON COLUMN orders.stripe_payment_id IS 'Stripe Payment ID after successful payment';
COMMENT ON COLUMN orders.stripe_customer_id IS 'Stripe Customer ID for the buyer';
COMMENT ON COLUMN orders.payment_method_id IS 'Stripe Payment Method ID used for this order';
COMMENT ON COLUMN orders.shipping_amount IS 'Shipping/fee amount for this order';
COMMENT ON COLUMN orders.tax_amount IS 'Tax amount calculated for this order';
COMMENT ON COLUMN orders.delivery_method IS 'How the order will be delivered (pickup, shipping, local_dropoff)';
COMMENT ON COLUMN orders.shipping_address IS 'Shipping address as JSON object';
COMMENT ON COLUMN orders.billing_address IS 'Billing address as JSON object (if different from shipping)';
COMMENT ON COLUMN orders.payment_failure_reason IS 'Reason for payment failure if payment_status is failed';
```

### Step 4: Run Garage Sale Images Fix Migration

1. Create a new query (click "New query" again)
2. Copy the entire contents of `sql/007_fix_garage_sale_images.sql` (shown below)
3. Paste it into the SQL Editor
4. Click **"Run"** button
5. You should see: **"Migration complete!"** in the results

**Migration 2 SQL:**
```sql
-- ============================================================
-- FIX: Rename sale_id to garage_sale_id in garage_sale_images
-- Run this if you already have the table created with sale_id
-- ============================================================

-- Check if column needs renaming (this is idempotent)
DO $$
BEGIN
  -- Check if old column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'garage_sale_images' 
    AND column_name = 'sale_id'
  ) THEN
    -- Rename the column
    ALTER TABLE garage_sale_images RENAME COLUMN sale_id TO garage_sale_id;
    RAISE NOTICE 'Renamed sale_id to garage_sale_id';
  ELSE
    RAISE NOTICE 'Column already named garage_sale_id (or table does not exist)';
  END IF;
END $$;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Sale hosts can manage images" ON garage_sale_images;

-- Recreate policy with correct column name
CREATE POLICY "Sale hosts can manage images" ON garage_sale_images FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM garage_sales 
    WHERE garage_sales.id = garage_sale_images.garage_sale_id 
    AND garage_sales.host_id = auth.uid()
  ));

-- Done!
SELECT 'Migration complete!' as status;
```

### Step 5: Verify Migrations

1. Go to **"Table Editor"** in Supabase sidebar
2. Click on the **`orders`** table
3. Verify you see these new columns:
   - ✅ `payment_intent_id`
   - ✅ `payment_status`
   - ✅ `stripe_payment_id`
   - ✅ `shipping_address`
   - ✅ `billing_address`
   - ✅ `tax_amount`
   - ✅ `shipping_amount`
   - ✅ `delivery_method`

4. Click on the **`garage_sale_images`** table
5. Verify the column is named **`garage_sale_id`** (not `sale_id`)

---

## ✅ After Running Migrations

1. **Restart your backend server** (if it's running) to pick up any changes
2. **Test the payment flow:**
   - Add items to cart
   - Go to checkout
   - Enter test card: `4242 4242 4242 4242`
   - Any future expiry date (e.g., `12/34`)
   - Any 3-digit CVC (e.g., `123`)
   - Complete payment
   - Verify order is created with payment information

---

## 🔧 Troubleshooting

### Error: "column already exists"
- **Solution:** This means the migration has already been run. That's fine! Just skip to the next migration.

### Error: "table does not exist"
- **Solution:** You need to run the base schema first. Run `sql/001_schema.sql` to create all tables.

### Error: "permission denied"
- **Solution:** Make sure you're logged in and have admin access to the Supabase project.

### Error: "relation 'orders' does not exist"
- **Solution:** The `orders` table hasn't been created yet. Run `sql/001_schema.sql` first.

---

## 📝 Notes

- These migrations are **idempotent** - they can be run multiple times safely
- The `IF NOT EXISTS` clauses prevent errors if columns already exist
- All migrations are safe to run in production

---

## 🎉 Success!

Once both migrations are complete:
- ✅ Payment integration is fully functional
- ✅ Orders require payment before creation
- ✅ Garage sale images will work correctly

