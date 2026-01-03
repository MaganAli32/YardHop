// Express server for YardHop - serves API routes and static frontend
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import cors from 'cors';
import { createRequire } from 'module';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';

// Load environment variables from .env and .env.local
dotenv.config(); // Load .env
dotenv.config({ path: '.env.local', override: true }); // Load .env.local with override

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security Middleware [SECURITY]
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration [CRITICAL] [SECURITY]
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000'];
  
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1 || NODE_ENV === 'development') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Compression Middleware
app.use(compression());

// Request Logging [SECURITY]
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// Rate Limiting [SECURITY]
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const aiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit AI endpoints to 10 requests per minute
  message: 'Too many AI requests, please try again later.',
  skip: (req) => {
    // Skip rate limiting for authenticated users in development
    return NODE_ENV === 'development';
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth endpoints to 5 requests per 15 minutes
  message: 'Too many authentication attempts, please try again later.',
});

app.use('/api', generalLimiter);
app.use('/api/ai', aiLimiter);

// Body Parsing Middleware
app.use(express.json({ limit: '50mb' })); // For image uploads
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Import API route handlers
import { createSupabaseAdmin } from './api/lib/supabase.js';
import { requireAuth } from './server-utils/auth.js';
import { analyzeImage, suggestPrice, generateDescription } from './api/lib/ai.js';
import { validateProduct, validateGarageSale, validateEmail } from './server-utils/validation.js';

// API Routes

// Products API
app.get('/api/products', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { category, minPrice, maxPrice, isSteal, lat, lng, radius, sortBy } = req.query;

    let query = supabase
      .from('products')
      .select(`
        *,
        seller:profiles(id, name, avatar_url, verified),
        images:product_images(url, is_primary, order_index)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (category) query = query.eq('category', category);
    if (minPrice) query = query.gte('price', parseFloat(minPrice));
    if (maxPrice) query = query.lte('price', parseFloat(maxPrice));
    if (isSteal === 'true') query = query.eq('is_steal', true);
    if (sortBy === 'price') query = query.order('price', { ascending: true });

    const { data, error } = await query;
    if (error) throw error;

    const products = (data || []).map((p) => ({
      id: p.id,
      title: p.title,
      price: parseFloat(p.price),
      originalPrice: p.original_price ? parseFloat(p.original_price) : undefined,
      market_average: p.market_average ? parseFloat(p.market_average) : undefined,
      isSteal: p.is_steal,
      stealPercentage: p.steal_percentage,
      image: p.images?.find((img) => img.is_primary)?.url || p.images?.[0]?.url || '',
      images: p.images?.map((img) => img.url).sort((a, b) => {
        const aImg = p.images?.find((img) => img.url === a);
        const bImg = p.images?.find((img) => img.url === b);
        return (aImg?.order_index || 0) - (bImg?.order_index || 0);
      }),
      location: p.location,
      tags: p.tags || [],
      description: p.description,
      specs: p.condition ? { Condition: p.condition } : undefined,
      sellerName: p.seller?.name,
      sellerAvatar: p.seller?.avatar_url,
      isVerified: p.seller?.verified,
      isFeatured: p.is_featured,
      quantity: p.quantity,
    }));

    res.json(products);
  } catch (error) {
    console.error('Products fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { id } = req.params;

    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        seller:profiles(id, name, avatar_url, verified, bio),
        images:product_images(url, is_primary, order_index)
      `)
      .eq('id', id)
      .eq('status', 'active')
      .single();

    if (error || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Increment view count
    await supabase
      .from('products')
      .update({ view_count: (product.view_count || 0) + 1 })
      .eq('id', id);

    const transformedProduct = {
      id: product.id,
      title: product.title,
      price: parseFloat(product.price),
      originalPrice: product.original_price ? parseFloat(product.original_price) : undefined,
      market_average: product.market_average ? parseFloat(product.market_average) : undefined,
      isSteal: product.is_steal,
      stealPercentage: product.steal_percentage,
      image: product.images?.find((img) => img.is_primary)?.url || product.images?.[0]?.url || '',
      images: product.images?.map((img) => img.url).sort((a, b) => {
        const aImg = product.images?.find((img) => img.url === a);
        const bImg = product.images?.find((img) => img.url === b);
        return (aImg?.order_index || 0) - (bImg?.order_index || 0);
      }),
      location: product.location,
      tags: product.tags || [],
      description: product.description,
      specs: product.condition ? { Condition: product.condition } : undefined,
      sellerName: product.seller?.name,
      sellerAvatar: product.seller?.avatar_url,
      isVerified: product.seller?.verified,
      isFeatured: product.is_featured,
      quantity: product.quantity,
      viewCount: product.view_count,
    };

    res.json(transformedProduct);
  } catch (error) {
    console.error('Product fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch product' });
  }
});

