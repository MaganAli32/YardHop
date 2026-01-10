# Database Fixes - YardFront

## Issues Fixed

1. ✅ **Missing `rating_average` column** in profiles table
2. ✅ **Favorites API returning object instead of array** - Fixed frontend to extract `favorites` array
3. ✅ **Listings not appearing after publish** - Added missing columns and fixed image handling

---

## Migration File

Run this SQL migration in your Supabase dashboard:

**File:** `sql/006_database_fixes.sql`

This migration:
- Adds missing columns to `profiles` table
- Adds missing columns to `products` table  
- Ensures `favorites` table exists with proper structure
- Adds missing columns to `garage_sales` table
- Sets up Row Level Security (RLS) policies
- Creates helper functions

---

## Frontend Fixes Applied

### 1. Favorites Page (`frontend/pages/FavoritesPage.tsx`)

**Before:**
```tsx
const data = await favoritesApi.list(authToken);
setFavorites(data || []); // ❌ data is an object, not array
```

**After:**
```tsx
const data = await favoritesApi.list();
setFavorites(data?.favorites || []); // ✅ Extract favorites array
```

### 2. Products Route (`routes/products.js`)

**Fixed:** Now handles both `images` and `image_urls` for compatibility:
```js
const image_urls = req.body.image_urls || req.body.images || [];
```

---

## How to Apply

### Step 1: Run Database Migration

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste contents of `sql/006_database_fixes.sql`
4. Click "Run"

### Step 2: Verify

After running the migration, verify:

```sql
-- Check profiles table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'rating_average';

-- Check products table
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'products' AND column_name = 'seller_id';

-- Check favorites table
SELECT * FROM favorites LIMIT 1;
```

---

## What Gets Fixed

### Profiles Table
- ✅ `rating_average` (DECIMAL)
- ✅ `rating_count` (INTEGER)
- ✅ `total_sales` (INTEGER)
- ✅ `response_time` (TEXT)

### Products Table
- ✅ `seller_id` (UUID) - **Critical for products to work**
- ✅ `latitude` / `longitude` (DECIMAL)
- ✅ `location` (TEXT)
- ✅ `status` (TEXT with CHECK constraint)
- ✅ `condition` (TEXT with CHECK constraint)
- ✅ `images` (TEXT[])

### Garage Sales Table
- ✅ `host_id` (UUID)
- ✅ `latitude` / `longitude` (DECIMAL)
- ✅ `address` (TEXT)
- ✅ `status` (TEXT)
- ✅ `start_date` / `end_date` (DATE)
- ✅ `start_time` / `end_time` (TIME)
- ✅ `images` (TEXT[])
- ✅ `tags` (TEXT[])

### Favorites Table
- ✅ Created if doesn't exist
- ✅ Supports both products and garage sales
- ✅ Proper indexes for performance
- ✅ Unique constraints to prevent duplicates

### Row Level Security (RLS)
- ✅ Policies for profiles (read all, update own)
- ✅ Policies for products (read active, manage own)
- ✅ Policies for favorites (manage own)
- ✅ Policies for garage_sales (read active, manage own)

---

## Testing

After applying fixes:

1. **Test Profile Rating:**
   ```sql
   SELECT id, name, rating_average, rating_count FROM profiles LIMIT 5;
   ```

2. **Test Favorites:**
   - Go to Favorites page
   - Should load without errors
   - Should show favorites array

3. **Test Product Creation:**
   - Create a new listing
   - Should appear immediately after publish
   - Check that `seller_id` is set correctly

---

## Troubleshooting

### "column does not exist" errors
- Make sure you ran the full migration
- Check that all `ADD COLUMN IF NOT EXISTS` statements executed

### Favorites still not working
- Clear browser cache
- Check that frontend code was updated
- Verify API returns `{ favorites: [...], pagination: {...} }`

### Products not appearing
- Check `seller_id` is set in products table
- Verify `status = 'active'`
- Check RLS policies allow reading

---

## Next Steps

1. ✅ Run migration
2. ✅ Test favorites page
3. ✅ Test product creation
4. ✅ Verify profiles have rating columns

All fixes are backward compatible and use `IF NOT EXISTS` to avoid errors on re-run.


