/**
 * YardFront Navbar — brand mark, page links left (About · Extension · Marketplace),
 * account + Try-it CTA right. Editorial mono links, forest CTA.
 */

import React, { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { supabase } from '../lib/supabase';
import { colors as t, fonts as tf } from '../lib/tokens';
import { scrollToSection } from '../lib/scrollToSection';

const PAGE_LINKS = [
  { to: '/about', label: 'About' },
  { to: '/extension', label: 'Extension' },
  { to: '/marketplace', label: 'Marketplace' },
];

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, authToken } = usePersistence();
  const isLanding = location.pathname === '/';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isLoggedIn = !!(authToken || user);
  const accountName = (user?.email || '').split('@')[0] || 'Account';

  const goToTryIt = () => {
    setMobileOpen(false);
    if (isLanding) {
      scrollToSection('try');
      return;
    }
    navigate('/');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => scrollToSection('try'));
    });
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setMobileOpen(false);
    navigate('/');
  };

  const linkBase =
    'text-[11px] font-normal uppercase tracking-[0.14em] no-underline whitespace-nowrap transition-opacity duration-200 bg-transparent border-0 cursor-pointer';
  const linkStyle = {
    fontFamily: '"DM Mono", ui-monospace, monospace',
  } as React.CSSProperties;

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `${linkBase} ${
      isActive
        ? 'text-[#B54419] opacity-100'
        : 'text-[#2A2822] opacity-[0.78] hover:opacity-100 hover:text-[#B54419]'
    }`;

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-[100] h-[72px] px-6 md:px-12 flex items-center"
      style={{
        background: `${t.chalk}E6`,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `0.5px solid ${scrolled ? t.mist : 'transparent'}`,
        boxShadow: scrolled ? '0 8px 24px -18px rgba(26,42,28,0.35)' : 'none',
        transition: 'border-color 0.25s ease, box-shadow 0.25s ease',
      }}
    >
      {/* Brand */}
      <Link
        to="/"
        className="flex items-center gap-2.5 no-underline shrink-0"
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

      {/* Left: page links */}
      <div className="hidden min-[720px]:flex items-center gap-5 lg:gap-8 ml-8 lg:ml-12">
        {PAGE_LINKS.map((l) => (
          <NavLink key={l.to} to={l.to} className={navLinkClass} style={linkStyle}>
            {l.label}
          </NavLink>
        ))}
      </div>

      {/* Right: beta + account + CTA */}
      <div className="hidden min-[720px]:flex items-center gap-5 lg:gap-7 ml-auto">
        <NavLink
          to="/beta"
          className={({ isActive }) =>
            `${linkBase} flex items-center gap-1.5 ${
              isActive
                ? 'text-[#B54419] opacity-100'
                : 'text-[#B54419] opacity-[0.85] hover:opacity-100'
            }`
          }
          style={linkStyle}
        >
          <span
            className="inline-block rounded-full shrink-0"
            style={{ width: 5, height: 5, background: t.terracotta }}
          />
          Join beta
        </NavLink>
        {isLoggedIn ? (
          <>
            <Link
              to="/account"
              className={`${linkBase} text-[#2A2822] opacity-[0.78] hover:opacity-100 hover:text-[#B54419] flex items-center gap-2`}
              style={linkStyle}
              title={user?.email || 'My account'}
            >
              <span
                className="inline-flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  background: t.forest,
                  color: t.chalk,
                  fontSize: 9,
                  letterSpacing: '0.06em',
                }}
              >
                {accountName.slice(0, 2).toUpperCase()}
              </span>
              {accountName}
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className={`${linkBase} text-[#2A2822] opacity-[0.78] hover:opacity-100 hover:text-[#B54419]`}
              style={linkStyle}
            >
              Sign out
            </button>
          </>
        ) : (
          <Link
            to="/login"
            className={`${linkBase} text-[#2A2822] opacity-[0.78] hover:opacity-100 hover:text-[#B54419]`}
            style={linkStyle}
          >
            Sign in
          </Link>
        )}
        <button
          type="button"
          onClick={goToTryIt}
          className="border-0 cursor-pointer transition duration-150 ease-out active:scale-[0.97] motion-reduce:transform-none text-[11px] uppercase tracking-[0.14em] whitespace-nowrap px-4 py-2.5"
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
      </div>

      {/* Mobile hamburger */}
      <button
        className="min-[720px]:hidden p-2 ml-auto bg-transparent border-0 cursor-pointer"
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
          className="absolute top-[72px] left-0 right-0 min-[720px]:hidden shadow-lg"
          style={{
            background: t.chalk,
            borderTop: `0.5px solid ${t.mist}`,
            borderBottom: `0.5px solid ${t.mist}`,
          }}
        >
          <div className="flex flex-col p-6 gap-4">
            {PAGE_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setMobileOpen(false)}
                className="text-[15px] font-medium no-underline"
                style={{ color: t.ink }}
              >
                {l.label}
              </Link>
            ))}
            <Link
              to="/beta"
              onClick={() => setMobileOpen(false)}
              className="text-[15px] font-medium no-underline"
              style={{ color: t.terracotta }}
            >
              Join the beta
            </Link>

            {isLoggedIn ? (
              <>
                <Link
                  to="/account"
                  onClick={() => setMobileOpen(false)}
                  className="text-[15px] font-medium no-underline"
                  style={{ color: t.ink }}
                >
                  My account
                </Link>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="text-[15px] font-medium text-left bg-transparent border-0 cursor-pointer"
                  style={{ color: t.terracotta }}
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="text-[15px] font-medium no-underline"
                style={{ color: t.ink }}
              >
                Sign in
              </Link>
            )}
            <button
              type="button"
              onClick={goToTryIt}
              className="block text-center py-3 border-0 text-[11px] uppercase tracking-[0.14em] cursor-pointer"
              style={{ background: t.forest, color: t.chalk, fontFamily: '"DM Mono", monospace' }}
            >
              Try it free
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
