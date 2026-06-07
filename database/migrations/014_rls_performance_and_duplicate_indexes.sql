-- ============================================================
-- RLS PERFORMANCE + DUPLICATE INDEXES
-- Fixes: auth_rls_initplan, multiple_permissive_policies, duplicate_index
-- Run after 013. Use (select auth.uid()) so auth is evaluated once per query.
-- ============================================================

-- ============================================================
-- 1. DROP DUPLICATE INDEXES (keep _id suffixed; drop older names)
-- ============================================================
DROP INDEX IF EXISTS public.idx_cart_items_user;
DROP INDEX IF EXISTS public.idx_favorites_user;
DROP INDEX IF EXISTS public.idx_messages_conversation;
DROP INDEX IF EXISTS public.idx_products_seller;
DROP INDEX IF EXISTS public.idx_reviews_reviewee;

-- ============================================================
-- 2. DROP DUPLICATE / UMBRELLA POLICIES (so we have one per role+action)
-- ============================================================

-- cart_items: drop umbrella so only specific SELECT/INSERT/UPDATE/DELETE remain
DROP POLICY IF EXISTS "Users can manage own cart" ON public.cart_items;

-- favorites: drop duplicates (keep "view", "add", "remove")
DROP POLICY IF EXISTS "Users can manage own favorites" ON public.favorites;
DROP POLICY IF EXISTS "favorites_select_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_insert_own" ON public.favorites;
DROP POLICY IF EXISTS "favorites_delete_own" ON public.favorites;
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.favorites;

-- community_post_images
DROP POLICY IF EXISTS "Authors can manage post images" ON public.community_post_images;
DROP POLICY IF EXISTS "Community post images are viewable by everyone" ON public.community_post_images;

-- community_posts
DROP POLICY IF EXISTS "Community posts are viewable by everyone" ON public.community_posts;
DROP POLICY IF EXISTS "Users can create community posts" ON public.community_posts;

-- conversation_participants
DROP POLICY IF EXISTS "Users can view own conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add themselves to conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update own participation" ON public.conversation_participants;

-- conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

-- messages
DROP POLICY IF EXISTS "Users can view their conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can view messages in conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages to conversations" ON public.messages;
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;

-- order_items
DROP POLICY IF EXISTS "Users can view own order items" ON public.order_items;
DROP POLICY IF EXISTS "Order items can be inserted with order" ON public.order_items;

-- orders
DROP POLICY IF EXISTS "Buyers can create orders" ON public.orders;
DROP POLICY IF EXISTS "Buyers and sellers can update orders" ON public.orders;

-- post_comments
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Post comments are viewable by everyone" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.post_comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.post_comments;

-- post_likes
DROP POLICY IF EXISTS "Users can manage own likes" ON public.post_likes;
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON public.post_likes;

-- price_analyses
DROP POLICY IF EXISTS "Users can manage own price analyses" ON public.price_analyses;

-- product_images
DROP POLICY IF EXISTS "product_images_insert_own" ON public.product_images;
DROP POLICY IF EXISTS "product_images_delete_own" ON public.product_images;
DROP POLICY IF EXISTS "product_images_select_all" ON public.product_images;

-- products: drop 006-style and snake_case duplicates
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;
DROP POLICY IF EXISTS "products_select_all" ON public.products;
DROP POLICY IF EXISTS "products_insert_own" ON public.products;
DROP POLICY IF EXISTS "products_update_own" ON public.products;
DROP POLICY IF EXISTS "products_delete_own" ON public.products;
DROP POLICY IF EXISTS "Users can create products" ON public.products;
DROP POLICY IF EXISTS "Sellers can update own products" ON public.products;
DROP POLICY IF EXISTS "Sellers can delete own products" ON public.products;
DROP POLICY IF EXISTS "Authenticated users can create products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;

-- profiles
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;

-- reviews
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON public.reviews;

