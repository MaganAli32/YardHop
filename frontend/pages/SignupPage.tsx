import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const GoogleIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 48 48">
    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s12-5.373 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-2.641-.21-5.236-.611-7.743z" />
    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z" />
    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C42.022 35.026 44 30.038 44 24c0-2.641-.21-5.236-.611-7.743z" />
  </svg>
);

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Get return path from location state (for post-signup redirect)
  const from = (location.state as any)?.from?.pathname || '/';

  const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
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
      const name = formData.get('name') as string;
      const username = formData.get('username') as string;
      const rememberMe = formData.get('rememberMe') === 'on';

      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      if (!name || name.trim().length === 0) {
        setError('Please enter your full name');
        setLoading(false);
        return;
      }

      if (!username || username.trim().length === 0) {
        setError('Please choose a username');
        setLoading(false);
        return;
      }

      // Validate username format (alphanumeric, underscore, hyphen, min 3 chars)
      const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
      if (!usernameRegex.test(username)) {
        setError('Username must be 3-20 characters and contain only letters, numbers, underscores, or hyphens');
        setLoading(false);
        return;
      }

      if (password.length < 8) {
        setError('Password must be at least 8 characters');
        setLoading(false);
        return;
      }

      // Create Supabase client with session persistence based on "Keep me signed in"
      const authOptions = {
        emailRedirectTo: `${window.location.origin}${window.location.pathname}`,
        data: {
          name: name.trim(),
          username: username.trim().toLowerCase(),
        },
      };

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: authOptions,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // If rememberMe is checked, session will be persisted automatically by Supabase
        // Supabase persists sessions in localStorage by default
        // Navigate to intended destination or search page
        // Small delay to ensure session is fully established before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    setLoading(true);

    if (!isSupabaseConfigured || !supabase) {
      setError('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      setLoading(false);
      return;
    }

    // Set redirect URL - must match exactly what's configured in Supabase dashboard
    // For HashRouter, use base URL - Supabase will handle the callback
    const baseUrl = import.meta.env.VITE_APP_URL || 'https://yard-front-ivory.vercel.app';
    // Remove any trailing slashes and hash fragments
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

      // If successful, the OAuth flow will redirect
      // We don't need to do anything here as the redirect will happen
    } catch (err: any) {
      let errorMessage = 'Failed to sign up with Google.';
      
      // Extract error message from various possible formats
      // Supabase errors can come in different formats:
      // - err.message (standard)
      // - err.msg (some Supabase error responses)
      // - err.error?.message (nested error)
      // - err.error?.msg (nested error with msg)
      // - JSON string that needs parsing
      let errMsg = err?.message || err?.msg || err?.error?.message || err?.error?.msg || String(err);
      
      // Try to parse if it's a JSON string
      try {
        if (typeof errMsg === 'string' && errMsg.startsWith('{')) {
          const parsed = JSON.parse(errMsg);
          errMsg = parsed.msg || parsed.message || parsed.error || errMsg;
        }
      } catch {
        // Not JSON, use as-is
      }
      
      // Also check nested error structure and direct properties
      if (err?.error && typeof err.error === 'object') {
        errMsg = err.error.msg || err.error.message || err.error.error_code || errMsg;
      }
      
      // Check for error_code in the error object itself
      if (err?.error_code === 'validation_failed' || err?.error_code) {
        errMsg = err.msg || err.message || `Error: ${err.error_code}`;
      }
      
      console.error('Google OAuth error:', { err, errorCode: err?.code, errorCode2: err?.error_code, errorMsg: errMsg });
      
      // Check for specific error about provider not being enabled or missing OAuth secret
      const errorString = String(errMsg).toLowerCase();
      const hasValidationFailed = errorString.includes('validation_failed') || err?.error_code === 'validation_failed';
      const hasUnsupportedProvider = errorString.includes('unsupported provider') || errorString.includes('provider is not enabled');
      const hasMissingSecret = errorString.includes('missing oauth secret') || errorString.includes('oauth secret');
      
      if (hasUnsupportedProvider || hasValidationFailed) {
        if (hasMissingSecret) {
          errorMessage = 'Google OAuth is enabled but credentials are missing. Please configure Google OAuth in your Supabase dashboard:\n\n1. Go to Authentication > Providers > Google\n2. Enable Google provider\n3. Add your Client ID and Client Secret from Google Cloud Console\n4. Save the configuration';
        } else {
          errorMessage = 'Google sign-in is not enabled in your Supabase project. To enable it:\n\n1. Go to Authentication > Providers in your Supabase dashboard\n2. Enable Google OAuth\n3. Configure your Google Client ID and Secret from Google Cloud Console';
        }
      } else if (err?.code === 400 || hasValidationFailed) {
        errorMessage = 'Google OAuth is not properly configured. Please check your Supabase dashboard:\n\n1. Go to Authentication > Providers > Google\n2. Ensure Google provider is enabled\n3. Verify Client ID and Client Secret are correctly set';
      } else if (errMsg) {
        errorMessage = String(errMsg);
      }
      
      setError(errorMessage);
      setLoading(false);
    }
  };
  
  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navbar />
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      <div className="flex flex-col items-center justify-center pt-24 pb-12 px-4">
        <div className="w-full max-w-md">
          <h1 className="font-serif text-[28px] text-[#0A0A0A] mb-2">Create account</h1>
          <p className="text-[15px] text-[#6B6B6B] mb-8 font-sans">
            Join YardFront to list items and get price intelligence.
          </p>
          <form onSubmit={handleSignUp} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-[#0A0A0A] mb-1 font-sans">Full Name</label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Your name"
                className="w-full border-0 border-b border-[#E0E0E0] bg-transparent py-2.5 text-[15px] text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#0A0A0A] font-sans"
              />
            </div>
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[#0A0A0A] mb-1 font-sans">Username</label>
              <input
                id="username"
                name="username"
                type="text"
                required
                placeholder="Choose a username (3–20 chars)"
                className="w-full border-0 border-b border-[#E0E0E0] bg-transparent py-2.5 text-[15px] text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#0A0A0A] font-sans"
              />
            </div>
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
                minLength={8}
                placeholder="At least 8 characters"
                className="w-full border-0 border-b border-[#E0E0E0] bg-transparent py-2.5 text-[15px] text-[#0A0A0A] placeholder:text-[#9A9A9A] focus:outline-none focus:border-[#0A0A0A] font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0A0A0A] text-white font-medium py-3 rounded-full hover:opacity-90 transition-opacity disabled:opacity-60 font-sans"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          <div className="relative flex items-center justify-center my-8">
            <span className="w-full border-t border-[#E0E0E0]" />
            <span className="absolute px-4 text-sm text-[#9A9A9A] bg-white font-sans">or</span>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignUp}
            className="w-full flex items-center justify-center gap-3 border border-[#E0E0E0] rounded-full py-3 text-[#0A0A0A] font-medium hover:bg-[#F2F2F2] transition-colors font-sans"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <p className="text-center text-sm text-[#6B6B6B] mt-8 font-sans">
            Already have an account?{' '}
            <button type="button" onClick={handleLogin} className="text-[#FF6B35] hover:underline font-medium">
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
