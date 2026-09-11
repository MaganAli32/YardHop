-- ============================================================
-- DROP GARAGE SALES FEATURE
-- Removes all garage-sale tables, columns, views, triggers,
-- functions, and storage artifacts. The product no longer
-- supports garage sales.
--
-- DESTRUCTIVE: this permanently deletes garage-sale data.
-- Run once against your Supabase database (SQL editor).
-- ============================================================

-- 1. Drop dependent view (security invoker / definer variants)
DROP VIEW IF EXISTS public.public_garage_sales CASCADE;

-- 2. Drop the location-display trigger + function tied to garage_sales
DROP FUNCTION IF EXISTS public.compute_garage_sale_display_location() CASCADE;

-- 3. Drop foreign-key columns that reference garage sales
ALTER TABLE IF EXISTS public.products  DROP COLUMN IF EXISTS garage_sale_id;
ALTER TABLE IF EXISTS public.favorites DROP COLUMN IF EXISTS garage_sale_id;

-- 4. Drop the garage-sale tables (CASCADE clears FKs, policies, indexes, triggers)
DROP TABLE IF EXISTS public.garage_sale_images CASCADE;
DROP TABLE IF EXISTS public.garage_sales CASCADE;

-- 5. Remove the dedicated storage bucket and its policies
DROP POLICY IF EXISTS "Garage sale images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload garage sale images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their garage sale images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their garage sale images" ON storage.objects;

DELETE FROM storage.objects WHERE bucket_id = 'garage-sale-images';
DELETE FROM storage.buckets WHERE id = 'garage-sale-images';

-- ============================================================
-- NOTE: If you previously created the helper functions
-- get_exact_location() or find_items_within_radius() that
-- UNION over garage_sales, recreate them product-only if you
-- still rely on them. They are otherwise unused now.
-- ============================================================
