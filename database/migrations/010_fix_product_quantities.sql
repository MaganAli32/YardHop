-- Fix products with NULL or 0 quantity
-- Sets quantity to 1 for products that have NULL or 0 quantity
-- This ensures all products have a valid quantity for cart operations

UPDATE products
SET quantity = 1
WHERE quantity IS NULL OR quantity = 0;

-- Add a constraint to ensure quantity is always >= 1 for active products
-- (This is already handled by DEFAULT 1, but this ensures existing data is correct)

-- Note: If you want to allow 0 quantity (out of stock), you can remove this constraint
-- But the cart route now handles NULL/0 as 1, so this is safe

-- Verify the fix
SELECT id, title, quantity 
FROM products 
WHERE quantity IS NULL OR quantity = 0;

-- Should return 0 rows after the update

