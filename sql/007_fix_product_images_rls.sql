-- =============================================================================
-- FIX PRODUCT IMAGES RLS POLICY
-- Ensures images are viewable when fetching products
-- =============================================================================

-- Drop existing policy that might be blocking nested queries
DROP POLICY IF EXISTS "Product images are viewable" ON product_images;
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON product_images;
DROP POLICY IF EXISTS "Anyone can view product images" ON product_images;

-- Create simple policy that allows viewing all images
-- Security is already handled at the product level (only active products are visible)
CREATE POLICY "Product images are viewable by everyone"
  ON product_images
  FOR SELECT
  USING (true);

-- Ensure we still have the insert/update/delete policies for owners
-- Drop and recreate to ensure they exist
DROP POLICY IF EXISTS "Product owners can insert images" ON product_images;
DROP POLICY IF EXISTS "Product owners can update images" ON product_images;
DROP POLICY IF EXISTS "Product owners can delete images" ON product_images;
DROP POLICY IF EXISTS "Sellers can manage product images" ON product_images;

CREATE POLICY "Product owners can insert images"
  ON product_images
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.seller_id = auth.uid()
    )
  );

CREATE POLICY "Product owners can update images"
  ON product_images
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.seller_id = auth.uid()
    )
  );

CREATE POLICY "Product owners can delete images"
  ON product_images
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.seller_id = auth.uid()
    )
  );

