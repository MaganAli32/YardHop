# YardFront Backend Integration Guide

## ✅ Integration Complete

The new backend from `yardhop-backend` has been successfully integrated into the main `yardhop` project.

## 📁 What Was Integrated

### Backend Structure
- ✅ **Routes** (`/routes/`) - All API route handlers
  - `auth.js` - Authentication endpoints
  - `products.js` - Product CRUD operations
  - `garageSales.js` - Garage sale management
  - `ai.js` - Stitch AI endpoints (analyze, suggest-price, generate-description, detect-steals, history)
  - `favorites.js`, `cart.js`, `orders.js` - E-commerce features
  - `messages.js` - Real-time messaging
  - `community.js` - Community posts
  - `reviews.js` - Product reviews
  - `upload.js` - Image upload with Sharp processing
  - `search.js` - Global search
  - `profiles.js` - User profiles

- ✅ **Middleware** (`/middleware/`)
  - `auth.js` - JWT authentication (requireAuth, optionalAuth)
  - `validation.js` - Zod validation schemas
  - `rateLimiter.js` - Rate limiting for different endpoints

- ✅ **Server** (`server.js`)
  - Merged new backend routes with existing static file serving
  - Proper CORS configuration
  - Security headers (Helmet)
  - Request logging
  - Error handling

### Frontend Updates
- ✅ **API Client** (`frontend/lib/api.ts`)
  - Updated `aiApi` to match new backend endpoints
  - Updated `productsApi` to use new query parameters
  - Added new AI methods: `detectSteals()`, `getHistory()`

- ✅ **Components Updated**
  - `GarageSaleScannerPage.tsx` - Updated to handle new API response format

## 🔧 Setup Instructions

### 1. Install Dependencies

```bash
cd /Users/maganali/Downloads/yardhop
npm install zod multer sharp --legacy-peer-deps
```

**Note:** The `--legacy-peer-deps` flag is needed because `lucide-react@0.263.1` has a peer dependency on React 18, but the project uses React 19. This is safe to use as `zod`, `multer`, and `sharp` are backend-only packages and don't depend on React.

### 2. Set Up Supabase Database

1. Go to your Supabase project dashboard
2. Open SQL Editor
3. Run these files **in order**:
   - `sql/001_schema.sql` - Creates all 20 tables
   - `sql/002_rls_policies.sql` - Sets up Row Level Security
   - `sql/003_storage.sql` - Creates storage buckets

### 3. Environment Variables

Update your `.env` file with:

```env
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Keep secret!

# AI
GEMINI_API_KEY=AIza...  # Keep secret!

# Server
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173,http://localhost:3000

# Frontend (for Vite)
VITE_API_BASE=http://localhost:3000/api
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

### 4. Start the Server

```bash
npm start
# or for development with auto-reload:
npm install -g nodemon
nodemon server.js
```

## 🔄 API Endpoint Changes

### AI Endpoints

| Old Endpoint | New Endpoint | Changes |
|-------------|--------------|---------|
| `POST /api/ai/analyze-image` | `POST /api/ai/analyze` | Returns `{success, analysis}` instead of `{items}` |
| `POST /api/ai/suggest-price` | `POST /api/ai/suggest-price` | Same, but accepts `original_price` |
| `POST /api/ai/generate-description` | `POST /api/ai/generate-description` | Now takes `title, condition, category, features` instead of image |
| - | `POST /api/ai/detect-steals` | **NEW** - Detects steals from item array |
| - | `GET /api/ai/history` | **NEW** - Get user's AI analysis history |

### Products Endpoints

| Parameter | Old | New |
|-----------|-----|-----|
| Price min | `minPrice` | `min_price` |
| Price max | `maxPrice` | `max_price` |
| Steals filter | `isSteal` | `is_steal` |
| Location | `lat`, `lng` | `latitude`, `longitude` |
| Sorting | `sortBy` | `sort_by`, `sort_order` |
| Search | - | `q` (text search) |
| Pagination | - | `page`, `limit` |

## 🎯 Key Features

### Authentication
- JWT-based authentication via Supabase
- `requireAuth` middleware for protected routes
- `optionalAuth` middleware for routes that work with/without auth

### Rate Limiting
- **Auth**: 5 requests per 15 minutes
- **AI**: 20 requests per hour
- **Uploads**: 50 requests per hour
- **Standard**: 1000 requests per 15 minutes

### AI Features
1. **Image Analysis** (`/api/ai/analyze`)
   - Analyzes item images
   - Returns title, description, category, condition, pricing
   - Saves analysis to database if user is authenticated

2. **Price Suggestion** (`/api/ai/suggest-price`)
   - Suggests optimal pricing
   - Considers condition, category, original price
   - Falls back to calculation if AI unavailable

3. **Description Generation** (`/api/ai/generate-description`)
   - Generates compelling descriptions
   - Uses title, condition, category, features

4. **Steal Detection** (`/api/ai/detect-steals`)
   - Analyzes multiple items
   - Identifies potential steals (>30% savings)
   - Returns sorted list with savings calculations

## 🔍 Testing the Integration

### 1. Test Health Endpoint
```bash
curl http://localhost:3000/api/health
```

### 2. Test AI Analysis
```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{"image_base64": "base64_encoded_image_here"}'
```

### 3. Test Products List
```bash
curl http://localhost:3000/api/products?category=Furniture&min_price=10&max_price=100
```

## 📝 Next Steps

1. **Run SQL files** in Supabase to create database schema
2. **Install missing dependencies**: `npm install zod multer sharp`
3. **Update environment variables** in `.env`
4. **Test endpoints** using the examples above
5. **Update frontend components** that still use old API format:
   - `CreateListingPage.tsx` - Update price suggestion response handling
   - `ProductDetailPage.tsx` - Update if using AI features
   - `YardSaleDetailPage.tsx` - Update if using AI features

## 🐛 Troubleshooting

### "Missing required Supabase environment variables"
- Check that `.env` has `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### "Module not found: zod/multer/sharp"
- Run `npm install zod multer sharp`

### "Route not found" errors
- Make sure routes are copied to `/routes/` directory
- Check that server.js imports routes correctly

### CORS errors
- Update `CORS_ORIGIN` in `.env` to include your frontend URL
- Default allows `http://localhost:5173` and `http://localhost:3000`

## 📚 Documentation

- **Backend Routes**: See individual files in `/routes/`
- **Middleware**: See `/middleware/` for auth and validation
- **Database Schema**: See `/sql/001_schema.sql`
- **RLS Policies**: See `/sql/002_rls_policies.sql`

## ✅ Integration Checklist

- [x] Backend routes copied
- [x] Middleware copied
- [x] Server.js merged and updated
- [x] Frontend API client updated
- [x] GarageSaleScannerPage updated
- [ ] Dependencies installed (zod, multer, sharp)
- [ ] SQL files run in Supabase
- [ ] Environment variables configured
- [ ] Server tested and running
- [ ] Frontend components updated for new API responses

