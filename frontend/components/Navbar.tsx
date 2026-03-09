/**
 * YardFront Navbar — shared across all pages
 * Logged out: Logo | Marketplace | How It Works | Pricing | Sign In | Get Started
 * Logged in:  Logo | Marketplace | How It Works | Pricing | Dashboard | [user menu]
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { supabase } from '../lib/supabase';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authToken } = usePersistence();
  const isLanding = location.pathname === '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = !!(authToken || user);

  const scrollTo = (id: string) => {
    if (isLanding) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
      setMobileOpen(false);
    } else {
      navigate(`/#${id}`);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setMobileOpen(false);
    navigate('/');
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] h-16 px-6 md:px-[56px] flex items-center justify-between"
      style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
      }}
    >
      {/* Logo */}
      <Link
        to="/"
        className="text-[18px] font-bold text-[#0A0A0A] tracking-[-0.3px] no-underline"
      >
        Yard<span className="text-[#FF6B35]">Front</span>
      </Link>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-8">
        <Link
          to="/marketplace"
          className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors no-underline"
        >
          Marketplace
        </Link>
        <Link
          to="/business"
          className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#FF6B35] transition-colors no-underline flex items-center gap-1.5"
        >
          For Business
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FF6B35]/80">API</span>
        </Link>

        {isLanding ? (
          <>
            <button
              type="button"
              onClick={() => scrollTo('steps')}
              className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollTo('pricing')}
              className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Pricing
            </button>
          </>
        ) : (
          <>
            <Link
              to="/#steps"
              className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors no-underline"
            >
              How It Works
            </Link>
            <Link
              to="/#pricing"
              className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors no-underline"
            >
              Pricing
            </Link>
          </>
        )}

        {isLoggedIn ? (
          <>
            <Link
              to="/dashboard"
              className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors no-underline"
            >
              Dashboard
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link
              to="/login"
              className="text-[14px] font-medium text-[#6B6B6B] hover:text-[#0A0A0A] transition-colors no-underline"
            >
              Sign In
            </Link>
            {isLanding ? (
              <button
                type="button"
                onClick={() => scrollTo('upload')}
                className="py-2 px-5 bg-[#0A0A0A] text-white rounded-[100px] text-[13px] font-semibold hover:opacity-80 transition-opacity"
              >
                Get Started
              </button>
            ) : (
              <Link
                to="/signup"
                className="py-2 px-5 bg-[#0A0A0A] text-white rounded-[100px] text-[13px] font-semibold hover:opacity-80 transition-opacity no-underline inline-block"
              >
                Sign Up
              </Link>
            )}
          </>
        )}
      </div>

      {/* Mobile Nav Toggle */}
      <button
        className="md:hidden p-2 text-[#0A0A0A]"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Menu"
      >
        {mobileOpen ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18" />
          </svg>
        )}
      </button>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="absolute top-16 left-0 right-0 bg-white border-t border-[#F0F0F0] shadow-sm md:hidden"
          style={{ backdropFilter: 'blur(24px)' }}
        >
          <div className="flex flex-col p-6 gap-4">
            <Link
              to="/marketplace"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium text-[#0A0A0A] no-underline"
            >
              Marketplace
            </Link>
            <Link
              to="/business"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium text-[#6B6B6B] no-underline flex items-center gap-1.5"
            >
              For Business <span className="text-[10px] font-semibold text-[#FF6B35]">API</span>
            </Link>
            <button
              type="button"
              onClick={() => scrollTo('steps')}
              className="text-[15px] font-medium text-[#6B6B6B] text-left"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => scrollTo('pricing')}
              className="text-[15px] font-medium text-[#6B6B6B] text-left"
            >
              Pricing
            </button>

            {isLoggedIn ? (
              <>
                <Link
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="text-[15px] font-medium text-[#0A0A0A] no-underline"
                >
                  Dashboard
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[15px] font-medium text-[#C0392B] text-left"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-[15px] font-medium text-[#0A0A0A] no-underline"
                >
                  Sign In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="block text-center py-3 bg-[#0A0A0A] text-white rounded-[100px] text-[13px] font-semibold no-underline"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
