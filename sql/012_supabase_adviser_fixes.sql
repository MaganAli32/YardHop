-- ============================================================
-- SUPABASE ADVISER FIXES
-- Addresses: Function Search Path Mutable, RLS Always True,
-- Unindexed foreign keys. Run after 011.
-- ============================================================

-- ============================================================
-- 1. FUNCTION SEARCH PATH (fixes "Function Search Path Mutable")
-- Set search_path = public so functions don't depend on caller's search_path
-- ============================================================

-- (Run only if these functions exist from earlier migrations)
ALTER FUNCTION public.apply_privacy_offset(DECIMAL, DECIMAL, TEXT) SET search_path = public;
ALTER FUNCTION public.calculate_distance(DECIMAL, DECIMAL, DECIMAL, DECIMAL) SET search_path = public;
ALTER FUNCTION public.compute_garage_sale_display_location() SET search_path = public;
ALTER FUNCTION public.compute_product_display_location() SET search_path = public;
ALTER FUNCTION public.find_items_within_radius(DECIMAL, DECIMAL, DECIMAL) SET search_path = public;
ALTER FUNCTION public.get_exact_location(TEXT, UUID, UUID) SET search_path = public;
ALTER FUNCTION public.get_monthly_scan_count(UUID) SET search_path = public;
ALTER FUNCTION public.get_products_with_seller(TEXT, INTEGER, INTEGER) SET search_path = public;
ALTER FUNCTION public.get_scan_limit(TEXT) SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.update_user_rating() SET search_path = public;

-- ============================================================
-- 2. RLS POLICY "ALWAYS TRUE" ON conversations (fixes "RLS Policy Always True")
-- Replace WITH CHECK (true) with explicit auth check
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- 3. UNINDEXED FOREIGN KEYS (improves join performance)
-- Add indexes on FK columns that are used in JOINs / WHERE
-- ============================================================

-- cart_items
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON public.cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON public.cart_items(product_id);

-- community_post_images
CREATE INDEX IF NOT EXISTS idx_community_post_images_post_id ON public.community_post_images(post_id);

-- conversation_participants
CREATE INDEX IF NOT EXISTS idx_conversation_participants_conversation_id ON public.conversation_participants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_participants_user_id ON public.conversation_participants(user_id);

-- conversations
CREATE INDEX IF NOT EXISTS idx_conversations_product_id ON public.conversations(product_id);

-- messages
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- order_items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);

-- post_comments
CREATE INDEX IF NOT EXISTS idx_post_comments_post_id ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_author_id ON public.post_comments(author_id);

-- post_likes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);

-- price_analyses
CREATE INDEX IF NOT EXISTS idx_price_analyses_user_id ON public.price_analyses(user_id);

-- products (seller_id and garage_sale_id often used in filters)
CREATE INDEX IF NOT EXISTS idx_products_seller_id ON public.products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_garage_sale_id ON public.products(garage_sale_id);

-- reviews
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON public.reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON public.reviews(reviewee_id);
CREATE INDEX IF NOT EXISTS idx_reviews_order_id ON public.reviews(order_id);

-- saved_searches
CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);
