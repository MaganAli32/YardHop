import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PRODUCTS } from '../data';
import ProductCard from '../components/ProductCard';
import Footer from '../components/Footer';
import { ChevronRight, Star, ArrowRight, Zap, Camera, TrendingUp, ShieldCheck, LayoutGrid } from 'lucide-react';

// --- MAXIMALIST LAYER COMPONENTS ---

const DitherOverlay = () => (
  <div 
    className="fixed inset-0 pointer-events-none z-[9999] opacity-[0.15] mix-blend-overlay"
    style={{
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
    }}
  />
);

const InteractiveParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', resize);

    const particles = Array.from({ length: 40 }).map(() => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2 + 1
    }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        const dx = mouse.current.x - p.x;
        const dy = mouse.current.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 150) {
          p.vx -= (dx / dist) * 0.05;
          p.vy -= (dy / dist) * 0.05;
        }
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.x += p.vx;
        p.y += p.vy;

        ctx.fillStyle = '#FF6B35';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });
      raf = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none opacity-30" />;
};

const LandingPage: React.FC = () => {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { 
        threshold: 0.12, 
        rootMargin: '0px 0px -80px 0px' 
      }
    );

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el);
    });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
    };
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden bg-[#121c32] selection:bg-[#FF6B35] selection:text-white">
      <DitherOverlay />

      {/* 1. HERO SECTION */}
      <section className="relative flex flex-col lg:flex-row lg:h-[480px] bg-white overflow-hidden">
        <InteractiveParticles />
        
        {/* LEFT PANEL */}
        <div className="relative flex-[3] min-h-[320px] bg-slate-100 overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1594026112284-02bb6f3352fe?w=1600&q=80&fit=crop" 
            alt="Hero Furniture" 
            className="absolute inset-0 w-full h-full object-cover"
            style={{ transform: `translateY(${scrollY * 0.1}px)` }}
          />
          {/* Dark gradient overlay for text visibility */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#121c32]/70 via-[#121c32]/50 to-transparent z-[5]" />
          
          <div className="relative z-10 flex items-center h-full">
            <div className="max-w-lg px-6 lg:px-12 py-8 w-full">
              <h1 className="text-[clamp(1.9rem,4.2vw,3.4rem)] leading-[0.92] font-black tracking-tighter uppercase italic mb-6 font-display text-white drop-shadow-2xl">
                The easiest way <br/>to buy & sell <br/>used furniture
              </h1>
              <p className="text-base font-bold text-white/90 mb-6 uppercase italic max-w-sm font-display drop-shadow-lg">Your neighborhood marketplace for trusted local exchanges.</p>
              <Link to="/search" className="inline-flex items-center gap-4 bg-[#FF6B35] text-white px-10 py-4 rounded-md text-[11px] font-black uppercase tracking-[0.3em] shadow-xl hover:-translate-y-1 transition italic font-display">
                Browse Feed
                <ArrowRight size={18} strokeWidth={4} />
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="relative flex-[2] min-h-[260px] bg-[#FF6B35] overflow-hidden">
          <img 
            src="https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1000&q=80&fit=crop" 
            alt="Sell Furniture" 
            className="absolute inset-0 w-full h-full object-cover opacity-20"
            style={{ transform: `translateY(${scrollY * 0.15}px)` }}
          />
          
          <div className="relative z-10 flex items-center justify-center h-full px-8 py-10 text-center">
            <div className="w-full">
              <h2 className="text-[clamp(1.5rem,2.6vw,2.2rem)] leading-[0.9] font-black uppercase italic mb-6 text-white font-display">
                Ready to start <br/>selling?
              </h2>
              <Link to="/sell-hub" className="border border-white/40 text-white px-10 py-4 rounded-md text-[11px] font-black uppercase tracking-[0.3em] hover:bg-white hover:text-[#FF6B35] transition italic font-display">
                Learn More
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* WAVE DIVIDER */}
      <div className="h-24 w-full bg-white relative z-20 overflow-hidden">
        <svg viewBox="0 0 1440 100" className="absolute bottom-0 w-full h-full fill-[#121c32]">
          <path d="M0,64L80,69.3C160,75,320,85,480,80C640,75,800,53,960,48C1120,43,1280,53,1360,58.7L1440,64L1440,100L1360,100C1280,100,1120,100,960,100C800,100,640,100,480,100C320,100,160,100,80,100L0,100Z"></path>
        </svg>
      </div>

      {/* 2. AI POWERED FEATURES */}
      <section className="py-40 px-8 bg-[#121c32] relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row items-end justify-between mb-24 gap-8 scroll-reveal">
            <div>
              <div className="w-16 h-1.5 bg-[#FF6B35] mb-8" />
              <h2 className="text-5xl font-black text-white tracking-tighter leading-none mb-6 uppercase italic font-display">AI Pricing Intelligence</h2>
              <p className="text-xl font-bold text-white/40 uppercase tracking-widest text-xs italic font-display">Silicon Valley algorithms scaling neighborhood discovery.</p>
            </div>
            <div className="flex items-center gap-4 text-[#FF6B35] font-black text-[10px] uppercase tracking-[0.4em] italic font-display">
              <Zap size={14} fill="currentColor" />
              Neural Network Active
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: TrendingUp, num: "01", title: "Market Arbitrage", desc: "Identify items listed 30% below national averages." },
              { icon: Camera, num: "02", title: "Vision Recognition", desc: "Get MSRP data and descriptions from one photo." },
              { icon: ShieldCheck, num: "03", title: "Trust Protocol", desc: "Verified neighborhood profiles and safe zones." },
              { icon: LayoutGrid, num: "04", title: "Discovery Hub", desc: "High-fidelity neighborhood sale browser." }
            ].map((f, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-2xl hover:border-[#FF6B35]/40 transition-all group scroll-reveal">
                <div className="flex justify-between items-start mb-8">
                  <f.icon className="text-[#FF6B35] group-hover:scale-110 transition-transform" size={32} strokeWidth={3} />
                  <span className="text-2xl font-black text-white/10 group-hover:text-[#FF6B35]/20 font-display transition-colors">{f.num}</span>
                </div>
                <h3 className="text-xl font-black text-white mb-4 italic tracking-tighter uppercase font-display">{f.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed font-medium font-body">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. WORKFLOW - NUMERIC STEPS WITH ICONS */}
      <section className="py-48 px-8 bg-[#121c32] border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="mb-32 text-center scroll-reveal">
            <h2 className="text-5xl md:text-7xl font-black tracking-tighter text-white mb-10 leading-[0.85] uppercase italic font-display">
              The System Workflow
            </h2>
            <p className="text-2xl text-white/40 max-w-2xl mx-auto font-black uppercase tracking-widest text-xs leading-loose font-display">Optimized discovery through localized data analysis.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center">
            {[
              { num: "01", title: "Browse", desc: "Scan neighborhood patterns for high-potential listings." },
              { num: "02", title: "Validate", desc: "Snap a photo for neural recognition and MSRP data." },
              { num: "03", title: "Acquire", desc: "Secure the deal with protected local payments." },
              { num: "04", title: "Scale", desc: "Flip or resell using automated SEO descriptions." }
            ].map((step, i) => (
              <div key={i} className="scroll-reveal group">
                <div className="text-7xl md:text-8xl font-black text-white/5 group-hover:text-[#FF6B35]/20 transition-colors mb-6 select-none italic tracking-tighter font-display leading-none">
                  {step.num}
                </div>
                <h4 className="text-xl font-black text-white mb-4 uppercase italic font-display">{step.title}</h4>
                <p className="text-white/40 text-sm font-body px-4">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. MARKET FINDS */}
      <section className="py-40 px-8 bg-[#0a101d]">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-end mb-20 scroll-reveal">
            <h2 className="text-5xl font-black text-white tracking-tighter italic uppercase leading-none font-display">Recent Market Finds</h2>
            <Link to="/search" className="group flex items-center gap-4 text-[#FF6B35] font-black text-[10px] uppercase tracking-[0.4em] italic font-display">
              <span>EXPLORE ALL</span>
              <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center group-hover:bg-[#FF6B35] group-hover:text-white group-hover:border-[#FF6B35] transition-all">
                <ChevronRight size={18} strokeWidth={4} />
              </div>
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {PRODUCTS.slice(0, 4).map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. REVIEWS SECTION (LUCIDE STARS, NO EMOJIS) */}
      <section className="py-40 px-8 bg-[#121c32] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24 scroll-reveal">
            <h2 className="text-5xl font-black text-white tracking-tighter uppercase italic font-display">Trusted by Your Neighbors</h2>
            <div className="w-24 h-1 bg-[#FF6B35] mx-auto mt-8" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                stars: 5,
                quote: "YardFront's pricing intelligence helped me find a vintage Fender amp for $20. The valuation was spot-on.",
                author: "Marcus Thorne, Verified Buyer"
              },
              {
                stars: 5,
                quote: "I cleared out my garage in a weekend. Pricing, listings, and discovery were handled automatically.",
                author: "Elena G., Verified Seller"
              },
              {
                stars: 5,
                quote: "The trust layer makes all the difference. No sketchy meetups, no guessing.",
                author: "Jordan Pierce, Neighborhood Curator"
              }
            ].map((review, i) => (
              <div key={i} className="bg-white/5 backdrop-blur-md border border-white/10 p-10 rounded-2xl scroll-reveal group">
                <div className="flex gap-1 mb-6 text-[#FF6B35]">
                  {[...Array(review.stars)].map((_, j) => (
                    <Star key={j} size={16} fill="currentColor" />
                  ))}
                </div>
                <p className="text-white/80 text-lg mb-8 italic font-body">"{review.quote}"</p>
                <div className="h-px w-10 bg-[#FF6B35] mb-4" />
                <p className="text-[#FF6B35] text-[10px] font-black uppercase tracking-widest font-display">{review.author}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA */}
      <section className="py-64 bg-[#121c32] px-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FF6B35]/20 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-[40rem] h-[40rem] bg-[#FF6B35]/10 rounded-full blur-[120px]" />
        
        <div className="relative z-10 max-w-5xl mx-auto text-center space-y-16 scroll-reveal">
          <h2 className="text-6xl md:text-9xl font-black text-white tracking-tighter leading-[0.8] uppercase italic font-display">
            Own the <br/>Neighborhood.
          </h2>
          <p className="text-2xl text-white/40 max-w-2xl mx-auto font-black uppercase tracking-[0.3em] text-sm italic font-display">
            Join 50,000+ neighbors discoverying value with Silicon Valley tools.
          </p>
          <div className="pt-10">
            <Link 
              to="/signup" 
              className="group inline-flex items-center justify-center bg-[#FF6B35] hover:bg-white hover:text-[#FF6B35] text-white text-base font-black uppercase tracking-[0.4em] px-24 py-8 rounded-md transition-all shadow-[0_20px_60px_-10px_rgba(255,107,53,0.5)] hover:-translate-y-2 active:scale-95 italic font-display"
            >
              <span>GET STARTED FREE</span>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;
