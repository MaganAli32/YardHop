# YardHop/YardFront: Debug Prompt for "Event Not Found" / 500 on Sale Detail

**Give this entire document to Claude (or another AI) to continue debugging if the issue persists after deployment.**

---

## 1. Problem Summary

When users click on a yard sale from search, favorites, or profile:

- **UI**: "Event Not Found" or fallback/mock data.
- **Network**: `GET /api/sales/<uuid>` returns **500**.
- **Error message** (server/logs):  
  `"Could not embed because more than one relationship was found for 'garage_sales' and 'products'"`

This is a **PostgREST** (Supabase REST layer) error. It occurs when PostgREST sees multiple possible foreign-key paths between tables and cannot choose one for embedded (joined) resources.

---

## 2. Tech Stack

- **Frontend**: React (Vite), TypeScript, React Router.
- **Backend**: Node/Express, deployed as serverless (e.g. Vercel).
- **DB / API**: Supabase (PostgreSQL + PostgREST).
- **Relevant tables**: `garage_sales`, `garage_sale_images`, `products`, `product_images`, `profiles`.

---

## 3. Root Cause (Why the Error Happens)

PostgREST can throw **"more than one relationship was found for 'garage_sales' and 'products'"** when:

1. **Direct FK**: `products.garage_sale_id → garage_sales.id`.
2. **Views**: e.g. `public_garage_sales` / `public_products` that add extra relationship paths.
3. **Multiple FKs** involving the same tables (e.g. other tables also referencing `garage_sales` or `profiles`).

Any **embed** (e.g. `products(...)` or `host:profiles!host_id(...)` in a `.select()` on `garage_sales`) can trigger schema introspection that hits this ambiguity, even if the embed is only for `host` or `images` and not for `products`.

**Reliable fix**: Avoid **all** PostgREST embeds for garage-sale detail/list. Use **separate Supabase client queries** (one per table), then assemble the response in JavaScript.

---

## 4. What Has Already Been Tried

- **Backend (`routes/garageSales.js`)**  
  - **GET /api/sales/:id**  
    - Previously: one query with embeds like  
      `host:profiles!host_id(...)`, `images:garage_sale_images(...)`, and a **separate** query for `products` (but still with `images:product_images(...)` embed on products).  
    - The **first** query on `garage_sales` still used embeds; PostgREST can still error when resolving relationships for `garage_sales`.  
    - **Change applied**: Use **only** separate queries:  
      1) `garage_sales` with `select('*')` (no embeds).  
      2) `profiles` by `host_id`.  
      3) `garage_sale_images` by `garage_sale_id`.  
      4) `products` by `garage_sale_id` with `select(...)` (no nested embeds).  
      5) `product_images` by `product_id` for those products; then attach in JS.  
    - Same idea applied to **GET /api/sales** (list), **GET /api/sales/user/:userId**, **POST /api/sales**, **PUT /api/sales/:id** (no embeds; build response from separate queries).
- **Frontend**  
  - **YardSaleDetailPage**: Better error state, retry, and redirect to `/product/:id` when sale fetch fails for a valid UUID (so product links that point at `/sales/:id` still work).
  - **FavoritesPage**: Link product favorites to `/product/:id` instead of `/sales/:saleId` where appropriate.

If the 500 **still** happens after a clean deploy, possibilities:

- Old deployment/cache (Vercel or CDN) still serving previous backend.
- Another route or middleware (e.g. proxy, BFF) still calling Supabase with an embed on `garage_sales`.
- Supabase client or PostgREST version behaving differently (e.g. schema cache).
- A view or RLS policy that changes how PostgREST sees relationships.

---

## 5. Files to Review (In Order)

1. **`routes/garageSales.js`**
   - Ensure **no** `.select()` on `garage_sales` contains:
     - `host:profiles!...`, `profiles(...)`, or any embed of `profiles`.
     - `images:garage_sale_images(...)` or any embed of `garage_sale_images`.
     - `products(...)` or any embed of `products`.
   - For **GET /api/sales/:id**: only `from('garage_sales').select('*').eq('id', id).single()`, then separate queries for host, images, products, product_images; merge in JS.
   - Same pattern for list, user/:userId, POST response, PUT response.

