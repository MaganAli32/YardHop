
import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto w-full bg-[#020617] text-slate-300 border-t border-white/10">
      <div className="mx-auto max-w-7xl px-6 py-20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-12">
          <div className="space-y-6">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <span className="text-white text-lg">🏘️</span>
              </div>
              <span className="text-xl font-black text-white tracking-tight">YardHop</span>
            </Link>
            <p className="text-sm text-slate-500 leading-relaxed max-w-xs font-medium">
              The ultimate neighborhood marketplace for second-hand treasures. Designed for trust, safety, and local community.
            </p>
            <div className="flex gap-4">
               {['facebook', 'instagram', 'twitter'].map(social => (
                 <a key={social} href="#" className="size-10 rounded bg-white/5 border border-white/5 flex items-center justify-center hover:bg-primary/20 hover:text-primary transition-all">
                    <span className="material-symbols-outlined !text-lg">public</span>
                 </a>
               ))}
            </div>
          </div>
          
          <div>
            <h4 className="font-black mb-8 text-white text-[10px] uppercase tracking-[0.3em]">Marketplace</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><Link className="hover:text-primary transition-colors" to="/search">Browse Feed</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/sales">Active Sales</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/scanner">Treasure Scanner</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/sell-hub">Start Selling</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-black mb-8 text-white text-[10px] uppercase tracking-[0.3em]">Resources</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><Link className="hover:text-primary transition-colors" to="/how-it-works">How It Works</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/community">Neighborhood Board</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/live-advisor">Live Stitch Advisor</Link></li>
              <li><a className="hover:text-primary transition-colors" href="#">Safe Exchange Zones</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-black mb-8 text-white text-[10px] uppercase tracking-[0.3em]">Account</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><Link className="hover:text-primary transition-colors" to="/profile">My Dashboard</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/orders">Order History</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/favorites">Saved Items</Link></li>
              <li><Link className="hover:text-primary transition-colors" to="/inbox">Message Center</Link></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-20 pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">© 2024 YardHop, Inc. All rights reserved.</p>
          <div className="flex gap-8 text-[10px] font-black text-slate-600 uppercase tracking-widest">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-white transition-colors">Sitemap</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
