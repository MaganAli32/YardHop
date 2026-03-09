-- ── API KEYS TABLE ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  key TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  monthly_limit INTEGER NOT NULL DEFAULT 25,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own API key"
ON api_keys FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own API key"
ON api_keys FOR UPDATE
USING (auth.uid() = user_id);

-- ── API USAGE TABLE ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS api_usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint TEXT NOT NULL DEFAULT '/api/v1/appraise',
  item_name TEXT,
  image_url TEXT,
  price_low NUMERIC,
  price_high NUMERIC,
  confidence NUMERIC,
  status TEXT DEFAULT 'success',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE api_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own usage"
ON api_usage FOR SELECT
USING (auth.uid() = user_id);

-- ── AUTO-GENERATE KEY ON SIGNUP ─────────────────────────────
CREATE OR REPLACE FUNCTION generate_api_key_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_key TEXT;
BEGIN
  new_key := 'yf_live_' || encode(gen_random_bytes(8), 'hex');
  INSERT INTO api_keys (user_id, key, plan, monthly_limit)
  VALUES (NEW.id, new_key, 'free', 25);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION generate_api_key_for_new_user();

-- ── HELPER VIEW: usage this month ───────────────────────────
CREATE OR REPLACE VIEW api_usage_this_month AS
SELECT
  user_id,
  api_key_id,
  COUNT(*)::integer AS usage_count,
  DATE_TRUNC('month', NOW()) AS month_start
FROM api_usage
WHERE
  created_at >= DATE_TRUNC('month', NOW())
  AND status = 'success'
GROUP BY user_id, api_key_id;

-- Allow authenticated users to read the view (RLS on api_usage still applies)
GRANT SELECT ON api_usage_this_month TO authenticated;

-- ── BACKFILL: existing users without an API key ──────────────
INSERT INTO api_keys (user_id, key, plan, monthly_limit)
SELECT
  id,
  'yf_live_' || encode(gen_random_bytes(8), 'hex'),
  'free',
  25
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM api_keys);
