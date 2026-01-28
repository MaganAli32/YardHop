import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { supabase } from '../lib/supabase';

/**
 * Handles OAuth callback navigation after successful authentication.
 * Also handles OAuth errors and extracts session from URL hash.
 */
const AuthCallbackHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [oauthError, setOauthError] = useState<string | null>(null);
  
  // Use persistence context - it's safe since we're inside PersistenceProvider in App.tsx
  const { user, loading } = usePersistence();

  useEffect(() => {
    // Check for OAuth errors in URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    const error = urlParams.get('error') || hashParams.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
    
    if (error) {
      console.error('OAuth error detected:', error, errorDescription);
      setOauthError(errorDescription || error);
      
      // Clean up URL
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, '', cleanUrl);
      
      // Redirect to login with error
      navigate('/login', { 
        replace: true,
        state: { oauthError: errorDescription || error }
      });
      return;
    }

    // Handle OAuth callback - Supabase should have already processed the hash
    // But we need to ensure the session is extracted
    if (window.location.hash && supabase) {
      const hash = window.location.hash;
      // Check if hash contains OAuth callback data
      if (hash.includes('access_token') || hash.includes('code')) {
        // Supabase should handle this automatically with detectSessionInUrl: true
        // But we can verify the session was created
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('OAuth callback processed, session created');
            // Clean up URL hash
            window.history.replaceState({}, '', window.location.pathname);
          }
        });
      }
    }
  }, []);

  useEffect(() => {
    // Wait for auth state to load
    if (loading) return;

    // If user is authenticated and on login/signup page, redirect
    // But let LoginPage handle its own redirect logic to respect 'from' path
    // Only redirect if we're on signup page (not login, as login handles its own redirect)
    if (user && location.pathname === '/signup') {
      const from = (location.state as any)?.from?.pathname || '/search';
      navigate(from, { replace: true });
    }
    // Don't redirect from login page - let LoginPage handle it
    // This allows LoginPage to respect the 'from' path properly
  }, [user, loading, location.pathname, location.state, navigate]);

  return null;
};

export default AuthCallbackHandler;







