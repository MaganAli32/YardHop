-- Appraisal pipeline v2: structured identification, verification, listing copy, comps.
-- Run in Supabase SQL Editor after 020. Safe to re-run.

ALTER TABLE appraisals
  ADD COLUMN IF NOT EXISTS item_model TEXT,
  ADD COLUMN IF NOT EXISTS item_variant TEXT,
  ADD COLUMN IF NOT EXISTS item_reference TEXT,
  ADD COLUMN IF NOT EXISTS item_attributes JSONB,          -- size, color, materials, visible text, features, alternatives
  ADD COLUMN IF NOT EXISTS identity_level TEXT,            -- exact | model | brand | category | unknown
  ADD COLUMN IF NOT EXISTS identity_confidence INTEGER,    -- 0-100, from the vision model
  ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT false, -- identity confirmed by grounded web lookup
  ADD COLUMN IF NOT EXISTS msrp DECIMAL,                   -- original retail price (USD) when known
  ADD COLUMN IF NOT EXISTS comp_query TEXT,                -- search used for comparable sales
  ADD COLUMN IF NOT EXISTS listing_title TEXT,             -- marketplace-ready title (<= 80 chars)
  ADD COLUMN IF NOT EXISTS listing_description TEXT,       -- marketplace-ready description
  ADD COLUMN IF NOT EXISTS listing_highlights JSONB,       -- string[]
  ADD COLUMN IF NOT EXISTS comps JSONB,                    -- filtered comparable listings used for pricing
  ADD COLUMN IF NOT EXISTS price_method TEXT,              -- comps | retail | msrp
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'ok',       -- ok | low_confidence | insufficient_data | unidentified
  ADD COLUMN IF NOT EXISTS pipeline_version TEXT,
  ADD COLUMN IF NOT EXISTS hint TEXT,                      -- seller-supplied note / filename hint
  ADD COLUMN IF NOT EXISTS diagnostics JSONB;              -- stage timings and source diagnostics

CREATE INDEX IF NOT EXISTS idx_appraisals_status ON appraisals(status);
CREATE INDEX IF NOT EXISTS idx_appraisals_identity_level ON appraisals(identity_level);

COMMENT ON COLUMN appraisals.status IS 'ok | low_confidence | insufficient_data | unidentified — never trust price_* when status is unidentified/insufficient_data';
