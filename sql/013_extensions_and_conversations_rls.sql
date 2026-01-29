-- ============================================================
-- 1. MOVE EXTENSIONS OUT OF PUBLIC (fixes "Extension in Public")
-- cube and earthdistance are used for geo; move to schema "extensions"
-- If you have indexes using ll_to_earth (e.g. gist on lat/lng), they
-- continue to work; ensure sessions that run geo queries have
-- search_path including "extensions" or use extensions.ll_to_earth.
-- ============================================================

CREATE SCHEMA IF NOT EXISTS extensions;

ALTER EXTENSION cube SET SCHEMA extensions;
ALTER EXTENSION earthdistance SET SCHEMA extensions;

-- Functions that use earthdistance (ll_to_earth, earth_distance) must see extensions schema
ALTER FUNCTION public.calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) SET search_path = public, extensions;

-- Grant usage so authenticated/anon can resolve extension objects if needed
GRANT USAGE ON SCHEMA extensions TO anon, authenticated;

-- ============================================================
-- 2. FIX CONVERSATIONS INSERT POLICY (fixes "RLS Policy Always True")
-- Drop any permissive INSERT policy and recreate with explicit auth check
-- ============================================================

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);
