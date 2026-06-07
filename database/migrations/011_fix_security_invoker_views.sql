-- ============================================================
-- FIX: public_garage_sales and public_products SECURITY DEFINER
-- ============================================================
-- Supabase flags views with SECURITY DEFINER as critical: they run
-- with the view owner's permissions and can bypass RLS.
-- Recreate both views with security_invoker = true (PostgreSQL 15+)
-- so they run as the querying user and respect RLS on base tables.
-- ============================================================

-- Drop existing views (order may matter if one depends on the other; they don't)
DROP VIEW IF EXISTS public.public_garage_sales;
DROP VIEW IF EXISTS public.public_products;

-- Recreate with security_invoker = true (caller's permissions, RLS respected)
CREATE VIEW public.public_garage_sales
  WITH (security_invoker = true)
AS
SELECT
  id,
  host_id,
  title,
  description,
  address,
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
FROM public.garage_sales
WHERE status IN ('upcoming', 'active');

CREATE VIEW public.public_products
  WITH (security_invoker = true)
AS
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
FROM public.products
WHERE status = 'active';

-- Restore grants so anon/authenticated can SELECT (RLS on base tables still applies)
GRANT SELECT ON public.public_garage_sales TO anon, authenticated;
GRANT SELECT ON public.public_products TO anon, authenticated;
