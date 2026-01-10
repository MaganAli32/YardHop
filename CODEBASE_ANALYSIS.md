# YardFront Codebase Analysis & Stitch AI Documentation

## 📋 Executive Summary

This document provides a comprehensive analysis of the YardFront codebase, identifies unused files, verifies all components work correctly, and documents the Stitch AI feature implementation.

---

## 🎯 Stitch AI Feature Files

### **Backend AI Implementation**
**Location:** `api/lib/ai.js`

This is the **main Stitch AI backend file** containing three core AI functions:

1. **`analyzeImage(imageBase64, mimeType)`**
   - Analyzes garage sale photos to identify sellable items
   - Returns: Array of items with name, bounding_box, estimated_value, confidence, location
   - Uses: `gemini-1.5-flash` model
   - **Used by:** GarageSaleScannerPage

2. **`suggestPrice(title, description, condition, category)`**
   - Suggests optimal pricing for products
   - Returns: `{suggestedPrice, marketAverage, priceRange: {min, max}}`
   - Uses: `gemini-1.5-flash` model
   - **Used by:** CreateListingPage (price check feature)

3. **`generateDescription(imageBase64, mimeType)`**
   - Generates product title, description, category, and tags from image
   - Returns: `{title, description, category, tags}`
   - Uses: `gemini-1.5-flash` model
   - **Used by:** Product creation workflows

**API Endpoints (in `server.js`):**
- `POST /api/ai/analyze-image` → calls `analyzeImage()`
- `POST /api/ai/suggest-price` → calls `suggestPrice()`
- `POST /api/ai/generate-description` → calls `generateDescription()`

### **Frontend AI Integration**

**1. AI API Client**
- **File:** `frontend/lib/api.ts`
- **Section:** `aiApi` object (lines 136-167)
- Functions: `analyzeImage()`, `suggestPrice()`, `generateDescription()`
- These call the backend API endpoints

**2. Stitch Live Advisor**
- **File:** `frontend/pages/StitchLivePage.tsx`
- **Route:** `/live-advisor`
- **Features:**
  - Real-time camera/microphone access
  - Live video streaming to Gemini API
  - Audio input/output for voice interaction
  - Uses: `gemini-2.5-flash-native-audio-preview-09-2025` model
  - **Key Function:** `startSession()` - establishes live connection

**3. Garage Sale Scanner**
- **File:** `frontend/pages/GarageSaleScannerPage.tsx`
- **Route:** `/scanner` (protected)
- **Features:**
  - Upload garage sale photos
  - Calls `aiApi.analyzeImage()` to detect high-value items
  - Displays detected items with bounding boxes and market values
  - **Key Function:** `handleScan()` - processes images through AI

**4. Product Intelligence Terminal**
- **File:** `frontend/pages/ProductDetailPage.tsx`
- **Component:** `StitchIntelligenceTerminal` (lines 176-240)
- **Features:**
  - Market arbitrage analysis for individual products
  - Provides "Stitch Score" (0-100)
  - Uses: Direct Gemini API call via `callGemini()` function
  - **Key Function:** `handleInitialize()` - runs analysis

**5. Sale Intelligence**
- **File:** `frontend/pages/YardSaleDetailPage.tsx`
- **Component:** `StitchSaleIntelligence` (lines 188-259)
- **Features:**
  - Analyzes entire garage sale events
  - Provides quality score, arrival strategy, top categories
  - Uses: Direct Gemini API call via `callGemini()` function
  - **Key Function:** `runAnalysis()` - analyzes sale data

**6. Inbox Stitch Consultation**
- **File:** `frontend/pages/InboxPage.tsx`
- **Function:** `consultStitch()` (lines 86-106)
- **Features:**
  - Provides negotiation advice during conversations
  - Currently has placeholder implementation
  - **Status:** Needs backend integration

**7. Feed Page Pulse**
- **File:** `frontend/pages/FeedPage.tsx`
- **Function:** `fetchPulse()` (lines 14-33)
- **Features:**
  - Generates neighborhood activity forecast
  - Uses: Direct Gemini API call
  - **Status:** Uses deprecated API pattern

