# YardHop / YardFront – Project Overview & Recent Changes

This document explains what the project is, how it’s built, what was going wrong, and what was fixed.

---

## 1. What the project is

- **YardHop / YardFront** – A marketplace-style app for **garage sales** and **second-hand products**.
- **Core flows:**
  - Browse/search **garage sale events** and **products**.
  - View **event detail** (sale page) and **product detail** (product page).
  - Create listings, garage sales, favorites, cart, orders, messages, community posts.
  - Auth (email/password + Google OAuth), profiles, AI features (scan/price suggestions).

- **Deployment:** Frontend + API on **Vercel**; database and auth on **Supabase** (PostgreSQL + PostgREST).

---

## 2. Tech stack

| Layer        | Technology |
|-------------|------------|
| Frontend    | React 19, TypeScript, Vite, React Router (HashRouter) |
| API         | Express.js (Node), mounted at `/api/*` |
| Hosting     | Vercel (SPA + serverless API via `api/index.js` → `server.js`) |
| Database    | Supabase (PostgreSQL), Row Level Security (RLS) |
| Auth        | Supabase Auth (email + OAuth); JWT passed to API |
| Storage     | Supabase Storage (avatars, listing images, garage sale images, etc.) |

- **Routing:** Hash-based (`/#/search`, `/#/product/:id`, `/#/sales/:id`) so OAuth redirects and static hosting work cleanly.
- **API base:** Frontend calls `/api/...` (e.g. `salesApi.get(id)` → `GET /api/sales/:id`).

---

## 3. Architecture in a nutshell

```
User → Browser (React SPA)
         ↓
      /api/* → Vercel serverless → Express (server.js)
         ↓
      req.supabase (JWT from Authorization header)
         ↓
      Supabase (PostgreSQL + PostgREST, RLS, Storage)
```

- **Frontend** uses `frontend/lib/api.ts` (e.g. `salesApi`, `productsApi`) to talk to the backend; auth token comes from Supabase session.
- **Backend** uses `req.supabase` (Supabase client with the user’s JWT) so RLS applies correctly.
- **SQL** in `sql/` is applied in order (001 → 002 → … → 014) in the Supabase SQL Editor or your migration flow.

---

## 4. What was going wrong (and what we fixed)

### 4.1 Supabase Adviser: 273+ warnings

Supabase’s database linter reported:

1. **Auth RLS Initialization Plan (PERFORMANCE)**  
   - **Issue:** RLS policies used `auth.uid()` (and similar) directly, so the planner re-evaluated them **per row** instead of once per query.  
   - **Fix:** Use `(select auth.uid())` in policy expressions so the value is computed once (init plan).  
   - **Where:** Migration **014** recreates all affected RLS policies with `(select auth.uid())`.

2. **Multiple Permissive Policies (PERFORMANCE)**  
   - **Issue:** Several tables had more than one permissive policy for the same role and action (e.g. two SELECT policies for `authenticated`), so the planner had to evaluate multiple policies per query.  
   - **Fix:** Keep a single canonical policy per (table, role, action); drop duplicate/umbrella policies (e.g. “Users can manage own cart”, “Sale hosts can manage images”).  
   - **Where:** Migration **014** drops the redundant policies and recreates the canonical set.

3. **Duplicate Index (PERFORMANCE)**  
   - **Issue:** Same column(s) had two indexes (e.g. `idx_cart_items_user` and `idx_cart_items_user_id`).  
   - **Fix:** Drop the redundant index, keep one per column set.  
   - **Where:** Migration **014** drops: `idx_cart_items_user`, `idx_favorites_user`, `idx_messages_conversation`, `idx_products_seller`, `idx_reviews_reviewee` (keeps the `*_id` versions).

4. **Other Adviser items (already or partly fixed in 011–013)**  
   - Security definer views → **011** (views recreated with `security_invoker = true`).  
   - Function search path → **012** (`SET search_path = public` etc.).  
   - RLS “always true” on `conversations` INSERT → **012/013** (`WITH CHECK (auth.uid() IS NOT NULL)`).  
   - Unindexed foreign keys → **012** (indexes added).  
   - Extensions in `public` → **013** (cube, earthdistance moved to schema `extensions`).

5. **Leaked password protection (Auth)**  
   - **Issue:** Supabase Auth’s “leaked password” check was off.  
   - **Fix:** Manual in Dashboard: **Authentication → Providers / Settings** → enable “Leaked password protection”.

---

### 4.2 Sale detail 500: “Could not embed because more than one relationship was found for 'garage_sales' and 'products'”

