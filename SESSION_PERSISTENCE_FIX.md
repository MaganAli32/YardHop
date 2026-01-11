# Session Persistence Fix - Prevented Accidental Logouts

## Problem
After logging in, clicking buttons would log the user out unexpectedly.

## Root Cause
The `onAuthStateChange` listener in `PersistenceContext.tsx` was clearing the session whenever `session` was `null`, even during initialization or token refresh. This caused:
- Session cleared during app initialization
- Session cleared during token refresh
- Session cleared when checking for session before it loaded

## Solution

### Fix 1: Improved Auth State Change Handling
Only clear session on explicit sign out events, not on null sessions during initialization:

```typescript
// Before: Cleared on ANY null session
if (session) {
  setAuthToken(session.access_token);
  await loadUserProfile(session.user.id);
} else {
  setAuthToken(null);  // ❌ This was clearing during init!
  setUser(null);
}

// After: Only clear on explicit sign out
if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
  // User explicitly signed out - clear everything
  setAuthToken(null);
  setUser(null);
  return;
}

if (session) {
  setAuthToken(session.access_token);
  await loadUserProfile(session.user.id);
} else if (event === 'INITIAL_SESSION') {
  // No session during initial check - this is normal, don't clear
}
```

### Fix 2: Better Token Retrieval
Changed `getAuthToken()` in `api.ts` to use Supabase's `getSession()` instead of parsing localStorage:

```typescript
// Before: Tried to parse localStorage directly (unreliable)
const storageKey = Object.keys(localStorage).find(key => 
  key.startsWith('sb-') && key.endsWith('-auth-token')
);

// After: Use Supabase's session API (reliable)
const { data: { session } } = await supabase.auth.getSession();
return session?.access_token || null;
```

### Fix 3: Session Refresh on 401 Errors
Added automatic session refresh when API calls return 401 (unauthorized):

- If API call fails with 401, try to refresh the session
- Retry the request with the new token
- Only clear session if refresh fails

### Fix 4: Improved Login Flow
Added small delay after login to ensure session is fully established before navigation.

## Changes Made

1. **`frontend/store/PersistenceContext.tsx`**:
   - Fixed `onAuthStateChange` to only clear on SIGNED_OUT events
   - Added logging for debugging
   - Better error handling during session check

2. **`frontend/lib/api.ts`**:
   - Changed `getAuthToken()` to async and use Supabase API
   - Added automatic session refresh on 401 errors
   - Better error messages

3. **`frontend/pages/LoginPage.tsx`**:
   - Added check for session after login
   - Small delay to ensure session is established
   - Better error handling for email confirmation

## Testing

After applying the fix:

1. **Login and stay logged in:**
   - Login with email/password
   - Click various buttons (should NOT log you out)
   - Navigate between pages
   - Session should persist

2. **Check session persistence:**
   - Login
   - Close browser tab
   - Reopen the app
   - Should still be logged in (if "Keep me signed in" was checked)

3. **Test logout:**
   - Click "LOG OUT" button in header
   - Should log out properly
   - No errors in console

4. **Test token refresh:**
   - Login and wait for token to expire (or manually expire it)
   - Make an API call
   - Session should refresh automatically
   - Should NOT log you out

## Common Auth State Change Events

Supabase fires these events:
- `INITIAL_SESSION` - App startup, may have null session
- `SIGNED_IN` - User just signed in
- `SIGNED_OUT` - User explicitly signed out (✅ clear session here)
- `TOKEN_REFRESHED` - Access token refreshed
- `USER_UPDATED` - User profile updated
- `USER_DELETED` - User account deleted (✅ clear session here)

## Which Button Was Logging You Out?

If you're still experiencing logouts, check:

1. **Header "LOG OUT" button** - This should log you out (by design)
   - Located in the top right header
   - Only visible when logged in

2. **Profile page logout button** - This should log you out (by design)
   - Located in profile settings

3. **Any other button** - Should NOT log you out
   - If another button logs you out, check:
     - Browser console for errors
     - Network tab for failed API calls
     - Check if button has `onClick={signOut}` by mistake

## Debugging

If logouts still occur:

1. **Check browser console:**
   ```javascript
   // Look for these logs:
   "Auth state change: SIGNED_OUT" // ✅ Expected on logout
   "Auth state change: INITIAL_SESSION" // ✅ Normal on startup
   "No session found during initial check" // ✅ Normal if not logged in
   ```

2. **Check localStorage:**
   - Open DevTools → Application → Local Storage
   - Look for keys starting with `sb-` (Supabase)
   - Should contain session data if logged in

3. **Check Supabase session:**
   ```javascript
   // In browser console:
   const { data: { session } } = await supabase.auth.getSession();
   console.log('Current session:', session);
   ```

4. **Watch for errors:**
   - API errors (401, 403, 500)
   - Network errors
   - Supabase errors

## Prevention

To prevent future issues:

1. **Never clear session on INITIAL_SESSION event** if session is null
2. **Only clear session on explicit SIGNED_OUT or USER_DELETED events**
3. **Always use Supabase's session API** instead of parsing localStorage
4. **Handle token refresh automatically** on 401 errors
5. **Add logging** to track auth state changes (for debugging)

## Still Having Issues?

If you're still experiencing logouts:

1. **Clear browser cache and cookies**
2. **Check Supabase Dashboard** → Authentication → Settings
   - Check if "Enable email confirmations" is causing issues
   - Check session expiration settings
3. **Check environment variables:**
   - `VITE_SUPABASE_URL` is set correctly
   - `VITE_SUPABASE_ANON_KEY` is set correctly
4. **Check backend logs** for authentication errors
5. **Check Supabase logs** (Dashboard → Logs) for errors

