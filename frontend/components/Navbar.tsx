/**
 * YardFront Navbar — editorial mono links + forest CTA (YardFront.html)
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { supabase } from '../lib/supabase';
import { colors as t, fonts as tf } from '../lib/tokens';
import { scrollToSection } from '../lib/scrollToSection';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authToken } = usePersistence();
  const isLanding = location.pathname === '/';
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = !!(authToken || user);

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    if (isLanding) {
      scrollToSection(id);
      return;
    }
    navigate('/');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToSection(id));
    });
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setMobileOpen(false);
    navigate('/');
  };

  const linkBase =
    'text-[11px] font-normal uppercase tracking-[0.14em] no-underline transition-opacity duration-200';
  const linkIdle = 'text-[color:var(--ink)] opacity-[0.78] hover:opacity-100 hover:text-[color:var(--terra)]';
  const linkStyle = { fontFamily: '"DM Mono", ui-monospace, monospace', ['--ink' as string]: t.ink, ['--terra' as string]: t.terracotta } as React.CSSProperties;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] h-[72px] px-6 md:px-12 flex items-center justify-between"
      style={{
        background: `${t.chalk}E6`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `0.5px solid ${t.mist}`,
      }}
    >
      <Link
        to="/"
        className="flex items-center gap-2.5 no-underline"
        style={{ fontFamily: tf.serif }}
        onClick={() => setMobileOpen(false)}
      >
        <span
          className="rounded-full shrink-0"
          style={{ width: 9, height: 9, background: t.terracotta }}
        />
        <span className="text-[22px] font-normal tracking-[-0.01em]" style={{ color: t.ink }}>
          YardFront
        </span>
      </Link>

      <div className="hidden lg:flex items-center gap-7">
        <Link to="/about" className={`${linkBase} ${linkIdle}`} style={linkStyle}>
          About
        </Link>
        <Link to="/business" className={`${linkBase} ${linkIdle}`} style={linkStyle}>
          For Business
        </Link>
        <Link to="/marketplace" className={`${linkBase} ${linkIdle}`} style={linkStyle}>
          Marketplace
        </Link>

        <>
          <button type="button" onClick={() => scrollTo('how')} className={`${linkBase} ${linkIdle} bg-transparent border-0 cursor-pointer`} style={linkStyle}>
            How it works
          </button>
          <button type="button" onClick={() => scrollTo('pricing')} className={`${linkBase} ${linkIdle} bg-transparent border-0 cursor-pointer`} style={linkStyle}>
            Pricing
          </button>
        </>

        {isLoggedIn ? (
          <>
            <Link to="/account" className={`${linkBase} ${linkIdle}`} style={linkStyle}>
              My Account
            </Link>
            <Link to="/dashboard" className={`${linkBase} ${linkIdle}`} style={linkStyle}>
              API Dashboard
            </Link>
            <button type="button" onClick={handleSignOut} className={`${linkBase} ${linkIdle} bg-transparent border-0 cursor-pointer`} style={linkStyle}>
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link to="/login" className={`${linkBase} ${linkIdle}`} style={linkStyle}>
              Sign In
            </Link>
            <button
              type="button"
              onClick={() => scrollTo('try')}
              className="border-0 cursor-pointer transition-colors duration-200 text-[11px] uppercase tracking-[0.14em] px-4 py-2.5"
              style={{
                fontFamily: '"DM Mono", ui-monospace, monospace',
                background: t.forest,
                color: t.chalk,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = t.terracotta;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = t.forest;
              }}
            >
              Try it free
            </button>
          </>
        )}
      </div>

      <button
        className="lg:hidden p-2"
        style={{ color: t.ink }}
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

      {mobileOpen && (
        <div
          className="absolute top-[72px] left-0 right-0 lg:hidden shadow-lg"
          style={{
            background: t.chalk,
            borderTop: `0.5px solid ${t.mist}`,
            borderBottom: `0.5px solid ${t.mist}`,
          }}
        >
          <div className="flex flex-col p-6 gap-4">
            <Link to="/about" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium no-underline" style={{ color: t.ink }}>
              About
            </Link>
            <Link to="/business" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium no-underline" style={{ color: t.sage }}>
              For Business
            </Link>
            <Link to="/marketplace" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium no-underline" style={{ color: t.ink }}>
              Marketplace
            </Link>
            <button type="button" onClick={() => scrollTo('how')} className="text-[15px] font-medium text-left bg-transparent border-0 cursor-pointer" style={{ color: t.sage }}>
              How it works
            </button>
            <button type="button" onClick={() => scrollTo('pricing')} className="text-[15px] font-medium text-left bg-transparent border-0 cursor-pointer" style={{ color: t.sage }}>
              Pricing
            </button>

            {isLoggedIn ? (
              <>
                <Link to="/account" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium no-underline" style={{ color: t.ink }}>
                  My Account
                </Link>
                <Link to="/dashboard" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium no-underline" style={{ color: t.ink }}>
                  API Dashboard
                </Link>
                <button type="button" onClick={handleSignOut} className="text-[15px] font-medium text-left bg-transparent border-0 cursor-pointer" style={{ color: t.terracotta }}>
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" onClick={() => setMobileOpen(false)} className="text-[15px] font-medium no-underline" style={{ color: t.ink }}>
                  Sign In
                </Link>
                <button
                  type="button"
                  onClick={() => scrollTo('try')}
                  className="block text-center py-3 border-0 text-[11px] uppercase tracking-[0.14em] cursor-pointer"
                  style={{ background: t.forest, color: t.chalk, fontFamily: '"DM Mono", monospace' }}
                >
                  Try it free
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
