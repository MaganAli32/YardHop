-- YardFront Database Schema for Supabase
-- Copy ALL the SQL below (from this line to the end) and paste into Supabase SQL Editor

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Note: PostGIS extension (for advanced geospatial queries) is optional
-- Uncomment the line below only if you need advanced location features
-- CREATE EXTENSION IF NOT EXISTS "postgis";

-- Profiles (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  bio TEXT,
  location TEXT,
  avatar_url TEXT,
  role TEXT CHECK (role IN ('Buyer', 'Seller', 'Collector', 'Neighbor')) DEFAULT 'Buyer',
  verified BOOLEAN DEFAULT FALSE,
  safe_meet_only BOOLEAN DEFAULT TRUE,
  notifications_enabled BOOLEAN DEFAULT TRUE,
  rating_average DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products/Listings
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2),
  market_average DECIMAL(10,2),
  is_steal BOOLEAN DEFAULT FALSE,
  steal_percentage INTEGER,
  condition TEXT CHECK (condition IN ('New', 'Like New', 'Good', 'Fair', 'Project Piece')),
  category TEXT,
  tags TEXT[],
  location TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  quantity INTEGER DEFAULT 1,
  status TEXT CHECK (status IN ('active', 'sold', 'reserved', 'deleted')) DEFAULT 'active',
  is_featured BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  garage_sale_id UUID REFERENCES garage_sales(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Product Images
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garage Sales
CREATE TABLE IF NOT EXISTS garage_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  start_date DATE NOT NULL,
  end_date DATE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  tags TEXT[],
  is_multi_family BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('upcoming', 'active', 'completed', 'cancelled')) DEFAULT 'upcoming',
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Garage Sale Images
CREATE TABLE IF NOT EXISTS garage_sale_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  garage_sale_id UUID REFERENCES garage_sales(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Favorites
CREATE TABLE IF NOT EXISTS favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Cart Items
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- Orders
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id UUID REFERENCES profiles(id),
  seller_id UUID REFERENCES profiles(id),
  status TEXT CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')) DEFAULT 'pending',
  total_amount DECIMAL(10,2) NOT NULL,
  meetup_location TEXT,
  meetup_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Order Items
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INTEGER DEFAULT 1,
  price_at_purchase DECIMAL(10,2) NOT NULL
);

-- Chats/Conversations
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation Participants
CREATE TABLE IF NOT EXISTS conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ,
  UNIQUE(conversation_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Posts
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('Free', 'Announcement', 'Event', 'Question', 'Lost & Found')) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  location TEXT,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  status TEXT CHECK (status IN ('active', 'resolved', 'deleted')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Community Post Images
CREATE TABLE IF NOT EXISTS community_post_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Post Likes
CREATE TABLE IF NOT EXISTS post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

-- Post Comments
CREATE TABLE IF NOT EXISTS post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES community_posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reviews/Ratings
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  reviewee_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Price History (for analytics)
CREATE TABLE IF NOT EXISTS price_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id),
  image_url TEXT,
  detected_items JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_seller ON products(seller_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_garage_sale ON products(garage_sale_id);
CREATE INDEX IF NOT EXISTS idx_garage_sales_date ON garage_sales(start_date);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_user ON cart_items(user_id);

-- Row Level Security (RLS) Policies [CRITICAL] [SECURITY]

-- Enable RLS on ALL tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE garage_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE garage_sale_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_post_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_analyses ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read all, update own, insert via trigger only
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Products: Public read for active items, owner-only write
DROP POLICY IF EXISTS "Products are viewable by everyone" ON products;
CREATE POLICY "Products are viewable by everyone" ON products
  FOR SELECT USING (status != 'deleted');

DROP POLICY IF EXISTS "Users can create products" ON products;
CREATE POLICY "Users can create products" ON products
  FOR INSERT WITH CHECK (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can update own products" ON products;
CREATE POLICY "Sellers can update own products" ON products
  FOR UPDATE USING (auth.uid() = seller_id);

DROP POLICY IF EXISTS "Sellers can delete own products" ON products;
CREATE POLICY "Sellers can delete own products" ON products
  FOR DELETE USING (auth.uid() = seller_id);

-- Product Images: Public read, owner write
DROP POLICY IF EXISTS "Product images are viewable by everyone" ON product_images;
CREATE POLICY "Product images are viewable by everyone" ON product_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND status != 'deleted')
  );

DROP POLICY IF EXISTS "Sellers can manage product images" ON product_images;
CREATE POLICY "Sellers can manage product images" ON product_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM products WHERE id = product_id AND seller_id = auth.uid())
  );

-- Garage Sales: Public read, host-only write
DROP POLICY IF EXISTS "Garage sales are viewable by everyone" ON garage_sales;
CREATE POLICY "Garage sales are viewable by everyone" ON garage_sales
  FOR SELECT USING (status != 'cancelled');

DROP POLICY IF EXISTS "Hosts can create garage sales" ON garage_sales;
CREATE POLICY "Hosts can create garage sales" ON garage_sales
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update own garage sales" ON garage_sales;
CREATE POLICY "Hosts can update own garage sales" ON garage_sales
  FOR UPDATE USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can cancel own garage sales" ON garage_sales;
CREATE POLICY "Hosts can cancel own garage sales" ON garage_sales
  FOR DELETE USING (auth.uid() = host_id);

-- Garage Sale Images: Public read, host write
DROP POLICY IF EXISTS "Garage sale images are viewable by everyone" ON garage_sale_images;
CREATE POLICY "Garage sale images are viewable by everyone" ON garage_sale_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM garage_sales WHERE id = garage_sale_id AND status != 'cancelled')
  );

