# Running Database Migrations

This guide will help you run the SQL migrations in your Supabase database.

## Migration Files to Run

### 1. `sql/008_add_payment_fields.sql` - Payment Integration
This adds payment fields to the `orders` table for Stripe payment processing.

### 2. `sql/007_fix_garage_sale_images.sql` - Garage Sale Images Fix
This renames `sale_id` to `garage_sale_id` in the `garage_sale_images` table (if needed).

## Steps to Run Migrations in Supabase

1. **Open Supabase Dashboard**
   - Go to [https://app.supabase.com](https://app.supabase.com)
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run Migration 1: Payment Fields**
   - Copy the contents of `sql/008_add_payment_fields.sql`
   - Paste into the SQL Editor
   - Click "Run" (or press Ctrl/Cmd + Enter)
   - Verify you see "Success. No rows returned" or similar success message

4. **Run Migration 2: Garage Sale Images Fix**
   - Copy the contents of `sql/007_fix_garage_sale_images.sql`
   - Paste into the SQL Editor
   - Click "Run"
   - Verify you see "Success. Migration complete!" message

5. **Verify Migrations**
   - Go to "Table Editor" in Supabase
   - Check the `orders` table - you should see new columns:
     - `payment_intent_id`
     - `payment_status`
     - `stripe_payment_id`
     - `shipping_address`
     - `billing_address`
     - etc.
   - Check the `garage_sale_images` table - verify it has `garage_sale_id` column (not `sale_id`)

## Migration Files Contents

The migration files are located in:
- `/sql/008_add_payment_fields.sql`
- `/sql/007_fix_garage_sale_images.sql`

## Troubleshooting

If you get an error:
- **"column already exists"** - The migration has already been run, that's fine
- **"table does not exist"** - You need to run the base schema first (`sql/001_schema.sql`)
- **"permission denied"** - Make sure you're logged in and have admin access to the project

## After Running Migrations

1. Restart your backend server (if running)
2. Test the payment flow:
   - Add items to cart
   - Go to checkout
   - Enter test card: `4242 4242 4242 4242`
   - Complete payment
   - Verify order is created with payment information

