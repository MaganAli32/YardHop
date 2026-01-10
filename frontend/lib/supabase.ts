// Frontend Supabase client
import { createClient } from '@supabase/supabase-js';

// Get from environment variables - these are public keys (anon key)
// but should still be set via env vars for flexibility
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Debug: Log environment variable status (only in dev)
if (import.meta.env.DEV) {
  console.log('Supabase Config Check:', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPreview: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
    keyPreview: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'missing',
  });
}

// Track if Supabase is properly configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co');

// Create a mock Supabase client if env vars are missing (allows app to render)
// The app will work in a degraded mode without authentication
let supabase: ReturnType<typeof createClient> | null = null;

if (supabaseUrl && supabaseAnonKey && supabaseUrl !== 'https://placeholder.supabase.co') {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (error) {
    console.warn('Failed to initialize Supabase client:', error);
  }
} else {
  console.warn('Missing Supabase environment variables. App will run in demo mode without authentication.');
  // Don't create a mock client - return null instead
  supabase = null;
}

export { supabase };
