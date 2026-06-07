-- Business API waitlist: leads from /business landing page form.
-- RLS: anyone can insert; only service role can read (protect lead data).

CREATE TABLE IF NOT EXISTS business_waitlist (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  company TEXT NOT NULL,
  email TEXT NOT NULL,
  use_case TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Allow anyone to insert (public waitlist form, no auth required)
ALTER TABLE business_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can join waitlist"
ON business_waitlist FOR INSERT
WITH CHECK (true);

-- Only service role can read (protect lead data)
CREATE POLICY "Only service role can read waitlist"
ON business_waitlist FOR SELECT
USING (false);
