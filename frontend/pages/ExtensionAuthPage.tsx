import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function ExtensionAuthPage() {
  const [status, setStatus] = useState('Connecting...');

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 15;
    let interval: ReturnType<typeof setInterval> | undefined;

    async function sendToken() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setStatus('No active session. Please sign in first.');
        return;
      }

      setStatus('Sending credentials to extension...');

      // Send the token repeatedly to handle timing — content script may not be ready immediately
      interval = setInterval(() => {
        attempts++;
        window.postMessage({
          type: 'YF_AUTH_TOKEN',
          token: session.access_token,
          refreshToken: session.refresh_token,
        }, '*');

        if (attempts >= maxAttempts) {
          clearInterval(interval);
          interval = undefined;
          setStatus('Connected! You can close this tab.');
        }
      }, 300);
    }

    // Small initial delay to let the content script initialize
    const timeout = setTimeout(sendToken, 400);

    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      fontFamily: "'Satoshi', -apple-system, sans-serif",
      background: '#FFFFFF',
    }}>
      <div style={{
        fontFamily: "'Instrument Serif', serif",
        fontSize: '32px',
        color: '#0A0A0A',
      }}>
        Connected to YardFront
      </div>
      <p style={{
        fontSize: '15px',
        color: '#888',
        marginTop: '8px',
      }}>
        {status}
      </p>
    </div>
  );
}