-- garage_sales: drop 006-style and umbrella duplicates
DROP POLICY IF EXISTS "Garage sales are viewable by everyone" ON public.garage_sales;
DROP POLICY IF EXISTS "Users can insert own garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Users can update own garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Users can delete own garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "garage_sales_select_all" ON public.garage_sales;
DROP POLICY IF EXISTS "garage_sales_insert_own" ON public.garage_sales;
DROP POLICY IF EXISTS "garage_sales_update_own" ON public.garage_sales;
DROP POLICY IF EXISTS "garage_sales_delete_own" ON public.garage_sales;
DROP POLICY IF EXISTS "Hosts can cancel own garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Hosts can create garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Authenticated users can create garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Garage sales are viewable" ON public.garage_sales;
DROP POLICY IF EXISTS "Hosts can update own garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Hosts can delete own garage sales" ON public.garage_sales;

-- garage_sale_images: drop umbrella and duplicates
DROP POLICY IF EXISTS "Sale hosts can manage images" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Hosts can manage garage sale images" ON public.garage_sale_images;
DROP POLICY IF EXISTS "garage_sale_images_insert_own" ON public.garage_sale_images;
DROP POLICY IF EXISTS "garage_sale_images_delete_own" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Garage sale images are viewable by everyone" ON public.garage_sale_images;
DROP POLICY IF EXISTS "garage_sale_images_select_all" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Hosts can insert garage sale images" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Hosts can update garage sale images" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Hosts can delete garage sale images" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Garage sale images are viewable" ON public.garage_sale_images;

-- ============================================================
-- 3. RECREATE CANONICAL POLICIES WITH (select auth.uid()) FOR INIT PLAN
-- ============================================================

-- ----- PROFILES -----
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK ((select auth.uid()) = id);

-- Service role (no auth.uid() change)
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
CREATE POLICY "Service role can insert profiles"
  ON public.profiles FOR INSERT TO service_role
  WITH CHECK (true);

-- ----- PRODUCTS -----
DROP POLICY IF EXISTS "Active products are viewable by everyone" ON public.products;
CREATE POLICY "Active products are viewable by everyone"
  ON public.products FOR SELECT
  USING (status IN ('active', 'sold', 'reserved'));

CREATE POLICY "Authenticated users can create products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = seller_id);

CREATE POLICY "Sellers can update own products"
  ON public.products FOR UPDATE
  USING ((select auth.uid()) = seller_id)
  WITH CHECK ((select auth.uid()) = seller_id);

CREATE POLICY "Sellers can delete own products"
  ON public.products FOR DELETE
  USING ((select auth.uid()) = seller_id);

-- ----- PRODUCT IMAGES -----
DROP POLICY IF EXISTS "Product images are viewable" ON public.product_images;
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON public.product_images;
DROP POLICY IF EXISTS "Product owners can insert images" ON public.product_images;
DROP POLICY IF EXISTS "Product owners can update images" ON public.product_images;
DROP POLICY IF EXISTS "Product owners can delete images" ON public.product_images;
CREATE POLICY "Product images are viewable"
  ON public.product_images FOR SELECT
  USING (true);

CREATE POLICY "Product owners can insert images"
  ON public.product_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.seller_id = (select auth.uid())
    )
  );

CREATE POLICY "Product owners can update images"
  ON public.product_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.seller_id = (select auth.uid())
    )
  );

CREATE POLICY "Product owners can delete images"
  ON public.product_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.products
      WHERE products.id = product_images.product_id
      AND products.seller_id = (select auth.uid())
    )
  );

-- ----- GARAGE SALES -----
DROP POLICY IF EXISTS "Garage sales are viewable" ON public.garage_sales;
DROP POLICY IF EXISTS "Authenticated users can create garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Hosts can update own garage sales" ON public.garage_sales;
DROP POLICY IF EXISTS "Hosts can delete own garage sales" ON public.garage_sales;
CREATE POLICY "Garage sales are viewable"
  ON public.garage_sales FOR SELECT
  USING (status IN ('upcoming', 'active', 'completed'));

CREATE POLICY "Authenticated users can create garage sales"
  ON public.garage_sales FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can update own garage sales"
  ON public.garage_sales FOR UPDATE
  USING ((select auth.uid()) = host_id)
  WITH CHECK ((select auth.uid()) = host_id);

CREATE POLICY "Hosts can delete own garage sales"
  ON public.garage_sales FOR DELETE
  USING ((select auth.uid()) = host_id);

