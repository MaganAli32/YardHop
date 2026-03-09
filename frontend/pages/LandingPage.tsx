/**
 * YardFront Landing Page — AI-powered secondhand price intelligence
 * Design: white background, Instrument Serif headlines, orange accents, upload → appraisal flow.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { ArrowRight, Upload, Check } from 'lucide-react';
import { getBrowserFingerprint } from '../lib/fingerprint';
import { usePersistence } from '../store/PersistenceContext';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPT_IMAGES = 'image/jpeg,image/png,image/heic,image/webp';

interface UsageState {
  used: number;
  limit: number;
  remaining: number;
  is_limited: boolean;
}

export default function LandingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authToken } = usePersistence();
  const uploadSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [usage, setUsage] = useState<UsageState>({ used: 0, limit: 3, remaining: 3, is_limited: false });

  // Fetch usage on load and when auth changes
  useEffect(() => {
    const headers: Record<string, string> = { 'X-Fingerprint': getBrowserFingerprint() };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    fetch('/api/usage', { headers })
      .then((res) => res.json())
      .then((data) => setUsage({
        used: data.used ?? 0,
        limit: data.limit ?? 3,
        remaining: data.remaining ?? 3,
        is_limited: data.is_limited ?? false,
      }))
      .catch(() => {});
  }, [authToken]);

  // Scroll to section when navigated with state (e.g. from "Try Another Appraisal") or hash
  useEffect(() => {
    const scrollTo = (location.state as { scrollTo?: string })?.scrollTo;
    const hash = window.location.hash?.slice(1);
    const target = scrollTo || hash;
    if (target) {
      const el = document.getElementById(target);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.state, location.key]);

  // Scroll reveal: fade-up with IntersectionObserver
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.scroll-reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToUpload = () => {
    uploadSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAppraise = async (file: File) => {
    setUploadError(null);
    if (file.size > MAX_FILE_SIZE) {
      setUploadError('File too large. Please use an image under 10MB.');
      return;
    }
    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload an image file.');
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('image', file);

    const headers: Record<string, string> = { 'X-Fingerprint': getBrowserFingerprint() };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

    try {
      const response = await fetch('/api/appraise', {
        method: 'POST',
        body: formData,
        headers,
      });

      const data = await response.json().catch(() => ({}));

      if (response.status === 403 && data?.error === 'free_limit_reached') {
        setUsage((prev) => ({ ...prev, is_limited: true, remaining: 0 }));
        setUploadError("You've used all 3 free appraisals. Upgrade to Pro for unlimited.");
        return;
      }

      if (!response.ok) {
        throw new Error(data?.error || data?.message || `Appraisal failed (${response.status})`);
      }

      sessionStorage.setItem('appraisalResult', JSON.stringify(data));
      setUsage((prev) => ({
        ...prev,
        used: prev.used + 1,
        remaining: Math.max(0, prev.remaining - 1),
        is_limited: prev.used + 1 >= prev.limit,
      }));
      navigate('/appraise/results');
    } catch (e) {
      console.error('Appraisal error:', e);
      setUploadError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleAppraise(file);
    e.target.value = '';
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleAppraise(file);
    else setUploadError('Please drop an image file (JPG, PNG, HEIC).');
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const onDragLeave = () => setIsDragging(false);

  const triggerFileInput = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const scrollToSteps = () => {
    document.getElementById('steps')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="landing-page bg-[#FFFFFF] text-[#1A1A1A] font-sans antialiased overflow-x-hidden">
      <style>{`
        .landing-page { --black: #0A0A0A; --dark: #1A1A1A; --gray-600: #6B6B6B; --gray-400: #9A9A9A; --gray-200: #E0E0E0; --gray-100: #F2F2F2; --white: #FAFAFA; --pure-white: #FFFFFF; --orange: #FF6B35; --orange-soft: rgba(255,107,53,0.08); }
        .scroll-reveal { opacity: 0; transform: translateY(30px); transition: opacity 0.9s cubic-bezier(0.25, 1, 0.5, 1), transform 0.9s cubic-bezier(0.25, 1, 0.5, 1); }
        .scroll-reveal.is-visible { opacity: 1 !important; transform: translateY(0) !important; }
        .scroll-reveal.d1 { transition-delay: 0.1s; } .scroll-reveal.d2 { transition-delay: 0.2s; } .scroll-reveal.d3 { transition-delay: 0.3s; } .scroll-reveal.d4 { transition-delay: 0.4s; }
        [data-confidence-bar] { transition: width 1.8s cubic-bezier(0.25, 1, 0.5, 1); }
        .scroll-reveal.is-visible [data-confidence-bar] { width: 87% !important; }
        @keyframes breathe { 0%, 100% { opacity: 0.4; } 50% { opacity: 1; } }
        .hero-dot { animation: breathe 3s ease-in-out infinite; }
        @keyframes scrolld { 0% { top: -100%; } 50%, 100% { top: 100%; } }
        .scroll-line-inner { position: absolute; left: 0; width: 100%; height: 100%; background: var(--orange); top: -100%; animation: scrolld 2s ease-in-out infinite; }
        .step-num-hover { transition: color 0.4s ease; }
        .landing-page .step-card:hover .step-num-hover { color: var(--orange-soft); }
      `}</style>

      <Navbar />

      {/* 2. Hero — padding 140px 24px 100px desktop, 120px 24px 80px mobile */}
      <section className="min-h-screen flex flex-col justify-center items-center text-center relative pt-[120px] pb-[80px] md:pt-[140px] md:pb-[100px] px-6">
        <div className="scroll-reveal d1 inline-flex items-center gap-2 text-[13px] font-semibold text-[#9A9A9A] tracking-[0.5px] mb-10">
          <span className="hero-dot w-1.5 h-1.5 rounded-full bg-[#FF6B35]" />
          Now live in Berkeley
        </div>
        <h1 className="scroll-reveal d1 font-serif text-[clamp(52px,7vw,96px)] font-normal text-[#0A0A0A] tracking-[-2px] leading-[1.05] max-w-[800px]">
          Know what it's<br /><em className="italic text-[#FF6B35]">actually worth</em>
        </h1>
        <p className="scroll-reveal d2 mt-7 text-[18px] leading-[1.6] text-[#6B6B6B] max-w-[440px]">
          Upload a photo. Get an instant AI appraisal with real market data from 5+ platforms.
        </p>
        <div className="scroll-reveal d3 mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
          <button type="button" onClick={scrollToUpload} className="btn-dark inline-flex items-center gap-2 py-3.5 px-8 rounded-[100px] text-[15px] font-semibold bg-[#0A0A0A] text-white hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)] transition-all w-full sm:w-auto justify-center">
            Try a Free Appraisal
            <ArrowRight size={16} strokeWidth={2.5} />
          </button>
          <button type="button" onClick={scrollToSteps} className="btn-ghost inline-flex items-center gap-2 py-3.5 px-8 rounded-[100px] text-[15px] font-semibold bg-transparent text-[#6B6B6B] border border-[#E0E0E0] border-[1.5px] hover:border-[#9A9A9A] hover:text-[#0A0A0A] transition-all w-full sm:w-auto justify-center">
            Learn More
          </button>
        </div>
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <div className="w-px h-8 bg-[#E0E0E0] relative overflow-hidden">
            <div className="scroll-line-inner" />
          </div>
        </div>
      </section>

      {/* 3. Demo Appraisal Card — matches HTML .demo-wrap / .demo-card */}
      <section className="px-6 pb-[160px] md:pb-[160px] flex justify-center">
        <div className="scroll-reveal w-full max-w-[720px] bg-[#FAFAFA] border border-[#E0E0E0] rounded-[20px] overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_24px_80px_rgba(0,0,0,0.06)] transition-shadow duration-[0.6s]">
          <div className="flex justify-between items-center py-5 px-6 md:py-5 md:px-7 border-b border-[#F2F2F2]">
            <div className="flex gap-1.5 items-center">
              <span className="w-2 h-2 rounded-full bg-[#FF5F57]" />
              <span className="w-2 h-2 rounded-full bg-[#FFBD2E]" />
              <span className="w-2 h-2 rounded-full bg-[#28C840]" />
              <span className="text-[13px] font-medium text-[#9A9A9A] ml-2.5">Appraisal</span>
            </div>
            <span className="text-[12px] font-semibold text-[#16A34A] bg-[rgba(22,163,74,0.08)] py-1 px-3 rounded-[100px]">Complete</span>
          </div>
          <div className="py-9 px-6 md:px-8">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-[100px] h-[100px] rounded-[14px] shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(145deg, #E8E4E0, #D8D2CC)' }}>
                <svg className="w-9 h-9 text-[#9A9A9A] opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 12h.01" /></svg>
              </div>
              <div className="flex-1">
                <h3 className="font-serif text-[22px] text-[#0A0A0A] mb-0.5">Herman Miller Aeron Chair</h3>
                <p className="text-[13px] text-[#9A9A9A] mb-5">Size B · Graphite · Good condition</p>
                <div className="flex items-baseline gap-3">
                  <span className="text-[36px] font-bold text-[#0A0A0A] tracking-[-1.5px]">$485</span>
                  <span className="text-[14px] text-[#9A9A9A]">$380 – $620</span>
                </div>
              </div>
            </div>
            <div className="mt-7 pt-7 border-t border-[#F2F2F2]">
              <div className="flex justify-between mb-2.5">
                <span className="text-[12px] font-semibold uppercase tracking-[0.8px] text-[#9A9A9A]">Confidence</span>
                <strong className="text-[13px] font-semibold text-[#0A0A0A]">87%</strong>
              </div>
              <div className="h-1 bg-[#F2F2F2] rounded-sm overflow-hidden">
                <div data-confidence-bar className="h-full w-0 bg-[#FF6B35] rounded-sm" />
              </div>
              <div className="flex flex-wrap gap-2 mt-5">
                {['eBay Sold', 'Amazon', 'Mercari', 'Craigslist', 'Google Shopping'].map((label) => (
                  <span key={label} className="text-[12px] font-medium text-[#6B6B6B] py-1.5 px-3 bg-[#F2F2F2] rounded-[100px]">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How It Works — matches HTML .steps */}
      <section id="steps" className="py-[100px] md:py-[160px] px-6 md:px-[56px]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16 md:mb-[100px]">
            <p className="scroll-reveal text-[12px] font-bold uppercase tracking-[2px] text-[#FF6B35] mb-5">How It Works</p>
            <h2 className="scroll-reveal d1 font-serif text-[clamp(36px,4.5vw,56px)] font-normal text-[#0A0A0A] tracking-[-1px]">Photo in, price out.</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-16">
            {[
              { num: '01', title: 'Snap a photo', desc: 'Take a photo of anything you want to sell. Furniture, electronics, clothing, collectibles — whatever it is.' },
              { num: '02', title: 'AI scans the market', desc: 'We identify the item and cross-reference real sold prices from eBay, Amazon, Etsy, Mercari, and Google Shopping.' },
              { num: '03', title: 'Get your price', desc: 'Receive a detailed appraisal with fair market value, confidence score, and comparable listings. Sell wherever you want.' },
            ].map((step, i) => (
              <div key={step.num} className={`scroll-reveal step-card ${i === 0 ? 'd1' : i === 1 ? 'd2' : 'd3'}`}>
                <div className="font-serif text-[64px] leading-none text-[#F2F2F2] mb-6 step-num-hover">{step.num}</div>
                <h3 className="text-[18px] font-bold text-[#0A0A0A] tracking-[-0.3px] mb-3">{step.title}</h3>
                <p className="text-[15px] leading-[1.7] text-[#6B6B6B]">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. Features — dark, matches HTML .feats */}
      <section className="bg-[#0A0A0A] text-white py-[100px] md:py-[160px] px-6 md:px-[56px]">
        <div className="max-w-[1100px] mx-auto">
          <div className="mb-16 md:mb-[100px]">
            <p className="scroll-reveal text-[12px] font-bold uppercase tracking-[2px] mb-5" style={{ color: 'rgba(255,107,53,0.7)' }}>Why YardFront</p>
            <h2 className="scroll-reveal d1 font-serif text-[clamp(36px,4.5vw,56px)] font-normal text-white tracking-[-1px] max-w-[600px]">Built different.</h2>
          </div>
          <div className="divide-y divide-white/[0.08]">
            {[
              { num: '01', title: 'Real sold data', desc: "We pull actual completed sales, not asking prices. You see what people really paid — not what sellers wished they'd get." },
              { num: '02', title: 'AI vision, not keywords', desc: 'Google Gemini identifies brand, model, era, and condition from a single photo. No typing, no searching — point and shoot.' },
              { num: '03', title: 'Local context', desc: 'A couch in Berkeley prices differently than in rural Montana. We factor in your local market alongside national data.' },
              { num: '04', title: 'Sell anywhere', desc: "We're not a marketplace. Get your price, then list on eBay, Facebook, Craigslist — wherever works best for you." },
            ].map((row, i) => (
              <div key={row.num} className={`scroll-reveal grid grid-cols-1 md:grid-cols-[200px_1fr] gap-4 md:gap-12 py-12 items-baseline border-t border-white/[0.08] hover:pl-3 transition-[padding-left] duration-300 ${i === 3 ? 'border-b border-white/[0.08]' : ''} ${i === 0 ? 'd1' : i === 1 ? 'd2' : i === 2 ? 'd3' : 'd4'}`}>
                <span className="font-serif text-[18px] text-[#FF6B35]">{row.num}</span>
                <div>
                  <h3 className="text-[22px] font-semibold text-white tracking-[-0.3px] mb-2">{row.title}</h3>
                  <p className="text-[15px] leading-[1.7] text-white/40 max-w-[520px]">{row.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Upload / Try It — matches HTML .upload-sec */}
      <section ref={uploadSectionRef} id="upload" className="py-[100px] md:py-[160px] px-6 flex flex-col items-center text-center">
        <p className="scroll-reveal text-[12px] font-bold uppercase tracking-[2px] text-[#FF6B35] mb-4">Try It</p>
        <h2 className="scroll-reveal d1 font-serif text-[clamp(36px,4.5vw,56px)] font-normal text-[#0A0A0A] tracking-[-1px] mb-4">See it in action.</h2>
        <p className="scroll-reveal d2 text-[17px] text-[#6B6B6B] mb-14 max-w-[380px]">No signup required for your first appraisal.</p>

        {usage.is_limited ? (
          <div className="scroll-reveal d3 w-full max-w-[520px] border border-[#E0E0E0] rounded-[20px] p-12 text-center bg-[#FAFAFA]">
            <div className="text-4xl mb-4">🔒</div>
            <h3 className="text-[20px] font-bold text-[#0A0A0A] mb-2">You've used all 3 free appraisals</h3>
            <p className="text-[#6B6B6B] mb-8 max-w-[360px] mx-auto">
              Upgrade to Pro for unlimited appraisals, all 5+ data sources, and comparable listings.
            </p>
            <button
              type="button"
              onClick={() => document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-2 px-8 py-3 bg-[#0A0A0A] text-white rounded-[100px] font-semibold text-[15px] hover:opacity-85 transition-opacity"
            >
              View Plans
            </button>
            <p className="text-[13px] text-[#9A9A9A] mt-4">Starting at $9/mo · Cancel anytime</p>
          </div>
        ) : (
          <>
            <input ref={fileInputRef} type="file" accept={ACCEPT_IMAGES} capture="environment" className="hidden" onChange={onFileChange} />

            {/* Error message above the upload box */}
            {uploadError && (
              <div className="scroll-reveal d3 w-full max-w-[520px] mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex flex-col items-center justify-center text-center">
                <p className="text-[15px] font-medium text-red-700">{uploadError}</p>
                <p className="text-[13px] text-[#6B6B6B] mt-1">Try another photo or click the box below to try again.</p>
                <button type="button" onClick={() => setUploadError(null)} className="mt-2 text-[13px] font-medium text-[#FF6B35] hover:underline">Dismiss</button>
              </div>
            )}

            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => {
                if (uploadError) setUploadError(null);
                triggerFileInput();
              }}
              className={`scroll-reveal d3 w-full max-w-[520px] border-[1.5px] border-dashed rounded-[20px] py-16 px-10 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${
                isDragging || isUploading ? 'border-[#FF6B35] bg-[rgba(255,107,53,0.08)]' : 'border-[#E0E0E0] hover:border-[#FF6B35] hover:bg-[rgba(255,107,53,0.08)]'
              }`}
            >
              {isUploading ? (
                <>
                  <div className="w-14 h-14 rounded-full flex items-center justify-center mb-5 bg-[rgba(255,107,53,0.08)]">
                    <div className="w-6 h-6 border-2 border-[#E0E0E0] border-t-[#FF6B35] rounded-full animate-spin" />
                  </div>
                  <p className="text-[16px] font-medium text-[#0A0A0A]">Scanning markets...</p>
                  <p className="text-[13px] text-[#9A9A9A] mt-1">Checking eBay, Mercari, Craigslist, and more</p>
                </>
              ) : (
                <>
                  <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-5 transition-all duration-300 ${isDragging ? 'bg-[rgba(255,107,53,0.08)] text-[#FF6B35]' : 'bg-[#F2F2F2] text-[#9A9A9A]'}`}>
                    <Upload size={24} strokeWidth={2} />
                  </div>
                  <p className="text-[16px] font-medium text-[#1A1A1A]">Drop a photo here, or <span className="text-[#FF6B35]">browse</span></p>
                  <p className="text-[13px] text-[#9A9A9A] mt-2">JPG, PNG, HEIC up to 10MB</p>
                </>
              )}
            </div>

            {usage.used > 0 && !usage.is_limited && (
              <p className="text-[13px] text-[#9A9A9A] mt-4">
                {usage.remaining} free appraisal{usage.remaining !== 1 ? 's' : ''} remaining
              </p>
            )}
          </>
        )}

        <div className="flex flex-wrap justify-center gap-2 mt-7 scroll-reveal d4">
          {['Furniture', 'Electronics', 'Sneakers', 'Instruments', 'Collectibles'].map((label) => (
            <button key={label} type="button" className="text-[13px] font-medium text-[#6B6B6B] py-[7px] px-4 border border-[#E0E0E0] rounded-[100px] hover:border-[#FF6B35] hover:text-[#FF6B35] hover:bg-[rgba(255,107,53,0.08)] transition-colors duration-200">
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-[#9A9A9A] mt-4 text-center">
          Powering pricing for estate sales, thrift chains & insurance appraisers.{" "}
          <Link to="/business" className="text-[#FF6B35] hover:underline">
            See business plans →
          </Link>
        </p>
      </section>

      {/* 7. Pricing — matches HTML .pricing */}
      <section id="pricing" className="py-[100px] md:py-[160px] px-6 md:px-[56px]">
        <div className="max-w-[1100px] mx-auto">
          <div className="text-center mb-16 md:mb-[72px]">
            <p className="scroll-reveal text-[12px] font-bold uppercase tracking-[2px] text-[#FF6B35] mb-5">Pricing</p>
            <h2 className="scroll-reveal d1 font-serif text-[clamp(36px,4.5vw,56px)] font-normal text-[#0A0A0A] tracking-[-1px]">Simple and fair.</h2>
            <p className="scroll-reveal d2 text-[16px] text-[#6B6B6B] mt-3">Start with 3 free appraisals. No credit card.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-[400px] md:max-w-none mx-auto md:mx-0">
            {[
              { name: 'Free', price: '$0', priceSpan: '', sub: '3 appraisals', features: ['AI item recognition', 'Price range estimate', '3 platform sources'], cta: 'Get Started', highlight: false, outline: true },
              { name: 'Pro', price: '$9', priceSpan: '/mo', sub: 'Unlimited appraisals', features: ['Unlimited appraisals', 'All 5+ sources', 'Comparable listings', 'Bulk uploads'], cta: 'Start Free Trial', highlight: true, badge: 'Popular', outline: false },
              { name: 'Business', price: '$29', priceSpan: '/mo', sub: 'For resellers', features: ['Everything in Pro', 'API access', 'Batch processing', 'CSV / PDF export'], cta: 'Contact Us', highlight: false, outline: true },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`scroll-reveal relative rounded-[20px] py-10 px-8 border transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(0,0,0,0.06)] ${plan.highlight ? 'bg-[#0A0A0A] text-white border-transparent' : 'bg-white border-[#E0E0E0]'}`}
              >
                {plan.badge && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 py-1 px-3.5 bg-[#FF6B35] text-white text-[11px] font-bold uppercase tracking-[0.5px] rounded-[100px]">{plan.badge}</span>
                )}
                <div className="text-[13px] font-bold uppercase tracking-[1.5px] text-[#9A9A9A] mb-5">{plan.name}</div>
                <div className={`text-[44px] font-bold tracking-[-2px] ${plan.highlight ? 'text-white' : 'text-[#0A0A0A]'}`}>
                  {plan.price}<span className="text-[16px] font-medium tracking-normal">{plan.priceSpan}</span>
                </div>
                <div className={`text-[14px] mt-1 mb-8 ${plan.highlight ? 'text-white/40' : 'text-[#9A9A9A]'}`}>{plan.sub}</div>
                <ul className="flex flex-col gap-3 mb-9">
                  {plan.features.map((f) => (
                    <li key={f} className={`flex items-center gap-2.5 text-[14px] ${plan.highlight ? 'text-white/50' : 'text-[#6B6B6B]'}`}>
                      {plan.highlight ? <span className="text-[#FF6B35]">✓</span> : <Check className="w-4 h-4 text-[#16A34A] shrink-0" strokeWidth={2.5} />}
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                {plan.name === 'Free' ? (
                  <button
                    type="button"
                    onClick={scrollToUpload}
                    className={`block w-full text-center py-3 px-6 rounded-[100px] text-[14px] font-semibold transition-all duration-300 bg-transparent border border-[#E0E0E0] text-[#1A1A1A] hover:border-[#9A9A9A]`}
                  >
                    {plan.cta}
                  </button>
                ) : plan.name === 'Pro' ? (
                  <button
                    type="button"
                    onClick={() => alert('Pro plan coming soon! Join the waitlist at hello@yardfront.com')}
                    className={`block w-full text-center py-3 px-6 rounded-[100px] text-[14px] font-semibold transition-all duration-300 bg-white text-[#0A0A0A] hover:bg-[#F2F2F2]`}
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <a
                    href="mailto:hello@yardfront.com?subject=YardFront%20Business%20Plan%20Inquiry"
                    className={`block text-center py-3 px-6 rounded-[100px] text-[14px] font-semibold transition-all duration-300 bg-transparent border border-[#E0E0E0] text-[#1A1A1A] hover:border-[#9A9A9A]`}
                  >
                    {plan.cta}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 8. Final CTA — matches HTML .final */}
      <section className="py-[120px] md:py-[200px] px-6 text-center">
        <h2 className="scroll-reveal font-serif text-[clamp(44px,6vw,80px)] font-normal text-[#0A0A0A] tracking-[-2px] leading-[1.05] mb-10">
          Stop guessing.<br />Start <em className="italic text-[#FF6B35]">knowing.</em>
        </h2>
        <button
          type="button"
          onClick={scrollToUpload}
          className="scroll-reveal d1 inline-flex items-center gap-2 bg-[#0A0A0A] text-white font-semibold text-[17px] py-4 px-10 rounded-[100px] hover:opacity-90 transition-opacity"
        >
          Try Your First Appraisal
          <ArrowRight size={18} strokeWidth={2.5} />
        </button>
      </section>

      {/* ── BUSINESS SECTION ──────────────────────────────────── */}
      <section className="bg-[#121C32] py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-[#FF6B35] text-xs font-semibold tracking-[0.2em] uppercase mb-6">
            For Businesses
          </p>
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16">
            <h2 className="text-white font-serif italic text-4xl lg:text-6xl leading-tight max-w-2xl">
              Price your entire inventory.<br />
              Not just one item.
            </h2>
            <Link
              to="/business"
              className="inline-flex items-center gap-2 bg-[#FF6B35] text-white px-6 py-3 rounded-full text-sm font-medium hover:opacity-90 transition-opacity self-start lg:self-end whitespace-nowrap no-underline"
            >
              Get API Access →
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-16">
            {[
              {
                title: "Estate Sale Companies",
                description: "Price 200+ items per event in minutes, not days. Bulk upload via CSV or API.",
                stat: "500 items/event avg",
              },
              {
                title: "Thrift Store Chains",
                description: "Stop leaving money on the table. Accurate comps from eBay, Mercari, and more.",
                stat: "5+ data sources",
              },
              {
                title: "Insurance & Claims",
                description: "Defensible market-value appraisals for personal property claims. Audit trail included.",
                stat: "2s response time",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="border border-white/10 rounded-2xl p-6 hover:border-[#FF6B35]/40 transition-colors"
              >
                <p className="text-[#FF6B35] text-2xl font-semibold mb-2">{card.stat}</p>
                <h3 className="text-white font-semibold text-lg mb-2">{card.title}</h3>
                <p className="text-white/50 text-sm leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <p className="text-white/40 text-xs font-mono mb-3">POST /api/v1/appraise</p>
            <pre className="text-white/80 text-sm font-mono leading-relaxed overflow-x-auto">
{`{
  "image_url": "https://...",
  "condition": "good",
  "category": "electronics"
}

→ {
  "item_name": "Canon AE-1 35mm Film Camera",
  "price_low": 65,
  "price_high": 110,
  "price_recommended": 85,
  "confidence": 8.2,
  "sources": ["ebay_sold", "mercari", "craigslist"]
}`}
            </pre>
          </div>
        </div>
      </section>
      {/* ── END BUSINESS SECTION ──────────────────────────────── */}

      {/* 9. Footer — matches HTML footer */}
      <footer className="border-t border-[#F2F2F2] py-10 md:py-12 px-6 md:px-[56px] flex flex-col md:flex-row justify-between items-center gap-5 md:gap-0 text-center md:text-left">
        <div className="text-[13px] text-[#9A9A9A]">© 2026 YardFront · Berkeley, CA</div>
        <div className="flex gap-7">
          <Link to="/privacy-policy" className="text-[13px] text-[#9A9A9A] hover:text-[#0A0A0A] transition-colors">Privacy</Link>
          <Link to="/terms-of-service" className="text-[13px] text-[#9A9A9A] hover:text-[#0A0A0A] transition-colors">Terms</Link>
          <button type="button" onClick={scrollToUpload} className="text-[13px] text-[#9A9A9A] hover:text-[#0A0A0A] transition-colors">Contact</button>
        </div>
      </footer>
    </div>
  );
}
