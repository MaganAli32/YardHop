-- ============================================================
-- LOCATION PRIVACY SYSTEM
-- Adds privacy-aware location fields and triggers
-- ============================================================

-- Add location privacy columns to garage_sales
ALTER TABLE garage_sales
  ADD COLUMN IF NOT EXISTS location_privacy TEXT CHECK (location_privacy IN ('exact', 'neighborhood', 'city')) DEFAULT 'neighborhood',
  ADD COLUMN IF NOT EXISTS display_latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS display_longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS privacy_radius_meters INTEGER,
  ADD COLUMN IF NOT EXISTS display_text TEXT;

-- Add location privacy columns to products
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS location_privacy TEXT CHECK (location_privacy IN ('exact', 'neighborhood', 'city')) DEFAULT 'neighborhood',
  ADD COLUMN IF NOT EXISTS display_latitude DECIMAL(10,8),
  ADD COLUMN IF NOT EXISTS display_longitude DECIMAL(11,8),
  ADD COLUMN IF NOT EXISTS privacy_radius_meters INTEGER;

-- Ensure all columns referenced in the view exist (might be missing if table was created differently)
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS shipping_available BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS shipping_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS market_average DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS is_steal BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS steal_percentage INTEGER,
  ADD COLUMN IF NOT EXISTS garage_sale_id UUID,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS original_price DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS tags TEXT[];

-- ============================================================
-- HELPER FUNCTION: Apply privacy offset
-- ============================================================
CREATE OR REPLACE FUNCTION apply_privacy_offset(
  lat DECIMAL,
  lng DECIMAL,
  privacy_level TEXT
)
RETURNS TABLE(
  display_lat DECIMAL,
  display_lng DECIMAL,
  radius_meters INTEGER
) AS $$
DECLARE
  offset_meters INTEGER;
  radius_meters INTEGER;
  lat_offset DECIMAL;
  lng_offset DECIMAL;
  random_direction DECIMAL;
BEGIN
  -- Set radius and offset based on privacy level
  CASE privacy_level
    WHEN 'exact' THEN
      radius_meters := 0;
      offset_meters := 0;
    WHEN 'neighborhood' THEN
      radius_meters := 800; -- ~0.5 miles
      offset_meters := 200 + (RANDOM() * 400)::INTEGER; -- Random 200-600m
    WHEN 'city' THEN
      radius_meters := 5000; -- ~3 miles
      offset_meters := 1000 + (RANDOM() * 2000)::INTEGER; -- Random 1-3km
    ELSE
      radius_meters := 800;
      offset_meters := 200 + (RANDOM() * 400)::INTEGER;
  END CASE;

  IF offset_meters = 0 THEN
    RETURN QUERY SELECT lat, lng, radius_meters;
    RETURN;
  END IF;

  -- Random direction (0 to 2π)
  random_direction := RANDOM() * 2 * PI();

  -- Convert meters to degrees (approximate)
  -- 1 degree latitude ≈ 111,000 meters
  -- 1 degree longitude ≈ 111,000 * cos(latitude) meters
  lat_offset := (offset_meters * SIN(random_direction)) / 111000.0;
  lng_offset := (offset_meters * COS(random_direction)) / (111000.0 * COS(RADIANS(lat)));

  RETURN QUERY SELECT
    lat + lat_offset AS display_lat,
    lng + lng_offset AS display_lng,
    radius_meters;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- TRIGGER: Auto-compute display coordinates for garage_sales
-- ============================================================
CREATE OR REPLACE FUNCTION compute_garage_sale_display_location()
RETURNS TRIGGER AS $$
DECLARE
  result RECORD;
BEGIN
  -- Only compute if we have exact coordinates
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    SELECT * INTO result
    FROM apply_privacy_offset(
      NEW.latitude,
      NEW.longitude,
      COALESCE(NEW.location_privacy, 'neighborhood')
    );

    NEW.display_latitude := result.display_lat;
    NEW.display_longitude := result.display_lng;
    NEW.privacy_radius_meters := result.radius_meters;

    -- Set display text
    CASE NEW.location_privacy
      WHEN 'exact' THEN
        NEW.display_text := COALESCE(NEW.address, 'Exact location');
      WHEN 'neighborhood' THEN
        NEW.display_text := 'Neighborhood area';
      WHEN 'city' THEN
        NEW.display_text := 'City area';
      ELSE
        NEW.display_text := 'Neighborhood area';
    END CASE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_garage_sale_display_location
  BEFORE INSERT OR UPDATE OF latitude, longitude, location_privacy ON garage_sales
  FOR EACH ROW
  EXECUTE FUNCTION compute_garage_sale_display_location();

-- ============================================================
-- TRIGGER: Auto-compute display coordinates for products
-- ============================================================
CREATE OR REPLACE FUNCTION compute_product_display_location()
RETURNS TRIGGER AS $$
DECLARE
  result RECORD;
BEGIN
  -- Only compute if we have exact coordinates
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    SELECT * INTO result
    FROM apply_privacy_offset(
      NEW.latitude,
      NEW.longitude,
      COALESCE(NEW.location_privacy, 'neighborhood')
    );

    NEW.display_latitude := result.display_lat;
    NEW.display_longitude := result.display_lng;
    NEW.privacy_radius_meters := result.radius_meters;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_compute_product_display_location
  BEFORE INSERT OR UPDATE OF latitude, longitude, location_privacy ON products
  FOR EACH ROW
  EXECUTE FUNCTION compute_product_display_location();