---

## 🧹 Unused Files Removed ✅

### **1. FeedPage.tsx** ✅ DELETED
- **Location:** `frontend/pages/FeedPage.tsx`
- **Status:** ✅ **REMOVED**
- **Reason:** 
  - Not imported in `App.tsx`
  - Route `/feed` redirects to `/search` instead
  - Contained old implementation

### **2. Untitled (Environment Variables)** ✅ DELETED
- **Location:** `frontend/Untitled`
- **Status:** ✅ **REMOVED**
- **Reason:** 
  - Temporary file with environment variables
  - Variables already in root `.env` file

---

## ✅ Code Quality Check

### **Linting Status**
- ✅ **No linting errors found** across all files
- All TypeScript/JavaScript files compile successfully

### **Frontend Files Verified**
All 20 page components exist and are properly routed (FeedPage.tsx removed):
- ✅ All pages imported in `App.tsx`
- ✅ All routes properly configured
- ✅ No broken imports detected
- ✅ Unused files cleaned up

### **Backend Files Verified**
- ✅ `server.js` - Main Express server (1080 lines)
- ✅ `api/lib/ai.js` - Stitch AI backend (141 lines)
- ✅ `api/lib/supabase.js` - Database client (31 lines)
- ✅ `server-utils/auth.js` - Authentication (45 lines)
- ✅ `server-utils/validation.js` - Input validation (110 lines)

---

## 🔧 Issues Found & Recommendations

### **1. StitchLivePage.tsx - API Key Issue** ✅ FIXED
**File:** `frontend/pages/StitchLivePage.tsx:81`
**Issue:** Was using `process.env.API_KEY` which won't work in browser
**Status:** ✅ **FIXED** - Now uses `import.meta.env.VITE_GEMINI_API_KEY` with proper error handling

### **2. FeedPage.tsx - Deprecated API Pattern** ✅ REMOVED
**File:** `frontend/pages/FeedPage.tsx`
**Issue:** Was unused, contained deprecated API pattern
**Status:** ✅ **DELETED** - File removed from codebase

### **3. InboxPage.tsx - Placeholder Implementation**
**File:** `frontend/pages/InboxPage.tsx:86-106`
**Issue:** `consultStitch()` function has hardcoded response
**Recommendation:** Implement backend API endpoint for Stitch consultation

---

## 📁 File Structure Summary

### **Stitch AI Core Files (Priority for Development)**
1. **`api/lib/ai.js`** ⭐ **START HERE** - Main AI backend implementation
2. **`frontend/lib/api.ts`** - AI API client (lines 136-167)
3. **`frontend/pages/StitchLivePage.tsx`** - Live advisor feature
4. **`frontend/pages/GarageSaleScannerPage.tsx`** - Scanner feature
5. **`frontend/pages/ProductDetailPage.tsx`** - Product intelligence
6. **`frontend/pages/YardSaleDetailPage.tsx`** - Sale intelligence

### **Supporting Files**
- `server.js` - API route handlers for AI endpoints (lines 293-334)
- `frontend/pages/InboxPage.tsx` - Stitch consultation (needs implementation)

---

## 🚀 Next Steps for Stitch AI Development

1. **Review `api/lib/ai.js`** ⭐ **START HERE** - This is your main AI backend file
2. **Check API endpoints in `server.js`** (lines 293-334) - All three endpoints are implemented
3. ✅ **StitchLivePage API key** - FIXED - Now uses proper environment variable
4. **Implement InboxPage consultation** - Add backend endpoint for negotiation advice
5. **Consider consolidating** - Some pages call Gemini directly, others use backend (optional optimization)

---

## 📝 Notes

- All files are properly typed (TypeScript/JavaScript)
- No critical errors detected
- Backend and frontend are properly separated
- Environment variables are configured in `.env`
- All routes are properly protected where needed

