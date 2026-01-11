import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { salesApi } from '../lib/api';
import { GarageSale } from '../types';

// Fallback image constant
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop';

const GarageSalesPage: React.FC = () => {
  const { coords } = usePersistence();
  const [sales, setSales] = useState<GarageSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSales = async () => {
      setLoading(true);
      setError('');
      try {
        const params: any = {};
        if (coords) {
          params.latitude = coords.lat;
          params.longitude = coords.lng;
          params.radius = 10;
        }
        const data = await salesApi.list(params);
        
        // Helper to extract primary image URL from a sale object
        const getSaleImage = (sale: any): string => {
          // If there's already an image field with a value
          if (sale.image && typeof sale.image === 'string' && sale.image.trim() !== '') {
            return sale.image;
          }
          
          // If images is an array, extract from it
          if (Array.isArray(sale.images) && sale.images.length > 0) {
            // Sort by is_primary first, then by order_index
            const sorted = [...sale.images].sort((a: any, b: any) => {
              if (a?.is_primary && !b?.is_primary) return -1;
              if (!a?.is_primary && b?.is_primary) return 1;
              return (a?.order_index || 0) - (b?.order_index || 0);
            });
            
            const first = sorted[0];
            
            // If it's a string
            if (typeof first === 'string' && first.trim() !== '') {
              return first;
            }
            
            // If it's an object with url property
            if (first && typeof first === 'object' && first.url) {
              return first.url;
            }
          }
          
          return FALLBACK_IMAGE;
        };
        
        // Process sales to ensure each has an image field
        const salesWithImages = (data?.sales || []).map((sale: any) => ({
          ...sale,
          image: getSaleImage(sale)
        }));
        
        setSales(salesWithImages);
      } catch (err: any) {
        console.error('Failed to fetch garage sales:', err);
        setError(err.message || 'Failed to load garage sales');
        setSales([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [coords]);
  return (
    <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Sidebar Filters */}
        <aside className="lg:col-span-3">
          <div className="sticky top-24 space-y-8">
            <h1 className="text-2xl font-bold text-text-light dark:text-text-dark">Filters</h1>
            
            {/* Calendar Widget (Static for visual) */}
            <div className="space-y-2">
               <h2 className="font-bold text-lg text-text-light dark:text-text-dark">Date</h2>
               <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-lg p-3">
                  <div className="flex justify-between items-center mb-2 px-1">
                     <button className="hover:bg-border-light dark:hover:bg-border-dark rounded-full p-1"><span className="material-symbols-outlined">chevron_left</span></button>
                     <span className="font-bold">October 2024</span>
                     <button className="hover:bg-border-light dark:hover:bg-border-dark rounded-full p-1"><span className="material-symbols-outlined">chevron_right</span></button>
                  </div>
                  <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium">
                     {['S','M','T','W','T','F','S'].map(d => <div key={d} className="text-subtle-light">{d}</div>)}
                     {/* Simplified Days */}
                     {Array.from({length: 30}, (_, i) => i + 1).map(day => (
                        <div key={day} className={`h-8 flex items-center justify-center rounded-full cursor-pointer hover:bg-primary/20 ${day === 5 ? 'bg-primary text-white' : ''}`}>
                           {day}
                        </div>
                     ))}
                  </div>
               </div>
            </div>

             <div className="space-y-3">
                <h2 className="font-bold text-lg text-text-light dark:text-text-dark">Categories</h2>
                <div className="space-y-2">
                   {['Furniture', 'Electronics', 'Clothing', 'Toys & Games'].map(cat => (
                      <label key={cat} className="flex items-center gap-2 text-sm text-text-light dark:text-text-dark">
                         <input type="checkbox" className="rounded text-primary border-border-dark focus:ring-primary" defaultChecked />
                         {cat}
                      </label>
                   ))}
                </div>
             </div>
             
             <button className="w-full bg-primary text-white py-3 rounded-lg font-bold hover:bg-primary/90">Apply Filters</button>
          </div>
        </aside>

        {/* Main Content */}
        <section className="lg:col-span-9 xl:col-span-6">
           <div className="flex flex-col gap-6">
              <div className="flex flex-wrap justify-between items-end gap-4">
                 <div>
                    <h2 className="text-4xl font-semibold tracking-tight text-text-light dark:text-text-dark">All Garage Sales</h2>
                    <p className="text-subtle-light dark:text-subtle-dark">
                      {loading ? 'Loading...' : `Showing ${sales.length} results near you`}
                    </p>
                 </div>
                 <select className="bg-surface-light dark:bg-surface-dark border-border-light dark:border-border-dark rounded-lg py-2 pl-3 pr-10 text-sm">
                    <option>Nearest</option>
                    <option>Newest</option>
                 </select>
              </div>

              {/* Search Bar */}
              <div className="relative">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-subtle-light">
                    <span className="material-symbols-outlined">search</span>
                 </div>
                 <input type="text" className="block w-full pl-10 pr-3 py-3 border border-border-light dark:border-border-dark rounded-lg leading-5 bg-surface-light dark:bg-surface-dark placeholder-subtle-light focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm" placeholder="Search by keyword or location..." />
              </div>

              {/* Loading State */}
              {loading && (
                <div className="text-center py-20">Loading garage sales...</div>
              )}

              {/* Error State */}
              {error && (
                <div className="text-center py-20 text-red-500">{error}</div>
              )}

              {/* List */}
              {!loading && !error && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {sales.length === 0 ? (
                    <div className="col-span-2 text-center py-20 text-subtle-light">
                      No garage sales found. Be the first to create one!
                    </div>
                  ) : (
                    sales.map(sale => (
                      <Link 
                        key={sale.id} 
                        to={`/sales/${sale.id}`} 
                        className="flex flex-col bg-surface-light dark:bg-surface-dark rounded-lg overflow-hidden border border-border-light dark:border-border-dark hover:shadow-md transition-shadow cursor-pointer"
                      >
                        <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                          <img 
                            src={sale.image || FALLBACK_IMAGE} 
                            alt={sale.title} 
                            className="w-full h-full object-cover" 
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_IMAGE;
                            }} 
                          />
                        </div>
                        <div className="p-4 flex flex-col flex-1">
                          <h3 className="text-lg font-bold text-text-light dark:text-text-dark mb-1">{sale.title}</h3>
                          <p className="text-sm text-subtle-light dark:text-subtle-dark font-medium mb-2">
                            {sale.start_date || sale.date} • {sale.start_time || sale.time}
                          </p>
                          <p className="text-sm text-text-light dark:text-text-dark mb-4 flex-1 line-clamp-2">
                            {sale.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-auto">
                            {sale.tags?.map(tag => (
                              <span key={tag} className="px-2 py-1 bg-primary/10 text-primary text-xs font-bold rounded-md">{tag}</span>
                            ))}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}
           </div>
        </section>

        {/* Map View */}
        <aside className="hidden xl:col-span-3 xl:block">
           <div className="sticky top-24 h-[calc(100vh-8rem)] w-full rounded-lg overflow-hidden border border-border-light dark:border-border-dark">
              <div className="w-full h-full bg-cover bg-center" style={{backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBligbuEPyT0NPT0sQqTfotVgWGIkuSrzmPg4u2HTsTmUs4u9C9hyrhi8M0HtOGFmmXs5mEhF9JgGj8TueKhPScVEbj3SacIijZY38V23HOC8ejvGnVj3pNhIORYVD53FF8ob4MPKv7E7-PgT11mo47kqHefocykWq2g6_No14X0JpMYURFl-iOrlK542TDQi32R9XoxHMGDVF_cNK5_Y-EqRfprodbE2oHvSn_E2kJvZRX7xlO910GBWLm6MY7HnTMeVh5QrZG")'}}>
                 {/* Fake Pins */}
                 <div className="w-full h-full bg-black/10 flex items-center justify-center relative">
                    <span className="material-symbols-outlined text-red-500 absolute top-1/4 left-1/4 text-4xl drop-shadow-md">location_on</span>
                    <span className="material-symbols-outlined text-red-500 absolute top-1/2 left-1/2 text-4xl drop-shadow-md">location_on</span>
                    <span className="material-symbols-outlined text-red-500 absolute bottom-1/3 right-1/4 text-4xl drop-shadow-md">location_on</span>
                 </div>
              </div>
           </div>
        </aside>
      </div>
    </div>
  );
};

export default GarageSalesPage;
