
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignInPage, Testimonial } from '../components/ui/sign-in';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { usePersistence } from '../store/PersistenceContext';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarahhop",
    text: "YardFront makes selling my vintage finds so easy. Love the community!"
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/64.jpg",
    name: "Marcus Johnson",
    handle: "@marcustech",
    text: "Found incredible tools for my workshop just blocks away. Highly recommend."
  }
];

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

  // Get return path from location state (for post-login redirect)
  const from = (location.state as any)?.from?.pathname || '/search';
  
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
        navigate(from, { replace: true });
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
          navigate(from, { replace: true });
        }
      }, 800);
      return () => clearTimeout(fallbackTimer);
    }
  }, [loginSuccess, user, authToken, from, navigate]);

  // If already logged in, redirect (only check once on mount)
  useEffect(() => {
    if ((user || authToken) && !loginSuccess) {
      console.log('Already logged in, redirecting to:', from);
      navigate(from, { replace: true });
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
    <>
      {error && !showResetModal && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50 shadow-lg">
          {error}
        </div>
      )}
      <SignInPage
        title={<span className="font-bold tracking-tight text-slate-900 dark:text-white">Welcome Back</span>}
        description="Log in to access your saved items and messages."
        heroImageSrc="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=2160&q=80"
        testimonials={sampleTestimonials}
        onSignIn={handleSignIn}
        onGoogleSignIn={handleGoogleSignIn}
        onCreateAccount={handleCreateAccount}
        onResetPassword={() => setShowResetModal(true)}
        buttonText={loading ? "Signing In..." : "Sign In"}
      />
      
      {/* Password Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !resetLoading && setShowResetModal(false)}>
          <div className="bg-white dark:bg-surface-dark rounded-lg p-6 max-w-md w-full mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-black mb-4 text-slate-900 dark:text-white">Reset Password</h3>
            {resetSuccess ? (
              <div className="space-y-4">
                <p className="text-green-600 dark:text-green-400 font-medium">
                  Password reset email sent! Check your inbox for instructions.
                </p>
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetEmail('');
                    setResetSuccess(false);
                  }}
                  className="w-full bg-primary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Email Address
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full border border-gray-300 dark:border-white/10 rounded-lg px-4 py-2 bg-white dark:bg-black/20 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                    required
                    disabled={resetLoading}
                  />
                </div>
                {error && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
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
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="bg-primary text-white px-4 py-2 rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default LoginPage;
