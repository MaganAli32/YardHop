-- Stripe billing metadata for API plans.
ALTER TABLE api_keys
  ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_period TEXT DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_customer
  ON api_keys(stripe_customer_id);

CREATE INDEX IF NOT EXISTS idx_api_keys_stripe_subscription
  ON api_keys(stripe_subscription_id);
