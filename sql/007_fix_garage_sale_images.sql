-- ============================================================
-- FIX: Rename sale_id to garage_sale_id in garage_sale_images
-- Run this if you already have the table created with sale_id
-- ============================================================

-- Check if column needs renaming (this is idempotent)
DO $$
BEGIN
  -- Check if old column exists
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'garage_sale_images' 
    AND column_name = 'sale_id'
  ) THEN
    -- Rename the column
    ALTER TABLE garage_sale_images RENAME COLUMN sale_id TO garage_sale_id;
    RAISE NOTICE 'Renamed sale_id to garage_sale_id';
  ELSE
    RAISE NOTICE 'Column already named garage_sale_id (or table does not exist)';
  END IF;
END $$;

-- Drop old policy if exists
DROP POLICY IF EXISTS "Sale hosts can manage images" ON garage_sale_images;

-- Recreate policy with correct column name
CREATE POLICY "Sale hosts can manage images" ON garage_sale_images FOR ALL 
  USING (EXISTS (
    SELECT 1 FROM garage_sales 
    WHERE garage_sales.id = garage_sale_images.garage_sale_id 
    AND garage_sales.host_id = auth.uid()
  ));

-- Done!
SELECT 'Migration complete!' as status;

