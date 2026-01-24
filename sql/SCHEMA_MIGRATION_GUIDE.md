# Schema Migration Guide

## Problem: "relation already exists" Error

When running `001_schema.sql` in Supabase, you may get errors like:
```
ERROR: 42P07: relation "profiles" already exists
```

This happens because the original schema file uses `CREATE TABLE` instead of `CREATE TABLE IF NOT EXISTS`.

## Solution: Use the Idempotent Version

I've created `001_schema_idempotent.sql` which is safe to run multiple times. It uses:
- `CREATE TABLE IF NOT EXISTS` for all tables
- `CREATE INDEX IF NOT EXISTS` for all indexes
- `DROP TRIGGER IF EXISTS` before recreating triggers
- Conditional constraint addition for foreign keys

## How to Use

### Option 1: Use the Idempotent Version (Recommended)

1. **If you have an existing database with some tables:**
   - Use `sql/001_schema_idempotent.sql` instead of `sql/001_schema.sql`
   - This will create any missing tables without errors
   - Safe to run multiple times

2. **Copy the SQL:**
   - Open `sql/001_schema_idempotent.sql` in your editor
   - Copy all the SQL
   - Paste into Supabase SQL Editor
   - Click "Run"

### Option 2: Check What Exists First

If you want to see what tables already exist before running migrations:

```sql
-- Check existing tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check existing indexes
SELECT indexname 
FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY indexname;

-- Check existing functions
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

### Option 3: Drop and Recreate (⚠️ WARNING: Deletes All Data)

**⚠️ ONLY USE THIS ON A DEVELOPMENT DATABASE - THIS DELETES ALL DATA!**

If you want to start fresh:

```sql
-- Drop all tables (cascade will handle dependencies)
DROP TABLE IF EXISTS recent_searches CASCADE;
DROP TABLE IF EXISTS saved_searches CASCADE;
DROP TABLE IF EXISTS price_analyses CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS post_comments CASCADE;
DROP TABLE IF EXISTS post_likes CASCADE;
DROP TABLE IF EXISTS community_post_images CASCADE;
DROP TABLE IF EXISTS community_posts CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS garage_sale_images CASCADE;
DROP TABLE IF EXISTS garage_sales CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS update_user_rating() CASCADE;
DROP FUNCTION IF EXISTS find_items_within_radius(DECIMAL, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Then run 001_schema.sql or 001_schema_idempotent.sql
```

## Migration Order

When running migrations, always run them in this order:

1. `sql/001_schema.sql` (or `001_schema_idempotent.sql` if tables already exist)
2. `sql/002_rls_policies.sql`
3. `sql/003_storage.sql`
4. `sql/004_fix_ai_usage_rls.sql` OR `sql/004_subscription_ai_usage.sql` (choose one)
5. `sql/005_location_privacy.sql`
6. `sql/005_verify_ai_usage_setup.sql` (if using AI features)
7. `sql/006_database_fixes.sql`
8. `sql/007_fix_product_images_rls.sql`
9. `sql/007_fix_garage_sale_images.sql`
10. `sql/008_add_payment_fields.sql`
11. `sql/009_fix_profile_trigger.sql`
12. `sql/010_fix_product_quantities.sql`

## Verifying Schema

After running migrations, verify your schema:

```sql
-- Count tables
SELECT COUNT(*) as table_count 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE';

-- List all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Expected tables (20 total):
-- 1. profiles
-- 2. products
-- 3. product_images
-- 4. garage_sales
-- 5. garage_sale_images
-- 6. favorites
-- 7. cart_items
-- 8. orders
-- 9. order_items
-- 10. conversations
-- 11. conversation_participants
-- 12. messages
-- 13. community_posts
-- 14. community_post_images
-- 15. post_likes
-- 16. post_comments
-- 17. reviews
-- 18. price_analyses
-- 19. saved_searches
-- 20. recent_searches
```

## Troubleshooting

### Issue: "constraint already exists"
**Solution:** The idempotent version handles this. If using the original, skip the constraint creation line or use the idempotent version.

### Issue: "trigger already exists"  
**Solution:** The idempotent version drops triggers before recreating them. If using the original, manually drop the trigger first.

### Issue: "index already exists"
**Solution:** Use `CREATE INDEX IF NOT EXISTS` - the idempotent version includes this.

### Issue: "function already exists"
**Solution:** Functions use `CREATE OR REPLACE` which is already idempotent.

## Next Steps

After successfully running the schema:

1. ✅ Verify all tables exist (use verification query above)
2. ✅ Run RLS policies migration (`002_rls_policies.sql`)
3. ✅ Run storage setup (`003_storage.sql`)
4. ✅ Run remaining migrations in order
5. ✅ Test with sample data

## Notes

- The idempotent version (`001_schema_idempotent.sql`) is safe for production use
- Always backup your database before running migrations
- Test migrations on a development database first
- The original `001_schema.sql` is designed for fresh installations
- Consider keeping both versions: use original for new databases, idempotent for updates

