/**
 * ============================================================
 * YARDHOP BACKEND SERVER
 * Express.js API Server with Supabase Integration
 * Serves API routes and static frontend files
 * ============================================================
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import compression from 'compression';
import morgan from 'morgan';

// Route imports
import authRoutes from './routes/auth.js';
import profileRoutes from './routes/profiles.js';
import productRoutes from './routes/products.js';
import garageSaleRoutes from './routes/garageSales.js';
import favoriteRoutes from './routes/favorites.js';
import cartRoutes from './routes/cart.js';
import orderRoutes from './routes/orders.js';
import messageRoutes from './routes/messages.js';
import communityRoutes from './routes/community.js';
import reviewRoutes from './routes/reviews.js';
import aiRoutes from './routes/ai.js';
import uploadRoutes from './routes/upload.js';
import searchRoutes from './routes/search.js';
import paymentRoutes from './routes/payments.js';

// Load environment variables
dotenv.config();
dotenv.config({ path: '.env.local', override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing required Supabase environment variables');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('   SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  console.error('\n   Please create a .env file in the project root with:');
  console.error('   SUPABASE_URL=https://xxx.supabase.co');
  console.error('   SUPABASE_ANON_KEY=eyJ...');
  process.exit(1);
}

// Public client (respects RLS)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client (bypasses RLS - use carefully!)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null;

// ============================================================
// MIDDLEWARE
// ============================================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "https://use.typekit.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://cdn.tailwindcss.com", "https://unpkg.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:", "https://*.supabase.co"],
      connectSrc: ["'self'", "http://localhost:*", "http://127.0.0.1:*", "ws://localhost:*", "ws://127.0.0.1:*", supabaseUrl, "https://*.supabase.co", "wss://*.supabase.co", "https://generativelanguage.googleapis.com"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
const allowedOrigins = process.env.CORS_ORIGIN?.split(',') || process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || NODE_ENV === 'development') return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression
app.use(compression());

// Request logging
if (NODE_ENV === 'production') {
  app.use(morgan('combined'));
} else {
  app.use(morgan('dev'));
}

// IMPORTANT: Stripe webhook needs raw body for signature verification
// Handle webhook route BEFORE body parsing to preserve raw body for signature verification
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const Stripe = (await import('stripe')).default;
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST;
    const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' }) : null;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !webhookSecret) {
      console.error('Stripe webhook secret not configured');
      return res.status(503).json({ error: 'Webhook not configured' });
    }

    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log('PaymentIntent succeeded:', paymentIntent.id);
        // Update order payment status in database
        // This will be handled by updating the order after frontend confirmation
        break;

      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log('PaymentIntent failed:', failedPayment.id);
        // Update order payment status to failed
        break;

      case 'charge.refunded':
        const refund = event.data.object;
        console.log('Charge refunded:', refund.id);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Body parsing for all other routes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

// ============================================================
// HEALTH CHECK
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'YardFront API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// ============================================================
// API ROUTES
// ============================================================

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', garageSaleRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/messages', messageRoutes);

// Legacy alias for conversations - proxy requests to messages routes
// The messages router has routes like /conversations, so mounting at /api/conversations
// won't work directly. Instead, we'll handle this in the messages router or 
// create a simple proxy. For now, let's just mount messages router which will 
// handle /api/messages/conversations correctly

app.use('/api/community', communityRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/payments', paymentRoutes);

// ============================================================
// STATIC FILE SERVING (Frontend)
// ============================================================

// Serve static files from dist directory (built frontend)
// Must be before the catch-all route to properly serve CSS/JS assets
app.use(express.static(join(__dirname, 'dist'), {
  maxAge: NODE_ENV === 'production' ? '1y' : '0',
  etag: true,
  lastModified: true,
}));

// ============================================================
// ERROR HANDLING
// ============================================================

// 404 handler for API routes (must be after all API routes)
// This catches any unmatched API routes
app.use('/api', (req, res, next) => {
  // If we reach here, no route matched
  // Check if response was already sent (shouldn't happen, but safety check)
  if (res.headersSent) {
    return next();
  }
  res.status(404).json({
    error: 'Not Found',
    message: `API route ${req.method} ${req.originalUrl || req.url || req.path} not found`,
    path: req.path,
    url: req.url,
    originalUrl: req.originalUrl,
  });
});

// Fallback: serve index.html for client-side routing (SPA)
// This should be last to catch all non-API routes
app.get('*', (req, res, next) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return next();
  }
  // Skip static asset requests (they should be handled by express.static above)
  if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/)) {
    return res.status(404).send('Not found');
  }
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  
  // Don't leak error details in production
  const isDev = NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isDev && { stack: err.stack }),
  });
});

// ============================================================
// START SERVER
// ============================================================

const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🏠 YardFront Backend Server                               ║
║                                                           ║
║   ✅ Server running on http://localhost:${PORT}              ║
║   📡 API available at http://localhost:${PORT}/api           ║
║   🔗 Supabase connected: ${supabaseUrl ? '✓' : '✗'}                         ║
║   🌍 Environment: ${NODE_ENV}                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful Shutdown
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

export default app;
