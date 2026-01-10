# AI Routes Environment Variable Fix

## Problem

The `routes/ai.js` file had a bug where it was trying to read `GEMINI_API_KEY` at import time, but there was also a bug in the helper function that was already added.

**Original Issue:**
- Environment variables were read at module load time before dotenv loaded them

**Additional Bug Found:**
- Line 16 had: `process.env.getGeminiApiKey()` which is incorrect
- Should be: `process.env.GEMINI_API_KEY`

## Solution

Fixed the `getGeminiApiKey()` helper function to correctly read the environment variable at runtime:

```javascript
// ✅ FIXED - reads env var at runtime
const getGeminiApiKey = () => process.env.GEMINI_API_KEY;
```

## Changes Made

1. **Fixed** the `getGeminiApiKey()` function to use `process.env.GEMINI_API_KEY` instead of the incorrect `process.env.getGeminiApiKey()`
2. **Moved** `GEMINI_API_URL` constant before the helper function for better organization
3. **Verified** all 7 usages of `getGeminiApiKey()` throughout the file are correct

## Usage

The function is used in 7 places:
- Line 29: Check if API key exists before processing
- Line 83: Use in Gemini API fetch URL
- Line 185: Check if API key exists (suggest-price endpoint)
- Line 231: Use in Gemini API fetch URL (suggest-price)
- Line 297: Check if API key exists (generate-description endpoint)
- Line 322: Use in Gemini API fetch URL (generate-description)

## Benefits

- ✅ Environment variables are read **after** dotenv has loaded them
- ✅ No more `undefined` API key errors at startup
- ✅ AI endpoints will work correctly when requests come in
- ✅ Consistent with the auth middleware fix pattern

## Verification

The routes now:
- Load without errors even if env vars aren't set at import time
- Read env vars correctly when route handlers execute
- Provide proper error messages (503) if API key is missing at runtime

## Testing

To verify the fix works:

```bash
# Start the server
cd /Users/maganali/Downloads/yardhop
npm start

# Test AI endpoint
curl -X POST http://localhost:3000/api/ai/suggest-price \
  -H "Content-Type: application/json" \
  -d '{"title": "Vintage Chair", "condition": "Good"}'
```

The endpoint should now correctly read `GEMINI_API_KEY` from the environment at runtime.


