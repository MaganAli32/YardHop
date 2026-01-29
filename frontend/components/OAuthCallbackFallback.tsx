import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';

/**
 * Rendered when no route matches (e.g. HashRouter path becomes "access_token=..." after OAuth).
 * If the path looks like an OAuth callback, wait for session then redirect to /.
 */
const OAuthCallbackFallback: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  const pathname = location.pathname || '';
  const isOAuthCallback =
    pathname.includes('access_token') ||
    pathname.includes('refresh_token') ||
    pathname.startsWith('access_token') ||
    pathname.startsWith('/access_token');

  useEffect(() => {
    if (!isOAuthCallback) {
      setChecking(false);
      return;
    }

    // With HashRouter, Supabase may put tokens in the hash; pathname can be the whole fragment.
    // Ensure Supabase can read the session (it usually has already on load).
    const timer = setTimeout(() => {
      const base = window.location.origin + (window.location.pathname || '') + (window.location.search || '');
      window.history.replaceState({}, '', base + '#/');
      navigate('/', { replace: true });
      setChecking(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [isOAuthCallback, navigate]);

  if (!isOAuthCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <p className="text-slate-500">Page not found.</p>
      </div>
    );
  }

  if (checking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-4 gap-4">
        <div className="animate-spin w-10 h-10 border-2 border-primary border-t-transparent rounded-full" />
        <p className="text-slate-600 font-medium">Signing you in...</p>
      </div>
    );
  }

  return null;
};

export default OAuthCallbackFallback;