2. **`routes/search.js`**
   - If it queries `garage_sales` with embeds (e.g. host or images), change to separate queries per entity.

3. **`server.js`** (or main app entry)
   - Confirm `/api/sales` is routed to the same `garageSales` router (no duplicate or legacy route that might use embeds).

4. **`api/index.js`** (if Vercel serverless)
   - Same: ensure `/api/sales` and `/api/sales/:id` are handled by the same garage sales route that uses separate queries only.

5. **`frontend/lib/api.ts`**
   - `salesApi.get(id)` should call `GET /api/sales/${id}` (or your actual API base). No client-side Supabase embed logic for garage sales.

6. **`frontend/pages/YardSaleDetailPage.tsx`**
   - Fetches via `salesApi.get(id)`; on failure for a UUID, redirects to `/product/:id`. Good to keep; focus backend so 500 does not occur.

7. **Supabase**
   - Check for **views** (e.g. `public_garage_sales`, `public_products`) that might add FKs or relationships visible to PostgREST.
   - Optional: in Supabase dashboard, open the API docs and see which relationships PostgREST reports for `garage_sales` (and products). That can confirm ambiguity.

---

## 6. What “Done” Looks Like

- `GET /api/sales/<valid-uuid>` returns **200** with a JSON object that includes:
  - Garage sale fields.
  - `host` (object or null).
  - `images` (array of garage_sale_images).
  - `image` (primary or first image URL).
  - `products` (array of products, each with its own `images` / `image` if desired).
- No 500 and no PostgREST error in logs.
- UI shows the sale detail (no "Event Not Found") when opening a sale from search, favorites, or profile.

---

## 7. Quick Verification Checklist

- [ ] In `routes/garageSales.js`, no `.select(...)` on `garage_sales` includes `, host:...` or `, images:...` or `, products(...)`.
- [ ] In `routes/garageSales.js`, GET /api/sales/:id uses exactly: one `garage_sales` select('*'), then separate queries for host, garage_sale_images, products, product_images; response built in JS.
- [ ] Search and any other route that return garage sales also use no embeds on `garage_sales`.
- [ ] Redeploy with cache clear (e.g. Vercel “Clear cache and redeploy”) and test with a real sale UUID from the DB.
- [ ] If 500 persists: check Vercel/server logs for the exact error message and stack; confirm the request hits the updated `garageSales.js` (e.g. add a temporary log line and redeploy).

---

## 8. Copy-Paste Snippet (Intended Pattern for GET /api/sales/:id)

Backend should follow this pattern (conceptually):

```javascript
// 1) Sale only
const { data: saleData, error: saleError } = await req.supabase
  .from('garage_sales')
  .select('*')
  .eq('id', id)
  .single();
if (saleError || !saleData) { /* 404 or 500 */ }

// 2) Host
let host = null;
if (saleData.host_id) {
  const { data: h } = await req.supabase.from('profiles').select('id, name, avatar_url, ...').eq('id', saleData.host_id).single();
  host = h;
}

// 3) Garage sale images
const { data: images } = await req.supabase
  .from('garage_sale_images')
  .select('id, url, is_primary, order_index')
  .eq('garage_sale_id', id)
  .order('order_index', { ascending: true });

// 4) Products (no nested embed)
const { data: products } = await req.supabase
  .from('products')
  .select('id, title, description, price, ...')
  .eq('garage_sale_id', id)
  .eq('status', 'active');

// 5) Product images (separate query, then attach to products in JS)
// ...

res.json({ ...saleData, host, images: images || [], products: productsWithImages });
```

No `products(...)` or `host:profiles!...` or `images:garage_sale_images(...)` inside a `.from('garage_sales').select(...)`.

Use this document plus the files above to fully remove embeds and fix the 500.
