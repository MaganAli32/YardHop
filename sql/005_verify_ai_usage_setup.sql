-- ============================================================
-- VERIFY: AI Usage Setup
-- Run this to check that everything is configured correctly
-- ============================================================

-- 1. Check that the table exists
SELECT 
  'ai_usage table exists' as check_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'ai_usage'
  ) as result;

-- 2. Check RLS is enabled
SELECT 
  'RLS enabled on ai_usage' as check_name,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'ai_usage';

-- 3. List all policies on ai_usage table
SELECT 
  'Policies on ai_usage' as check_name,
  policyname,
  cmd as command,
  qual as using_expression,
  with_check as with_check_expression
FROM pg_policies 
WHERE tablename = 'ai_usage'
ORDER BY policyname;

-- 4. Check subscription columns exist on profiles
SELECT 
  'Subscription columns on profiles' as check_name,
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'profiles'
  AND column_name IN ('subscription_tier', 'subscription_status', 'subscription_expires_at')
ORDER BY column_name;

-- 5. Show current usage count (if any records exist)
SELECT 
  'Current AI usage records' as check_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW())) as this_month_count
FROM ai_usage;

