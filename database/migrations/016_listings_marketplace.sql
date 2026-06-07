-- ============================================================
-- YARDFRONT MARKETPLACE — Listings, Saved Items, Messages
-- Run in Supabase SQL Editor
-- ============================================================

-- Create appraisals table if it does not exist (required by appraise feature)
CREATE TABLE IF NOT EXISTS appraisals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address TEXT,
  fingerprint TEXT,
  is_free BOOLEAN DEFAULT true,
  item_name TEXT NOT NULL,
  item_brand TEXT,
  item_category TEXT,
  item_condition TEXT,
  item_description TEXT,
  input_type TEXT,
  price_fair DECIMAL,
  price_low DECIMAL,
  price_high DECIMAL,
  confidence_score INTEGER,
  sources_summary TEXT,
  sources_count INTEGER,
  seller_tips JSONB,
  raw_sources JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE IF NOT EXISTS listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  condition TEXT NOT NULL,
  asking_price DECIMAL NOT NULL,
  images TEXT[] DEFAULT '{}',
  location TEXT,
  shipping TEXT DEFAULT 'local' CHECK (shipping IN ('local', 'shipping', 'both')),
  appraisal_id UUID REFERENCES appraisals(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'sold', 'archived')),
  views INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved items / wishlist
CREATE TABLE IF NOT EXISTS saved_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, listing_id)
);

-- Messages between buyers and sellers (listing-based)
CREATE TABLE IF NOT EXISTS listing_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category);
CREATE INDEX IF NOT EXISTS idx_listings_condition ON listings(condition);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_listings_asking_price ON listings(asking_price);
CREATE INDEX IF NOT EXISTS idx_listings_user_id ON listings(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_items_user_id ON saved_items(user_id);
CREATE INDEX IF NOT EXISTS idx_listing_messages_listing_id ON listing_messages(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_messages_sender_receiver ON listing_messages(sender_id, receiver_id);

-- RLS
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_messages ENABLE ROW LEVEL SECURITY;

-- Listings: anyone can read active, only owner can write
DROP POLICY IF EXISTS "Anyone can view active listings" ON listings;
CREATE POLICY "Anyone can view active listings" ON listings
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can create their own listings" ON listings;
CREATE POLICY "Users can create their own listings" ON listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own listings" ON listings;
CREATE POLICY "Users can update their own listings" ON listings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own listings" ON listings;
CREATE POLICY "Users can delete their own listings" ON listings
  FOR DELETE USING (auth.uid() = user_id);

-- Allow service role to read all (for dashboard, etc.)
DROP POLICY IF EXISTS "Service role can read all listings" ON listings;
CREATE POLICY "Service role can read all listings" ON listings
  FOR SELECT TO service_role USING (true);

-- Saved items: only owner
DROP POLICY IF EXISTS "Users can manage their saved items" ON saved_items;
CREATE POLICY "Users can manage their saved items" ON saved_items
  FOR ALL USING (auth.uid() = user_id);

-- Messages: sender or receiver can read
DROP POLICY IF EXISTS "Users can read their messages" ON listing_messages;
CREATE POLICY "Users can read their messages" ON listing_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON listing_messages;
CREATE POLICY "Users can send messages" ON listing_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
