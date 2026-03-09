# Part 2 — Sprint 2 pricing engine verification checklist

Use this list to confirm the appraisal (pricing engine) flow is correctly wired end-to-end. Check each item; if any fails, fix before launch.

---

## 1. API route: `POST /api/appraise`

**File:** `routes/appraise.js`

- [ ] **Exists** — File `routes/appraise.js` is present.
- [ ] **Accepts multipart/form-data** — Uses `multer` with `upload.single('image')` and memory storage, limit 10MB.
- [ ] **Item identification** — Sends image (or `req.body.description`) to Gemini (`gemini-2.0-flash`) and gets back: `name`, `brand`, `category`, `condition`, `searchQuery`, `description`.
- [ ] **Parallel pricing sources** — Uses `Promise.allSettled` to call:
  - eBay Finding API (sold listings)
  - Google Custom Search API
  - Craigslist scraper
  - Mercari scraper  
  One failure must not break the request.
- [ ] **Synthesis** — Gemini synthesizes all source data into: `priceFair`, `priceLow`, `priceHigh`, `confidenceScore`, `sourcesSummary`, `sourcesCount`, `sellerTips`.
- [ ] **Supabase save** — Inserts into `appraisals` table (user_id nullable for anonymous). Handles DB errors without failing the response.
- [ ] **Response shape** — Returns JSON:
  - `appraisalId`, `item` (name, brand, category, condition, description), `pricing` (fair, low, high, confidenceScore, sourcesSummary, sourcesCount), `sellerTips`, `elapsedSeconds`.

**How to verify:**  
Send a `POST` to `http://localhost:3000/api/appraise` with `Content-Type: multipart/form-data` and a field `image` (file). Expect 200 and the JSON shape above, or 400/422/500 with an `error` message.

---

## 2. Server registration

**File:** `server.js`

- [ ] **Import** — Contains: `import appraiseRoutes from './routes/appraise.js';`
- [ ] **Mount** — Contains: `app.use('/api/appraise', appraiseRoutes);`

**How to verify:**  
Grep for `appraise` in `server.js`; you should see the import and the `app.use` line.

---

## 3. Appraisal results page

**File:** `frontend/pages/AppraisalResultsPage.tsx`

- [ ] **Exists** — File is present.
- [ ] **Reads sessionStorage** — On mount, reads `sessionStorage.getItem('appraisalResult')`.
- [ ] **Redirect when missing** — If no data or invalid JSON, redirects to `/` (homepage).
- [ ] **Renders appraisal** — Displays: item name, description, price (fair), range (low–high), confidence bar, sources summary, seller tips.
- [ ] **CTA** — "List on YardFront" (or equivalent) links to `/create` or listing flow.

**How to verify:**  
Open app, go to `/appraise/results` with no prior appraisal — should redirect to `/`. Run an appraisal from the landing page — should land on results with data.

---

## 4. Routing

**File:** `frontend/App.tsx`

- [ ] **Landing** — `<Route path="/" element={<LandingPage />} />` exists.
- [ ] **Results** — `<Route path="/appraise/results" element={<AppraisalResultsPage />} />` exists.
- [ ] **No auth required** — `/appraise/results` is not wrapped in `ProtectedRoute` (anonymous users can view after submitting a photo).

**How to verify:**  
Navigate to `/#/` and `/#/appraise/results`; landing and results pages load. After a successful appraisal, URL should be `/#/appraise/results`.

---

## 5. Frontend → API wiring (landing page)

**File:** `frontend/pages/LandingPage.tsx`

- [ ] **Upload triggers request** — On file select or drop, builds `FormData`, appends `image`, calls `fetch('/api/appraise', { method: 'POST', body: formData })`.
- [ ] **No auth header required** — Request does not require `Authorization` for anonymous appraisal.
- [ ] **Success flow** — On 200: `sessionStorage.setItem('appraisalResult', JSON.stringify(result))`, then `navigate('/appraise/results')`.
- [ ] **Loading state** — Shows loading message (e.g. "Scanning eBay, Mercari, Craigslist...") while request is in flight.
- [ ] **Error state** — On non-OK response or throw, shows error message in the upload zone.
- [ ] **Client-side file size** — Rejects files > 10MB before sending.

**How to verify:**  
Use landing page upload; watch network tab for `POST /api/appraise` and redirect to results. Try a file > 10MB — should show error without sending.

---

## 6. Environment variables

**File:** `.env` (root or backend)

- [ ] **Required for appraise route:**
  - `GEMINI_API_KEY` — Gemini API key.
  - `SUPABASE_URL` — Supabase project URL.
  - `SUPABASE_SERVICE_KEY` — Supabase service role key (appraise uses this; some projects use `SUPABASE_SERVICE_ROLE_KEY` — ensure the name matches what `routes/appraise.js` reads).
- [ ] **Optional (sources fail gracefully if missing):**
  - `EBAY_APP_ID` — eBay Finding API.
  - `GOOGLE_SEARCH_API_KEY` — Google Custom Search.
  - `GOOGLE_SEARCH_ENGINE_ID` — Custom Search engine ID.

**How to verify:**  
Ensure `.env` has at least `GEMINI_API_KEY`, `SUPABASE_URL`, and the service key name used in `routes/appraise.js`. Missing eBay/Google keys should not crash the route; responses may have fewer sources.

---

## 7. Supabase table

- [ ] **Table exists** — `appraisals` table exists in Supabase with columns used by `routes/appraise.js`: e.g. `user_id`, `item_name`, `item_brand`, `item_category`, `item_condition`, `item_description`, `input_type`, `price_fair`, `price_low`, `price_high`, `confidence_score`, `sources_summary`, `sources_count`, `seller_tips`, `raw_sources` (or equivalent).
- [ ] **RLS / permissions** — Insert from the backend (service role) is allowed; no need for RLS if only server writes.

**How to verify:**  
Run an appraisal and check Supabase Table Editor for a new row in `appraisals`, or confirm schema in SQL editor.

---

## Quick smoke test

1. Start backend and frontend.
2. Open `/#/`.
3. Scroll to upload, drop or select an image (e.g. a chair).
4. See loading text, then redirect to `/#/appraise/results`.
5. Results page shows item name, price range, confidence, tips.
6. No console or network errors.

If all items above are checked and the smoke test passes, Sprint 2 pricing engine wiring is verified.
