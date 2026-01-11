# Supabase Signup 500 Error Fix

## Problem
Getting 500 error when trying to signup:
```
jdossjsgvavglqyexjor.supabase.co/auth/v1/signup?redirect_to=...
Failed to load resource: the server responded with a status of 500 ()
```

## Root Cause
The database trigger `on_auth_user_created` that creates a profile when a user signs up is failing because:
1. **Missing INSERT policy** - RLS policies don't allow profile inserts
2. **Trigger function permissions** - The trigger function may not have proper permissions
3. **Required fields** - The trigger might be missing required fields or hitting constraints

## Solution

### Step 1: Run the Fix SQL Migration

Run `sql/009_fix_profile_trigger.sql` in your Supabase SQL Editor:

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Create a new query
4. Copy and paste the contents of `sql/009_fix_profile_trigger.sql`
5. Run the query

This will:
- ✅ Fix the trigger function with proper error handling
- ✅ Add necessary RLS policies for profile insertion
- ✅ Grant proper permissions to the trigger function
- ✅ Add conflict handling to prevent duplicate errors

### Step 2: Update RLS Policies (if needed)

The RLS policies file (`sql/002_rls_policies.sql`) has been updated to include INSERT policies for profiles. If you haven't run the updated policies, run this:

```sql
-- Users can insert their own profile (for signup trigger)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can insert profiles (for trigger function)
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);
```

### Step 3: Verify the Trigger

Check if the trigger exists and is working:

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- Check if function exists
SELECT * FROM pg_proc WHERE proname = 'handle_new_user';

-- Test the function (don't run this, just verify it exists)
SELECT proname, prosecdef, proconfig 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

The function should have `prosecdef = true` (SECURITY DEFINER enabled).

## Alternative: Manual Profile Creation

If the trigger continues to fail, you can create profiles manually in the frontend after signup. However, this is NOT recommended as it's less secure and requires the user to be authenticated first.

## Testing

After applying the fix:

1. **Clear browser cache and cookies**
2. **Try signing up again** with a new email
3. **Check Supabase Dashboard**:
   - Go to Authentication → Users
   - Verify the user was created
   - Go to Table Editor → profiles
   - Verify a profile was created for the new user

## Common Issues

### Issue 1: "permission denied for table profiles"
**Cause:** Trigger function doesn't have permission
**Fix:** Run `sql/009_fix_profile_trigger.sql` which grants proper permissions

### Issue 2: "violates not-null constraint"
**Cause:** Required fields missing in trigger
**Fix:** The updated trigger function handles all required fields and provides defaults

### Issue 3: "duplicate key value violates unique constraint"
**Cause:** Trigger trying to insert duplicate profile
**Fix:** Updated trigger uses `ON CONFLICT DO NOTHING` to prevent duplicates

### Issue 4: "relation auth.users does not exist"
**Cause:** Running SQL in wrong database context
**Fix:** Make sure you're running SQL in the Supabase SQL Editor, not in a different database

## Troubleshooting

### Check Supabase Logs
1. Go to Supabase Dashboard
2. Navigate to Logs → Postgres Logs
3. Look for errors related to `handle_new_user` or `profiles` table
4. Check for RLS policy violations

### Check Function Definition
```sql
SELECT pg_get_functiondef(oid) 
FROM pg_proc 
WHERE proname = 'handle_new_user';
```

This will show you the current function definition.

### Test Trigger Manually
You can't easily test the trigger manually, but you can check if profiles are being created by:
1. Signing up a new user
2. Immediately checking the profiles table
3. If profile doesn't exist, the trigger failed

### Disable Email Confirmation (for testing)
If email confirmation is causing issues:
1. Go to Authentication → Settings
2. Disable "Enable email confirmations"
3. Try signing up again
4. Re-enable after testing

## Prevention

To prevent this issue in the future:

1. **Always run migrations in order:**
   - `001_schema.sql` (creates tables and triggers)
   - `002_rls_policies.sql` (creates RLS policies including INSERT)
   - `009_fix_profile_trigger.sql` (fixes trigger permissions)

2. **Test signup after every database migration**

3. **Check Supabase logs regularly** for errors

4. **Use Supabase's built-in trigger templates** when possible

## Still Not Working?

If the fix doesn't work:

1. **Check Supabase Status** - Make sure Supabase is operational
2. **Verify Environment Variables** - Check that `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are correct
3. **Check Network Tab** - Look at the actual error response from Supabase
4. **Try Direct Supabase API** - Test signup using Supabase client directly:

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'testpass123',
  options: {
    data: {
      name: 'Test User',
    }
  }
});

console.log('Error:', error);
console.log('Data:', data);
```

5. **Contact Supabase Support** if the issue persists

