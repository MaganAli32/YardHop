
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { SignInPage, Testimonial } from '../components/ui/sign-in';
import { supabase } from '../lib/supabase';

const sampleTestimonials: Testimonial[] = [
  {
    avatarSrc: "https://randomuser.me/api/portraits/women/57.jpg",
    name: "Sarah Chen",
    handle: "@sarahhop",
    text: "YardHop makes selling my vintage finds so easy. Love the community!"
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

    try {
      const { error: googleError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/search`,
        },
      });

      if (googleError) throw googleError;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
      setLoading(false);
    }
  };
  
  const handleCreateAccount = () => {
    navigate('/signup');
  };

  const handleResetPassword = async () => {
    const email = prompt('Enter your email address to reset password:');
    if (email) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
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