app.post('/api/products', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const body = req.body;

    // Input validation [SECURITY]
    const validationErrors = validateProduct(body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors: validationErrors });
    }

    // Limit products per user to prevent spam [SECURITY]
    const { count } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('seller_id', user.id)
      .eq('status', 'active');

    if (count && count >= 100) {
      return res.status(400).json({ error: 'Maximum number of active listings reached (100)' });
    }

    const { data: product, error } = await supabase
      .from('products')
      .insert({
        seller_id: user.id,
        title: body.title,
        description: body.description,
        price: body.price,
        original_price: body.originalPrice,
        market_average: body.market_average,
        is_steal: body.isSteal,
        steal_percentage: body.stealPercentage,
        condition: body.condition,
        category: body.category,
        tags: body.tags || [],
        location: body.location,
        latitude: body.latitude,
        longitude: body.longitude,
        quantity: body.quantity || 1,
      })
      .select()
      .single();

    if (error) throw error;

    if (body.images && body.images.length > 0) {
      await supabase.from('product_images').insert(
        body.images.map((url, index) => ({
          product_id: product.id,
          url,
          is_primary: index === 0,
          order_index: index,
        }))
      );
    }

    res.status(201).json({ id: product.id, ...product });
  } catch (error) {
    console.error('Product creation error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to create product',
    });
  }
});

// AI API Routes
app.post('/api/ai/analyze-image', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    const items = await analyzeImage(imageBase64, mimeType || 'image/jpeg');
    res.json({ items });
  } catch (error) {
    console.error('Analyze image error:', error);
    res.status(500).json({ error: error.message || 'Failed to analyze image' });
  }
});

app.post('/api/ai/suggest-price', async (req, res) => {
  try {
    const { title, description, condition, category } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const result = await suggestPrice(title, description, condition, category);
    res.json(result);
  } catch (error) {
    console.error('Suggest price error:', error);
    res.status(500).json({ error: error.message || 'Failed to suggest price' });
  }
});

app.post('/api/ai/generate-description', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 is required' });
    }
    const result = await generateDescription(imageBase64, mimeType || 'image/jpeg');
    res.json(result);
  } catch (error) {
    console.error('Generate description error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate description' });
  }
});

// Garage Sales API
app.get('/api/sales', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { date, lat, lng, radius } = req.query;

    let query = supabase
      .from('garage_sales')
      .select(`
        *,
        host:profiles(id, name, avatar_url),
        images:garage_sale_images(url, is_primary)
      `)
      .order('start_date', { ascending: true });

    if (date === 'today') {
      query = query.eq('start_date', new Date().toISOString().split('T')[0]);
    }

    const { data, error } = await query;
    if (error) throw error;

    const sales = (data || []).map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      date: s.start_date,
      time: `${s.start_time} - ${s.end_time}`,
      image: s.images?.find((img) => img.is_primary)?.url || s.images?.[0]?.url || '',
      tags: s.tags || [],
      address: s.address,
      hostName: s.host?.name,
    }));

    res.json(sales);
  } catch (error) {
    console.error('Garage sales fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch garage sales' });
  }
});

