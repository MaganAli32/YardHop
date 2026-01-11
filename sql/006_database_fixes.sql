-- =============================================================================
-- YARDHOP DATABASE FIX
-- Run this in Supabase SQL Editor to fix missing columns
-- =============================================================================

-- =============================================================================
-- 1. FIX PROFILES TABLE - Add missing rating columns
-- =============================================================================

-- Add rating_average if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2) DEFAULT 0;

-- Add rating_count if it doesn't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Add total_sales if it doesn't exist  
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0;

-- Add response_time if it doesn't exist
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS response_time TEXT DEFAULT 'Usually responds within a few hours';

-- =============================================================================
-- 2. FIX PRODUCTS TABLE - Add any missing columns
-- =============================================================================

-- Add seller_id if missing (critical for products to work)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS seller_id UUID REFERENCES profiles(id);

-- Add location fields if missing
ALTER TABLE products
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE products
ADD COLUMN IF NOT EXISTS location TEXT;

-- Add status if missing
ALTER TABLE products
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'sold', 'pending', 'deleted'));

-- Add condition if missing (note: schema uses different values)
ALTER TABLE products
ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'Good'
CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Project Piece'));

-- Add images array if missing
ALTER TABLE products
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

-- =============================================================================
-- 3. FIX FAVORITES TABLE - Ensure it exists and is properly structured
-- =============================================================================

-- Create favorites table if it doesn't exist (basic structure)
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add garage_sale_id column if it doesn't exist
ALTER TABLE favorites
ADD COLUMN IF NOT EXISTS garage_sale_id UUID REFERENCES garage_sales(id) ON DELETE CASCADE;

-- Make product_id nullable if it's currently NOT NULL (needed for "either/or" constraint)
DO $$
BEGIN
  -- Check if product_id column exists and is NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'favorites' 
    AND column_name = 'product_id'
    AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE favorites ALTER COLUMN product_id DROP NOT NULL;
  END IF;
END $$;

-- Drop existing constraints if they exist (to avoid conflicts)
-- First, drop any constraints that might exist with auto-generated names
DO $$
DECLARE
  r RECORD;
BEGIN
  -- Drop the favorites_has_target constraint if it exists
  ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_has_target;
  
  -- Drop unique_user_product constraint (could be named different ways)
  ALTER TABLE favorites DROP CONSTRAINT IF EXISTS unique_user_product;
  ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_user_id_product_id_key;
  
  -- Drop unique_user_garage_sale constraint
  ALTER TABLE favorites DROP CONSTRAINT IF EXISTS unique_user_garage_sale;
  
  -- Find and drop any other unique constraints on (user_id, product_id)
  FOR r IN 
    SELECT conname 
    FROM pg_constraint 
    WHERE conrelid = 'favorites'::regclass 
    AND contype = 'u'
    AND array_length(conkey, 1) = 2
    AND conkey::text LIKE '%user_id%' AND conkey::text LIKE '%product_id%'
  LOOP
    EXECUTE 'ALTER TABLE favorites DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
  END LOOP;
END $$;

-- Add unique constraint for products (allows NULLs for product_id when garage_sale_id is set)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_product' 
    AND conrelid = 'favorites'::regclass
  ) THEN
    -- Use partial unique index for products (only when product_id is not null)
    CREATE UNIQUE INDEX IF NOT EXISTS unique_user_product_idx 
    ON favorites(user_id, product_id) 
    WHERE product_id IS NOT NULL;
  END IF;
END $$;

-- Add unique constraint for garage sales (only when garage_sale_id is not null)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'unique_user_garage_sale' 
    AND conrelid = 'favorites'::regclass
  ) THEN
    -- Use partial unique index for garage sales (only when garage_sale_id is not null)
    CREATE UNIQUE INDEX IF NOT EXISTS unique_user_garage_sale_idx 
    ON favorites(user_id, garage_sale_id) 
    WHERE garage_sale_id IS NOT NULL;
  END IF;