-- ============================================================
-- PUBLIC VIEW: Garage sales with privacy-safe coordinates
-- ============================================================
CREATE OR REPLACE VIEW public_garage_sales AS
SELECT
  id,
  host_id,
  title,
  description,
  address,
  -- Use display coordinates (privacy-offset) for public view
  COALESCE(display_latitude, latitude) AS latitude,
  COALESCE(display_longitude, longitude) AS longitude,
  location_privacy,
  privacy_radius_meters,
  display_text,
  start_date,
  end_date,
  start_time,
  end_time,
  tags,
  is_multi_family,
  status,
  view_count,
  created_at,
  updated_at
FROM garage_sales
WHERE status IN ('upcoming', 'active');

-- ============================================================
-- PUBLIC VIEW: Products with privacy-safe coordinates
-- ============================================================
CREATE OR REPLACE VIEW public_products AS
SELECT
  id,
  seller_id,
  title,
  description,
  price,
  original_price,
  market_average,
  is_steal,
  steal_percentage,
  condition,
  category,
  tags,
  location,
  -- Use display coordinates (privacy-offset) for public view
  COALESCE(display_latitude, latitude) AS latitude,
  COALESCE(display_longitude, longitude) AS longitude,
  location_privacy,
  privacy_radius_meters,
  quantity,
  status,
  is_featured,
  view_count,
  garage_sale_id,
  shipping_available,
  shipping_price,
  created_at,
  updated_at
FROM products
WHERE status = 'active';

-- ============================================================
-- HELPER FUNCTION: Get exact location (owner only)
-- ============================================================
CREATE OR REPLACE FUNCTION get_exact_location(
  table_name TEXT,
  record_id UUID,
  user_id UUID
)
RETURNS TABLE(
  latitude DECIMAL,
  longitude DECIMAL,
  address TEXT
) AS $$
BEGIN
  IF table_name = 'garage_sales' THEN
    RETURN QUERY
    SELECT gs.latitude, gs.longitude, gs.address
    FROM garage_sales gs
    WHERE gs.id = record_id AND gs.host_id = user_id;
  ELSIF table_name = 'products' THEN
    RETURN QUERY
    SELECT p.latitude, p.longitude, p.location AS address
    FROM products p
    WHERE p.id = record_id AND p.seller_id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- HELPER FUNCTION: Find items within radius
-- ============================================================
CREATE OR REPLACE FUNCTION find_items_within_radius(
  center_lat DECIMAL,
  center_lng DECIMAL,
  radius_miles DECIMAL DEFAULT 10
)
RETURNS TABLE(
  id UUID,
  title TEXT,
  latitude DECIMAL,
  longitude DECIMAL,
  distance_miles DECIMAL,
  table_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Garage sales
  SELECT
    gs.id,
    gs.title,
    COALESCE(gs.display_latitude, gs.latitude) AS latitude,
    COALESCE(gs.display_longitude, gs.longitude) AS longitude,
    (
      3959 * acos(
        cos(radians(center_lat)) *
        cos(radians(COALESCE(gs.display_latitude, gs.latitude))) *
        cos(radians(COALESCE(gs.display_longitude, gs.longitude)) - radians(center_lng)) +
        sin(radians(center_lat)) *
        sin(radians(COALESCE(gs.display_latitude, gs.latitude)))
      )
    ) AS distance_miles,
    'garage_sale'::TEXT AS table_type
  FROM garage_sales gs
  WHERE
    gs.status IN ('upcoming', 'active')
    AND (gs.display_latitude IS NOT NULL OR gs.latitude IS NOT NULL)
    AND (
      3959 * acos(
        cos(radians(center_lat)) *
        cos(radians(COALESCE(gs.display_latitude, gs.latitude))) *
        cos(radians(COALESCE(gs.display_longitude, gs.longitude)) - radians(center_lng)) +
        sin(radians(center_lat)) *
        sin(radians(COALESCE(gs.display_latitude, gs.latitude)))
      )
    ) <= radius_miles

  UNION ALL

  -- Products
  SELECT
    p.id,
    p.title,
    COALESCE(p.display_latitude, p.latitude) AS latitude,
    COALESCE(p.display_longitude, p.longitude) AS longitude,
    (
      3959 * acos(
        cos(radians(center_lat)) *
        cos(radians(COALESCE(p.display_latitude, p.latitude))) *
        cos(radians(COALESCE(p.display_longitude, p.longitude)) - radians(center_lng)) +
        sin(radians(center_lat)) *
        sin(radians(COALESCE(p.display_latitude, p.latitude)))
      )
    ) AS distance_miles,
    'product'::TEXT AS table_type
  FROM products p
  WHERE
    p.status = 'active'
    AND (p.display_latitude IS NOT NULL OR p.latitude IS NOT NULL)
    AND (
      3959 * acos(
        cos(radians(center_lat)) *
        cos(radians(COALESCE(p.display_latitude, p.latitude))) *
        cos(radians(COALESCE(p.display_longitude, p.longitude)) - radians(center_lng)) +
        sin(radians(center_lat)) *
        sin(radians(COALESCE(p.display_latitude, p.latitude)))
      )
    ) <= radius_miles

  ORDER BY distance_miles;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- GRANT PERMISSIONS
-- ============================================================
GRANT SELECT ON public_garage_sales TO anon, authenticated;
GRANT SELECT ON public_products TO anon, authenticated;
GRANT EXECUTE ON FUNCTION find_items_within_radius TO anon, authenticated;

-- ============================================================
-- UPDATE EXISTING RECORDS (optional - run manually if needed)
-- ============================================================
-- Uncomment to update existing records with default privacy settings:
-- UPDATE garage_sales SET location_privacy = 'neighborhood' WHERE location_privacy IS NULL;
-- UPDATE products SET location_privacy = 'neighborhood' WHERE location_privacy IS NULL;




