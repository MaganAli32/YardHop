# Beta Launch Checklist

Use this list to confirm the app is ready before going live.

## Pre-launch (local / staging)

- [ ] **Build** – `npm run build` completes without errors
- [ ] **Env** – `.env` has all required vars (see `.env.example`). Backend needs `SUPABASE_URL`, `SUPABASE_ANON_KEY`; optional: `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, Stripe keys
- [ ] **Auth** – Sign up, login, and logout work
- [ ] **Search** – Browse items and events (garage sales) after login
- [ ] **Product detail** – Open a listing; images, price, location, seller show correctly
- [ ] **Create listing** – Create a listing with photo and location; it appears in search
- [ ] **Create garage sale** – Create an event with photos and address; it appears in events
- [ ] **Favorites** – Add/remove favorites
- [ ] **Cart & checkout** – Add to cart and complete checkout (Stripe test/live as configured)
- [ ] **Inbox** – Start a conversation from a listing; messages load

## Production deployment

- [ ] **Host** – Deploy backend (e.g. Railway, Render, or VPS). Frontend can be served by same server or a static host
- [ ] **Env in production** – Set all production env vars on the host (no `.env` file in repo)
- [ ] **Supabase** – RLS and migrations applied; storage buckets and policies correct
- [ ] **Stripe** – Use live keys in production; set webhook URL to `https://yourdomain.com/api/payments/webhook`
- [ ] **CORS** – Set `CORS_ORIGIN` / `ALLOWED_ORIGINS` to your production domain(s)
- [ ] **Frontend API base** – If frontend is on a different domain, set `VITE_API_BASE` (or equivalent) to the production API URL and rebuild

## Optional / nice-to-have

- [ ] **Domain & SSL** – Custom domain with HTTPS
- [ ] **Monitoring** – Logs or error tracking (e.g. Sentry)
- [ ] **Backups** – Supabase backups or export strategy

## If something breaks

- Check server logs and browser console
- Confirm env vars (especially Supabase and Stripe) in the environment where the app runs
- See `DEPLOYMENT_GUIDE.md` for deployment and env details
