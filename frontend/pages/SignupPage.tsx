
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignInPage, Testimonial } from '../components/ui/sign-in';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/men/32.jpg",
    name: "David Martinez",
    handle: "@davidcreates",
    text: "The verification process gave me peace of mind. Safe and simple."
  },
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/44.jpg",
    name: "Elena R.",
    handle: "@elenavintage",
    text: "I set up my moving sale in 10 minutes. Everything was gone by noon!"
  }
];

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Get return path from location state (for post-signup redirect)
  const from = (location.state as any)?.from?.pathname || '/search';

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

    // Use the same redirect URL format as login
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;

    try {
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
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
    <>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
          {error}
        </div>
      )}
      <SignInPage
        title={<span className="font-bold tracking-tight text-slate-900 dark:text-white">Start Your Journey</span>}
        description="Create an account to join your neighborhood marketplace."
        heroImageSrc="https://images.unsplash.com/photo-1519999482648-25049ddd37b1?w=2160&q=80"
        testimonials={sampleTestimonials}
        onSignIn={handleSignUp}
        onGoogleSignIn={handleGoogleSignUp}
        onCreateAccount={handleLogin}
        buttonText={loading ? "Creating Account..." : "Create Account"}
      />
    </>
  );
};

export default SignupPage;
