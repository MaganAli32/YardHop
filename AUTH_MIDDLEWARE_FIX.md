# Auth Middleware Environment Variable Fix

## Problem

The `middleware/auth.js` file was reading environment variables at **module load time** (when the file is first imported):

```javascript
// ❌ OLD CODE - reads env vars at import time
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
```

However, in `server.js`, the route imports happen **before** `dotenv.config()` is called:

```javascript
// server.js
import authRoutes from './routes/auth.js';  // ← Imports happen here
// ... more imports
dotenv.config();  // ← dotenv loads AFTER imports
```

This meant that when the middleware module was first loaded, `process.env.SUPABASE_URL` and `process.env.SUPABASE_ANON_KEY` were `undefined` because dotenv hadn't loaded the `.env` file yet.

## Solution

Moved environment variable reading inside a **runtime function** that gets called when the middleware actually executes (after dotenv has loaded):

```javascript
// ✅ NEW CODE - reads env vars at runtime
const getSupabaseClient = (token = null) => {
  const supabaseUrl = process.env.SUPABASE_URL;  // ← Read at runtime
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;  // ← Read at runtime
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }
  
  // ... create client
};
```

## Changes Made

1. **Removed** top-level environment variable assignments (lines 10-11)
2. **Created** `getSupabaseClient()` helper function that reads env vars at runtime
3. **Updated** `requireAuth` to use `getSupabaseClient(token)`
4. **Updated** `optionalAuth` to use `getSupabaseClient()` or `getSupabaseClient(token)`

## Benefits

- ✅ Environment variables are read **after** dotenv has loaded them
- ✅ No more `undefined` Supabase URL/key errors at startup
- ✅ Better error handling with clear error messages
- ✅ Code is more maintainable and follows best practices

## Verification

The middleware now:
- Loads without errors even if env vars aren't set at import time
- Reads env vars correctly when middleware functions execute
- Provides clear error messages if env vars are missing at runtime

## Testing

To verify the fix works:

```bash
# Start the server
cd /Users/maganali/Downloads/yardhop
npm start

# The server should start without errors about missing Supabase env vars
# Auth middleware will read env vars correctly when requests come in
```