app.get('/api/sales/:id', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { id } = req.params;

    const { data: sale, error } = await supabase
      .from('garage_sales')
      .select(`
        *,
        host:profiles(id, name, avatar_url, verified),
        images:garage_sale_images(url, is_primary)
      `)
      .eq('id', id)
      .single();

    if (error || !sale) {
      return res.status(404).json({ error: 'Garage sale not found' });
    }

    res.json({
      id: sale.id,
      title: sale.title,
      description: sale.description,
      date: sale.start_date,
      time: `${sale.start_time} - ${sale.end_time}`,
      image: sale.images?.find((img) => img.is_primary)?.url || sale.images?.[0]?.url || '',
      images: sale.images?.map((img) => img.url),
      tags: sale.tags || [],
      address: sale.address,
      hostName: sale.host?.name,
      hostAvatar: sale.host?.avatar_url,
    });
  } catch (error) {
    console.error('Garage sale fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch garage sale' });
  }
});

app.post('/api/sales', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const body = req.body;

    // Input validation [SECURITY]
    const validationErrors = validateGarageSale(body);
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: 'Validation failed', errors: validationErrors });
    }

    const { data: sale, error } = await supabase
      .from('garage_sales')
      .insert({
        host_id: user.id,
        title: body.title,
        description: body.description,
        address: body.address,
        start_date: body.start_date,
        end_date: body.end_date,
        start_time: body.start_time,
        end_time: body.end_time,
        tags: body.tags || [],
        is_multi_family: body.is_multi_family || false,
      })
      .select()
      .single();

    if (error) throw error;

    if (body.images && body.images.length > 0) {
      await supabase.from('garage_sale_images').insert(
        body.images.map((url, index) => ({
          garage_sale_id: sale.id,
          url,
          is_primary: index === 0,
        }))
      );
    }

    res.status(201).json(sale);
  } catch (error) {
    console.error('Garage sale creation error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to create garage sale',
    });
  }
});

// Favorites API
app.get('/api/favorites', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();

    const { data: favorites, error } = await supabase
      .from('favorites')
      .select(`
        *,
        product:products(
          *,
          seller:profiles(id, name, avatar_url, verified),
          images:product_images(url, is_primary, order_index)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const products = (favorites || []).map((f) => {
      const p = f.product;
      return {
        id: p.id,
        title: p.title,
        price: parseFloat(p.price),
        image: p.images?.find((img) => img.is_primary)?.url || p.images?.[0]?.url || '',
        location: p.location,
        sellerName: p.seller?.name,
      };
    });

    res.json(products);
  } catch (error) {
    console.error('Favorites fetch error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to fetch favorites',
    });
  }
});

app.post('/api/favorites/:productId', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { productId } = req.params;

    const { error } = await supabase
      .from('favorites')
      .insert({
        user_id: user.id,
        product_id: productId,
      });

    if (error) throw error;
    res.status(201).json({ message: 'Added to favorites' });
  } catch (error) {
    console.error('Favorite add error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to add favorite',
    });
  }
});

app.delete('/api/favorites/:productId', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { productId } = req.params;

    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) throw error;
    res.json({ message: 'Removed from favorites' });
  } catch (error) {
    console.error('Favorite remove error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to remove favorite',
    });
  }
});

// Cart API
app.get('/api/cart', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();

    const { data: cartItems, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        product:products(
          *,
          seller:profiles(id, name, avatar_url),
          images:product_images(url, is_primary)
        )
      `)
      .eq('user_id', user.id);

    if (error) throw error;

    const items = (cartItems || []).map((item) => {
      const p = item.product;
      return {
        id: item.id,
        productId: p.id,
        quantity: item.quantity,
        product: {
          id: p.id,
          title: p.title,
          price: parseFloat(p.price),
          image: p.images?.find((img) => img.is_primary)?.url || p.images?.[0]?.url || '',
          location: p.location,
        },
      };
    });

    res.json(items);
  } catch (error) {
    console.error('Cart fetch error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to fetch cart',
    });
  }
});

app.post('/api/cart/:productId', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { productId } = req.params;
    const { quantity = 1 } = req.body;

    const { error } = await supabase
      .from('cart_items')
      .upsert({
        user_id: user.id,
        product_id: productId,
        quantity,
      }, {
        onConflict: 'user_id,product_id'
      });

    if (error) throw error;
    res.status(201).json({ message: 'Added to cart' });
  } catch (error) {
    console.error('Cart add error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to add to cart',
    });
  }
});