-- ----- GARAGE SALE IMAGES -----
DROP POLICY IF EXISTS "Garage sale images are viewable" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Hosts can insert garage sale images" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Hosts can update garage sale images" ON public.garage_sale_images;
DROP POLICY IF EXISTS "Hosts can delete garage sale images" ON public.garage_sale_images;
CREATE POLICY "Garage sale images are viewable"
  ON public.garage_sale_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.status IN ('upcoming', 'active', 'completed')
    )
  );

CREATE POLICY "Hosts can insert garage sale images"
  ON public.garage_sale_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.host_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can update garage sale images"
  ON public.garage_sale_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.host_id = (select auth.uid())
    )
  );

CREATE POLICY "Hosts can delete garage sale images"
  ON public.garage_sale_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.host_id = (select auth.uid())
    )
  );

-- ----- FAVORITES -----
DROP POLICY IF EXISTS "Users can view own favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can add favorites" ON public.favorites;
DROP POLICY IF EXISTS "Users can remove favorites" ON public.favorites;
CREATE POLICY "Users can view own favorites"
  ON public.favorites FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add favorites"
  ON public.favorites FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove favorites"
  ON public.favorites FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----- CART ITEMS -----
DROP POLICY IF EXISTS "Users can view own cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can add to cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update cart items" ON public.cart_items;
DROP POLICY IF EXISTS "Users can remove from cart" ON public.cart_items;
CREATE POLICY "Users can view own cart"
  ON public.cart_items FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can add to cart"
  ON public.cart_items FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update cart items"
  ON public.cart_items FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can remove from cart"
  ON public.cart_items FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----- ORDERS -----
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
DROP POLICY IF EXISTS "Authenticated users can create orders" ON public.orders;
DROP POLICY IF EXISTS "Order participants can update orders" ON public.orders;
CREATE POLICY "Users can view own orders"
  ON public.orders FOR SELECT
  USING ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id);

CREATE POLICY "Authenticated users can create orders"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = buyer_id);

CREATE POLICY "Order participants can update orders"
  ON public.orders FOR UPDATE
  USING ((select auth.uid()) = buyer_id OR (select auth.uid()) = seller_id);

-- ----- ORDER ITEMS -----
DROP POLICY IF EXISTS "Order participants can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Order creators can add items" ON public.order_items;
CREATE POLICY "Order participants can view order items"
  ON public.order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND (orders.buyer_id = (select auth.uid()) OR orders.seller_id = (select auth.uid()))
    )
  );

CREATE POLICY "Order creators can add items"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders
      WHERE orders.id = order_items.order_id
      AND orders.buyer_id = (select auth.uid())
    )
  );

-- ----- CONVERSATIONS -----
DROP POLICY IF EXISTS "Participants can view conversations" ON public.conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON public.conversations;
CREATE POLICY "Participants can view conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Authenticated users can create conversations"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ----- CONVERSATION PARTICIPANTS -----
DROP POLICY IF EXISTS "Participants can view participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can join conversations" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can update own participant record" ON public.conversation_participants;
CREATE POLICY "Participants can view participants"
  ON public.conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Users can join conversations"
  ON public.conversation_participants FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own participant record"
  ON public.conversation_participants FOR UPDATE
  USING ((select auth.uid()) = user_id);

-- ----- MESSAGES -----
DROP POLICY IF EXISTS "Participants can view messages" ON public.messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.messages;
CREATE POLICY "Participants can view messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = (select auth.uid())
    )
  );

-- ----- COMMUNITY POSTS -----
DROP POLICY IF EXISTS "Active posts are viewable" ON public.community_posts;
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON public.community_posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.community_posts;
CREATE POLICY "Active posts are viewable"
  ON public.community_posts FOR SELECT
  USING (status = 'active');

CREATE POLICY "Authenticated users can create posts"
  ON public.community_posts FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = author_id);

CREATE POLICY "Authors can update own posts"
  ON public.community_posts FOR UPDATE
  USING ((select auth.uid()) = author_id)
  WITH CHECK ((select auth.uid()) = author_id);

