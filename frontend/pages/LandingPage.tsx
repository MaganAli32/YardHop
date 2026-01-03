import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data';
import ProductCard from '../components/ProductCard';

const LandingPage: React.FC = () => {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('animate-fadeIn');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -80px 0px' }
    );

    sectionRefs.current.forEach((ref) => {
      if (ref) observer.observe(ref);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden bg-white">
      {/* 1. HERO SECTION - Split Panel (Precise 520px height and 65/35 split) */}
      <section className="relative flex flex-col lg:flex-row h-auto lg:h-[520px] bg-white">
        
        {/* LEFT PANEL - Browse/Buy (65% width) */}
        <div className="relative flex-[3] min-h-[300px] lg:h-full bg-slate-100 overflow-hidden group">
          <img 
            src="https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=1600&q=80&fit=crop"
            alt="Styled interior"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-105"
          />
          {/* White Gradient Overlay - AptDeco Style */}
          <div 
            className="absolute inset-0 z-1"
            style={{
              background: 'linear-gradient(to right, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0.95) 30%, rgba(255,255,255,0.70) 55%, rgba(255,255,255,0.30) 75%, rgba(255,255,255,0) 100%)'
            }}
          ></div>
          
          <div className="relative z-10 h-full flex items-center">
            <div className="max-w-xl px-8 lg:px-20 py-12 lg:py-0">
              <h1 className="text-4xl lg:text-[3.5rem] font-extrabold text-slate-900 leading-[1.05] tracking-tight mb-10">
                The easiest way <br/>to buy & sell used <br/>furniture
              </h1>
              <Link 
                to="/search"
                className="inline-flex items-center gap-4 bg-orange-500 hover:bg-orange-600 text-white font-black px-10 py-4 rounded shadow-sm transition-all hover:shadow-xl hover:-translate-y-0.5 active:scale-95 text-[11px] uppercase tracking-[0.2em]"
              >
                <span>BROWSE</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"/>
                </svg>
              </Link>
            </div>
          </div>
        </div>
        
        {/* RIGHT PANEL - Sell Side (35% width) */}
        <div className="relative flex-[2] min-h-[250px] lg:h-full bg-slate-800 overflow-hidden group">
          <img 
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&q=80&fit=crop"
            alt="Warm texture"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-110"
          />
          {/* Burnt Orange Overlay (75% opacity) */}
          <div className="absolute inset-0 bg-orange-600/75"></div>
          
          <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-10 py-12 lg:py-0">
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white leading-[1.1] tracking-tight mb-10">
              Ready to start <br/>selling?
            </h2>
            <Link 
              to="/sell-hub"
              className="inline-flex items-center justify-center border-2 border-white bg-transparent hover:bg-white hover:text-orange-600 text-white font-black px-10 py-3.5 rounded transition-all active:scale-95 text-[10px] uppercase tracking-[0.2em]"
            >
              LEARN MORE
            </Link>
          </div>
        </div>
      </section>

      {/* 2. FRESH ON THE BLOCK - Product Grid */}
      <section 
        ref={(el) => { sectionRefs.current[0] = el; }}
        className="py-24 px-6 opacity-0"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex items-end justify-between mb-12 gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight leading-none mb-3">Fresh on the Block</h2>
              <p className="text-base font-medium text-slate-500">Just listed by your neighborhood community.</p>
            </div>
            <Link to="/search" className="group flex items-center gap-2 text-orange-500 font-bold text-xs uppercase tracking-widest transition-all hover:text-orange-600">
              <span>EXPLORE ALL</span>
              <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {PRODUCTS.slice(0, 4).map((product, idx) => (
              <div 
                key={product.id} 
                className="opacity-0" 
                style={{ animation: `fadeSlideIn 0.4s ease-out forwards ${idx * 0.1}s` }}
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. HOW IT WORKS - A Simpler Way */}
      <section 
        ref={(el) => { sectionRefs.current[1] = el; }}
        className="py-32 px-6 bg-slate-50 border-y border-slate-100 opacity-0"
      >
        <div className="max-w-7xl mx-auto">
          <div className="mb-24 text-center">
            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6 leading-tight">
              A simpler way to <br/><span className="text-orange-500">hop from yard to yard.</span>
            </h2>
            <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
              Forget clunky lists and sketchy meetups. YardHop is designed for speed, safety, and community trust.
            </p>
          </div>

          <div className="flex flex-col gap-32">
            {/* Step 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
               <div className="order-2 md:order-1 rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-[4/3] shadow-xl">
                  <img 
                    src="https://images.unsplash.com/photo-1556740714-a8395b3bf30f?w=800&q=80&fit=crop" 
                    alt="Taking photo of item" 
                    className="w-full h-full object-cover" 
                  />
               </div>
               <div className="order-1 md:order-2">
                  <span className="text-6xl font-extrabold text-slate-200 block leading-none mb-6">01</span>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-6">Snap & List in Seconds</h3>
                  <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                     Turn clutter into neighborhood cash without the headache. Our AI, <strong className="text-slate-700">Stitch</strong>, auto-fills details and suggests pricing so you don't have to.
                  </p>
                  <ul className="space-y-4">
                     {[
                       'Auto-enhanced photos', 
                       'Smart market pricing', 
                       'Instant local visibility'
                     ].map(item => (
                       <li key={item} className="flex items-center gap-3 text-slate-700 text-sm font-bold uppercase tracking-wide">
                          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100">
                            <svg className="w-3.5 h-3.5 text-orange-500" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                            </svg>
                          </span> 
                          {item}
                       </li>
                     ))}
                  </ul>
               </div>
            </div>

            {/* Step 2 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
               <div className="order-1">
                  <span className="text-6xl font-extrabold text-slate-200 block leading-none mb-6">02</span>
                  <h3 className="text-3xl font-extrabold text-slate-900 mb-6">Connect & Secure</h3>
                  <p className="text-lg text-slate-500 font-medium leading-relaxed mb-8">
                     Negotiate, ask questions, and agree on a meeting spot directly through our secure in-app hub. No private phone numbers required.
                  </p>
                  <div className="flex gap-4">
                     <span className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                       Verified Profiles
                     </span>
                     <span className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-[10px] font-bold uppercase text-slate-500 tracking-widest">
                       Safe Zones
                     </span>
                  </div>
               </div>
               <div className="order-2 rounded-2xl overflow-hidden border border-slate-200 bg-white aspect-[4/3] shadow-xl flex items-center justify-center p-8 md:p-12">
                  <div className="w-full flex flex-col gap-6">
                     <div className="self-start bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-none p-5 max-w-[85%] shadow-sm">
                        <p className="text-sm font-semibold text-slate-700 leading-snug">Is this available for pickup today?</p>
                     </div>
                     <div className="self-end bg-orange-500 rounded-2xl rounded-tr-none p-5 max-w-[85%] shadow-lg">
                        <p className="text-sm font-semibold text-white leading-snug">Yes! I'm at the Zilker park gate until 4PM.</p>
                     </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. FINAL CTA */}
      <section 
        ref={(el) => { sectionRefs.current[2] = el; }}
        className="py-32 bg-slate-900 px-6 relative overflow-hidden opacity-0"
      >
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-orange-500/10 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-10">
          <h2 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight">
            Start Hopping Today.
          </h2>
          <p className="text-lg text-slate-400 max-w-xl mx-auto font-medium">
            Join 50,000+ neighbors finding hidden treasures and clearing the clutter.
          </p>
          <div className="pt-6">
            <Link 
              to="/signup" 
              className="inline-flex items-center justify-center bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold uppercase tracking-widest px-12 py-5 rounded transition-all shadow-2xl hover:shadow-orange-500/30 hover:-translate-y-1 active:scale-95"
            >
              GET STARTED FREE
            </Link>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="bg-slate-950 py-12 px-6 text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
              </svg>
            </div>
            <span className="text-lg font-bold text-white tracking-tight">YardHop</span>
          </Link>
          
          <div className="flex items-center gap-8 text-sm font-medium">
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
          </div>
          
          <p className="text-sm font-medium">
            © 2025 YardHop. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
