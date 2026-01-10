import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => (
  <footer className="mt-auto w-full bg-[#020617] text-slate-400 border-t border-white/5 relative overflow-hidden">
    <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-[#FF6B35]/50 to-transparent" />
    <div className="mx-auto max-w-7xl px-8 py-24 relative z-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-20">
        <div className="space-y-8">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 bg-[#FF6B35] rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-black text-xl italic font-display">YF</span>
            </div>
            <span className="text-2xl font-black text-white tracking-tighter italic uppercase font-display">YardFront</span>
          </Link>
          <p className="text-sm text-slate-500 leading-relaxed max-w-xs font-medium font-body">
            The ultimate neighborhood marketplace for second-hand treasures. Designed for trust, safety, and local community discovery.
          </p>
        </div>
        <div>
          <h4 className="font-black mb-10 text-white text-[10px] uppercase tracking-[0.4em] font-display">Marketplace</h4>
          <ul className="space-y-5 text-xs font-bold uppercase tracking-widest text-slate-600 font-display">
            {['Browse Feed', 'Active Sales', 'Treasure Scanner', 'Start Selling'].map(item => (
              <li key={item}>
                <Link className="hover:text-[#FF6B35] transition-colors" to="/search">{item}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-black mb-10 text-white text-[10px] uppercase tracking-[0.4em] font-display">Resources</h4>
          <ul className="space-y-5 text-xs font-bold uppercase tracking-widest text-slate-600 font-display">
            {[
              { label: 'How It Works', path: '/how-it-works' },
              { label: 'Neighborhood Board', path: '/community' },
              { label: 'Live Advisor', path: '/live-advisor' },
              { label: 'Exchange Zones', path: '/search' }
            ].map(item => (
              <li key={item.label}>
                <Link className="hover:text-[#FF6B35] transition-colors" to={item.path}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-black mb-10 text-white text-[10px] uppercase tracking-[0.4em] font-display">Account</h4>
          <ul className="space-y-5 text-xs font-bold uppercase tracking-widest text-slate-600 font-display">
            {['My Dashboard', 'Order History', 'Saved Items', 'Inbox'].map(item => (
              <li key={item}>
                <Link className="hover:text-[#FF6B35] transition-colors" to="/profile">{item}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-24 pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-8">
        <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] font-display">© 2026 YardFront, Inc. Designed for neighborhood trust.</p>
        <div className="flex gap-12 text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] font-display">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Use</a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;
