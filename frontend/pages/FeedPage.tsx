
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { GoogleGenAI } from "@google/genai";
import { GarageSale, Product } from '../types';

const FeedPage: React.FC = () => {
  const { products, sales, posts } = usePersistence();
  const [pulse, setPulse] = useState<string>("Stitch is analyzing the neighborhood vibe...");
  const [isPulseLoading, setIsPulseLoading] = useState(true);

  useEffect(() => {
    const fetchPulse = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const context = sales.map(s => `${s.title}: ${s.description}`).join('\n');
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Analyze these local garage sales and provide a 1-sentence "Weekend Forecast". 
          Focus on what neighborhoods are most active.
          Sales:
          ${context}
          `,
        });
        setPulse(response.text || "Major garage sales happening in the North Loop area this Saturday.");
      } catch (e) {
        setPulse("It's a big weekend for Estate Sales in South Austin!");
      } finally {
        setIsPulseLoading(false);
      }
    };
    if (sales.length > 0) fetchPulse();
  }, [sales]);

  return (
    <div className="flex w-full flex-col items-center bg-[#F8FAFC] dark:bg-background-dark min-h-screen pb-24">
      
      {/* Neighborhood Pulse - Fixed Header */}
      <div className="w-full bg-white dark:bg-surface-dark border-b border-slate-200 dark:border-white/5 sticky top-[72px] z-30 py-4 px-6">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
           <div className="size-10 shrink-0 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-sm border border-primary/20">
              <span className="material-symbols-outlined !text-xl animate-pulse">magic_button</span>
           </div>
           <p className={`text-sm font-bold text-slate-800 dark:text-slate-200 transition-opacity ${isPulseLoading ? 'opacity-50' : 'opacity-100'}`}>
              {pulse}
           </p>
        </div>
      </div>

      <div className="w-full max-w-2xl px-4 py-8 space-y-12">
        
        {/* SECTION: LIVE SALES (Event Focused) */}
        <div className="space-y-6">
          <div className="flex justify-between items-end px-2">
             <h2 className="text-2xl font-black tracking-tight">Active Yard Sales</h2>
             <Link to="/search?view=map" className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">View Map</Link>
          </div>

          <div className="space-y-10">
            {sales.map((sale) => (
              <GarageSalePost key={sale.id} sale={sale} inventory={products.filter(p => p.location === sale.title || Math.random() > 0.7)} />
            ))}
          </div>
        </div>

        {/* SECTION: MARKETPLACE HIGHLIGHTS (Individual Items) */}
        <div className="space-y-6 pt-10 border-t border-slate-200 dark:border-white/5">
           <div className="px-2">
              <h2 className="text-2xl font-black tracking-tight">One-Off Finds</h2>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">Individual listings near you</p>
           </div>
           <div className="grid grid-cols-2 gap-4">
              {products.slice(0, 4).map(p => (
                <Link key={p.id} to={`/product/${p.id}`} className="group relative aspect-square rounded-3xl overflow-hidden shadow-sm border border-slate-200">
                   <img src={p.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                   <div className="absolute bottom-3 left-3 text-white">
                      <p className="text-[10px] font-black uppercase tracking-tighter opacity-80">{p.title}</p>
                      <p className="font-black">${p.price}</p>
                   </div>
                </Link>
              ))}
           </div>
           <Link to="/search" className="block w-full py-4 bg-slate-100 dark:bg-white/5 rounded-2xl text-center text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">
              Explore Full Marketplace
           </Link>
        </div>
      </div>

      {/* Floating Action Button */}
      <Link to="/sell-hub" className="fixed bottom-10 right-10 z-50 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-white shadow-2xl shadow-primary/30 transition hover:scale-110 active:scale-95 group">
        <span className="material-symbols-outlined !text-3xl">add</span>
      </Link>
    </div>
  );
};

// Instagram Style Garage Sale Card
// Fixed: Explicitly defining props and using React.FC to handle the 'key' prop correctly in TypeScript
interface GarageSalePostProps {
  sale: GarageSale;
  inventory: Product[];
}

const GarageSalePost: React.FC<GarageSalePostProps> = ({ sale, inventory }) => {
  return (
    <div className="bg-white dark:bg-surface-dark rounded-[32px] overflow-hidden border border-slate-200 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-500">
       {/* Card Header */}
       <div className="p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="size-10 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                <span className="material-symbols-outlined !text-xl">storefront</span>
             </div>
             <div>
                <h3 className="font-black text-slate-900 dark:text-white leading-tight">{sale.title}</h3>
                <div className="flex items-center gap-2">
                   <span className="text-[10px] font-black text-primary uppercase tracking-widest">{sale.date}</span>
                   <span className="size-1 bg-slate-200 rounded-full"></span>
                   <span className="text-[10px] font-bold text-slate-400 uppercase">{sale.time}</span>
                </div>
             </div>
          </div>
          <button className="size-10 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400">
             <span className="material-symbols-outlined">more_horiz</span>
          </button>
       </div>

       {/* Main Visual */}
       <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img src={sale.image} className="w-full h-full object-cover" />
          <div className="absolute top-4 right-4 bg-white/95 backdrop-blur px-3 py-1.5 rounded-xl flex items-center gap-2 shadow-xl border border-white">
             <span className="size-2 bg-green-500 rounded-full animate-ping"></span>
             <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Live Today</span>
          </div>
       </div>

       {/* Yard Highlights (Inventory Carousel) */}
       <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sneak Peek: {inventory.length} Items</p>
             <Link to={`/sales/${sale.id}`} className="text-[10px] font-black text-primary uppercase tracking-widest">Full Inventory</Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
             {inventory.slice(0, 5).map((item, idx) => (
               <div key={idx} className="size-24 shrink-0 rounded-2xl overflow-hidden relative group border border-slate-100 shadow-inner">
                  <img src={item.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors"></div>
                  <div className="absolute bottom-1 right-1 bg-white/90 px-1.5 py-0.5 rounded-lg text-[8px] font-black shadow-sm">
                     ${item.price}
                  </div>
               </div>
             ))}
             {inventory.length > 5 && (
                <div className="size-24 shrink-0 rounded-2xl bg-slate-50 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200">
                   <span className="font-black text-xs">+{inventory.length - 5} More</span>
                </div>
             )}
          </div>
       </div>

       {/* Footer Interaction */}
       <div className="px-5 py-4 bg-slate-50/50 dark:bg-black/10 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <button className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined !text-xl">directions</span> NAVIGATE
             </button>
             <button className="flex items-center gap-1.5 text-[10px] font-black text-slate-500 hover:text-primary transition-colors">
                <span className="material-symbols-outlined !text-xl">share</span> SHARE
             </button>
          </div>
          <button className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black tracking-widest shadow-lg">
             REMIND ME
          </button>
       </div>
    </div>
  );
};

export default FeedPage;