app.delete('/api/cart/:productId', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { productId } = req.params;

    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', user.id)
      .eq('product_id', productId);

    if (error) throw error;
    res.json({ message: 'Removed from cart' });
  } catch (error) {
    console.error('Cart remove error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to remove from cart',
    });
  }
});

// Orders API
app.get('/api/orders', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();

    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          *,
          product:products(id, title, images:product_images(url, is_primary))
        )
      `)
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(orders || []);
  } catch (error) {
    console.error('Orders fetch error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to fetch orders',
    });
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { items, totalAmount, meetupLocation, meetupTime, notes } = req.body;

    // Get cart items
    const { data: cartItems } = await supabase
      .from('cart_items')
      .select('*, product:products(*)')
      .eq('user_id', user.id);

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Create order
    const sellerId = cartItems[0].product.seller_id;
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        buyer_id: user.id,
        seller_id: sellerId,
        total_amount: totalAmount,
        meetup_location: meetupLocation,
        meetup_time: meetupTime,
        notes,
        status: 'pending',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price_at_purchase: item.product.price,
    }));

    await supabase.from('order_items').insert(orderItems);

    // Clear cart
    await supabase.from('cart_items').delete().eq('user_id', user.id);

    res.status(201).json(order);
  } catch (error) {
    console.error('Order creation error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to create order',
    });
  }
});

// Conversations/Messaging API
app.get('/api/conversations', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();

    const { data: conversations, error } = await supabase
      .from('conversation_participants')
      .select(`
        *,
        conversation:conversations(
          *,
          product:products(id, title, price, images:product_images(url, is_primary))
        )
      `)
      .eq('user_id', user.id)
      .order('conversation.updated_at', { ascending: false });

    if (error) throw error;

    const formatted = (conversations || []).map((cp) => ({
      id: cp.conversation.id,
      productId: cp.conversation.product_id,
      productTitle: cp.conversation.product?.title,
      productImage: cp.conversation.product?.images?.[0]?.url,
      productPrice: cp.conversation.product?.price,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Conversations fetch error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to fetch conversations',
    });
  }
});

app.get('/api/conversations/:id', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { id } = req.params;

    // Verify user is participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('*, sender:profiles(id, name, avatar_url)')
      .eq('conversation_id', id)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const formatted = (messages || []).map((m) => ({
      id: m.id,
      senderId: m.sender_id,
      senderName: m.sender?.name,
      text: m.content,
      timestamp: m.created_at,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Messages fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
});

app.post('/api/conversations/:id/messages', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { id } = req.params;
    const { content } = req.body;

    // Verify user is participant
    const { data: participant } = await supabase
      .from('conversation_participants')
      .select('*')
      .eq('conversation_id', id)
      .eq('user_id', user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'Not a participant' });
    }

    const { data: message, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: id,
        sender_id: user.id,
        content,
      })
      .select()
      .single();

    if (error) throw error;

    // Update conversation updated_at
    await supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id);

    res.status(201).json(message);
  } catch (error) {
    console.error('Message send error:', error);
    res.status(500).json({ error: error.message || 'Failed to send message' });
  }
});

// Community Posts API
app.get('/api/community', async (req, res) => {
  try {
    const supabase = createSupabaseAdmin();
    const { type } = req.query;

    let query = supabase
      .from('community_posts')
      .select(`
        *,
        author:profiles(id, name, avatar_url),
        images:community_post_images(url)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (type) {
      query = query.eq('type', type);
    }

    const { data: posts, error } = await query;
    if (error) throw error;

    // Get likes and comments counts
    const postIds = (posts || []).map((p) => p.id);
    const [likesData, commentsData] = await Promise.all([
      supabase.from('post_likes').select('post_id').in('post_id', postIds),
      supabase.from('post_comments').select('post_id').in('post_id', postIds),
    ]);

    const formatted = (posts || []).map((p) => ({
      id: p.id,
      authorName: p.author?.name,
      authorAvatar: p.author?.avatar_url,
      type: p.type,
      title: p.title,
      content: p.content,
      location: p.location,
      images: p.images?.map((img) => img.url),
      likes: likesData.data?.filter((l) => l.post_id === p.id).length || 0,
      comments: commentsData.data?.filter((c) => c.post_id === p.id).length || 0,
      timestamp: p.created_at,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Community posts fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch posts' });
  }
});

