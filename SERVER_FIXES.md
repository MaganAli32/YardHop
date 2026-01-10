# Server Startup Fixes

## ✅ Issues Fixed

### 1. Rate Limiter IPv6 Error
**Problem:** `express-rate-limit` was complaining about IPv6 handling in custom `keyGenerator` functions.

**Fix:** Updated `middleware/rateLimiter.js` to use the `ipKeyGenerator` helper function from `express-rate-limit`:

```javascript
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

// Changed from:
keyGenerator: (req) => req.user?.id || req.ip;

// To:
keyGenerator: (req) => req.user?.id || ipKeyGenerator(req);
```

This was applied to:
- `aiLimiter` (line 68)
- `uploadLimiter` (line 87)
- `messageLimiter` (line 105)

### 2. Missing Supabase Environment Variables
**Problem:** Routes were trying to create Supabase clients at module import time, before environment variables were checked.

**Fix:** Updated `routes/auth.js` to:
- Check for environment variables before creating Supabase client
- Return proper error messages if Supabase is not configured
- Handle missing env vars gracefully in all route handlers

## 🔧 Next Steps

### 1. Create `.env` File

Create a `.env` file in the project root with your Supabase credentials:

```bash
# Copy from your existing .env or create new one
cp .env.example .env  # If you have one
# Or create manually
```

Required variables:
```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=AIza...
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### 2. Start the Server

```bash
npm start
```

The server should now start without errors. If you see "Missing required Supabase environment variables", make sure your `.env` file is in the project root and contains the required variables.

### 3. Verify Server is Running

Once started, you should see:
```
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏠 YardFront Backend Server                               ║
║                                                           ║
║   ✅ Server running on http://localhost:3000              ║
║   📡 API available at http://localhost:3000/api           ║
║   🔗 Supabase connected: ✓                                ║
║   🌍 Environment: development                             ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
```

### 4. Test Health Endpoint

```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "YardFront API is running",
  "timestamp": "...",
  "version": "1.0.0"
}
```

## 📝 Files Modified

1. `middleware/rateLimiter.js` - Fixed IPv6 handling
2. `routes/auth.js` - Added Supabase configuration checks

## ⚠️ Important Notes

- The server will exit if `SUPABASE_URL` or `SUPABASE_ANON_KEY` are missing (this is intentional)
- Make sure your `.env` file is in the project root (`/Users/maganali/Downloads/yardhop/.env`)
- Never commit `.env` to version control (it should be in `.gitignore`)


