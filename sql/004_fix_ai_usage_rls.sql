-- ============================================================
-- FIX: Add missing RLS policy for users to insert AI usage
-- Run this if you already ran 004_subscription_ai_usage.sql
-- Safe to run multiple times - will drop and recreate if exists
-- ============================================================

-- Drop policy if it exists (safe to run multiple times)
DROP POLICY IF EXISTS "Users can insert own AI usage" ON ai_usage;

-- Add policy for users to insert their own AI usage records
CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

