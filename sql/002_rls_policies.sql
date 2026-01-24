-- ============================================================
-- YARDHOP ROW LEVEL SECURITY POLICIES
-- Run this AFTER 001_schema.sql
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
DROP POLICY IF EXISTS "Users can delete own profile" ON profiles;
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- Users can insert their own profile (for signup trigger)
-- This allows the handle_new_user() trigger to create profiles
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Service role can insert profiles (for trigger function)
-- This ensures the SECURITY DEFINER trigger function can create profiles
DROP POLICY IF EXISTS "Service role can insert profiles" ON profiles;
CREATE POLICY "Service role can insert profiles"
  ON profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================
-- PRODUCTS
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
DROP POLICY IF EXISTS "Active products are viewable by everyone" ON products;
CREATE POLICY "Active products are viewable by everyone"
  ON products FOR SELECT
  USING (status IN ('active', 'sold', 'reserved'));

-- Authenticated users can create products
DROP POLICY IF EXISTS "Authenticated users can create products" ON products;
CREATE POLICY "Authenticated users can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own products
DROP POLICY IF EXISTS "Sellers can update own products" ON products;
CREATE POLICY "Sellers can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own products
DROP POLICY IF EXISTS "Sellers can delete own products" ON products;
CREATE POLICY "Sellers can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = seller_id);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images for visible products
-- Simplified policy to avoid nested query issues
DROP POLICY IF EXISTS "Product images are viewable" ON product_images;
CREATE POLICY "Product images are viewable"
  ON product_images FOR SELECT
  USING (true); -- Allow viewing all images (security handled at product level)

-- Product owners can manage images
DROP POLICY IF EXISTS "Product owners can insert images" ON product_images;
CREATE POLICY "Product owners can insert images"
  ON product_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Product owners can update images" ON product_images;
CREATE POLICY "Product owners can update images"
  ON product_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.seller_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Product owners can delete images" ON product_images;
CREATE POLICY "Product owners can delete images"
  ON product_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.seller_id = auth.uid()
    )
  );

-- ============================================================
-- GARAGE SALES
-- ============================================================
ALTER TABLE garage_sales ENABLE ROW LEVEL SECURITY;

-- Anyone can view upcoming/active garage sales
DROP POLICY IF EXISTS "Garage sales are viewable" ON garage_sales;
CREATE POLICY "Garage sales are viewable"
  ON garage_sales FOR SELECT
  USING (status IN ('upcoming', 'active', 'completed'));

-- Authenticated users can create garage sales
DROP POLICY IF EXISTS "Authenticated users can create garage sales" ON garage_sales;
CREATE POLICY "Authenticated users can create garage sales"
  ON garage_sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own garage sales
DROP POLICY IF EXISTS "Hosts can update own garage sales" ON garage_sales;
CREATE POLICY "Hosts can update own garage sales"
  ON garage_sales FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Hosts can delete their own garage sales
DROP POLICY IF EXISTS "Hosts can delete own garage sales" ON garage_sales;
CREATE POLICY "Hosts can delete own garage sales"
  ON garage_sales FOR DELETE
  USING (auth.uid() = host_id);

-- ============================================================
-- GARAGE SALE IMAGES
-- ============================================================
ALTER TABLE garage_sale_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view garage sale images
DROP POLICY IF EXISTS "Garage sale images are viewable" ON garage_sale_images;
CREATE POLICY "Garage sale images are viewable"
  ON garage_sale_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.status IN ('upcoming', 'active', 'completed')
    )
  );

-- Hosts can manage their garage sale images
DROP POLICY IF EXISTS "Hosts can insert garage sale images" ON garage_sale_images;
CREATE POLICY "Hosts can insert garage sale images"
  ON garage_sale_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can update garage sale images" ON garage_sale_images;
CREATE POLICY "Hosts can update garage sale images"
  ON garage_sale_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.host_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Hosts can delete garage sale images" ON garage_sale_images;
CREATE POLICY "Hosts can delete garage sale images"
  ON garage_sale_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.host_id = auth.uid()
    )
  );

-- ============================================================
-- FAVORITES
-- ============================================================
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Users can only see their own favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own favorites
DROP POLICY IF EXISTS "Users can add favorites" ON favorites;
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own favorites
DROP POLICY IF EXISTS "Users can remove favorites" ON favorites;
CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- CART ITEMS
-- ============================================================
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cart
DROP POLICY IF EXISTS "Users can view own cart" ON cart_items;
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own cart
DROP POLICY IF EXISTS "Users can add to cart" ON cart_items;
CREATE POLICY "Users can add to cart"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart items
DROP POLICY IF EXISTS "Users can update cart items" ON cart_items;
CREATE POLICY "Users can update cart items"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own cart
DROP POLICY IF EXISTS "Users can remove from cart" ON cart_items;
CREATE POLICY "Users can remove from cart"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- ORDERS
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Authenticated users can create orders
DROP POLICY IF EXISTS "Authenticated users can create orders" ON orders;
CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers and sellers can update orders
DROP POLICY IF EXISTS "Order participants can update orders" ON orders;
CREATE POLICY "Order participants can update orders"
  ON orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Order participants can view order items
DROP POLICY IF EXISTS "Order participants can view order items" ON order_items;
CREATE POLICY "Order participants can view order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND (orders.buyer_id = auth.uid() OR orders.seller_id = auth.uid())
    )
  );

-- Order creators can add items
DROP POLICY IF EXISTS "Order creators can add items" ON order_items;
CREATE POLICY "Order creators can add items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.buyer_id = auth.uid()
    )
  );

