import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { Search, ChevronRight, Star, User, MessageCircle, Menu, X } from 'lucide-react';

const Header: React.FC = () => {
  const { user, signOut, loading } = usePersistence();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
      console.log('🔒 Body scroll locked, menu should be visible');
    } else {
      document.body.style.overflow = '';
      console.log('🔓 Body scroll unlocked, menu closed');
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Debug: Log when menu state changes
  useEffect(() => {
    console.log('📱 Mobile menu state changed:', mobileMenuOpen);
    console.log('📱 Window width:', window.innerWidth);
    console.log('📱 Should show menu:', mobileMenuOpen && window.innerWidth < 768);
    
    // Check if menu element exists in DOM
    if (mobileMenuOpen) {
      setTimeout(() => {
        const menuElement = document.querySelector('[aria-label="Mobile navigation"]');
        console.log('📱 Menu element in DOM:', !!menuElement);
        if (menuElement) {
          const styles = window.getComputedStyle(menuElement);
          console.log('📱 Menu computed styles:', {
            display: styles.display,
            visibility: styles.visibility,
            opacity: styles.opacity,
            zIndex: styles.zIndex,
            position: styles.position,
            top: styles.top
          });
        } else {
          console.error('❌ Menu element NOT found in DOM!');
        }
      }, 100);
    }
  }, [mobileMenuOpen]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setMobileMenuOpen(false);
    if (searchQuery.trim()) {
      const targetPath = `/search?q=${encodeURIComponent(searchQuery)}`;
      if (!user && !loading) {
        navigate('/login', { state: { from: { pathname: targetPath } } });
      } else {
        navigate(targetPath);
      }
    }
  };

  // Helper to handle protected navigation
  const handleProtectedNavigation = (path: string) => {
    setMobileMenuOpen(false);
    if (user) {
      // User is logged in, navigate directly
      navigate(path);
    } else {
      // No user or still loading - redirect to login
      console.log('No user, redirecting to login from:', path);
      navigate('/login', { state: { from: { pathname: path } } });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <>
      <div className="h-1 bg-[#121c32] relative z-[101]" />
      <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-4 flex items-center justify-between gap-4 md:gap-8">
          <Link to="/" className="flex items-center gap-2 md:gap-3 shrink-0 group" onClick={() => setMobileMenuOpen(false)}>
            <div className="w-9 h-9 md:w-10 md:h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center group-hover:rotate-12 transition-all shadow-xl shadow-orange-500/20">
              <span className="text-white font-black text-sm md:text-base italic font-display">YF</span>
            </div>
            <span className="text-xl md:text-2xl font-black text-[#121c32] tracking-tighter uppercase italic font-display">YardFront</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex items-center group/search gap-3">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} strokeWidth={3} />
              </div>
              <input 
                type="text" 
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-md py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#FF6B35]/5 focus:border-[#FF6B35] transition-all font-body"
              />
            </div>
            <button 
              type="button"
              onClick={() => handleProtectedNavigation('/search')}
              className="bg-[#FF6B35] hover:bg-[#ff8452] text-white px-6 py-3 rounded-md transition-all active:scale-90 flex items-center gap-2 shadow-lg shadow-orange-500/20 text-[10px] font-black uppercase tracking-[0.2em] italic font-display whitespace-nowrap"
            >
              Browse Feed
              <ChevronRight size={16} strokeWidth={4} />
            </button>
          </form>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            <button
              onClick={() => handleProtectedNavigation('/sell-hub')}
              className="bg-[#FF6B35] hover:bg-[#ff8452] text-white px-6 py-3 rounded-md text-[10px] font-black uppercase tracking-[0.2em] hidden lg:block transition-all hover:-translate-y-1 italic font-display"
            >
              Start Selling
            </button>
            <div className="hidden lg:block w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleProtectedNavigation('/favorites')}
                className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#FF6B35] transition-all rounded-md"
                title="Favorites"
                aria-label="Favorites"
              >
                <Star size={20} strokeWidth={2.5}/>
              </button>
              <button
                onClick={() => handleProtectedNavigation('/profile')}
                className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#FF6B35] transition-all rounded-md"
                title="Profile"
                aria-label="Profile"
              >
                <User size={20} strokeWidth={2.5}/>
              </button>
              <button
                onClick={() => handleProtectedNavigation('/inbox')}
                className="p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-[#FF6B35] transition-all rounded-md"
                title="Messages"
                aria-label="Messages"
              >
                <MessageCircle size={20} strokeWidth={2.5}/>
              </button>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            {user ? (
              <button 
                onClick={handleSignOut} 
                className="text-sm font-black text-slate-600 hover:text-[#FF6B35] transition-colors font-display py-2 min-h-[44px] flex items-center"
              >
                LOG OUT
              </button>
            ) : (
              <div className="flex items-center gap-4">
                <Link 
                  to="/login" 
                  className="text-xs font-black text-slate-600 hover:text-[#FF6B35] transition-colors uppercase tracking-[0.1em] font-display py-3 min-h-[44px] flex items-center"
                >
                  Log In
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-[#121c32] hover:bg-slate-800 text-white px-6 py-3 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all font-display min-h-[44px] flex items-center"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile: hamburger */}
          <button
            type="button"
            onClick={() => {
              console.log('🍔 Mobile menu clicked, current state:', mobileMenuOpen);
              const newState = !mobileMenuOpen;
              setMobileMenuOpen(newState);
              console.log('🍔 Mobile menu new state:', newState);
              console.log('🍔 Menu should be rendering:', newState);
            }}
            className="md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-600 hover:text-[#FF6B35] transition-colors rounded-md -mr-1"
            aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} strokeWidth={2.5} /> : <Menu size={24} strokeWidth={2.5} />}
          </button>
        </div>

        {/* Mobile menu overlay - rendered via portal to avoid stacking context issues */}
        {mobileMenuOpen && typeof document !== 'undefined' && createPortal(
          <>
            {/* Debug indicator - remove after fixing */}
            <div className="md:hidden fixed top-[65px] left-0 right-0 bg-[#FF6B35] text-white text-xs font-bold py-1 px-4 z-[200] text-center">
              🐛 MOBILE MENU OPEN - If you see this, menu is rendering! (z-index: 200)
            </div>
            <div
              className="md:hidden fixed inset-x-0 top-[73px] bottom-0 bg-white z-[200] overflow-y-auto border-t border-slate-200 shadow-lg"
              style={{ 
                display: 'block',
                visibility: 'visible',
                opacity: 1,
                zIndex: 200
              }}
              aria-modal="true"
              role="dialog"
              aria-label="Mobile navigation"
            >
            <nav className="flex flex-col p-4 sm:p-6 space-y-3">
              <form onSubmit={handleSearch} className="space-y-3 pb-4 border-b border-slate-200">
                <div className="relative">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search items..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35]"
                    autoComplete="off"
                  />
                </div>
                <button type="submit" className="w-full bg-[#FF6B35] hover:bg-[#ff8452] text-white py-3 rounded-lg font-bold text-sm uppercase tracking-wider transition-colors flex items-center justify-center gap-2 min-h-[44px]">
                  <Search size={20} /> Search
                </button>
              </form>
              
              <button
                onClick={() => handleProtectedNavigation('/search')}
                className="w-full bg-[#FF6B35] hover:bg-[#ff8452] text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 min-h-[44px]"
              >
                <ChevronRight size={18} /> Browse Feed
              </button>

              <button
                onClick={() => handleProtectedNavigation('/sell-hub')}
                className="w-full bg-[#FF6B35] hover:bg-[#ff8452] text-white py-3 rounded-lg font-bold flex items-center justify-center min-h-[44px]"
              >
                Start Selling
              </button>
              <button
                onClick={() => handleProtectedNavigation('/favorites')}
                className="w-full py-3 border-2 border-slate-200 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm text-slate-700 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors min-h-[44px]"
              >
                <Star size={18} /> Favorites
              </button>
              <button
                onClick={() => handleProtectedNavigation('/inbox')}
                className="w-full py-3 border-2 border-slate-200 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm text-slate-700 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors min-h-[44px]"
              >
                <MessageCircle size={18} /> Messages
              </button>
              <button
                onClick={() => handleProtectedNavigation('/profile')}
                className="w-full py-3 border-2 border-slate-200 rounded-lg flex items-center justify-center gap-2 font-semibold text-sm text-slate-700 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors min-h-[44px]"
              >
                <User size={20} /> Profile
              </button>

              <div className="pt-4 border-t border-slate-200 space-y-3">
                {user ? (
                  <button
                    onClick={() => { handleSignOut(); setMobileMenuOpen(false); }}
                    className="w-full py-3 border-2 border-slate-200 rounded-lg font-bold text-sm text-slate-600 hover:border-red-500 hover:text-red-600 transition-colors min-h-[44px]"
                  >
                    Log Out
                  </button>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full py-3 border-2 border-slate-200 rounded-lg text-center font-bold text-sm text-slate-700 hover:border-[#FF6B35] hover:text-[#FF6B35] transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      Log In
                    </Link>
                    <Link
                      to="/signup"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block w-full bg-[#121c32] hover:bg-slate-800 text-white py-3 rounded-lg text-center font-bold text-sm uppercase tracking-wider transition-colors min-h-[44px] flex items-center justify-center"
                    >
                      Sign Up
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
          </>,
          document.body
        )}
      </header>
    </>
  );
};

export default Header;
