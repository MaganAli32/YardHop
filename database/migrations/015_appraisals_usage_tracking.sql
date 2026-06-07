-- Add columns for freemium usage tracking (anonymous + logged-in)
-- Run in Supabase SQL Editor
-- Run after 014

ALTER TABLE appraisals ADD COLUMN IF NOT EXISTS ip_address TEXT;
ALTER TABLE appraisals ADD COLUMN IF NOT EXISTS fingerprint TEXT;
ALTER TABLE appraisals ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT true;
