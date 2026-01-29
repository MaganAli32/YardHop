
import React, { useState, useMemo, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import ProductCard from '../components/ProductCard';
import { usePersistence } from '../store/PersistenceContext';
import { productsApi, salesApi } from '../lib/api';
import { formatLocation } from '../lib/locationUtils';
import { Product, GarageSale } from '../types';
import { FALLBACK_IMAGE, PRODUCTS, SALES } from '../data';

/** Haversine formula: distance in miles between two lat/lng points */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/** Get display string for a sale's location (address or display_text, formatted) */
function formatLocationDisplay(sale: GarageSale): string {
  const raw =
    sale.address ||
    sale.display_text ||
    (sale as any).location ||
    '';
  if (!raw) return '';
  const { neighborhood, cityState } = formatLocation(raw);
  return neighborhood ? `${neighborhood}, ${cityState}` : cityState;
}

/** Debug: log sale location fields (call from SalesEventCard where we have userCoords) */
function logLocationDebug(
  sale: GarageSale,
  userCoords: { lat: number; lng: number } | null,
  calculatedDistance: number | null,
  finalDisplay: string
): void {
  console.log('formatLocationDisplay called with:', {
    saleId: sale.id,
    display_text: sale.display_text,
    address: sale.address,
    latitude: sale.latitude,
    longitude: sale.longitude,
    display_latitude: sale.display_latitude,
    display_longitude: sale.display_longitude,
    userCoords: userCoords ?? undefined
  });
  if (calculatedDistance != null) {
    console.log('Distance calculated:', calculatedDistance.toFixed(2));
  }
  console.log('Final location display:', finalDisplay);
}

const SearchSkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" aria-busy="true">
    {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
      <div key={i} className="animate-pulse rounded-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-200 h-48" />
        <div className="p-4 space-y-2">
          <div className="bg-slate-200 h-4 rounded w-3/4" />
          <div className="bg-slate-200 h-4 rounded w-1/2" />
          <div className="bg-slate-200 h-3 rounded w-1/3 mt-3" />
        </div>
      </div>
    ))}
  </div>
);

const EventsSkeletonList = () => (
  <div className="space-y-8" aria-busy="true">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-50 flex items-start gap-4">
          <div className="w-12 h-12 bg-slate-200 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="bg-slate-200 h-5 rounded w-2/3" />
            <div className="bg-slate-200 h-4 rounded w-1/4" />
          </div>
        </div>
        <div className="aspect-[21/9] bg-slate-200" />
        <div className="p-5 bg-slate-50">
          <div className="bg-slate-200 h-3 rounded w-full" />
        </div>
      </div>
    ))}
  </div>
);

const CATEGORIES = [
  { name: 'All', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"/>
    </svg>
  ) },
  { name: 'Furniture', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"/>
    </svg>
  ) },
  { name: 'Electronics', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25"/>
    </svg>
  ) },
  { name: 'Clothing', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
    </svg>
  ) },
  { name: 'Kids', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z"/>
    </svg>
  ) },
  { name: 'Antiques', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"/>
    </svg>
  ) },
  { name: 'Tools', icon: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
      <path d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
    </svg>
  ) },
];

