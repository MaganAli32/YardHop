import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { salesApi } from '../lib/api';
import { SALES, FALLBACK_IMAGE } from '../data';
import { GarageSale } from '../types';
import { DiscoveryMap } from '../components/maps';
import { 
  MapPin, 
  ChevronRight, 
  Zap,
  Navigation,
  ShieldCheck,
  RefreshCw,
  Lock,
  Cpu,
  Activity,
  Clock,
  Calendar,
  User,
  Sparkles,
  TrendingDown,
  Share2,
  Heart,
  MessageCircle,
  AlertCircle,
  ArrowRight,
  Info,
} from 'lucide-react';

// --- CONSTANTS ---
const DEFAULT_LAT = 33.4936;
const DEFAULT_LNG = -117.1484;

// --- GEMINI API INTEGRATION ---
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';

async function callGemini(
  prompt: string,
  systemPrompt = 'You are a neighborhood marketplace expert named Stitch AI.'
): Promise<string> {
  if (!GEMINI_API_KEY) {
    return "AI diagnostic unavailable. API key not configured.";
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;
  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
  };

  const maxRetries = 4;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        return result.candidates?.[0]?.content?.parts?.[0]?.text || 'No response.';
      }

      if (res.status === 429 || res.status >= 500) {
        await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
        continue;
      }
      return `AI error (${res.status}).`;
    } catch {
      await new Promise((r) => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
  return 'AI diagnostic unavailable. Please try again later.';
}

// --- SUBCOMPONENTS ---
const Img = ({
  src,
  alt,
  className,
}: {
  src?: string;
  alt: string;
  className?: string;
}) => {
  const [imgSrc, setImgSrc] = useState(src || FALLBACK_IMAGE);
  useEffect(() => setImgSrc(src || FALLBACK_IMAGE), [src]);
  return (
    <img
      src={imgSrc || FALLBACK_IMAGE}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setImgSrc(FALLBACK_IMAGE)}
    />
  );
};


const StitchSaleIntelligence = ({ sale }: { sale: GarageSale }) => {
  const [stage, setStage] = useState<'locked' | 'loading' | 'ready'>('locked');
  const [report, setReport] = useState<string>('');

  const runAnalysis = async () => {
    setStage('loading');
    const prompt = `Analyze this garage sale event:
Title: ${sale.title}
Date: ${sale.date}
Time: ${sale.time}
Tags: ${(sale.tags || []).join(', ')}

Return:
- Quality score (0-100)
- Best arrival strategy
- Top 3 categories to prioritize

Make it concise and use bold labels.`;
    const res = await callGemini(prompt);
    setReport(res);
    setStage('ready');
  };

  return (
    <div className="bg-[#121c32] rounded-2xl overflow-hidden border border-slate-800 p-6 shadow-xl">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Cpu size={16} className="text-[#FF6B35]" />
          <span className="text-[10px] font-bold text-white uppercase tracking-[0.2em]">
            Stitch Intelligence
          </span>
        </div>
        <div
          className={`w-1.5 h-1.5 rounded-full ${
            stage === 'ready'
              ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'
              : 'bg-[#FF6B35] animate-pulse'
          }`}
        />
      </div>

      {stage === 'locked' && (
        <div className="space-y-4">
          <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
            Unlock a quick plan: best time to arrive + what to hunt first.
          </p>
          <button
            onClick={runAnalysis}
            className="w-full py-3 bg-white hover:bg-[#FF6B35] text-[#121c32] hover:text-white text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <Lock size={12} /> Unlock Diagnostic
          </button>
        </div>
      )}

      {stage === 'loading' && (
        <div className="py-8 flex flex-col items-center gap-3">
          <RefreshCw className="animate-spin text-[#FF6B35]" size={24} />
          <span className="text-[9px] text-white/40 uppercase tracking-widest font-black">
            Analyzing…
          </span>
        </div>
      )}

      {stage === 'ready' && (
        <div className="text-[11px] text-slate-200 leading-relaxed font-mono whitespace-pre-wrap bg-black/40 p-4 rounded-xl border border-white/5 max-h-[300px] overflow-y-auto">
          {report}
        </div>
      )}
    </div>
  );
};

interface SaleItem {
  id: number;
  image: string;
  title: string;
  listedPrice: number;
  marketValue: { min: number; max: number };
  condition: string;
  category: string;
  isSteal?: boolean;
}

