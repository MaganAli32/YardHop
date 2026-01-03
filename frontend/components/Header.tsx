import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';

const Header: React.FC = () => {
  const { user, signOut } = usePersistence();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('Temecula, CA');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery)}&location=${encodeURIComponent(location)}`);
    }
  };

  return (
    <>
      {/* Navy Accent Bar */}
      <div className="h-1 bg-slate-900" />
      
      <header className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-6 py-4 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 bg-orange-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">YH</span>
            </div>
            <span className="text-xl font-bold text-slate-900">YardHop</span>
          </Link>

          {/* Dual Search Inputs */}
          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex items-center">
            {/* Item Search */}
            <div className="flex-1 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="8"/>
                  <path strokeLinecap="round" d="m21 21-4.35-4.35"/>
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-l-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-slate-400"
              />
            </div>
            
            {/* Location Search */}
            <div className="w-48 relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                </svg>
              </div>
              <input 
                type="text" 
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border-y border-slate-200 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all placeholder:text-slate-400"
              />
            </div>
            
            {/* Search Button with Arrow */}
            <button 
              type="submit"
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-r-md transition-colors flex items-center justify-center"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
              </svg>
            </button>
          </form>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Start Selling Button */}
            <Link 
              to="/sell-hub" 
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all hidden lg:block"
            >
              Start Selling
            </Link>
            
            {/* Divider */}
            <div className="hidden lg:block w-px h-6 bg-slate-200" />
            
            {/* User Icons */}
            <div className="flex items-center gap-1">
              <Link 
                to="/favorites" 
                className="p-2 text-slate-500 hover:text-orange-500 hover:bg-slate-50 rounded-lg transition-all" 
                title="Favorites"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
                </svg>
              </Link>
              
              <Link 
                to="/profile" 
                className="p-2 text-slate-500 hover:text-orange-500 hover:bg-slate-50 rounded-lg transition-all" 
                title="Profile"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
                </svg>
              </Link>
              
              <Link 
                to="/cart" 
                className="p-2 text-slate-500 hover:text-orange-500 hover:bg-slate-50 rounded-lg transition-all" 
                title="Cart"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
                </svg>
              </Link>
            </div>
            
            {/* Divider */}
            <div className="w-px h-6 bg-slate-200" />
            
            {/* Auth Buttons - Show based on login state */}
            {user ? (
              // Logged In: Show user menu or sign out
              <div className="flex items-center gap-2">
                <Link 
                  to="/profile" 
                  className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-orange-500 transition-colors"
                >
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-xs">
                      {user.email?.charAt(0).toUpperCase() || user.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </Link>
                <button 
                  onClick={signOut}
                  className="text-sm font-semibold text-slate-500 hover:text-orange-500 transition-colors"
                >
                  Log Out
                </button>
              </div>
            ) : (
              // Logged Out: Show Log In + Sign Up
              <>
                <Link 
                  to="/login" 
                  className="text-sm font-semibold text-slate-600 hover:text-orange-500 transition-colors"
                >
                  Log In
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