const SearchPage: React.FC = () => {
  const { coords } = usePersistence();
  console.log('SearchPage coords from usePersistence:', coords);
  const [searchParams] = useSearchParams();
  const initialView = searchParams.get('view') === 'map' ? 'map' : 'grid';
  const initialMode = searchParams.get('mode') === 'items' ? 'items' : 'events';

  const [mode, setMode] = useState<'events' | 'items'>(initialMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [distanceRange, setDistanceRange] = useState<number>(10);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [onlyLive, setOnlyLive] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>(initialView);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<GarageSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [pulse, setPulse] = useState<string>("Analyzing your neighborhood...");
  const [isPulseLoading, setIsPulseLoading] = useState(true);

  // Update mode when URL changes - trigger refetch when mode changes
  useEffect(() => {
    const urlMode = searchParams.get('mode') === 'items' ? 'items' : 'events';
    if (urlMode !== mode) {
      setMode(urlMode);
      // Force loading state to trigger refetch
      setLoading(true);
    }
  }, [searchParams]);

  // Fetch products from API (when in 'items' mode)
  useEffect(() => {
    // Only fetch products when in 'items' mode
    if (mode !== 'items') {
      return;
    }

    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const params: any = {
          sort_by: 'newest',
        };

        if (selectedCategory !== 'All') {
          params.category = selectedCategory;
        }

        if (coords) {
          params.latitude = coords.lat;
          params.longitude = coords.lng;
          params.radius = distanceRange;
        }

        const data = await productsApi.list(params);
        console.log('Products API response:', data);
        // API returns { products: [], pagination: {} }
        const apiProducts = data?.products || [];
        
        if (apiProducts && apiProducts.length > 0) {
          console.log(`Loaded ${apiProducts.length} products from API`);
          setProducts(apiProducts);
        } else {
          // If API returns empty but no error, might just be no products in database
          // Use mock data as fallback for testing (remove in production)
          console.warn('No products returned from API, using mock data for testing');
          setProducts(PRODUCTS);
        }
      } catch (err: any) {
        console.error('Failed to fetch products:', err);
        // Check if it's a connection error vs actual API error
        if (err?.message?.includes('Cannot connect') || err?.message?.includes('Failed to fetch')) {
          // Backend might be down - use mock data as fallback
          console.warn('Backend unavailable, using mock data for testing');
          setError('Backend connection failed. Showing demo data.');
          setProducts(PRODUCTS);
        } else {
          setError(err.message || 'Failed to load products');
          setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [mode, selectedCategory, distanceRange, coords]);

  // Fetch garage sales from API (when in 'events' mode)
  useEffect(() => {
    // Only fetch sales when in 'events' mode
    if (mode !== 'events') {
      return;
    }

    const fetchSales = async () => {
      setLoading(true);
      setError('');
      try {
        const params: any = {};
        if (coords) {
          params.latitude = coords.lat;
          params.longitude = coords.lng;
          params.radius = distanceRange;
        }

        const data = await salesApi.list(params);
        console.log('Sales API response:', data);
        // API returns { sales: [], pagination: {} }
        // Ensure each sale has an image field, extract from images array if needed
        const apiSales = (data?.sales || []).map((sale: any) => {
          let imageUrl = sale.image;
          // If no image field, try to extract from images array
          if (!imageUrl && sale.images && Array.isArray(sale.images) && sale.images.length > 0) {
            const primary = sale.images.find((img: any) => img.is_primary);
            imageUrl = primary?.url || sale.images[0]?.url;
          }
          // Fallback to placeholder if still no image
          if (!imageUrl) {
            imageUrl = FALLBACK_IMAGE;
          }
          return { ...sale, image: imageUrl };
        });
        
        if (apiSales && apiSales.length > 0) {
          console.log(`Loaded ${apiSales.length} sales from API`);
          setSales(apiSales);
        } else {
          // Use mock data as fallback for testing
          console.warn('No sales returned from API, using mock data for testing');
          setSales(SALES);
        }
      } catch (err: any) {
        console.error('Failed to fetch garage sales:', err);
        // Check if it's a connection error vs actual API error
        if (err?.message?.includes('Cannot connect') || err?.message?.includes('Failed to fetch')) {
          // Backend might be down - use mock data as fallback
          console.warn('Backend unavailable, using mock data for testing');
          setError('Backend connection failed. Showing demo data.');
          setSales(SALES);
        } else {
          setError(err.message || 'Failed to load garage sales');
          setSales(SALES); // Still show mock data on error
        }
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [mode, distanceRange, coords]);

  useEffect(() => {
    if (mode === 'events') {
      setPulse("Perfect weather for yard hopping! Active sales found nearby.");
    } else {
      setPulse("Discovering unique treasures in your neighborhood...");
    }
    setIsPulseLoading(false);
  }, [sales, mode]);

  const filteredItems = useMemo(() => {
    let filtered = products;
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => 
        p.tags?.some(t => t.toLowerCase() === selectedCategory.toLowerCase()) ||
        p.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    return filtered;
  }, [products, searchQuery, selectedCategory]);

  const filteredEvents = useMemo(() => {
    return sales.filter(s => {
      const matchesSearch = !searchQuery || s.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || s.tags?.some(t => t.toLowerCase() === selectedCategory.toLowerCase());
      const matchesLive = !onlyLive || s.date === 'Today';
      return matchesSearch && matchesCategory && matchesLive;
    });
  }, [sales, searchQuery, selectedCategory, onlyLive]);

  return (
    <div className="min-h-screen bg-white">
      <div className="flex h-[calc(100vh-64px)] overflow-hidden">
        
        {/* Left Sidebar - Design Optimized Sidebar */}
        <aside className="w-72 bg-white border-r border-slate-200 h-screen sticky top-16 overflow-y-auto hidden md:block">
          <div className="p-6">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">NEIGHBORHOOD SCOUT</h2>
              <button 
                onClick={() => {
                  setSelectedCategory('All');
                  setDistanceRange(10);
                  setSearchQuery('');
                  setOnlyLive(false);
                }}
                className="text-xs font-medium text-orange-500 hover:text-orange-600 transition"
              >
                CLEAR
              </button>
            </div>
            
            {/* Proximity Slider */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-bold text-slate-900 uppercase tracking-wider">
                  Proximity
                </label>
                <span className="text-xs font-bold text-slate-900">{distanceRange} MI</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="50" 
                value={distanceRange}
                onChange={e => setDistanceRange(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-orange-500"
              />
            </div>
            
            {/* Event Availability */}
            <div className="mb-10 pb-8 border-b border-slate-200">
              <label className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-4 block">
                Availability
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox"
                  checked={onlyLive}
                  onChange={() => setOnlyLive(!onlyLive)}
                  className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
                />
                <span className="text-sm font-medium text-slate-700">Only Live Today</span>
              </label>
            </div>
            
            {/* Categories */}
            <div>
              <label className="text-[10px] font-bold text-slate-900 uppercase tracking-wider mb-4 block">
                Categories
              </label>
              <div className="space-y-1">
                {CATEGORIES.map(cat => (
                  <button 
                    key={cat.name}
                    onClick={() => setSelectedCategory(cat.name)}
                    className={selectedCategory === cat.name 
                      ? "w-full flex items-center gap-3 px-4 py-2.5 bg-orange-500 text-white rounded-lg transition"
                      : "w-full flex items-center gap-3 px-4 py-2.5 text-slate-700 hover:bg-slate-50 rounded-lg transition"
                    }
                  >
                    <div className={selectedCategory === cat.name ? 'text-white' : 'text-slate-400'}>
                      {cat.icon}
                    </div>
                    <span className="text-xs font-semibold uppercase tracking-wide">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Feed Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Top Hub Bar */}
          <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
            <div className="px-6 py-5">
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                
                {/* Mode Toggles */}
                <div className="flex items-center gap-3 bg-slate-100 p-1 rounded-xl w-fit">
                  <button 
                    onClick={() => setMode('events')}
                    className={mode === 'events' 
                      ? "inline-flex items-center gap-2 bg-orange-50 text-orange-600 font-medium px-4 py-2 rounded-lg border border-orange-200 text-sm"
                      : "inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium px-4 py-2 rounded-lg text-sm transition"
                    }
                  >
                    <span>YARD SALES</span>
                  </button>
                  <button 
                    onClick={() => setMode('items')}
                    className={mode === 'items' 
                      ? "inline-flex items-center gap-2 bg-orange-50 text-orange-600 font-medium px-4 py-2 rounded-lg border border-orange-200 text-sm"
                      : "inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 font-medium px-4 py-2 rounded-lg text-sm transition"
                    }
                  >
                    <span>UNIQUE FINDS</span>
                  </button>
                </div>

                {/* Search Bar */}
                <div className="flex-1 flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
                  <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                  </svg>
                  <input 
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder={`Find nearby ${mode === 'events' ? 'yard sales' : 'treasures'}...`}
                    className="flex-1 bg-transparent text-sm text-slate-900 placeholder-slate-500 outline-none"
                  />
                </div>
              </div>

              {/* Neighborhood Pulse Label */}
              <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 w-fit px-3 py-1.5 rounded-full border border-slate-100">
                <span className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></span>
                <span>PULSE: <span className="text-slate-900">{isPulseLoading ? 'STITCH IS ANALYZING...' : pulse}</span></span>
              </div>
            </div>
          </div>

          {/* Feed Content */}
          <div className="flex-1 overflow-y-auto p-6 md:px-10 md:py-8">
            <div className="max-w-6xl mx-auto">
              {mode === 'events' ? (
                <>
                  {loading ? (
                    <EventsSkeletonList />
                  ) : error ? (
                    <div className="text-center py-20 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-red-600 font-medium mb-4">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : filteredEvents.length > 0 ? (
                    <div className="space-y-8">
                      {filteredEvents.map(sale => (
                        <SalesEventCard key={sale.id} sale={sale} userCoords={coords} />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium italic">No neighborhood sales found in this range.</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  {loading ? (
                    <SearchSkeletonGrid />
                  ) : error ? (
                    <div className="text-center py-20 bg-red-50 rounded-xl border border-red-200">
                      <p className="text-red-600 font-medium mb-4">{error}</p>
                      <button
                        onClick={() => window.location.reload()}
                        className="text-sm text-red-600 hover:text-red-700 underline"
                      >
                        Try again
                      </button>
                    </div>
                  ) : filteredItems.length === 0 ? (
                    <div className="text-center py-20 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <p className="text-slate-400 font-medium italic mb-4">
                        {products.length === 0 
                          ? 'No products found. Be the first to list something!'
                          : 'No products match your filters. Try adjusting your search.'}
                      </p>
                      {products.length === 0 && (
                        <Link
                          to="/create"
                          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold px-6 py-3 rounded-lg transition"
                        >
                          Create First Listing
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {filteredItems.map(product => (
                        <ProductCard key={product.id} product={product} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

// --- UPDATED YARD SALE CARD COMPONENT ---

interface SalesEventCardProps {
  sale: GarageSale;
  userCoords: { lat: number; lng: number } | null;
}

const SalesEventCard: React.FC<SalesEventCardProps> = ({ sale, userCoords }) => {
  const [imgSrc, setImgSrc] = useState(sale.image);
  const locationStr =
    sale.address ||
    sale.display_text ||
    (sale as any).location ||
    '';
  const { neighborhood, cityState } = formatLocation(locationStr);
  // Use backend distance if provided; otherwise calculate from user coords + sale coords
  const saleLat = sale.display_latitude ?? sale.latitude;
  const saleLng = sale.display_longitude ?? sale.longitude;
  const calculatedDistance =
    userCoords && saleLat != null && saleLng != null
      ? calculateDistance(userCoords.lat, userCoords.lng, saleLat, saleLng)
      : null;
  const distance =
    sale.distance ??
    (calculatedDistance != null ? `${calculatedDistance.toFixed(1)} mi away` : undefined);

  const finalDisplay = neighborhood
    ? `${neighborhood}${distance ? ` • ${distance}` : ''}`
    : (cityState || 'Location not specified');
  logLocationDebug(sale, userCoords, calculatedDistance ?? null, finalDisplay);

  return (
    <article className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition cursor-pointer group">
      
      {/* Header Info */}
      <div className="p-5 border-b border-slate-50 flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="w-12 h-12 bg-slate-900 rounded-lg flex items-center justify-center flex-shrink-0 text-white shadow-sm">
            <span className="material-symbols-outlined">storefront</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900 mb-1 leading-tight group-hover:text-orange-500 transition-colors">
              {sale.title}
            </h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-orange-500 font-medium text-sm">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd"/>
                </svg>
                <span className="uppercase tracking-wide">{sale.date}</span>
              </div>
              <span className="text-xs text-slate-500 font-medium">{sale.time}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Visual */}
      <Link to={`/sales/${sale.id}`} className="relative aspect-[21/9] bg-slate-100 overflow-hidden block">
        <img 
          src={imgSrc} 
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
          alt={sale.title}
        />
        
        {/* Live Indicator Overlay */}
        {sale.date === 'Today' && (
          <div className="absolute top-4 right-4">
            <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm text-slate-900 text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span className="uppercase tracking-wider">Happening Now</span>
            </div>
          </div>
        )}
        
        {/* Location Badge Overlay */}
        <div className="absolute bottom-4 left-4">
          <div className="flex items-start gap-2 bg-slate-900/90 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-md min-w-0 max-w-[85%]">
            <svg className="w-3.5 h-3.5 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden />
            <div className="flex flex-col min-w-0">
              <span className="uppercase tracking-wide">
                {neighborhood ? `${neighborhood}${distance ? ` • ${distance}` : ''}` : cityState || 'Location not specified'}
              </span>
              {cityState && (neighborhood || distance) && (
                <span className="truncate text-slate-300">{cityState}</span>
              )}
            </div>
          </div>
        </div>
      </Link>
      
      {/* Footer Info */}
      <div className="p-5 bg-slate-50 flex items-center justify-between border-t border-slate-100">
        <p className="text-xs text-slate-500 font-medium line-clamp-1 max-w-[70%]">
          {sale.description}
        </p>
        <Link 
          to={`/sales/${sale.id}`}
          className="text-[10px] font-bold text-orange-500 hover:text-orange-600 uppercase tracking-widest transition"
        >
          EXPLORE ITEMS
        </Link>
      </div>
    </article>
  );
};

export default SearchPage;
