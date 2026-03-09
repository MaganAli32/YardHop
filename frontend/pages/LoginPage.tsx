import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { usePersistence } from '../store/PersistenceContext';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authToken } = usePersistence();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Get return path: extension sends ?from=extension → redirect to /extension-auth.
  // With HashRouter the param can be in the hash (#/login?from=extension) or in search (if tab opened as /login?from=extension).
  const hash = window.location.hash || '';
  const queryString =
    (hash.includes('?') ? hash.split('?')[1] : '') ||
    (window.location.search || '').slice(1) ||
    '';
  const searchParams = new URLSearchParams(queryString);
  const fromExtension = searchParams.get('from') === 'extension';
  const from = fromExtension ? '/extension-auth' : ((location.state as any)?.from?.pathname || '/');
  const fromRef = useRef(from);
  
  // Check for OAuth errors passed via navigation state
  useEffect(() => {
    const oauthError = (location.state as any)?.oauthError;
    if (oauthError) {
      setError(oauthError);
      // Clear the state to prevent showing error on re-render
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  // Navigate when auth state updates after successful login
  useEffect(() => {
    if (loginSuccess && (user || authToken)) {
      console.log('Auth state updated after login, navigating to:', from);
      // Small delay to ensure state is fully propagated
      const timer = setTimeout(() => {
        if (fromRef.current === '/extension-auth') { window.location.href = '/#/extension-auth'; window.location.reload(); } else { if (fromRef.current === '/extension-auth') { window.location.href = '/#/extension-auth'; window.location.reload(); } else { navigate(fromRef.current, { replace: true }); } }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, user, authToken, from, navigate]);
  
  // Fallback: if loginSuccess is true but auth state hasn't updated after a delay, check session directly
  useEffect(() => {
    if (loginSuccess && !user && !authToken) {
      const fallbackTimer = setTimeout(async () => {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          console.log('Fallback: Session exists, forcing navigation to:', from);
          if (fromRef.current === '/extension-auth') { window.location.href = '/#/extension-auth'; window.location.reload(); } else { if (fromRef.current === '/extension-auth') { window.location.href = '/#/extension-auth'; window.location.reload(); } else { navigate(fromRef.current, { replace: true }); } }
        }
      }, 800);
      return () => clearTimeout(fallbackTimer);
    }
  }, [loginSuccess, user, authToken, from, navigate]);

  // If already logged in, redirect (only check once on mount)
  useEffect(() => {
    if ((user || authToken) && !loginSuccess) {
      console.log('Already logged in, redirecting to:', from);
      if (fromRef.current === '/extension-auth') { window.location.href = '/#/extension-auth'; window.location.reload(); } else { if (fromRef.current === '/extension-auth') { window.location.href = '/#/extension-auth'; window.location.reload(); } else { navigate(fromRef.current, { replace: true }); } }
    }
  }, []);

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setError('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData(event.currentTarget);
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;

      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (data.user && data.session) {
        console.log('Login successful, session created:', data.user.email);
        // Verify session is properly set
        const { data: { session: verifiedSession } } = await supabase.auth.getSession();
        
        if (verifiedSession) {
          console.log('Session verified, waiting for auth state to propagate...');
          setLoginSuccess(true);
          setLoading(false);
          
          // The useEffect will handle navigation when authToken/user is set by PersistenceContext
          // The auth state listener should fire quickly and update the context
        } else {
          throw new Error('Session was not properly established. Please try again.');
        }
      } else {
        throw new Error('Login failed - no user or session returned');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
      setLoading(false);
      setLoginSuccess(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setError('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      setLoading(false);
      return;
    }

    // Set redirect URL - must match exactly what's configured in Supabase dashboard.
    // With HashRouter, Supabase appends #access_token=... to this URL; the resulting path
    // won't match any route, so we use OAuthCallbackFallback (*) to catch it and redirect to /.
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://yard-front-ivory.vercel.app';
    const redirectUrl = baseUrl.replace(/\/$/, '').split('#')[0];

    try {
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (googleError) {
        throw googleError;
      }
    } catch (err: any) {
      let errorMessage = 'Failed to sign in with Google.';
      
      // Check for specific error about provider not being enabled
      const errMsg = err?.message || err?.error?.message || String(err);
      if (errMsg?.includes('provider is not enabled') || errMsg?.includes('Unsupported provider')) {
        if (errMsg?.includes('missing OAuth secret') || errMsg?.includes('OAuth secret')) {
          errorMessage = 'Google OAuth is enabled but credentials are missing. Go to Authentication > Providers > Google in your Supabase dashboard and add your Client ID and Client Secret from Google Cloud Console.';
        } else {
          errorMessage = 'Google sign-in is not enabled in your Supabase project. To enable it, go to Authentication > Providers in your Supabase dashboard and enable Google OAuth.';
        }
      } else if (errMsg) {
        errorMessage = errMsg;
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  const handleCreateAccount = () => {
    navigate('/signup');
  };

  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!isSupabaseConfigured || !supabase) {
      setError('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      return;
    }

    if (!resetEmail.trim()) {
      setError('Please enter your email address');
      return;
    }

    setResetLoading(true);
    setError('');
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
      });
      if (error) throw error;
      setResetSuccess(true);
      setTimeout(() => {
        setShowResetModal(false);
        setResetEmail('');
        setResetSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email.');
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />
      {error && !showResetModal && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50 shadow-lg">
          {error}
        </div>
      )}
      <div className="flex flex-col items-center justify-center pt-24 pb-12 px-4">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-[28px] text-[#0A0A0A] mb-2">Sign in</h1>
          <p className="text-[15px] text-[#6B6B6B] mb-8 font-sans">
            Log in to access your account and continue.
          </p>
          <form onSubmit={handleSignIn} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#0A0A0A] mb-1 font-sans">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="w-full border-0 border-b border-[#E0E0E0] bg-transparent py-2.5 text-[15px] text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#0A0A0A] font-sans"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#0A0A0A] mb-1 font-sans">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                required
                placeholder="Enter your password"
                className="w-full border-0 border-b border-[#E0E0E0] bg-transparent py-2.5 text-[15px] text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#0A0A0A] font-sans"
              />
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6B6B6B] font-sans">Keep me signed in</span>
              <button type="button" onClick={() => setShowResetModal(true)} className="text-[#FF6B35] hover:underline font-sans">
                Reset password
              </button>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A0A0A] text-white font-medium py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 font-sans"
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>
          <div className="relative flex items-center justify-center my-8">
            <span className="w-full border-t border-[#E0E0E0]" />
            <span className="absolute px-4 text-sm text-[#9A9A9A] bg-white font-sans">or</span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 border border-[#E0E0E0] rounded-full py-3 text-[#0A0A0A] font-medium hover:bg-[#F2F2F2] transition-colors font-sans"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="text-center text-sm text-[#6B6B6B] mt-8 font-sans">
            Don&apos;t have an account?{' '}
            <button type="button" onClick={handleCreateAccount} className="text-[#FF6B35] hover:underline font-medium">
              Sign up
            </button>
          </p>
        </div>
      </div>

      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !resetLoading && setShowResetModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-4 text-[#0A0A0A] font-serif">Reset Password</h3>
            {resetSuccess ? (
              <div className="space-y-4">
                <p className="text-green-600 font-medium font-sans">
                  Password reset email sent! Check your inbox for instructions.
                </p>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail('');
                    setResetSuccess(false);
                  }}
                  className="w-full bg-[#0A0A0A] text-white px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity font-sans"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-[#0A0A0A] mb-2 font-sans">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full border border-[#E0E0E0] rounded-lg px-4 py-2 bg-white text-[#0A0A0A] focus:outline-none focus:border-[#0A0A0A] font-sans"
                    required
                    disabled={resetLoading}
                  />
                </div>
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-sm text-red-600 font-sans">{error}</p>
                  </div>
                )}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetModal(false);
                      setResetEmail('');
                      setError('');
                    }}
                    disabled={resetLoading}
                    className="px-4 py-2 text-[#6B6B6B] font-medium hover:bg-[#F2F2F2] rounded-lg transition-colors disabled:opacity-50 font-sans"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="bg-[#0A0A0A] text-white px-4 py-2 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed font-sans"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;
