# YardFront (YardHop)

Local marketplace: browse and sell items, discover garage sales, message sellers, checkout with Stripe.

## Quick start

```bash
# Install
npm install --legacy-peer-deps

# Copy env and add your keys
cp .env.example .env

# Dev: frontend + API
npm run dev          # frontend only (Vite, port 5173)
npm run dev:api      # backend only (Express, port 3000)
npm run dev:full     # both

# Build and run production
npm run build
npm start
```

## Beta launch

- **Checklist** – [BETA_LAUNCH_CHECKLIST.md](./BETA_LAUNCH_CHECKLIST.md)
- **Deploy** – [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)
- **Env** – Copy `.env.example` to `.env` and set Supabase (required), optional: Gemini, Stripe, Maps.

## Stack

- **Frontend:** React, Vite, TypeScript, Tailwind
- **Backend:** Node, Express
- **DB/Auth:** Supabase (Postgres, Auth, Storage)
- **Payments:** Stripe
- **AI:** Google Gemini (price suggestions)

## Scripts

| Command        | Description                    |
|----------------|--------------------------------|
| `npm run dev`  | Frontend dev server (5173)     |
| `npm run dev:api` | Backend API (3000)          |
| `npm run build`| Build frontend → `frontend/dist` |
| `npm start`    | Serve API + static frontend    |
| `npm run deploy` | Build + PM2 start/restart   |
