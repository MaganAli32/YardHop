-- ============================================================
-- YARDHOP ROW LEVEL SECURITY POLICIES
-- Run this AFTER 001_schema.sql
-- ============================================================

-- ============================================================
-- PROFILES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Anyone can view profiles
CREATE POLICY "Profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can delete their own profile
CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = id);

-- ============================================================
-- PRODUCTS
-- ============================================================
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Anyone can view active products
CREATE POLICY "Active products are viewable by everyone"
  ON products FOR SELECT
  USING (status IN ('active', 'sold', 'reserved'));

-- Authenticated users can create products
CREATE POLICY "Authenticated users can create products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can update their own products
CREATE POLICY "Sellers can update own products"
  ON products FOR UPDATE
  USING (auth.uid() = seller_id)
  WITH CHECK (auth.uid() = seller_id);

-- Sellers can delete their own products
CREATE POLICY "Sellers can delete own products"
  ON products FOR DELETE
  USING (auth.uid() = seller_id);

-- ============================================================
-- PRODUCT IMAGES
-- ============================================================
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view product images for visible products
CREATE POLICY "Product images are viewable"
  ON product_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.status IN ('active', 'sold', 'reserved')
    )
  );

-- Product owners can manage images
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

CREATE POLICY "Product owners can update images"
  ON product_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_images.product_id
      AND products.seller_id = auth.uid()
    )
  );

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
CREATE POLICY "Garage sales are viewable"
  ON garage_sales FOR SELECT
  USING (status IN ('upcoming', 'active', 'completed'));

-- Authenticated users can create garage sales
CREATE POLICY "Authenticated users can create garage sales"
  ON garage_sales FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = host_id);

-- Hosts can update their own garage sales
CREATE POLICY "Hosts can update own garage sales"
  ON garage_sales FOR UPDATE
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

-- Hosts can delete their own garage sales
CREATE POLICY "Hosts can delete own garage sales"
  ON garage_sales FOR DELETE
  USING (auth.uid() = host_id);

-- ============================================================
-- GARAGE SALE IMAGES
-- ============================================================
ALTER TABLE garage_sale_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view garage sale images
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

CREATE POLICY "Hosts can update garage sale images"
  ON garage_sale_images FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM garage_sales
      WHERE garage_sales.id = garage_sale_images.garage_sale_id
      AND garage_sales.host_id = auth.uid()
    )
  );

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
CREATE POLICY "Users can view own favorites"
  ON favorites FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own favorites
CREATE POLICY "Users can add favorites"
  ON favorites FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own favorites
CREATE POLICY "Users can remove favorites"
  ON favorites FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- CART ITEMS
-- ============================================================
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Users can only see their own cart
CREATE POLICY "Users can view own cart"
  ON cart_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can add to their own cart
CREATE POLICY "Users can add to cart"
  ON cart_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own cart items
CREATE POLICY "Users can update cart items"
  ON cart_items FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can remove from their own cart
CREATE POLICY "Users can remove from cart"
  ON cart_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- ORDERS
-- ============================================================
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Buyers and sellers can view their own orders
CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Authenticated users can create orders
CREATE POLICY "Authenticated users can create orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers and sellers can update orders
CREATE POLICY "Order participants can update orders"
  ON orders FOR UPDATE
  USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- ============================================================
-- ORDER ITEMS
-- ============================================================
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Order participants can view order items
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
CREATE POLICY "Authenticated users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- CONVERSATION PARTICIPANTS
-- ============================================================
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Participants can view conversation participants
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
CREATE POLICY "Users can join conversations"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own participant record
CREATE POLICY "Users can update own participant record"
  ON conversation_participants FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================
-- MESSAGES
-- ============================================================
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversation participants can view messages
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
CREATE POLICY "Active posts are viewable"
  ON community_posts FOR SELECT
  USING (status = 'active');

-- Authenticated users can create posts
CREATE POLICY "Authenticated users can create posts"
  ON community_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authors can update their posts
CREATE POLICY "Authors can update own posts"
  ON community_posts FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their posts
CREATE POLICY "Authors can delete own posts"
  ON community_posts FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- COMMUNITY POST IMAGES
-- ============================================================
ALTER TABLE community_post_images ENABLE ROW LEVEL SECURITY;

-- Anyone can view post images
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
CREATE POLICY "Likes are viewable"
  ON post_likes FOR SELECT
  USING (true);

-- Users can like posts
CREATE POLICY "Users can like posts"
  ON post_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can unlike posts
CREATE POLICY "Users can unlike posts"
  ON post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- POST COMMENTS
-- ============================================================
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- Anyone can view comments on active posts
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
CREATE POLICY "Users can comment"
  ON post_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- Authors can delete their comments
CREATE POLICY "Authors can delete comments"
  ON post_comments FOR DELETE
  USING (auth.uid() = author_id);

-- ============================================================
-- REVIEWS
-- ============================================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view reviews
CREATE POLICY "Reviews are viewable"
  ON reviews FOR SELECT
  USING (true);

-- Authenticated users can create reviews
CREATE POLICY "Users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = reviewer_id);

-- ============================================================
-- PRICE ANALYSES
-- ============================================================
ALTER TABLE price_analyses ENABLE ROW LEVEL SECURITY;

-- Users can only see their own analyses
CREATE POLICY "Users can view own analyses"
  ON price_analyses FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can create analyses
CREATE POLICY "Users can create analyses"
  ON price_analyses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================
-- SAVED SEARCHES
-- ============================================================
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own saved searches
CREATE POLICY "Users can view own saved searches"
  ON saved_searches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create saved searches
CREATE POLICY "Users can create saved searches"
  ON saved_searches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update own saved searches
CREATE POLICY "Users can update saved searches"
  ON saved_searches FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete own saved searches
CREATE POLICY "Users can delete saved searches"
  ON saved_searches FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================
-- RECENT SEARCHES
-- ============================================================
ALTER TABLE recent_searches ENABLE ROW LEVEL SECURITY;

-- Users can only see their own recent searches
CREATE POLICY "Users can view own recent searches"
  ON recent_searches FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create recent searches
CREATE POLICY "Users can create recent searches"
  ON recent_searches FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can delete own recent searches
CREATE POLICY "Users can delete recent searches"
  ON recent_searches FOR DELETE
  USING (auth.uid() = user_id);
