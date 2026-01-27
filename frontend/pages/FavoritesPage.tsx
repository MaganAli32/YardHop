
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { usePersistence } from '../store/PersistenceContext';
import { favoritesApi } from '../lib/api';
import { Product } from '../types';

const FavoritesPage: React.FC = () => {
  const { authToken } = usePersistence();
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'steals' | 'recent'>('all');

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!authToken) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');
      try {
        const data = await favoritesApi.list();
        // Extract favorites array from response object
        setFavorites(data?.favorites || []);
      } catch (err: any) {
        // Check if backend is unavailable (silently handle this case)
        if (err?.isBackendUnavailable) {
          // Backend API not available - silently use empty array
          setFavorites([]);
          // Don't show error message for unavailable backend
        } else {
          // Only log/show errors for actual API errors
          console.error('Failed to fetch favorites:', err);
          setError(err.message || 'Failed to load favorites');
          setFavorites([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [authToken]);

  const handleRemoveFavorite = async (productId: string) => {
    if (!authToken) return;

    try {
      await favoritesApi.remove(productId);
      setFavorites(prev => prev.filter(f => f.id !== productId));
    } catch (err: any) {
      console.error('Failed to remove favorite:', err);
      alert(err.message || 'Failed to remove favorite');
    }
  };

  if (!authToken) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Please log in to view favorites</h2>
          <Link to="/login" className="text-primary">Log In</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center">
          <RefreshCw className="animate-spin text-[#FF6B35]" size={32} aria-hidden />
          <span className="mt-3 text-slate-600 font-medium">Loading favorites...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20 text-red-500">{error}</div>
      </div>
    );
  }

  const filteredItems = favorites.filter(item => {
    if (filter === 'steals') return item.isSteal;
    return true;
  });

  const totalSavings = favorites
    .filter(item => item.isSteal && item.market_average)
    .reduce((sum, item) => sum + ((item.market_average || 0) - item.price), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight">
                My Favorites
              </h1>
              <p className="text-base text-slate-600 font-medium">
                {favorites.length} {favorites.length === 1 ? 'item' : 'items'} saved
                {totalSavings > 0 && (
                  <span className="text-green-600 font-bold ml-2">
                    • Potential savings: ${totalSavings}
                  </span>
                )}
              </p>
            </div>
            
            {favorites.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filter:</span>
                <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                      filter === 'all'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilter('steals')}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                      filter === 'steals'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Steals
                  </button>
                  <button
                    onClick={() => setFilter('recent')}
                    className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${
                      filter === 'recent'
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Recent
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {favorites.length === 0 ? (
          /* Empty State */
          <div className="bg-white rounded-3xl border border-slate-200 p-20 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/>
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">
              Your wishlist is empty
            </h3>
            <p className="text-slate-500 font-medium mb-10">
              Start saving items you love to keep track of neighborhood treasures.
            </p>
            <Link
              to="/search"
              className="inline-flex items-center gap-3 bg-primary hover:bg-orange-600 text-white font-black px-10 py-5 rounded-2xl transition-all shadow-xl shadow-primary/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span className="uppercase tracking-[0.1em] text-sm">Explore Marketplace</span>
            </Link>
          </div>
        ) : (
          /* Items Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 animate-fadeIn">
            {filteredItems.map((item) => (
              <article 
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-xl transition-all duration-300 group"
              >
                
                {/* Image */}
                <Link to={item.saleId ? `/sales/${item.saleId}` : `/product/${item.id}`}>
                  <div className="relative aspect-square bg-slate-50 overflow-hidden">
                    <img 
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    
                    {/* Steal Badge */}
                    {item.isSteal && (
                      <div className="absolute top-4 left-4">
                        <span className="inline-flex items-center gap-1.5 bg-green-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-xl uppercase tracking-widest">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                          </svg>
                          <span>{item.stealPercentage}% OFF</span>
                        </span>
                      </div>
                    )}
                    
                    {/* Remove Button */}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleRemoveFavorite(item.id);
                      }}
                      className="absolute top-4 right-4 w-10 h-10 bg-white/95 hover:bg-white text-primary rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90"
                    >
                      <svg className="w-5 h-5 fill-current" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/>
                      </svg>
                    </button>
                  </div>
                </Link>
                
                {/* Content */}
                <div className="p-6">
                  <Link to={`/product/${item.id}`}>
                    <h3 className="text-base font-black text-slate-900 mb-2 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                      {item.title}
                    </h3>
                  </Link>
                  
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/>
                      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                    </svg>
                    <span>{item.location}{item.distance ? ` • ${item.distance}` : ''}</span>
                  </div>
                  
                  <div className="flex items-end justify-between pt-4 border-t border-slate-50">
                    <div>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">
                        ${item.price}
                      </p>
                      {item.isSteal && item.market_average && (
                        <p className="text-[10px] text-slate-400 line-through font-bold uppercase tracking-widest">
                          Market: ${item.market_average}
                        </p>
                      )}
                    </div>
                    
                    {item.isSteal && item.market_average && (
                      <div className="text-right">
                        <p className="text-xs font-black text-green-600 uppercase tracking-widest">
                          SAVE ${Math.round(item.market_average - item.price)}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {item.tags && item.tags.length > 0 && (
                    <div className="mt-4 flex items-center gap-2">
                      {item.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="px-2 py-1 bg-slate-50 text-slate-400 text-[9px] font-black rounded uppercase tracking-widest">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
                
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoritesPage;
