import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const CookieConsent: React.FC = () => {
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookieConsent');
    if (!consent) {
      // Show consent banner after a short delay
      const timer = setTimeout(() => {
        setShowConsent(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowConsent(false);
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('cookieConsentDate', new Date().toISOString());
    setShowConsent(false);
  };

  if (!showConsent) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-fadeIn">
      <div className="max-w-6xl mx-auto bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-6 md:p-8 backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex-1 space-y-3">
            <h3 className="text-lg font-black text-white uppercase tracking-wider">
              Cookie Consent
            </h3>
            <p className="text-sm text-slate-400 font-medium leading-relaxed">
              We use cookies and similar tracking technologies to improve your experience, analyze site 
              usage, and assist with marketing efforts. By clicking "Accept All", you consent to our use 
              of cookies. You can manage your preferences at any time.
            </p>
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
              <Link 
                to="/privacy-policy" 
                className="text-[#FF6B35] hover:text-[#FF8C5A] transition-colors underline"
              >
                Privacy Policy
              </Link>
              <span>•</span>
              <Link 
                to="/terms-of-service" 
                className="text-[#FF6B35] hover:text-[#FF8C5A] transition-colors underline"
              >
                Terms of Service
              </Link>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={handleDecline}
              className="px-6 py-3 bg-transparent border border-white/20 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-white/10 transition-all active:scale-95"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              className="px-6 py-3 bg-[#FF6B35] text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-[#FF8C5A] transition-all shadow-lg shadow-orange-500/20 active:scale-95"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieConsent;

