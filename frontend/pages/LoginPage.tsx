
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignInPage, Testimonial } from '../components/ui/sign-in';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Get return path from location state (for post-login redirect)
  const from = (location.state as any)?.from?.pathname || '/search';

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

      if (data.user) {
        navigate(from, { replace: true });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
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

    // FIXED: Remove hash from redirect URL - Supabase OAuth doesn't handle hash routing well
    // Redirect to root, navigation will be handled by auth state listener
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

  const handleResetPassword = async () => {
    if (!isSupabaseConfigured || !supabase) {
      alert('Authentication is not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.');
      return;
    }

    const email = prompt('Enter your email address to reset password:');
    if (email) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}${window.location.pathname}#/reset-password`,
        });
        if (error) throw error;
        alert('Password reset email sent! Check your inbox.');
      } catch (err: any) {
        alert(err.message || 'Failed to send reset email.');
      }
    }
  };

  return (
    <>
      {error && (
        <div className="fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg z-50">
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
        onResetPassword={handleResetPassword}
        buttonText={loading ? "Signing In..." : "Sign In"}
      />
    </>
  );
};

export default LoginPage;