- **What happened:**  
  `GET /api/sales/:id` (or a similar path) was returning **500** and the frontend showed “API fetch failed, using mock data” with that PostgREST error.

- **Why:**  
  PostgREST throws that when you **embed** a relation (e.g. `products`) in a query on `garage_sales` and there is more than one possible way to join the two (or the intended FK isn’t clear). Even with a hint like `products!garage_sale_id`, having multiple FKs or ambiguous relationships can trigger it.

- **What we did:**
  1. **Backend (`routes/garageSales.js`):**
     - **GET /api/sales/:id**  
       - **No** embed of `products` in the garage_sales query.  
       - One query: `garage_sales` with `host:profiles!host_id` and `images:garage_sale_images`.  
       - Second query: `products` with `garage_sale_id = :id` and `images:product_images`.  
       - Response is built by merging sale + products in code.
     - **GET /api/sales/user/:userId**  
       - Removed `products:products!garage_sale_id(count)` from the select.  
       - Product counts are now loaded in a **separate** query and attached to each sale in code.
     - So **no** Supabase embed between `garage_sales` and `products` in these routes.

  2. **Frontend (so wrong links still land in the right place):**
     - **YardSaleDetailPage**  
       When the sale API fails for a **UUID** (e.g. 404 or 500), we **redirect** to `/product/:id`. So if someone follows a bad link like `/sales/{productId}`, they end up on the **product page** instead of “Event Not Found” or mock data.
     - **FavoritesPage**  
       Product favorites now link to the **product page**: `item.id ? /product/:id : item.saleId ? /sales/:saleId : '#'`. So clicking a product in Favorites goes to `/product/:id`, not the sale.

---

### 4.3 “It should go to the product page, not the sales side”

- **What you meant:**  
  When clicking a **product** (e.g. from Favorites or a wrong link), the app should open the **product detail** page (`/product/:id`), not the **sale/event** page (`/sales/:id`).

- **What we changed:**
  - **FavoritesPage:**  
    Link for a favorite that has a product `id` is now **always** `/product/${item.id}`. Only when there’s no product id (e.g. sale-only favorite) do we use `/sales/${item.saleId}`.
  - **YardSaleDetailPage:**  
    If the sale API fails for the given UUID, we **redirect** to `/product/:id`. So a URL like `/sales/5aa3b0b7-...` that is actually a **product** ID will redirect to `/product/5aa3b0b7-...`.

Result: product links take you to the product page; sale links to the sale page; wrong sale URLs with a product ID redirect to the product page.

---

### 4.4 OAuth and HashRouter (earlier fixes, still relevant)

- **Issue:**  
  After Google login, Supabase redirects to your app. If the redirect put tokens in the **path** (e.g. `/access_token=...`) instead of the **hash** (`#/access_token=...`), HashRouter didn’t match a route and the app showed a blank or “no route” screen.

- **Fixes (already in the repo):**
  - **OAuthCallbackFallback** – Catch-all route that handles malformed OAuth URLs, reads tokens from the path, and redirects to `/#/`.
  - **AuthCallbackHandler** – Can read tokens from both `window.location.hash` and `window.location.pathname` and then redirect to `/#/`.
  - **Login/Signup** – `redirectUrl` uses `import.meta.env.VITE_APP_URL` so the redirect URL is correct for your environment.

---

### 4.5 Location display and formatting

- **Issue:**  
  Addresses/locations were inconsistent (e.g. “Austin”, “Temecula, CA”) and not split into neighborhood vs city/state.

- **Fix:**
  - **frontend/lib/locationUtils.ts** – `formatLocation(address)` returns `{ neighborhood, cityState }` and handles 2- and 3-part addresses.
  - Used on: SearchPage (events + products), YardSaleDetailPage, ProductDetailPage, ProductCard, FavoritesPage, CartPage.
  - Hardcoded fallbacks like “Austin” / “Temecula, CA” were removed or replaced with “Location not available” / “—” where appropriate.

---

### 4.6 Backend sale detail and “Event Not Found”

- **Issue:**  
  Single sale fetch could 500 (e.g. embed error or “Could not embed…”), and the UI only showed “Event Not Found”.

- **Fixes:**
  - Backend: Two-query approach for `GET /api/sales/:id` (no products embed), plus handling for “more than one relationship” in the error response.
  - Frontend: For UUIDs, on API failure we redirect to `/product/:id` so the user isn’t stuck on a broken sale page.

---

## 5. SQL migrations (011 → 014) – what each does

Run in order in the Supabase SQL Editor (or your migration pipeline).

