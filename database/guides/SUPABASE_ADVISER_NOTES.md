# Supabase Adviser – What’s Fixed vs Dashboard-Only

## Fixed by migrations (run in order: `011` → `012` → `013` → `014`)

| Issue | Fix |
|-------|-----|
| **Security Definer views** (`public_garage_sales`, `public_products`) | `011_fix_security_invoker_views.sql` – views recreated with `security_invoker = true` |
| **Function search path mutable** (all listed functions) | `012_supabase_adviser_fixes.sql` – `ALTER FUNCTION ... SET search_path = public` |
| **RLS policy always true** (`conversations` INSERT) | `012` and `013` – drop "Users can create conversations" / "Authenticated users…", recreate with `WITH CHECK (auth.uid() IS NOT NULL)` |
| **Unindexed foreign keys** (listed tables) | `012` – `CREATE INDEX IF NOT EXISTS` on FK columns |
| **Extensions in public** (`cube`, `earthdistance`) | `013_extensions_and_conversations_rls.sql` – move both to schema `extensions`; `calculate_distance` set `search_path = public, extensions` |
| **Auth RLS Initialization Plan** (per-row `auth.uid()` re-eval) | `014_rls_performance_and_duplicate_indexes.sql` – all RLS policies use `(select auth.uid())` so auth is evaluated once per query |
| **Multiple permissive policies** (same role+action) | `014` – duplicate/umbrella policies dropped; one canonical policy per table/role/action |
| **Duplicate index** (cart_items, favorites, messages, products, reviews) | `014` – drops `idx_*_user`, `idx_*_conversation`, `idx_*_seller`, `idx_*_reviewee`; keeps `*_user_id`, `*_conversation_id`, etc. |

---

## Fix in Supabase Dashboard (no SQL)

### Leaked password protection disabled (Auth)

Supabase Auth can check passwords against HaveIBeenPwned.org to block compromised passwords.

1. In **Supabase Dashboard**, go to **Authentication** → **Providers** (or **Settings**).
2. Find **“Leaked password protection”** / **“Check passwords against breach database”**.
3. **Enable** it so new signups and password changes reject known-leaked passwords.

---

## Extensions in public (`public.cube`, `public.earthdistance`) – fixed in 013

- **Migration 013** moves `cube` and `earthdistance` into schema `extensions` and sets `calculate_distance` search_path to `public, extensions` so geo functions keep working.

---

## Auth RLS initialization plan – fixed in 014

- Migration **014** updates all RLS policies to use `(select auth.uid())` instead of `auth.uid()`, so the planner evaluates auth once per query (init plan) instead of per row.

---

## Multiple permissive policies – fixed in 014

- Migration **014** drops umbrella/duplicate policies (e.g. “Users can manage own cart”, “Sale hosts can manage images”) and keeps one canonical policy per table/role/action.

---

## Unused index / duplicate index

- **Duplicate index:** Fixed in **014** for `cart_items`, `favorites`, `messages`, `products`, `reviews` (drops redundant index names; keeps `*_user_id`, `*_conversation_id`, etc.).
- **Unused index:** Adviser may still report indexes unused in its observation window. Before dropping, confirm in **Dashboard → Database → Indexes** (or `pg_stat_user_indexes`) that they’re really unused, then drop via SQL or Dashboard.

---

## Summary

1. Run **`011`** → **`012`** → **`013`** → **`014_rls_performance_and_duplicate_indexes.sql`** in the SQL Editor (or your migration flow).
2. In **Authentication** settings, enable **leaked password protection** (see “Fix in Supabase Dashboard” above).
3. After 014, **Auth RLS init**, **multiple permissive policies**, and **duplicate index** are addressed; only **unused index** (if any) remains optional manual cleanup.
