-- YardFront Supabase Storage Setup
-- Run this SQL in Supabase SQL Editor after creating storage buckets manually

-- Storage Bucket Policies
-- Note: Create buckets manually in Supabase Dashboard first:
-- 1. Go to Storage > New bucket
-- 2. Create: product-images, garage-sale-images, community-post-images, profile-avatars
-- 3. Set all buckets to PUBLIC
-- 4. Then run this SQL to set up policies

-- Product Images Bucket
CREATE POLICY "Product images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own product images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own product images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Garage Sale Images Bucket
CREATE POLICY "Garage sale images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'garage-sale-images');

CREATE POLICY "Authenticated users can upload garage sale images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'garage-sale-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own garage sale images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'garage-sale-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own garage sale images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'garage-sale-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Community Post Images Bucket
CREATE POLICY "Community post images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'community-post-images');

CREATE POLICY "Authenticated users can upload community post images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'community-post-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own community post images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'community-post-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own community post images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'community-post-images'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Profile Avatars Bucket
CREATE POLICY "Profile avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-avatars');

CREATE POLICY "Authenticated users can upload own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'profile-avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'profile-avatars'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

