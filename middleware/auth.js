/**
 * ============================================================
 * AUTHENTICATION MIDDLEWARE
 * JWT verification and user extraction
 * ============================================================
 */
import { createClient } from '@supabase/supabase-js';

// Helper to get Supabase client (reads env at runtime, not import time)
const getSupabaseClient = (token = null) => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  const options = token
    ? {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    : {};

  return createClient(supabaseUrl, supabaseAnonKey, options);
};

/**
 * Middleware to verify JWT and attach user to request
 * Required for protected routes
 */
export const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'No authorization token provided',
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient(token);

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token',
      });
    }

    req.user = user;
    req.supabase = supabase;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      error: 'Authentication Error',
      message: 'Failed to verify authentication',
    });
  }
};

/**
 * Optional auth middleware - attaches user if token exists but doesn't require it
 */
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      req.supabase = getSupabaseClient();
      return next();
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = getSupabaseClient(token);

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      req.user = null;
      req.supabase = getSupabaseClient();
      return next();
    }

    req.user = user;
    req.supabase = supabase;

    next();
  } catch (error) {
    req.user = null;
    try {
      req.supabase = getSupabaseClient();
    } catch {
      req.supabase = null;
    }
    next();
  }
};

export default { requireAuth, optionalAuth };
