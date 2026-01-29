import React, { useEffect, useState } from 'react';
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
    const winPath = window.location.pathname || '';
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const pathParams = winPath.startsWith('/') && winPath.includes('=') ? new URLSearchParams(winPath.substring(1)) : null;

    const error = urlParams.get('error') || hashParams.get('error') || pathParams?.get('error');
    const errorDescription = urlParams.get('error_description') || hashParams.get('error_description') || pathParams?.get('error_description');

    if (error) {
      console.error('OAuth error detected:', error, errorDescription);
      setOauthError(errorDescription || error);
      const cleanUrl = window.location.origin + '/#/';
      window.history.replaceState({}, '', cleanUrl);
      navigate('/login', { replace: true, state: { oauthError: errorDescription || error } });
      return;
    }

    // OAuth callback: tokens can be in hash (correct) or in path (wrong redirect from provider)
    const hash = window.location.hash || '';
    const tokensInPath = winPath.includes('access_token');
    const tokensInHash = hash.includes('access_token') || hash.includes('code');

    if (supabase && (tokensInPath || tokensInHash)) {
      if (tokensInPath) {
        // Tokens in path: Supabase redirect went to path instead of hash. Parse and set session.
        const pathPart = winPath.startsWith('/') ? winPath.slice(1) : winPath;
        const params = new URLSearchParams(pathPart);
        const access_token = params.get('access_token');
        const refresh_token = params.get('refresh_token');
        if (access_token) {
          supabase.auth.setSession({ access_token, refresh_token: refresh_token || '' }).then(() => {
            console.log('OAuth callback processed, session created (from path)');
            window.history.replaceState({}, '', window.location.origin + '/#/');
            navigate('/', { replace: true });
          }).catch((err) => console.error('setSession failed:', err));
          return;
        }
      }
      if (tokensInHash) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          if (session) {
            console.log('OAuth callback processed, session created');
            window.history.replaceState({}, '', window.location.origin + '/#/');
            navigate('/', { replace: true });
          }
        });
      }
    }
  }, [navigate]);

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