app.post('/api/community', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { type, title, content, location, images } = req.body;

    const { data: post, error } = await supabase
      .from('community_posts')
      .insert({
        author_id: user.id,
        type,
        title,
        content,
        location,
      })
      .select()
      .single();

    if (error) throw error;

    if (images && images.length > 0) {
      await supabase.from('community_post_images').insert(
        images.map((url) => ({
          post_id: post.id,
          url,
        }))
      );
    }

    res.status(201).json(post);
  } catch (error) {
    console.error('Post creation error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to create post',
    });
  }
});

// Image Upload API (to Supabase Storage) [SECURITY]
app.post('/api/upload', async (req, res) => {
  try {
    const user = await requireAuth(req);
    const supabase = createSupabaseAdmin();
    const { imageBase64, bucket, fileName } = req.body;

    // Input validation [SECURITY]
    if (!imageBase64 || !bucket) {
      return res.status(400).json({ error: 'imageBase64 and bucket are required' });
    }

    // Validate bucket name [SECURITY]
    const allowedBuckets = ['product-images', 'garage-sale-images', 'community-post-images', 'profile-avatars'];
    if (!allowedBuckets.includes(bucket)) {
      return res.status(400).json({ error: 'Invalid bucket name' });
    }

    // Validate base64 format [SECURITY]
    const base64Regex = /^data:image\/(jpeg|jpg|png|webp);base64,/;
    const base64Data = imageBase64.startsWith('data:') 
      ? imageBase64.split(',')[1] 
      : imageBase64;

    // Validate file size (5MB limit) [SECURITY]
    const buffer = Buffer.from(base64Data, 'base64');
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (buffer.length > maxSize) {
      return res.status(400).json({ error: 'File size exceeds 5MB limit' });
    }

    // Validate file type by magic numbers [SECURITY]
    const jpegSignature = Buffer.from([0xFF, 0xD8, 0xFF]);
    const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47]);
    const webpSignature = Buffer.from('RIFF', 'ascii');
    
    const isValidImage = buffer.slice(0, 3).equals(jpegSignature) ||
                        buffer.slice(0, 4).equals(pngSignature) ||
                        buffer.toString('ascii', 0, 4) === 'RIFF';
    
    if (!isValidImage) {
      return res.status(400).json({ error: 'Invalid image file type. Only JPEG, PNG, and WebP are allowed' });
    }

    // Generate unique filename [SECURITY]
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 15);
    const safeFileName = fileName 
      ? fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
      : `${timestamp}_${randomStr}.jpg`;
    const filePath = `${user.id}/${safeFileName}`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
        cacheControl: '3600',
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    res.json({ url: urlData.publicUrl, path: filePath });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(error.message === 'Unauthorized' ? 401 : 500).json({
      error: error.message || 'Failed to upload image',
    });
  }
});

// Health Check Endpoint [CRITICAL]
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Error Handling Middleware [CRITICAL]
app.use((err, req, res, next) => {
  // Skip if headers already sent
  if (res.headersSent) {
    return next(err);
  }

  console.error('Error:', err);
  
  // Don't expose error details in production
  if (NODE_ENV === 'production') {
    res.status(err.status || 500).json({
      error: 'An error occurred',
    });
  } else {
    res.status(err.status || 500).json({
      error: err.message || 'An error occurred',
      stack: err.stack,
    });
  }
});

// Serve static files from dist directory (built frontend)
app.use(express.static(join(__dirname, 'dist')));

// Fallback: serve index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Graceful Shutdown [CRITICAL]
const server = app.listen(PORT, () => {
  console.log(`🚀 YardHop server running on port ${PORT}`);
  console.log(`📍 http://localhost:${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

