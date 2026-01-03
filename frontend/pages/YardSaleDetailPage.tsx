
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { salesApi } from '../lib/api';
import { GarageSale } from '../types';

interface SaleItem {
  id: number;
  image: string;
  title: string;
  listedPrice: number;
  marketValue: { min: number; max: number };
  condition: string;
  isSteal: boolean;
  stealPercentage?: number;
  category: string;
}

const YardSaleDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showPriceAnalysis, setShowPriceAnalysis] = useState<number | null>(null);
  const [saleInfo, setSaleInfo] = useState<GarageSale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    const fetchSale = async () => {
      if (!id) return;
      
      setLoading(true);
      setError('');
      try {
        const data = await salesApi.get(id);
        const saleData: any = {
          id: data.id,
          title: data.title,
          description: data.description || '',
          date: data.date || '',
          time: data.time || '',
          image: data.image || '',
          images: data.images || [data.image || ''],
          tags: data.tags || [],
          location: data.address || '',
          address: data.address || '',
          hostName: data.hostName || '',
          isLive: data.date === new Date().toISOString().split('T')[0],
        };
        setSaleInfo(saleData);
      } catch (err: any) {
        console.error('Failed to fetch garage sale:', err);
        setError(err.message || 'Failed to load garage sale');
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id]);

  if (loading) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">Loading garage sale...</div>
      </div>
    );
  }

  if (error || !saleInfo) {
    return (
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center py-20">
          <p className="text-red-500">{error || 'Garage sale not found'}</p>
          <button onClick={() => navigate('/sales')} className="mt-4 text-primary">
            Back to Sales
          </button>
        </div>
      </div>
    );
  }

  // Mock items with AI price intelligence
  const items: SaleItem[] = [
    {
      id: 1,
      image: "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
      title: "Mid-Century Modern Lounge Chair",
      listedPrice: 45,
      marketValue: { min: 180, max: 250 },
      condition: "Good",
      isSteal: true,
      stealPercentage: 78,
      category: "Furniture"
    },
    {
      id: 2,
      image: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600",
      title: "Vintage Canon AE-1 Camera",
      listedPrice: 35,
      marketValue: { min: 120, max: 180 },
      condition: "Good",
      isSteal: true,
      stealPercentage: 71,
      category: "Electronics"
    },
    {
      id: 3,
      image: "https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600",
      title: "Set of 6 Dining Chairs",
      listedPrice: 80,
      marketValue: { min: 90, max: 140 },
      condition: "Like New",
      isSteal: false,
      category: "Furniture"
    },
    {
      id: 4,
      image: "https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600",
      title: "Kids' Bicycle (Ages 6-9)",
      listedPrice: 25,
      marketValue: { min: 60, max: 95 },
      condition: "Good",
      isSteal: true,
      stealPercentage: 58,
      category: "Kids"
    },
    {
      id: 5,
      image: "https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=600",
      title: "Hardcover Book Collection (50+ books)",
      listedPrice: 20,
      marketValue: { min: 25, max: 40 },
      condition: "Good",
      isSteal: false,
      category: "Books"
    },
    {
      id: 6,
      image: "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=600",
      title: "Ninja Blender System",
      listedPrice: 30,
      marketValue: { min: 75, max: 110 },
      condition: "Like New",
      isSteal: true,
      stealPercentage: 60,
      category: "Kitchen"
    }
  ];

  const stealItems = items.filter(item => item.isSteal);
  const totalPotentialSavings = stealItems.reduce((sum, item) => 
    sum + (item.marketValue.max - item.listedPrice), 0
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      
      {/* Back Button Integrated Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
            </svg>
            <span>Back to Sales Feed</span>
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-8">
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* Left - Large Interactive Gallery */}
            <div>
              <div className="relative aspect-[4/3] bg-slate-100 rounded-2xl overflow-hidden shadow-sm mb-4">
                <img 
                  src={saleInfo.images[0]}
                  alt="Yard sale"
                  className="w-full h-full object-cover"
                />
                {saleInfo.isLive && (
                  <div className="absolute top-5 right-5">
                    <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm text-slate-900 text-xs font-bold px-3 py-1.5 rounded-full border border-slate-200 shadow-xl tracking-wider uppercase">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                      <span>Happening Now</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-4 gap-3">
                {saleInfo.images.map((img, idx) => (
                  <div key={idx} className="aspect-video bg-slate-100 rounded-xl overflow-hidden cursor-pointer hover:ring-2 hover:ring-orange-500 transition-all border border-slate-200">
                    <img src={img} alt={`View ${idx + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Right - Sale Content & Action Hub */}
            <div className="flex flex-col">
              <div className="flex-1">
                <div className="inline-flex items-center gap-1.5 bg-orange-50 text-orange-600 text-[10px] font-black px-2.5 py-1 rounded-md mb-4 uppercase tracking-widest border border-orange-100">
                  Verified Yard Sale
                </div>
                <h1 className="text-3xl font-black text-slate-900 mb-4 leading-tight tracking-tight">
                  {saleInfo.title}
                </h1>
                
                <div className="space-y-4 mb-8">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-13a.75.75 0 00-1.5 0v5c0 .414.336.75.75.75h4a.75.75 0 000-1.5h-3.25V5z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{saleInfo.date}</p>
                      <p className="text-xs text-slate-500 font-medium">{saleInfo.time}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"/><path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold">{saleInfo.location}</p>
                      <p className="text-xs text-slate-500 font-medium">{saleInfo.distance}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 text-slate-600">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"/>
                      </svg>
                    </div>
                    <p className="text-sm font-medium leading-snug">{saleInfo.address}</p>
                  </div>
                </div>
                
                <p className="text-base text-slate-600 leading-relaxed mb-8 font-medium">
                  {saleInfo.description}
                </p>
              </div>
              
              {/* Primary Actions */}
              <div className="flex items-center gap-3">
                <button className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold px-6 py-4 rounded-xl transition-all shadow-lg shadow-orange-500/20 active:scale-95">
                  Navigate to Yard
                </button>
                <button className="p-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all shadow-sm">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"/>
                  </svg>
                </button>
                <button className="p-4 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl transition-all shadow-sm">
                  <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/>
                  </svg>
                </button>
              </div>
              
              <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                    SJ
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Hosted by</p>
                    <p className="text-sm font-bold text-slate-900">{saleInfo.hostName}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <svg key={i} className="w-3.5 h-3.5 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Treasure Scanner Intelligence Alert */}
      {stealItems.length > 0 && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-y border-emerald-100">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
              <div className="w-16 h-16 bg-emerald-500 rounded-[24px] flex items-center justify-center flex-shrink-0 shadow-lg shadow-emerald-500/20 rotate-3">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                </svg>
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-black text-slate-900 mb-1 leading-none tracking-tight">
                  🎯 Stitch Scanner Detected {stealItems.length} Major Steals!
                </h3>
                <p className="text-sm text-slate-600 mb-5 font-medium leading-relaxed max-w-2xl">
                  Our price engine cross-referenced current market values on eBay and FB Marketplace. 
                  <span className="text-emerald-600 font-black ml-1">Total potential neighborhood savings: ${totalPotentialSavings}+</span>
                </p>
                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                  {stealItems.slice(0, 3).map((item) => (
                    <div key={item.id} className="inline-flex items-center gap-2 bg-white text-emerald-700 text-[10px] font-black px-3 py-1.5 rounded-lg border border-emerald-200 shadow-sm uppercase tracking-wider">
                      <span>{item.title}</span>
                      <span className="bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded">-{item.stealPercentage}%</span>
                    </div>
                  ))}
                  {stealItems.length > 3 && (
                    <div className="inline-flex items-center text-[10px] font-black text-emerald-500 uppercase tracking-widest ml-1">
                      +{stealItems.length - 3} MORE TREASURES
                    </div>
                  )}
                </div>
              </div>
              <div className="hidden xl:block">
                 <div className="p-4 bg-white/40 backdrop-blur rounded-2xl border border-emerald-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Last Update</p>
                    <p className="text-xs font-bold text-slate-700">Live Signal: 4 mins ago</p>
                 </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Items Grid Section */}
      <div className="max-w-7xl mx-auto px-6 py-16 flex-grow">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">
              Items at This Sale ({items.length})
            </h2>
            <p className="text-slate-500 font-medium">Scanned and cataloged by host.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sort by:</span>
            <select className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg px-4 py-2 outline-none focus:border-orange-500 shadow-xs">
              <option>Best Neighborhood Steals</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Recently Scanned</option>
            </select>
          </div>
        </div>

        {/* Professional Items Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {items.map((item) => (
            <article 
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-xl transition-all duration-300 cursor-pointer group flex flex-col"
            >
              
              {/* Item Visual */}
              <div className="relative aspect-square bg-slate-100 overflow-hidden">
                <img 
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Steal Indicator Badge */}
                {item.isSteal && (
                  <div className="absolute top-4 left-4">
                    <span className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-[10px] font-black px-2.5 py-1.5 rounded-lg shadow-xl uppercase tracking-widest">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                      </svg>
                      <span>HUGE STEAL</span>
                    </span>
                  </div>
                )}
                
                {/* AI Intelligence Toggle */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowPriceAnalysis(showPriceAnalysis === item.id ? null : item.id); }}
                  className="absolute top-4 right-4 bg-slate-900/90 backdrop-blur-md hover:bg-slate-900 text-white text-[10px] font-black px-3 py-2 rounded-lg border border-white/10 shadow-xl transition-all flex items-center gap-2 group/btn active:scale-95"
                >
                  <span className="material-symbols-outlined !text-sm text-orange-400 group-hover/btn:animate-spin-slow">magic_button</span>
                  <span>AI APPRAISAL</span>
                </button>
              </div>
              
              {/* Item Details */}
              <div className="p-6 flex flex-col flex-1">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h3 className="text-lg font-black text-slate-900 leading-tight flex-1 group-hover:text-orange-500 transition-colors">
                    {item.title}
                  </h3>
                </div>
                
                <div className="flex items-center gap-2 mb-6">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-wider">{item.category}</span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-500 text-[9px] font-black rounded-md uppercase tracking-wider">{item.condition}</span>
                </div>
                
                {/* Price Display */}
                <div className="mt-auto flex items-end justify-between pt-6 border-t border-slate-50">
                  <div>
                    <p className="text-3xl font-black text-slate-900 tracking-tighter">
                      ${item.listedPrice}
                    </p>
                    {item.isSteal && (
                      <p className="text-[10px] text-slate-400 line-through font-bold uppercase tracking-widest mt-1">
                        Market Avg: ${item.marketValue.max}
                      </p>
                    )}
                  </div>
                  
                  {item.isSteal && (
                    <div className="text-right">
                      <div className="text-xs font-black text-emerald-600 flex items-center justify-end gap-1">
                        <span className="material-symbols-outlined !text-sm">trending_down</span>
                        <span>SAVE ${item.marketValue.max - item.listedPrice}</span>
                      </div>
                      <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                        {item.stealPercentage}% LOCAL DISCOUNT
                      </p>
                    </div>
                  )}
                </div>
                
                {/* AI Detail Panel (Animated Dropdown) */}
                {showPriceAnalysis === item.id && (
                  <div className="mt-6 pt-6 border-t border-slate-100 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                    <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-inner relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl"></div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="material-symbols-outlined !text-lg text-orange-400">insights</span>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-400">Market Intelligence</h4>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">Web Range</span>
                          <span className="font-black text-white">${item.marketValue.min} - ${item.marketValue.max}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400 font-bold uppercase tracking-wider">Current List</span>
                          <span className="font-black text-orange-400">${item.listedPrice}</span>
                        </div>
                        
                        {item.isSteal && (
                          <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-emerald-400 font-black text-[10px] uppercase tracking-[0.15em] leading-tight">
                              ⚡ Verified neighborhood deal. Priced significantly lower than active Seattle/Austin resale listings.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              
            </article>
          ))}
        </div>
      </div>

    </div>
  );
};

export default YardSaleDetailPage;