END $$;

-- Add the constraint for at least one target (after garage_sale_id column exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'favorites_has_target' 
    AND conrelid = 'favorites'::regclass
  ) THEN
    ALTER TABLE favorites
    ADD CONSTRAINT favorites_has_target CHECK (
      (product_id IS NOT NULL) OR (garage_sale_id IS NOT NULL)
    );
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_product_id ON favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_favorites_garage_sale_id ON favorites(garage_sale_id);

-- =============================================================================
-- 4. FIX GARAGE_SALES TABLE - Add any missing columns
-- =============================================================================

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS host_id UUID REFERENCES profiles(id);

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'upcoming'
CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled'));

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS start_date DATE;

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS end_date DATE;

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS start_time TIME;

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS end_time TIME;

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS images TEXT[] DEFAULT '{}';

ALTER TABLE garage_sales
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- =============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE garage_sales ENABLE ROW LEVEL SECURITY;

-- PROFILES: Anyone can read, users can update their own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- PRODUCTS: Anyone can read active, sellers can manage their own
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (status = 'active' OR seller_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own products" ON products;
CREATE POLICY "Users can insert own products" ON products
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can update own products" ON products;
CREATE POLICY "Users can update own products" ON products
  FOR UPDATE USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Users can delete own products" ON products;
CREATE POLICY "Users can delete own products" ON products
  FOR DELETE USING (auth.uid() = seller_id);

-- FAVORITES: Users can only see and manage their own favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites" ON favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites
  FOR DELETE USING (auth.uid() = user_id);

-- GARAGE_SALES: Anyone can read upcoming/active, hosts can manage their own
DROP POLICY IF EXISTS "Garage sales are viewable by everyone" ON garage_sales;
CREATE POLICY "Garage sales are viewable by everyone" ON garage_sales
  FOR SELECT USING (status IN ('upcoming', 'active') OR host_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own garage sales" ON garage_sales;
CREATE POLICY "Users can insert own garage sales" ON garage_sales
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Users can update own garage sales" ON garage_sales;
CREATE POLICY "Users can update own garage sales" ON garage_sales
  FOR UPDATE USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Users can delete own garage sales" ON garage_sales;
CREATE POLICY "Users can delete own garage sales" ON garage_sales
  FOR DELETE USING (auth.uid() = host_id);

-- =============================================================================
-- 6. CREATE HELPER FUNCTION FOR PRODUCTS API
-- =============================================================================

-- This function returns products with seller info, avoiding the join issue
CREATE OR REPLACE FUNCTION get_products_with_seller(
  p_status TEXT DEFAULT 'active',
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  price DECIMAL,
  images TEXT[],
  condition TEXT,
  category TEXT,
  location TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  status TEXT,
  seller_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  seller_name TEXT,
  seller_avatar TEXT,
  seller_rating DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    p.title,
    p.description,
    p.price,
    COALESCE(p.images, ARRAY[]::TEXT[]) as images,
    p.condition,
    p.category,
    p.location,
    p.latitude,
    p.longitude,
    p.status,
    p.seller_id,
    p.created_at,
    p.updated_at,
    COALESCE(pr.name, 'Anonymous') as seller_name,
    pr.avatar_url as seller_avatar,
    COALESCE(pr.rating_average, 0) as seller_rating
  FROM products p
  LEFT JOIN profiles pr ON p.seller_id = pr.id
  WHERE p.status = p_status
  ORDER BY p.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- 7. VERIFY EVERYTHING
-- =============================================================================

-- Check that all columns exist
DO $$
BEGIN
  -- Check profiles
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'rating_average') THEN
    RAISE EXCEPTION 'profiles.rating_average column still missing!';
  END IF;
  
  -- Check products  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'seller_id') THEN
    RAISE EXCEPTION 'products.seller_id column still missing!';
  END IF;
  
  RAISE NOTICE 'All database fixes applied successfully!';
END $$;




