# 🚀 Quick Copy-Paste Migration SQL

## Migration 1: Payment Integration
Copy and paste this into Supabase SQL Editor:

```sql
-- Add payment fields to orders table
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

CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_intent ON orders(payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_stripe_payment ON orders(stripe_payment_id) WHERE stripe_payment_id IS NOT NULL;
```

---

## Migration 2: Garage Sale Images Fix
Copy and paste this into Supabase SQL Editor:

```sql
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'garage_sale_images' 
    AND column_name = 'sale_id'
  ) THEN
    ALTER TABLE garage_sale_images RENAME COLUMN sale_id TO garage_sale_id;
    RAISE NOTICE 'Renamed sale_id to garage_sale_id';
  ELSE
    RAISE NOTICE 'Column already named garage_sale_id';
  END IF;
END $$;

DROP POLICY IF EXISTS "Sale hosts can manage images" ON garage_sale_images;

CREATE POLICY "Sale hosts can manage images" ON garage_sale_images FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM garage_sales 
    WHERE garage_sales.id = garage_sale_images.garage_sale_id 
    AND garage_sales.host_id = auth.uid()
  ));

SELECT 'Migration complete!' as status;
```
