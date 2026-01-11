import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';

/**
 * Handles OAuth callback navigation after successful authentication.
 * Redirects authenticated users from login/signup pages to /search.
 */
const AuthCallbackHandler: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Use persistence context - it's safe since we're inside PersistenceProvider in App.tsx
  const { user, loading } = usePersistence();

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







