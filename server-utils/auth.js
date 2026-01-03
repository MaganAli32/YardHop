import { createSupabaseAdmin } from '../api/lib/supabase.js';

/**
 * Get authenticated user from Express request headers
 * Extracts Supabase auth token from Authorization header
 */
export async function getAuthenticatedUser(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createSupabaseAdmin();

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

/**
 * Middleware helper to require authentication
 */
export async function requireAuth(req) {
  const user = await getAuthenticatedUser(req);
  
  if (!user) {
    throw new Error('Unauthorized');
  }

  return user;
}


