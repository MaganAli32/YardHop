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
  const { user, loading } = usePersistence();

  useEffect(() => {
    // Wait for auth state to load
    if (loading) return;

    // If user is authenticated and on login/signup page, redirect to search
    if (user && (location.pathname === '/login' || location.pathname === '/signup')) {
      navigate('/search', { replace: true });
    }
  }, [user, loading, location.pathname, navigate]);

  return null;
};

export default AuthCallbackHandler;





