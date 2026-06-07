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

-- Update RLS policies to allow users to see their own payment info
-- Note: Payment intent IDs should only be visible to the buyer
-- Sellers should only see payment status (succeeded/failed) but not payment details

-- Ensure existing RLS policies still work with new columns
-- (No changes needed to RLS as columns are automatically covered by existing policies)