CREATE POLICY "Authors can delete own posts"
  ON public.community_posts FOR DELETE
  USING ((select auth.uid()) = author_id);

-- ----- COMMUNITY POST IMAGES -----
DROP POLICY IF EXISTS "Post images are viewable" ON public.community_post_images;
DROP POLICY IF EXISTS "Authors can insert post images" ON public.community_post_images;
DROP POLICY IF EXISTS "Authors can delete post images" ON public.community_post_images;
CREATE POLICY "Post images are viewable"
  ON public.community_post_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts
      WHERE community_posts.id = community_post_images.post_id
      AND community_posts.status = 'active'
    )
  );

CREATE POLICY "Authors can insert post images"
  ON public.community_post_images FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.community_posts
      WHERE community_posts.id = community_post_images.post_id
      AND community_posts.author_id = (select auth.uid())
    )
  );

CREATE POLICY "Authors can delete post images"
  ON public.community_post_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts
      WHERE community_posts.id = community_post_images.post_id
      AND community_posts.author_id = (select auth.uid())
    )
  );

-- ----- POST LIKES -----
DROP POLICY IF EXISTS "Likes are viewable" ON public.post_likes;
DROP POLICY IF EXISTS "Users can like posts" ON public.post_likes;
DROP POLICY IF EXISTS "Users can unlike posts" ON public.post_likes;
CREATE POLICY "Likes are viewable"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "Users can like posts"
  ON public.post_likes FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can unlike posts"
  ON public.post_likes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----- POST COMMENTS -----
DROP POLICY IF EXISTS "Comments are viewable" ON public.post_comments;
DROP POLICY IF EXISTS "Users can comment" ON public.post_comments;
DROP POLICY IF EXISTS "Authors can delete comments" ON public.post_comments;
CREATE POLICY "Comments are viewable"
  ON public.post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.community_posts
      WHERE community_posts.id = post_comments.post_id
      AND community_posts.status = 'active'
    )
  );

CREATE POLICY "Users can comment"
  ON public.post_comments FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = author_id);

CREATE POLICY "Authors can delete comments"
  ON public.post_comments FOR DELETE
  USING ((select auth.uid()) = author_id);

-- ----- REVIEWS -----
DROP POLICY IF EXISTS "Reviews are viewable" ON public.reviews;
CREATE POLICY "Reviews are viewable"
  ON public.reviews FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = reviewer_id);

-- ----- PRICE ANALYSES -----
DROP POLICY IF EXISTS "Users can view own analyses" ON public.price_analyses;
DROP POLICY IF EXISTS "Users can create analyses" ON public.price_analyses;
CREATE POLICY "Users can view own analyses"
  ON public.price_analyses FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create analyses"
  ON public.price_analyses FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id OR user_id IS NULL);

-- ----- SAVED SEARCHES -----
DROP POLICY IF EXISTS "Users can view own saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Users can create saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Users can update saved searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Users can delete saved searches" ON public.saved_searches;
CREATE POLICY "Users can view own saved searches"
  ON public.saved_searches FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create saved searches"
  ON public.saved_searches FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update saved searches"
  ON public.saved_searches FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete saved searches"
  ON public.saved_searches FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----- RECENT SEARCHES -----
DROP POLICY IF EXISTS "Users can view own recent searches" ON public.recent_searches;
DROP POLICY IF EXISTS "Users can create recent searches" ON public.recent_searches;
DROP POLICY IF EXISTS "Users can delete recent searches" ON public.recent_searches;
CREATE POLICY "Users can view own recent searches"
  ON public.recent_searches FOR SELECT
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create recent searches"
  ON public.recent_searches FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete recent searches"
  ON public.recent_searches FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ----- AI USAGE -----
DROP POLICY IF EXISTS "Users can view own AI usage" ON public.ai_usage;
CREATE POLICY "Users can view own AI usage"
  ON public.ai_usage FOR SELECT
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own AI usage" ON public.ai_usage;
CREATE POLICY "Users can insert own AI usage"
  ON public.ai_usage FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service role can insert AI usage" ON public.ai_usage;
CREATE POLICY "Service role can insert AI usage"
  ON public.ai_usage FOR INSERT TO service_role
  WITH CHECK (true);