// --- YARD SALE DETAIL PAGE ---
const YardSaleDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [showPriceAnalysis, setShowPriceAnalysis] = useState<number | null>(null);
  const [saleInfo, setSaleInfo] = useState<GarageSale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSale = async () => {
      setLoading(true);
      try {
        // Try to fetch from API first
        let data: any = null;
        try {
          data = await salesApi.get(id || '');
        } catch (apiError) {
          // Fallback to mock data if API fails
          console.warn('API fetch failed, using mock data:', apiError);
          data = SALES.find(s => s.id === id) || null;
        }

        if (data) {
          // Extract image using the same logic as other pages
          let imageUrl = '';
          
          // First, try the convenience image field
          if (data.image && typeof data.image === 'string' && data.image.trim() !== '') {
            imageUrl = data.image;
          } 
          // Then, try to extract from images array
          else if (Array.isArray(data.images) && data.images.length > 0) {
            // Sort by is_primary first, then by order_index
            const sorted = [...data.images].sort((a: any, b: any) => {
              if (a?.is_primary && !b?.is_primary) return -1;
              if (!a?.is_primary && b?.is_primary) return 1;
              return (a?.order_index || 0) - (b?.order_index || 0);
            });
            
            const first = sorted[0];
            if (typeof first === 'string' && first.trim() !== '') {
              imageUrl = first;
            } else if (first && typeof first === 'object' && first.url) {
              imageUrl = first.url;
            }
          }
          
          // Format date and time from API response
          const formatDate = (dateStr: string) => {
            if (!dateStr) return '';
            try {
              const date = new Date(dateStr);
              return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            } catch {
              return dateStr;
            }
          };
          
          const formatTime = (timeStr: string) => {
            if (!timeStr) return '';
            return timeStr.slice(0, 5); // HH:MM format
          };
          
          const saleData: GarageSale = {
            id: data.id,
            title: data.title,
            description: data.description || '',
            date: data.start_date ? formatDate(data.start_date) : (data.date || ''),
            time: data.start_time ? formatTime(data.start_time) : (data.time || ''),
            image: imageUrl || FALLBACK_IMAGE,
            tags: data.tags || [],
          };
          
          console.log('YardSaleDetailPage - Image extraction:', {
            hasImageField: !!data.image,
            imageFieldValue: data.image,
            hasImagesArray: Array.isArray(data.images),
            imagesArrayLength: Array.isArray(data.images) ? data.images.length : 0,
            extractedImage: imageUrl
          });
          
          setSaleInfo(saleData);
        }
      } catch (err: any) {
        console.error('Failed to fetch garage sale:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [id]);

  const items: SaleItem[] = [
    {
      id: 1,
      image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600&auto=format&fit=crop&q=80',
      title: 'MCM Lounge Chair',
      listedPrice: 45,
      marketValue: { min: 180, max: 250 },
      condition: 'Good',
      category: 'Furniture',
      isSteal: true,
    },
    {
      id: 2,
      image: 'https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=600&auto=format&fit=crop&q=80',
      title: 'Vintage Canon AE-1',
      listedPrice: 35,
      marketValue: { min: 120, max: 180 },
      condition: 'Good',
      category: 'Electronics',
      isSteal: true,
    },
    {
      id: 3,
      image: 'https://images.unsplash.com/photo-1592078615290-033ee584e267?w=600&auto=format&fit=crop&q=80',
      title: 'Dining Set (6 Chairs)',
      listedPrice: 120,
      marketValue: { min: 140, max: 200 },
      condition: 'Like New',
      category: 'Furniture',
    },
    {
      id: 4,
      image: 'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=600&auto=format&fit=crop&q=80',
      title: "Kids' Bike",
      listedPrice: 40,
      marketValue: { min: 95, max: 150 },
      condition: 'Fair',
      category: 'Kids',
      isSteal: true,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <RefreshCw className="animate-spin text-[#FF6B35]" size={32} />
      </div>
    );
  }

  if (!saleInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8 text-center">
        <AlertCircle size={48} className="text-slate-200 mb-4 mx-auto" />
        <h2 className="text-xl font-bold text-[#121c32] mb-2">Event Not Found</h2>
        <button
          onClick={() => navigate('/sales')}
          className="bg-[#121c32] text-white px-6 py-2 rounded-lg font-bold text-sm uppercase mt-4"
        >
          Back to Sales
        </button>
      </div>
    );
  }

  const lat = saleInfo.latitude || (saleInfo as any).lat || DEFAULT_LAT;
  const lng = saleInfo.longitude || (saleInfo as any).lng || DEFAULT_LNG;
  const privacy = (saleInfo.location_privacy || 'neighborhood') as 'exact' | 'neighborhood' | 'city';

  return (
    <div className="min-h-screen bg-white text-[#121c32] font-sans selection:bg-[#FF6B35] selection:text-white pb-20">
      {/* Breadcrumbs */}
      <div className="border-b border-slate-100 sticky top-0 z-50 bg-white/80 backdrop-blur-md">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.15em] text-slate-400">
          <Link to="/" className="hover:text-[#FF6B35] transition-colors">
            Home
          </Link>
          <ChevronRight size={12} className="text-slate-200" />
          <Link to="/sales" className="hover:text-[#FF6B35] transition-colors">
            Garage Sales
          </Link>
          <ChevronRight size={12} className="text-slate-200" />
          <span className="text-slate-900 truncate">{saleInfo.title}</span>
        </nav>
      </div>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 mt-8 mb-16">
        <div className="relative w-full h-[320px] md:h-[480px] rounded-2xl overflow-hidden border border-slate-200 shadow-sm group">
          <Img
            src={saleInfo.image}
            alt={saleInfo.title}
            className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
          <div className="absolute top-4 md:top-8 left-4 md:left-8">
            <div className="flex items-center gap-3 bg-white/95 backdrop-blur px-3 md:px-5 py-2 md:py-2.5 rounded-xl border border-slate-200 shadow-xl">
              <Zap size={14} className="text-[#FF6B35]" fill="currentColor" />
              <span className="text-[9px] md:text-[10px] font-black text-[#121c32] uppercase tracking-[0.2em]">
                Garage Sale Event
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 md:mt-12 flex flex-col lg:flex-row lg:items-end justify-between gap-8 md:gap-10">
          <div className="space-y-4 md:space-y-6 max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-[#121c32] leading-[1.1]">
              {saleInfo.title}
            </h1>

            <div className="flex flex-wrap gap-3 md:gap-4">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 md:px-5 py-2 md:py-3 rounded-xl text-[11px] md:text-xs font-bold text-slate-700">
                <Calendar size={14} className="text-[#FF6B35]" /> {saleInfo.date}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 md:px-5 py-2 md:py-3 rounded-xl text-[11px] md:text-xs font-bold text-slate-700">
                <Clock size={14} className="text-[#FF6B35]" /> {saleInfo.time}
              </div>
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-4 md:px-5 py-2 md:py-3 rounded-xl text-[11px] md:text-xs font-bold text-slate-700">
                <MapPin size={14} className="text-[#FF6B35]" /> {(saleInfo as any).location || 'Temecula, CA'}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3 lg:pb-2">
            <button
              onClick={() => window.open(`https://maps.google.com/?q=${lat},${lng}`, '_blank')}
              className="flex items-center gap-2 md:gap-3 bg-[#FF6B35] hover:bg-[#121c32] text-white px-6 md:px-10 py-3 md:py-5 rounded-xl font-bold text-[10px] md:text-xs uppercase tracking-[0.2em] transition-all shadow-xl shadow-orange-500/10 active:scale-95"
            >
              <Navigation size={18} /> Directions
            </button>
            <button className="p-3 md:p-5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-[#121c32] transition-colors">
              <Heart size={20} />
            </button>
            <button className="p-3 md:p-5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-400 hover:text-[#121c32] transition-colors">
              <Share2 size={20} />
            </button>
            <button className="flex items-center gap-2 md:gap-3 px-5 md:px-8 py-3 md:py-5 border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-900 font-bold text-[10px] md:text-xs uppercase tracking-widest transition-colors">
              <MessageCircle size={18} /> Message
            </button>
          </div>
        </div>
      </section>

      {/* Main grid */}
      <section className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-12 gap-10 md:gap-16">
        {/* Left */}
        <div className="lg:col-span-8 space-y-12 md:space-y-20">
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center gap-4">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#121c32]">
                About this sale
              </h3>
              <div className="h-px flex-1 bg-slate-100" />
            </div>
            <p className="text-slate-600 leading-relaxed text-lg md:text-xl font-medium">
              {saleInfo.description}
            </p>

            {!!saleInfo.tags?.length && (
              <div className="flex flex-wrap gap-2 pt-2">
                {saleInfo.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[9px] md:text-[10px] font-black uppercase tracking-widest px-3 md:px-4 py-1.5 md:py-2 bg-slate-50 text-slate-400 rounded-lg border border-slate-200"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Featured */}
          <div className="space-y-6 md:space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#121c32]">
                Featured Items
              </h3>
              <a
                href="#catalog"
                className="text-[9px] md:text-[10px] font-bold text-[#FF6B35] uppercase tracking-[0.2em] flex items-center gap-2 hover:underline"
              >
                See Full Catalog <ArrowRight size={14} />
              </a>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
              {items.slice(0, 4).map((item) => (
                <div key={item.id} className="group cursor-pointer">
                  <div className="aspect-square rounded-2xl overflow-hidden border border-slate-100 mb-3 md:mb-4 bg-slate-50">
                    <Img
                      src={item.image}
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                  <h4 className="text-[10px] md:text-[11px] font-black text-slate-900 uppercase tracking-tight truncate">
                    {item.title}
                  </h4>
                  <p className="text-xs md:text-sm font-black text-[#FF6B35] mt-1">
                    ${item.listedPrice}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="lg:col-span-4 space-y-8 md:space-y-10">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                Location Preview
              </h4>
              <div className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase border border-blue-100">
                Safe Zone
              </div>
            </div>

            <DiscoveryMap
              lat={lat}
              lng={lng}
              privacy={privacy}
              height="280px"
              showUserLocation={true}
              interactive={true}
            />

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
              <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <Info size={14} className="text-blue-500" /> Safety Note
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-2 font-medium">
                Address may be revealed on the morning of the sale for host security. Meet in daylight and
                prefer public areas when possible.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
              The Host
            </h4>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden">
                <User size={30} className="text-slate-300" />
              </div>
              <div className="space-y-1">
                <p className="text-base font-black text-[#121c32] tracking-tighter uppercase leading-none">
                  {(saleInfo as any).hostName || 'Verified Neighbor'}
                </p>
                <p className="text-[10px] font-bold text-slate-400 uppercase">
                  {(saleInfo as any).hostLabel || 'Trusted Host'}
                </p>
              </div>
            </div>
            <button className="w-full py-4 bg-slate-900 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-[#FF6B35] transition-colors">
              View Profile
            </button>
          </div>

          <StitchSaleIntelligence sale={saleInfo} />
        </div>
      </section>

      {/* Catalog */}
      <section
        id="catalog"
        className="max-w-7xl mx-auto px-6 mt-24 pt-16 border-t border-slate-100"
      >
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-[#121c32]">Item Catalog</h2>
            <p className="text-slate-500 font-medium mt-2">Preview items before you arrive.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {items.map((item) => {
            const pct = Math.round((1 - item.listedPrice / item.marketValue.max) * 100);
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col hover:border-[#FF6B35] hover:shadow-xl transition-all duration-300 group"
              >
                <div className="relative aspect-square bg-slate-50 overflow-hidden">
                  <Img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />

                  <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={() =>
                        setShowPriceAnalysis(showPriceAnalysis === item.id ? null : item.id)
                      }
                      className="p-3 bg-white/95 backdrop-blur rounded-xl border border-slate-200 text-[#121c32] hover:text-[#FF6B35] shadow-xl"
                      aria-label="Toggle market analysis"
                    >
                      <Activity size={16} />
                    </button>
                    <button
                      className="p-3 bg-white/95 backdrop-blur rounded-xl border border-slate-200 text-slate-400 hover:text-red-500 shadow-xl"
                      aria-label="Save item"
                    >
                      <Heart size={16} />
                    </button>
                  </div>

                  {item.isSteal && (
                    <div className="absolute top-4 left-4">
                      <div className="bg-[#FF6B35] text-white text-[9px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest shadow-xl flex items-center gap-1.5">
                        <Sparkles size={10} fill="currentColor" />
                        Yard Steal
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-tight flex-1 line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="text-right">
                      <p className="text-xl font-black text-[#121c32] tracking-tighter leading-none">
                        ${item.listedPrice}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded border border-slate-100">
                      {item.condition}
                    </span>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 bg-slate-50 rounded border border-slate-100">
                      {item.category}
                    </span>
                  </div>

                  {showPriceAnalysis === item.id && (
                    <div className="mb-6 p-4 bg-[#121c32] text-white rounded-2xl border border-slate-800 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex items-center gap-2 mb-3">
                        <TrendingDown size={14} className="text-[#FF6B35]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#FF6B35]">
                          Market Intelligence
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 uppercase font-bold">Resale Range</span>
                          <span className="font-black text-white">
                            ${item.marketValue.min} - ${item.marketValue.max}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 leading-relaxed font-medium italic">
                          Priced about {pct}% below active resale listings.
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-auto">
                    <button className="w-full py-3.5 bg-[#121c32] hover:bg-[#FF6B35] text-white rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                      Inquire
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default YardSaleDetailPage;