-- ============================================================
-- CONVERSATIONS
-- ============================================================
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- Participants can view their conversations
DROP POLICY IF EXISTS "Participants can view conversations" ON conversations;
CREATE POLICY "Participants can view conversations"
  ON conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Authenticated users can create conversations
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Participants can view conversation participants
DROP POLICY IF EXISTS "Participants can view participants" ON conversation_participants;
CREATE POLICY "Participants can view participants"
  ON conversation_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

-- Authenticated users can add themselves to conversations
DROP POLICY IF EXISTS "Users can join conversations" ON conversation_participants;
CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own participant record
DROP POLICY IF EXISTS "Users can update own participant record" ON conversation_participants;
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversation participants can view messages
DROP POLICY IF EXISTS "Participants can view messages" ON messages;
CREATE POLICY "Participants can view messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- Participants can send messages
DROP POLICY IF EXISTS "Participants can send messages" ON messages;
CREATE POLICY "Participants can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = messages.conversation_id
      AND conversation_participants.user_id = auth.uid()
    )
  );

-- ============================================================
-- COMMUNITY POSTS
-- ============================================================
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active posts
DROP POLICY IF EXISTS "Active posts are viewable" ON community_posts;
CREATE POLICY "Active posts are viewable"
  ON community_posts FOR SELECT
  USING (status = 'active');

-- Authenticated users can create posts
DROP POLICY IF EXISTS "Authenticated users can create posts" ON community_posts;
CREATE POLICY "Authenticated users can create posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their posts
DROP POLICY IF EXISTS "Authors can update own posts" ON community_posts;
CREATE POLICY "Authors can update own posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their posts
DROP POLICY IF EXISTS "Authors can delete own posts" ON community_posts;
CREATE POLICY "Authors can delete own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- COMMUNITY POST IMAGES
-- ============================================================
ALTER TABLE community_post_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view post images
DROP POLICY IF EXISTS "Post images are viewable" ON community_post_images;
CREATE POLICY "Post images are viewable"
  ON community_post_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_posts
      WHERE community_posts.id = community_post_images.post_id
      AND community_posts.status = 'active'
    )
  );

-- Authors can manage their post images
DROP POLICY IF EXISTS "Authors can insert post images" ON community_post_images;
CREATE POLICY "Authors can insert post images"
  ON community_post_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM community_posts
      WHERE community_posts.id = community_post_images.post_id
      AND community_posts.author_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Authors can delete post images" ON community_post_images;
CREATE POLICY "Authors can delete post images"
  ON community_post_images FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM community_posts
      WHERE community_posts.id = community_post_images.post_id
      AND community_posts.author_id = auth.uid()
    )
  );

-- ============================================================
-- POST LIKES
-- ============================================================
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

-- Anyone can see likes
DROP POLICY IF EXISTS "Likes are viewable" ON post_likes;
CREATE POLICY "Likes are viewable"
  ON post_likes FOR SELECT
  USING (true);

-- Users can like posts
DROP POLICY IF EXISTS "Users can like posts" ON post_likes;
CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike posts
DROP POLICY IF EXISTS "Users can unlike posts" ON post_likes;
CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- POST COMMENTS
-- ============================================================
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on active posts
DROP POLICY IF EXISTS "Comments are viewable" ON post_comments;
CREATE POLICY "Comments are viewable"
  ON post_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM community_posts
      WHERE community_posts.id = post_comments.post_id
      AND community_posts.status = 'active'
    )
  );

-- Authenticated users can comment
DROP POLICY IF EXISTS "Users can comment" ON post_comments;
CREATE POLICY "Users can comment"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their comments
DROP POLICY IF EXISTS "Authors can delete comments" ON post_comments;
CREATE POLICY "Authors can delete comments"
  ON post_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
DROP POLICY IF EXISTS "Reviews are viewable" ON reviews;
CREATE POLICY "Reviews are viewable"
  ON reviews FOR SELECT
  USING (true);

-- Authenticated users can create reviews
DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- PRICE ANALYSES
-- ============================================================
ALTER TABLE price_analyses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
DROP POLICY IF EXISTS "Users can view own analyses" ON price_analyses;
CREATE POLICY "Users can view own analyses"
  ON price_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create analyses
DROP POLICY IF EXISTS "Users can create analyses" ON price_analyses;
CREATE POLICY "Users can create analyses"
  ON price_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- SAVED SEARCHES
-- ============================================================
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved searches
DROP POLICY IF EXISTS "Users can view own saved searches" ON saved_searches;
CREATE POLICY "Users can view own saved searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create saved searches
DROP POLICY IF EXISTS "Users can create saved searches" ON saved_searches;
CREATE POLICY "Users can create saved searches"
  ON saved_searches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own saved searches
DROP POLICY IF EXISTS "Users can update saved searches" ON saved_searches;
CREATE POLICY "Users can update saved searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own saved searches
DROP POLICY IF EXISTS "Users can delete saved searches" ON saved_searches;
CREATE POLICY "Users can delete saved searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- RECENT SEARCHES
-- ============================================================
ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recent searches
DROP POLICY IF EXISTS "Users can view own recent searches" ON recent_searches;
CREATE POLICY "Users can view own recent searches"
  ON recent_searches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create recent searches
DROP POLICY IF EXISTS "Users can create recent searches" ON recent_searches;
CREATE POLICY "Users can create recent searches"
  ON recent_searches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own recent searches
DROP POLICY IF EXISTS "Users can delete recent searches" ON recent_searches;
CREATE POLICY "Users can delete recent searches"
  ON recent_searches FOR DELETE
  USING (auth.uid() = user_id);
