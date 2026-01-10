import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { Search, MapPin, ChevronRight, Star, User, ShoppingBag } from 'lucide-react';

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
      <div className="h-1 bg-[#121c32] relative z-[101]" />
      <header className="sticky top-0 z-[100] bg-white/95 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-8 py-4 flex items-center justify-between gap-8">
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center group-hover:rotate-12 transition-all shadow-xl shadow-orange-500/20">
              <span className="text-white font-black text-base italic font-display">YF</span>
            </div>
            <span className="text-2xl font-black text-[#121c32] tracking-tighter uppercase italic font-display">YardFront</span>
          </Link>

          <form onSubmit={handleSearch} className="flex-1 max-w-2xl hidden md:flex items-center group/search">
            <div className="flex-1 relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <Search size={16} strokeWidth={3} />
              </div>
              <input 
                type="text" 
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-l-md py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#FF6B35]/5 focus:border-[#FF6B35] transition-all font-body"
              />
            </div>
            <div className="w-48 relative border-l border-slate-200">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                <MapPin size={16} strokeWidth={3} />
              </div>
              <input 
                type="text" 
                placeholder="Location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-slate-50 border-y border-slate-200 py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-4 focus:ring-[#FF6B35]/5 focus:border-[#FF6B35] transition-all font-body"
              />
            </div>
            <button 
              type="submit" 
              className="bg-[#FF6B35] hover:bg-[#ff8452] text-white px-6 py-3 rounded-r-md transition-all active:scale-90 flex items-center shadow-lg shadow-orange-500/20"
            >
              <ChevronRight size={20} strokeWidth={4} />
            </button>
          </form>

          <div className="flex items-center gap-6">
            <Link 
              to="/sell-hub" 
              className="bg-[#FF6B35] hover:bg-[#ff8452] text-white px-6 py-3 rounded-md text-[10px] font-black uppercase tracking-[0.2em] hidden lg:block transition-all hover:-translate-y-1 italic font-display"
            >
              Start Selling
            </Link>
            <div className="hidden lg:block w-px h-6 bg-slate-200" />
            <div className="flex items-center gap-4">
              <Link to="/favorites" className="p-2 text-slate-400 hover:text-[#FF6B35] transition-all">
                <Star size={20} strokeWidth={2.5}/>
              </Link>
              <Link to="/profile" className="p-2 text-slate-400 hover:text-[#FF6B35] transition-all">
                <User size={20} strokeWidth={2.5}/>
              </Link>
              <Link to="/cart" className="p-2 text-slate-400 hover:text-[#FF6B35] transition-all">
                <ShoppingBag size={20} strokeWidth={2.5}/>
              </Link>
            </div>
            <div className="w-px h-6 bg-slate-200" />
            {user ? (
              <button 
                onClick={signOut} 
                className="text-sm font-black text-slate-600 hover:text-[#FF6B35] transition-colors font-display"
              >
                LOG OUT
              </button>
            ) : (
              <div className="flex items-center gap-6">
                <Link 
                  to="/login" 
                  className="text-xs font-black text-slate-600 hover:text-[#FF6B35] transition-colors uppercase tracking-[0.1em] font-display"
                >
                  Log In
                </Link>
                <Link 
                  to="/signup" 
                  className="bg-[#121c32] hover:bg-slate-800 text-white px-6 py-3 rounded-md text-[10px] font-black uppercase tracking-[0.2em] transition-all font-display"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;
