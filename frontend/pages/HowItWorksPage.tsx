
import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { renderCanvas } from '../components/ui/canvas';

const HowItWorksPage: React.FC = () => {
  useEffect(() => {
    renderCanvas();
  }, []);

  const steps = [
    {
      num: "01",
      title: "Snap & List",
      desc: "Selling on YardFront is faster than making a cup of coffee. Just take a photo of your item, and our AI 'Stitch' handles the rest.",
      features: ["Auto-enhanced photos", "Smart market pricing", "Instant local visibility"],
      icon: "photo_camera",
      color: "text-orange-500",
      bg: "bg-orange-50",
      img: "https://images.unsplash.com/photo-1556740714-a8395b3bf30f?w=800&auto=format&fit=crop&q=60"
    },
    {
      num: "02",
      title: "Chat & Connect",
      desc: "Negotiate prices and arrange meetups directly through our secure in-app hub. Your personal data stays completely private.",
      features: ["Verified neighbor profiles", "Encrypted messaging", "No phone number required"],
      icon: "forum",
      color: "text-blue-500",
      bg: "bg-blue-50",
      img: "https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?w=800&auto=format&fit=crop&q=60"
    },
    {
      num: "03",
      title: "Hop & Exchange",
      desc: "Meet up at a verified 'Safe Zone' to exchange your treasure. Pay securely in-app or with cash—the choice is yours.",
      features: ["Verified Safe Spots", "Escrow protection", "Community ratings"],
      icon: "handshake",
      color: "text-green-500",
      bg: "bg-green-50",
      img: "https://images.unsplash.com/photo-1526614180625-e6b402ea91da?w=800&auto=format&fit=crop&q=60"
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative w-full min-h-[60vh] flex flex-col items-center justify-center text-center px-6 pt-24 pb-12 overflow-hidden bg-slate-900">
        <canvas
          className="pointer-events-none absolute inset-0 mx-auto opacity-30"
          id="canvas"
        ></canvas>
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-slate-900/90 pointer-events-none"></div>
        
        <div className="relative z-10 max-w-4xl mx-auto space-y-8 animate-fadeIn">
          <div className="inline-flex items-center gap-3 px-5 py-2 rounded-full bg-white/10 backdrop-blur-md text-white text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            The Neighborhood Playbook
          </div>
          <h1 className="text-5xl md:text-8xl font-black tracking-tighter text-white leading-[0.9]">
            The New Way <br/>To <span className="text-primary">YardFront.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
            We've digitized the local garage sale experience. Faster, safer, and entirely neighborhood-focused.
          </p>
          <div className="pt-8 flex flex-col sm:flex-row justify-center gap-4">
             <Link to="/signup" className="bg-primary text-white px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl shadow-primary/30 hover:-translate-y-1 transition-all active:scale-95">Get Started Free</Link>
             <Link to="/search" className="bg-white/10 backdrop-blur-md text-white border border-white/10 px-10 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/20 transition-all">Explore Feed</Link>
          </div>
        </div>
      </section>

      {/* Main Steps Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto space-y-40">
          {steps.map((step, idx) => (
            <div key={step.num} className={`grid grid-cols-1 lg:grid-cols-2 gap-20 items-center ${idx % 2 !== 0 ? 'lg:direction-rtl' : ''}`}>
               <div className={`${idx % 2 !== 0 ? 'lg:order-2' : ''} space-y-8 animate-fadeIn`}>
                  <div className="space-y-4">
                    <span className="text-7xl font-black text-slate-100 block leading-none">{step.num}</span>
                    <div className={`inline-flex items-center gap-3 px-4 py-2 rounded-xl ${step.bg} ${step.color} border border-current/10`}>
                       <span className="material-symbols-outlined !text-2xl">{step.icon}</span>
                       <span className="text-xs font-black uppercase tracking-widest">{step.title}</span>
                    </div>
                    <h2 className="text-4xl font-black text-slate-900 tracking-tight">{step.title} In Seconds</h2>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed">
                       {step.desc}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {step.features.map(feat => (
                      <div key={feat} className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <span className="material-symbols-outlined text-green-500 fill !text-lg">check_circle</span>
                        <span className="text-xs font-black text-slate-700 uppercase tracking-wide">{feat}</span>
                      </div>
                    ))}
                  </div>
               </div>
               
               <div className={`${idx % 2 !== 0 ? 'lg:order-1' : ''} relative group`}>
                  <div className={`absolute -inset-4 rounded-[48px] ${step.bg} blur-2xl opacity-50 group-hover:opacity-100 transition-opacity`}></div>
                  <div className="relative aspect-[4/3] rounded-[40px] overflow-hidden shadow-2xl border-8 border-white group-hover:scale-[1.02] transition-transform duration-700">
                     <img src={step.img} alt={step.title} className="w-full h-full object-cover" />
                  </div>
                  
                  {/* Floating Micro-UI Component */}
                  <div className={`absolute ${idx % 2 === 0 ? '-bottom-10 -right-10' : '-bottom-10 -left-10'} hidden md:block w-64 p-6 bg-slate-900 text-white rounded-3xl shadow-2xl border border-white/10 animate-fadeIn`}>
                     <div className="flex items-center gap-4 mb-4">
                        <div className={`size-10 rounded-xl ${step.bg} ${step.color} flex items-center justify-center`}>
                           <span className="material-symbols-outlined !text-lg">verified_user</span>
                        </div>
                        <p className="text-[10px] font-black uppercase tracking-widest">Stitch Verified</p>
                     </div>
                     <p className="text-xs text-slate-400 font-medium italic">"100% of neighbors in this area recommend {step.title.toLowerCase()}."</p>
                  </div>
               </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ/Quick Stats Section */}
      <section className="py-32 bg-slate-50 border-y border-slate-200/60">
        <div className="max-w-7xl mx-auto px-6">
           <div className="text-center mb-20 space-y-4">
              <h2 className="text-4xl font-black tracking-tighter">Common Questions</h2>
              <p className="text-slate-500 font-medium">Everything you need to know before you start hopping.</p>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-4 p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
                 <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest text-primary">Is it free?</h4>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">Yes! Listing individual items is 100% free. We only charge a small neighbor-fee for hosting multi-family garage sale events to cover map pinning and promotion.</p>
              </div>
              <div className="space-y-4 p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
                 <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest text-primary">How do I get paid?</h4>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">You can accept cash at the yard, or use our secure in-app payments. Funds are held in escrow until the buyer confirms they've received the item.</p>
              </div>
              <div className="space-y-4 p-8 bg-white rounded-3xl shadow-sm border border-slate-100">
                 <h4 className="font-black text-slate-900 uppercase text-xs tracking-widest text-primary">Is it safe?</h4>
                 <p className="text-sm text-slate-500 font-medium leading-relaxed">Safety is our priority. We verify neighbor profiles using map data and provide 'Safe Zones'—public meeting spots like libraries or fire stations for every exchange.</p>
              </div>
           </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="py-32 bg-slate-900 px-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-primary/20 to-transparent pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center space-y-12 relative z-10">
          <h2 className="text-5xl md:text-7xl font-black text-white tracking-tighter leading-[0.9]">
            Ready to turn clutter into <span className="text-primary">cash?</span>
          </h2>
          <div className="pt-6">
            <Link 
              to="/signup" 
              className="inline-flex items-center justify-center bg-primary hover:bg-orange-600 text-white text-sm font-black uppercase tracking-[0.2em] px-16 py-6 rounded-2xl transition-all shadow-2xl shadow-primary/30 hover:-translate-y-1 active:scale-95"
            >
              Start Selling Today
            </Link>
          </div>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.3em]">Join 50,000+ Verified Neighbors</p>
        </div>
      </section>
    </div>
  );
};

export default HowItWorksPage;
