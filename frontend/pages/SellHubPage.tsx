
import React from 'react';
import { Link } from 'react-router-dom';

const SellHubPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background-dark py-12 px-6">
      <div className="max-w-[1000px] mx-auto space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-white">Start Selling</h1>
          <p className="text-slate-500 font-medium max-w-xl mx-auto">Whether it's one unique treasure or a whole weekend event, YardFront gets you in front of neighbors instantly.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Option 1: Individual Item */}
          <Link to="/create" className="group bg-white dark:bg-surface-dark p-8 rounded-3xl border border-slate-200/60 dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-primary/20 transition-all">
            <div className="size-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <span className="material-symbols-outlined !text-4xl">inventory_2</span>
            </div>
            <h3 className="text-2xl font-black mb-3">List Single Item</h3>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Perfect for furniture, electronics, or collectibles. Uses **Stitch AI Scanner** to auto-appraise your item against real market prices.
            </p>
            <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
              Get Started <span className="material-symbols-outlined !text-sm">arrow_forward</span>
            </div>
          </Link>

          {/* Option 2: Garage Sale Event */}
          <Link to="/create-sale" className="group bg-slate-900 text-white p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary rounded-full blur-[80px] opacity-20 transition-opacity group-hover:opacity-40"></div>
            <div className="relative z-10">
              <div className="size-16 bg-white/10 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <span className="material-symbols-outlined !text-4xl">storefront</span>
              </div>
              <h3 className="text-2xl font-black mb-3 text-white">Host Garage Sale</h3>
              <p className="text-slate-300 text-sm leading-relaxed mb-6">
                Organize a full event at your location. Pins your yard on the neighborhood map for everyone to see. Includes multi-item listing.
              </p>
              <div className="flex items-center gap-2 text-xs font-black text-primary uppercase tracking-widest">
                Plan Event <span className="material-symbols-outlined !text-sm">arrow_forward</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Stitch Scanner Highlight */}
        <div className="bg-white dark:bg-surface-dark border border-slate-200/60 dark:border-white/5 p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8">
          <div className="size-24 shrink-0 bg-slate-50 dark:bg-white/5 rounded-2xl flex items-center justify-center">
            <span className="material-symbols-outlined !text-5xl text-primary animate-pulse">magic_button</span>
          </div>
          <div className="flex-1">
             <h4 className="text-lg font-black mb-1">Stitch Price Appraisal</h4>
             <p className="text-xs text-slate-500 font-medium">
               Our built-in AI scanner checks eBay, FB Marketplace, and more to ensure your listing price is fair. It's like a car history report for your furniture.
             </p>
          </div>
          <Link to="/scanner" className="px-6 py-3 bg-slate-100 dark:bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-colors">Try Scanner Solo</Link>
        </div>
      </div>
    </div>
  );
};

export default SellHubPage;