DROP POLICY IF EXISTS "Hosts can manage garage sale images" ON garage_sale_images;
CREATE POLICY "Hosts can manage garage sale images" ON garage_sale_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM garage_sales WHERE id = garage_sale_id AND host_id = auth.uid())
  );

-- Favorites: Private to user
DROP POLICY IF EXISTS "Users can manage own favorites" ON favorites;
CREATE POLICY "Users can manage own favorites" ON favorites
  FOR ALL USING (auth.uid() = user_id);

-- Cart: Private to user
DROP POLICY IF EXISTS "Users can manage own cart" ON cart_items;
CREATE POLICY "Users can manage own cart" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- Orders: Buyer and seller can view their own orders
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
CREATE POLICY "Users can view own orders" ON orders
  FOR SELECT USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

DROP POLICY IF EXISTS "Buyers can create orders" ON orders;
CREATE POLICY "Buyers can create orders" ON orders
  FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers and sellers can update orders" ON orders;
CREATE POLICY "Buyers and sellers can update orders" ON orders
  FOR UPDATE USING (auth.uid() = buyer_id OR auth.uid() = seller_id);

-- Order Items: Same access as orders
DROP POLICY IF EXISTS "Users can view own order items" ON order_items;
CREATE POLICY "Users can view own order items" ON order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id
      AND (buyer_id = auth.uid() OR seller_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Order items can be inserted with order" ON order_items;
CREATE POLICY "Order items can be inserted with order" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE id = order_id
      AND buyer_id = auth.uid()
    )
  );

-- Conversations: Participants only
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations" ON conversations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = conversations.id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

-- Conversation Participants: Participants only
DROP POLICY IF EXISTS "Users can view own conversation participants" ON conversation_participants;
CREATE POLICY "Users can view own conversation participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      WHERE cp.conversation_id = conversation_participants.conversation_id
      AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can add themselves to conversations" ON conversation_participants;
CREATE POLICY "Users can add themselves to conversations" ON conversation_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own participation" ON conversation_participants;
CREATE POLICY "Users can update own participation" ON conversation_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Messages: Participants can read/write
DROP POLICY IF EXISTS "Users can view messages in conversations" ON messages;
CREATE POLICY "Users can view messages in conversations" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can send messages to conversations" ON messages;
CREATE POLICY "Users can send messages to conversations" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_id = messages.conversation_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own messages" ON messages;
CREATE POLICY "Users can update own messages" ON messages
  FOR UPDATE USING (auth.uid() = sender_id);

-- Community Posts: Public read for active, author write
DROP POLICY IF EXISTS "Community posts are viewable by everyone" ON community_posts;
CREATE POLICY "Community posts are viewable by everyone" ON community_posts
  FOR SELECT USING (status = 'active');

DROP POLICY IF EXISTS "Users can create community posts" ON community_posts;
CREATE POLICY "Users can create community posts" ON community_posts
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own posts" ON community_posts;
CREATE POLICY "Authors can update own posts" ON community_posts
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own posts" ON community_posts;
CREATE POLICY "Authors can delete own posts" ON community_posts
  FOR DELETE USING (auth.uid() = author_id);

-- Community Post Images: Public read, author write
DROP POLICY IF EXISTS "Community post images are viewable by everyone" ON community_post_images;
CREATE POLICY "Community post images are viewable by everyone" ON community_post_images
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM community_posts WHERE id = post_id AND status = 'active')
  );

DROP POLICY IF EXISTS "Authors can manage post images" ON community_post_images;
CREATE POLICY "Authors can manage post images" ON community_post_images
  FOR ALL USING (
    EXISTS (SELECT 1 FROM community_posts WHERE id = post_id AND author_id = auth.uid())
  );

-- Post Likes: Public read, authenticated write
DROP POLICY IF EXISTS "Post likes are viewable by everyone" ON post_likes;
CREATE POLICY "Post likes are viewable by everyone" ON post_likes
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage own likes" ON post_likes;
CREATE POLICY "Users can manage own likes" ON post_likes
  FOR ALL USING (auth.uid() = user_id);

-- Post Comments: Public read, authenticated write
DROP POLICY IF EXISTS "Post comments are viewable by everyone" ON post_comments;
CREATE POLICY "Post comments are viewable by everyone" ON post_comments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM community_posts WHERE id = post_id AND status = 'active')
  );

DROP POLICY IF EXISTS "Users can create comments" ON post_comments;
CREATE POLICY "Users can create comments" ON post_comments
  FOR INSERT WITH CHECK (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can update own comments" ON post_comments;
CREATE POLICY "Authors can update own comments" ON post_comments
  FOR UPDATE USING (auth.uid() = author_id);

DROP POLICY IF EXISTS "Authors can delete own comments" ON post_comments;
CREATE POLICY "Authors can delete own comments" ON post_comments
  FOR DELETE USING (auth.uid() = author_id);

-- Reviews: Public read, authenticated write (no self-reviews)
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can create reviews" ON reviews;
CREATE POLICY "Users can create reviews" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND reviewer_id != reviewee_id
  );

DROP POLICY IF EXISTS "Reviewers can update own reviews" ON reviews;
CREATE POLICY "Reviewers can update own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

DROP POLICY IF EXISTS "Reviewers can delete own reviews" ON reviews;
CREATE POLICY "Reviewers can delete own reviews" ON reviews
  FOR DELETE USING (auth.uid() = reviewer_id);

-- Price Analyses: Private to user only
DROP POLICY IF EXISTS "Users can manage own price analyses" ON price_analyses;
CREATE POLICY "Users can manage own price analyses" ON price_analyses
  FOR ALL USING (auth.uid() = user_id);

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
