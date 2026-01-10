
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
      const name = formData.get('name') as string || email.split('@')[0];

      if (!email || !password) {
        setError('Please enter both email and password');
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        setLoading(false);
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        // Profile will be created automatically by the trigger
        navigate('/profile');
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

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}${window.location.pathname}#/profile`,
        },
      });

      if (googleError) throw googleError;
    } catch (err: any) {
      let errorMessage = 'Failed to sign up with Google.';
      
      // Check for specific error about provider not being enabled
      if (err.message?.includes('provider is not enabled') || err.message?.includes('Unsupported provider')) {
        if (err.message?.includes('missing OAuth secret') || err.message?.includes('OAuth secret')) {
          errorMessage = 'Google OAuth is enabled but credentials are missing. Go to Authentication > Providers > Google in your Supabase dashboard and add your Client ID and Client Secret from Google Cloud Console.';
        } else {
          errorMessage = 'Google sign-in is not enabled in your Supabase project. To enable it, go to Authentication > Providers in your Supabase dashboard and enable Google OAuth.';
        }
      } else if (err.message) {
        errorMessage = err.message;
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
        description="Create an account to join your local Austin neighborhood marketplace."
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
