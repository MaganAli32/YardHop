# YardFront Quick Start & Troubleshooting Guide

## The Error: "Failed to scan image: Failed to fetch"

This error means your frontend is trying to call the backend API at `http://localhost:3000/api/ai/analyze`, but the backend server isn't running.

---

## Quick Fix Steps

### Step 1: Start the Backend Server

Open a terminal in your `yardhop-backend` folder and run:

```bash
cd yardhop-backend
npm install
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════════════════╗
║   🏠 YardFront Backend Server                               ║
║   ✅ Server running on http://localhost:3000              ║
╚═══════════════════════════════════════════════════════════╝
```

### Step 2: Set Up Environment Variables

Make sure you have a `.env` file in `yardhop-backend/`:

```env
# Required
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJ...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJ...your-service-role-key

# For AI features
GEMINI_API_KEY=AIza...your-gemini-key

# Server config
PORT=3000
FRONTEND_URL=http://localhost:5173
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

### Step 3: Start the Frontend

In a **separate terminal**:

```bash
cd frontend  # or your frontend folder
npm run dev
```

### Step 4: Test the Connection

1. Open browser to `http://localhost:5173`
2. Open DevTools → Network tab
3. Try the scanner feature
4. Check if requests go to `localhost:3000/api/ai/analyze`

---

## Common Issues & Solutions

### Issue 1: "Failed to fetch" or "Network Error"

**Cause:** Backend not running or wrong port

**Solution:**
```bash
# Check if port 3000 is in use
lsof -i :3000

# Kill existing process if needed
lsof -ti:3000 | xargs kill -9

# Restart backend
cd yardhop-backend && npm run dev
```

### Issue 2: "CORS Error"

**Cause:** Frontend origin not allowed

**Solution:** Add your frontend URL to `.env`:
```env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173
```

### Issue 3: "AI Service Unavailable"

**Cause:** Missing GEMINI_API_KEY

**Solution:**
1. Get API key from https://aistudio.google.com/app/apikey
2. Add to `.env`:
```env
GEMINI_API_KEY=AIza...
```
3. Restart backend

### Issue 4: "Unauthorized" or "Invalid token"

**Cause:** Not logged in or expired session

**Solution:**
1. Log out and log back in
2. Check that Supabase keys are correct in `.env`

---

## Testing the AI Endpoint Directly

Test with curl to verify backend is working:

```bash
# Health check
curl http://localhost:3000/api/health

# Test AI (with a sample base64 image)
curl -X POST http://localhost:3000/api/ai/suggest-price \
  -H "Content-Type: application/json" \
  -d '{"title": "Vintage Chair", "condition": "Good", "category": "Furniture"}'
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (localhost:5173)                              │
│  - GarageSaleScannerPage.tsx                            │
│  - Calls: aiApi.analyzeImage()                          │
│  - Which calls: POST /api/ai/analyze                    │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼ HTTP Request
┌─────────────────────────────────────────────────────────┐
│  BACKEND (localhost:3000)                               │
│  - server.js (Express)                                  │
│  - routes/ai.js                                         │
│  - Calls Gemini API with your GEMINI_API_KEY            │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼ HTTPS
┌─────────────────────────────────────────────────────────┐
│  GEMINI API                                             │
│  - generativelanguage.googleapis.com                    │
│  - Analyzes images, returns JSON                        │
└─────────────────────────────────────────────────────────┘
```

---

## File Locations

| File | Purpose |
|------|---------|
| `yardhop-backend/server.js` | Main Express server |
| `yardhop-backend/routes/ai.js` | AI endpoints (analyze, suggest-price, etc.) |
| `yardhop-backend/.env` | Backend environment variables |
| `frontend/lib/api.ts` | Frontend API client |
| `frontend/pages/GarageSaleScannerPage.tsx` | Scanner UI |
| `frontend/.env` | Frontend environment variables |

---

## Frontend .env

Also make sure your frontend has:

```env
VITE_API_BASE=http://localhost:3000/api
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Run Both at Once (Optional)

Add to `package.json` in root:

```json
{
  "scripts": {
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\"",
    "dev:backend": "cd yardhop-backend && npm run dev",
    "dev:frontend": "cd frontend && npm run dev"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

Then just run: `npm run dev`


