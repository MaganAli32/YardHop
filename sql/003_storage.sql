-- ============================================================
-- YARDHOP STORAGE BUCKETS & POLICIES
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('listing-images', 'listing-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('garage-sale-images', 'garage-sale-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('community-images', 'community-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('message-attachments', 'message-attachments', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- AVATARS BUCKET POLICIES
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;

-- Anyone can view avatars
CREATE POLICY "Avatar images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Users can upload their own avatar
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own avatar
CREATE POLICY "Users can update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own avatar
CREATE POLICY "Users can delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- LISTING IMAGES BUCKET POLICIES
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Listing images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own listing images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own listing images" ON storage.objects;

-- Anyone can view listing images
CREATE POLICY "Listing images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-images');

-- Authenticated users can upload listing images
CREATE POLICY "Authenticated users can upload listing images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own listing images
CREATE POLICY "Users can update own listing images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own listing images
CREATE POLICY "Users can delete own listing images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'listing-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- GARAGE SALE IMAGES BUCKET POLICIES
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Garage sale images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload garage sale images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own garage sale images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own garage sale images" ON storage.objects;

-- Anyone can view garage sale images
CREATE POLICY "Garage sale images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'garage-sale-images');

-- Authenticated users can upload garage sale images
CREATE POLICY "Authenticated users can upload garage sale images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'garage-sale-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own garage sale images
CREATE POLICY "Users can update own garage sale images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'garage-sale-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own garage sale images
CREATE POLICY "Users can delete own garage sale images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'garage-sale-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- COMMUNITY IMAGES BUCKET POLICIES
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Community images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own community images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own community images" ON storage.objects;

-- Anyone can view community images
CREATE POLICY "Community images are publicly accessible"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'community-images');

-- Authenticated users can upload community images
CREATE POLICY "Authenticated users can upload community images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'community-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own community images
CREATE POLICY "Users can update own community images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'community-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own community images
CREATE POLICY "Users can delete own community images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================
-- MESSAGE ATTACHMENTS BUCKET POLICIES (Private)
-- ============================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Conversation participants can view attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload message attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own message attachments" ON storage.objects;

-- Only conversation participants can view attachments
CREATE POLICY "Conversation participants can view attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (
      -- User owns the file
      (storage.foldername(name))[1] = auth.uid()::text
      OR
      -- User is in the conversation
      EXISTS (
        SELECT 1 FROM conversation_participants cp
        WHERE cp.conversation_id = ((storage.foldername(name))[2])::uuid
        AND cp.user_id = auth.uid()
      )
    )
  );

-- Authenticated users can upload message attachments
CREATE POLICY "Users can upload message attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own message attachments
CREATE POLICY "Users can delete own message attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'message-attachments'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