| File | Purpose |
|------|--------|
| **011_fix_security_invoker_views.sql** | Recreates `public_garage_sales` and `public_products` views with `WITH (security_invoker = true)` so they run with the **caller’s** permissions and respect RLS instead of bypassing it. |
| **012_supabase_adviser_fixes.sql** | Sets `search_path = public` on listed functions (avoids search path injection); fixes `conversations` INSERT policy to `WITH CHECK (auth.uid() IS NOT NULL)`; adds indexes on unindexed foreign keys. |
| **013_extensions_and_conversations_rls.sql** | Creates schema `extensions`, moves `cube` and `earthdistance` there; sets `calculate_distance` search_path to `public, extensions`; reinforces conversations INSERT policy. |
| **014_rls_performance_and_duplicate_indexes.sql** | (1) Drops duplicate indexes (cart_items, favorites, messages, products, reviews). (2) Drops duplicate/umbrella RLS policies so there’s one policy per (table, role, action). (3) Recreates all canonical RLS policies with `(select auth.uid())` so auth is evaluated once per query (init plan). Fully idempotent (DROP IF EXISTS before each CREATE). |

Details and manual steps (e.g. leaked password) are in **sql/SUPABASE_ADVISER_NOTES.md**.

---

## 6. Backend changes (garage sales) – summary

- **GET /api/sales**  
  List sales; no products embed (products only on detail).

- **GET /api/sales/user/:userId**  
  Sales by user; no `products:products!garage_sale_id(count)`; product counts come from a separate query and are attached in code.

- **GET /api/sales/:id**  
  - Query 1: `garage_sales` by id with `host:profiles!host_id`, `images:garage_sale_images`.  
  - Query 2: `products` with `garage_sale_id = id` and `images:product_images`.  
  - Response: sale + products merged in code.  
  - If PostgREST returns “more than one relationship”, we catch it and return a clear 500 message.

No Supabase embed between `garage_sales` and `products` in any of these routes.

---

## 7. Frontend changes – summary

- **YardSaleDetailPage**
  - On sale API failure for a UUID → `navigate(\`/product/${id}\`, { replace: true })` so product IDs in `/sales/:id` land on the product page.

- **FavoritesPage**
  - Product favorites: link to `/product/${item.id}`.  
  - Sale-only favorites: link to `/sales/${item.saleId}`.

- **OAuth / Auth**
  - OAuthCallbackFallback, AuthCallbackHandler, and redirect URL handling so OAuth works with HashRouter.

- **Location**
  - `formatLocation()` from `locationUtils.ts` used where addresses are shown; hardcoded locations removed.

- **Types / build**
  - vite-env.d.ts, types, and component fixes so TypeScript and the app build cleanly.

---

## 8. Current state and what to do next

- **Codebase:**  
  RLS performance and duplicate-index fixes are in migration **014**; sale/product routing and Favorites links are in the frontend and backend; OAuth and location behavior are updated as above.

- **Database:**  
  Run **011 → 012 → 013 → 014** in Supabase if you haven’t already. Then re-run the Supabase Adviser; auth RLS init, multiple permissive policies, and duplicate index warnings should be addressed.

- **Auth (manual):**  
  In Supabase Dashboard, enable **Leaked password protection** under Authentication (see sql/SUPABASE_ADVISER_NOTES.md).

- **Deploy:**  
  Commit and push (your last commit is already created). Run `git push origin main` (or your branch) so Vercel deploys the latest backend and frontend. After deploy, sale detail and product/sale navigation should behave as described.

- **If 500 on GET /api/sales/:id still appears:**  
  Ensure the **deployed** server is using the latest `routes/garageSales.js` (two queries, no products embed). Trigger a fresh Vercel deploy if needed. Even if the 500 persists, the frontend will redirect UUID failures to `/product/:id`, so users still land on the product page when the ID is a product.

---

## 9. File map (where to look)

| Area | Key files |
|------|-----------|
| API entry | `api/index.js`, `server.js` |
| Garage sales API | `routes/garageSales.js` |
| Auth middleware | `middleware/auth.js` |
| Frontend API client | `frontend/lib/api.ts` |
| Sale detail page | `frontend/pages/YardSaleDetailPage.tsx` |
| Favorites | `frontend/pages/FavoritesPage.tsx` |
| OAuth / callback | `frontend/components/AuthCallbackHandler.tsx`, `frontend/components/OAuthCallbackFallback.tsx` |
| Location formatting | `frontend/lib/locationUtils.ts` |
| SQL migrations | `sql/011_*` … `sql/014_*`, `sql/SUPABASE_ADVISER_NOTES.md` |
| Deployment | `vercel.json`, `DEPLOYMENT_GUIDE.md` |

This is the full picture of what’s going on in the project and what was changed to get here.
