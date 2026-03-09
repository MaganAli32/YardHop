# YardFront Extension

Load in Chrome via **chrome://extensions** → Load unpacked → select this folder.

## Token refresh (FIX 4)

In `background/service-worker.js`, set **SUPABASE_URL** and **SUPABASE_ANON_KEY** to the same values as your frontend `.env`:

- `VITE_SUPABASE_URL` → `SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` → `SUPABASE_ANON_KEY`

Without these, 401s will not auto-refresh and users will be prompted to sign in again when the access token expires.

## Testing

1. Reload the extension in chrome://extensions.
2. **eBay search** (`ebay.com/sch/i.html?_nkw=furniture`) → inline badges (check console for `YF: scrapeEbaySearch running`).
3. **Amazon search** (`amazon.com/s?k=furniture`) → inline badges.
4. **Amazon product page** → badge within 30s or quick fallback.
5. After 1+ hour, token should auto-refresh without re-login.
6. Service worker console: right-click extension → Inspect service worker.
