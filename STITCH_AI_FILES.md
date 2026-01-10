# Stitch AI Feature Files

## 🎯 Core Stitch AI Files

### **Backend Files**

1. **`routes/ai.js`** ⭐ **MAIN BACKEND FILE**
   - Location: `/Users/maganali/Downloads/yardhop/routes/ai.js`
   - Contains all AI API endpoints:
     - `POST /api/ai/analyze` - Image analysis (used by scanner)
     - `POST /api/ai/suggest-price` - Price suggestions
     - `POST /api/ai/generate-description` - Description generation
     - `POST /api/ai/detect-steals` - Steal detection
     - `GET /api/ai/history` - Analysis history
   - **Status:** ✅ Active and integrated

2. **`api/lib/ai.js`** (Legacy/Alternative Implementation)
   - Location: `/Users/maganali/Downloads/yardhop/api/lib/ai.js`
   - Contains alternative AI functions
   - **Status:** ⚠️ May be unused - check if routes use this

### **Frontend Files**

3. **`frontend/pages/GarageSaleScannerPage.tsx`** ⭐ **SCANNER FEATURE**
   - Location: `/Users/maganali/Downloads/yardhop/frontend/pages/GarageSaleScannerPage.tsx`
   - Route: `/scanner`
   - **Function:** `handleScan()` (line 32)
   - **API Call:** `aiApi.analyzeImage(imageBase64)` (line 42)
   - **Error Location:** Line 65 - "Failed to scan image"
   - **Status:** ✅ Active - This is where your error is happening

4. **`frontend/pages/StitchLivePage.tsx`** ⭐ **LIVE ADVISOR**
   - Location: `/Users/maganali/Downloads/yardhop/frontend/pages/StitchLivePage.tsx`
   - Route: `/live-advisor`
   - **Features:** Real-time camera/microphone, live AI consultation
   - **Uses:** Direct Gemini API (not backend)
   - **Status:** ✅ Active

5. **`frontend/pages/ProductDetailPage.tsx`** ⭐ **PRODUCT INTELLIGENCE**
   - Location: `/Users/maganali/Downloads/yardhop/frontend/pages/ProductDetailPage.tsx`
   - Component: `StitchIntelligenceTerminal` (around line 176)
   - **Function:** `callGemini()` - Direct API call
   - **Features:** Market arbitrage analysis, Stitch Score
   - **Status:** ✅ Active

6. **`frontend/pages/YardSaleDetailPage.tsx`** ⭐ **SALE INTELLIGENCE**
   - Location: `/Users/maganali/Downloads/yardhop/frontend/pages/YardSaleDetailPage.tsx`
   - Component: `StitchSaleIntelligence` (around line 188)
   - **Function:** `runAnalysis()` - Direct API call
   - **Features:** Sale quality score, arrival strategy
   - **Status:** ✅ Active

7. **`frontend/lib/api.ts`** ⭐ **API CLIENT**
   - Location: `/Users/maganali/Downloads/yardhop/frontend/lib/api.ts`
   - **Section:** `aiApi` object (lines 147-197)
   - **Functions:**
     - `analyzeImage()` - Calls `/api/ai/analyze`
     - `suggestPrice()` - Calls `/api/ai/suggest-price`
     - `generateDescription()` - Calls `/api/ai/generate-description`
     - `detectSteals()` - Calls `/api/ai/detect-steals`
     - `getHistory()` - Calls `/api/ai/history`
   - **Status:** ✅ Active - This is what the scanner uses

## 🔍 Current Issue: "Failed to scan image: Failed to fetch"

### **Problem Location:**
- **File:** `frontend/pages/GarageSaleScannerPage.tsx`
- **Line:** 42 - `const result = await aiApi.analyzeImage(imageBase64);`
- **Error:** Line 65 - `alert(\`Failed to scan image: ${e.message || 'Unknown error'}\`);`

### **Root Cause:**
The error "Failed to fetch" means the frontend cannot connect to the backend API. This happens because:

1. **Server not running** - The backend server must be running on port 3000
2. **Wrong endpoint** - The API client calls `/api/ai/analyze` which should be correct
3. **CORS/CSP issues** - Content Security Policy might be blocking

### **Fix Steps:**

1. **Start the backend server:**
   ```bash
   cd /Users/maganali/Downloads/yardhop
   npm start
   ```

2. **Verify the endpoint exists:**
   ```bash
   curl -X POST http://localhost:3000/api/ai/analyze \
     -H "Content-Type: application/json" \
     -d '{"image_base64":"test"}'
   ```

3. **Check browser console** for CORS/CSP errors

4. **Verify API_BASE in frontend:**
   - Check `frontend/lib/api.ts` line 2
   - Should be: `const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';`

## 📋 Summary

**Main Stitch AI Files to Work On:**
1. ⭐ `routes/ai.js` - Backend AI endpoints
2. ⭐ `frontend/pages/GarageSaleScannerPage.tsx` - Scanner (where error occurs)
3. ⭐ `frontend/pages/StitchLivePage.tsx` - Live advisor
4. ⭐ `frontend/lib/api.ts` - API client

**Supporting Files:**
- `frontend/pages/ProductDetailPage.tsx` - Product intelligence
- `frontend/pages/YardSaleDetailPage.tsx` - Sale intelligence
- `server.js` - Registers AI routes

## 🚀 Next Steps

1. **Start the server** - This will fix the "Failed to fetch" error
2. **Test the scanner** - Upload an image and verify it works
3. **Review `routes/ai.js`** - This is your main backend AI file
4. **Check `api/lib/ai.js`** - See if this is being used or can be removed


