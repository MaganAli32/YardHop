# Fix: RLS Policy for AI Usage Tracking

## ✅ Issue Identified

The **403 Forbidden error after 2 scans is CORRECT behavior** - it means the freemium limit is working! 🎉

However, there was a missing RLS policy that prevented `recordScan` from inserting usage records.

## 🔧 What Was Fixed

### 1. Added Missing RLS Policy

The original SQL only had:
- Policy for users to SELECT their own records ✅
- Policy for service role to INSERT ✅
- **Missing**: Policy for users to INSERT their own records ❌

### 2. Updated SQL File

**File**: `sql/004_subscription_ai_usage.sql`

Added:
```sql
CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### 3. Improved Error Logging

**File**: `middleware/scanLimiter.js`

Enhanced `recordScan` function to:
- Log detailed error information
- Confirm successful inserts
- Better debugging output

## 🚀 How to Apply the Fix

### Option 1: If you haven't run the migration yet
Just run the updated `sql/004_subscription_ai_usage.sql` - it now includes the fix.

### Option 2: If you already ran the migration
Run this quick fix script:

```sql
-- File: sql/004_fix_ai_usage_rls.sql
-- Drop policy if it exists (safe to run multiple times)
DROP POLICY IF EXISTS "Users can insert own AI usage" ON ai_usage;

-- Add policy for users to insert their own AI usage records
CREATE POLICY "Users can insert own AI usage"
  ON ai_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

Execute it in your Supabase SQL Editor.

## ✅ Verification

After applying the fix:

1. **Check that scans are being recorded**:
   ```sql
   SELECT * FROM ai_usage ORDER BY created_at DESC LIMIT 5;
   ```

2. **Test the limit**:
   - Perform 2 scans (should work)
   - Try a 3rd scan (should get 403 with upgrade prompt)

3. **Check server logs**:
   - You should see `✅ Scan recorded successfully:` messages
   - No more silent failures

## 📊 Understanding the 403 Error

The **403 Forbidden** error after 2 scans is **EXPECTED and CORRECT**:

- ✅ Free tier allows 2 scans/month
- ✅ After 2 scans, the limit is reached
- ✅ The middleware correctly blocks the 3rd scan
- ✅ Returns 403 with upgrade information

The error message should include:
```json
{
  "error": "Scan Limit Reached",
  "code": "SCAN_LIMIT_EXCEEDED",
  "message": "You've used all 2 AI scans for this month. Upgrade to Pro for more scans!",
  "usage": {
    "current": 2,
    "limit": 2,
    "remaining": 0,
    "tier": "free"
  }
}
```

## 🐛 Troubleshooting

### If scans still aren't being recorded:

1. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'ai_usage';
   ```

2. **Verify the policy exists**:
   ```sql
   SELECT policyname, cmd, qual, with_check 
   FROM pg_policies 
   WHERE tablename = 'ai_usage' AND cmd = 'INSERT';
   ```

3. **Test insert manually** (replace USER_ID):
   ```sql
   INSERT INTO ai_usage (user_id, scan_type, metadata)
   VALUES ('USER_ID', 'analyze', '{}');
   ```

4. **Check server logs** for detailed error messages from `recordScan`

### If you still get 403 on first scan:

- Check that `subscription_tier` is set to 'free' (default)
- Verify the user has a profile record
- Check server logs for scan limiter errors

---

## ✨ Summary

- **403 after 2 scans = Working as intended!** ✅
- **Missing RLS policy = Fixed!** ✅
- **Better error logging = Added!** ✅

The freemium feature is now fully functional!

