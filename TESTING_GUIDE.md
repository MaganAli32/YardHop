# Testing Guide - YardFront Application

## ✅ Server Status

Both servers are currently running:

- **Backend Server**: ✅ Running on `http://localhost:3000`
  - Health check: `http://localhost:3000/api/health`
  - API endpoints: `http://localhost:3000/api/*`

- **Frontend Server**: ✅ Running on `http://localhost:5173`
  - Application: `http://localhost:5173`

## 🧪 Testing Steps

### 1. Open the Application
Open your browser and navigate to:
```
http://localhost:5173
```

### 2. Test Treasure Scanner (Garage Sale Scanner)

**Path to test:**
- Navigate to the Garage Sale Scanner page
- Or go directly to: `http://localhost:5173/#/scanner` (if using hash routing)

**What to test:**
1. Upload an image of items (furniture, electronics, etc.)
2. Click "Scan Image" button
3. Verify that:
   - The image is processed
   - AI analysis returns:
     - Title
     - Description
     - Category
     - Condition
     - Price range
     - Suggested price
     - Features
     - Whether it's a potential steal

**Expected behavior:**
- Image uploads successfully
- Backend API call to `/api/ai/analyze` succeeds
- Results display with all analysis fields
- No errors in browser console

### 3. Test Create Listing Page

**Path to test:**
- Navigate to Create Listing page
- Or go directly to: `http://localhost:5173/#/sell/create` (if using hash routing)

**What to test:**
1. Fill in listing details:
   - Title
   - Description (or use AI to generate)
   - Condition
   - Category
   - Price
2. Test AI Price Check:
   - Click "Check Price" or similar button
   - Verify AI suggests a price
3. Upload product images
4. Submit the listing

**Expected behavior:**
- AI price suggestion works (calls `/api/ai/suggest-price`)
- AI description generation works (if available)
- Form submission succeeds
- No errors in browser console

## 🔍 What to Check

### Browser Console
Open Developer Tools (F12) and check:
- ✅ No red errors
- ✅ API calls to `http://localhost:3000/api/*` succeed
- ✅ Network tab shows successful requests

### Network Tab
Check that these endpoints work:
- `GET /api/health` - Should return `{"status":"ok",...}`
- `POST /api/ai/analyze` - Should return analysis data
- `POST /api/ai/suggest-price` - Should return price suggestion
- `GET /api/sales` - Should return garage sales list
- `GET /api/products` - Should return products list

### Common Issues to Watch For

1. **Connection Refused Errors**
   - Make sure backend is running on port 3000
   - Check: `curl http://localhost:3000/api/health`

2. **CORS Errors**
   - Backend should allow `http://localhost:5173`
   - Check backend CORS configuration

3. **Missing Environment Variables**
   - `GEMINI_API_KEY` must be set for AI features
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` must be set

4. **Empty Responses**
   - Check backend logs for errors
   - Verify environment variables are loaded

## 🛠️ Server Management

### Start Backend (if not running)
```bash
cd /Users/maganali/Downloads/yardhop
npm start
# Or: node server.js
```

### Start Frontend (if not running)
```bash
cd /Users/maganali/Downloads/yardhop/frontend
npm run dev
```

### Stop Servers
```bash
# Stop backend
lsof -ti:3000 | xargs kill -9

# Stop frontend
lsof -ti:5173 | xargs kill -9
```

## 📝 Test Checklist

- [ ] Backend server running on port 3000
- [ ] Frontend server running on port 5173
- [ ] Can access `http://localhost:5173` in browser
- [ ] Garage Sale Scanner page loads
- [ ] Can upload image in scanner
- [ ] AI analysis returns results
- [ ] Create Listing page loads
- [ ] AI price check works
- [ ] No console errors
- [ ] API calls succeed in Network tab

## 🐛 Debugging

If something doesn't work:

1. **Check backend logs:**
   ```bash
   tail -f /Users/maganali/Downloads/yardhop/server.log
   ```

2. **Check frontend logs:**
   ```bash
   tail -f /tmp/frontend-dev.log
   ```

3. **Test API directly:**
   ```bash
   curl -X POST http://localhost:3000/api/ai/suggest-price \
     -H "Content-Type: application/json" \
     -d '{"title": "Vintage Chair", "condition": "Good"}'
   ```

4. **Verify environment variables:**
   ```bash
   cd /Users/maganali/Downloads/yardhop
   cat .env | grep -E "GEMINI_API_KEY|SUPABASE"
   ```


