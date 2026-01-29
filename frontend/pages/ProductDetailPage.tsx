import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { productsApi, aiApi, favoritesApi, conversationsApi } from '../lib/api';
import { formatLocation } from '../lib/locationUtils';
import { supabase } from '../lib/supabase';
import { PRODUCTS, FALLBACK_IMAGE } from '../data';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';
import { DiscoveryMap } from '../components/maps';
import { 
  MapPin, 
  ChevronRight, 
  Zap,
  Navigation,
  Shield,
  RefreshCw,
  Cpu,
  Activity,
  Heart,
  ShieldCheck,
  Truck,
  MessageCircle,
  Star,
  Share2,
  CheckCircle2,
  Info,
  Check,
} from 'lucide-react';

// --- CONSTANTS ---
const APP_ID = 'yardfront-preview';

// --- AI API INTEGRATION ---
// Using backend API instead of direct Gemini calls for better security

// --- UI HELPERS ---
const Img = ({ src, alt, className }: { src?: string; alt: string; className?: string }) => {
  const [bad, setBad] = useState(false);
  const finalSrc = !src || bad ? FALLBACK_IMAGE : src;
  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={className} 
      onError={() => setBad(true)} 
      loading="lazy"
    />
  );
};

// --- UI COMPONENTS ---
const DitherOverlay = () => (
  <div 
    className="fixed inset-0 pointer-events-none z-0 opacity-[0.012] mix-blend-multiply"
    style={{ 
      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
    }}
  />
);


const StitchIntelligenceTerminal = ({ product }: { product: Product }) => {
  const [stage, setStage] = useState<'locked' | 'initializing' | 'ready' | 'error'>('locked');
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleInitialize = async () => {
    setStage('initializing');
    setError(null);

    try {
      const result = await aiApi.appraise({
        title: product.title,
        price: product.price,
        description: product.description,
      });
      
      if (!result.appraisal) {
        setError('Failed to get appraisal. Please try again.');
        setStage('error');
        return;
      }
      
      setReport(result.appraisal);
      setStage('ready');
    } catch (err: any) {
      console.error('Stitch appraisal error:', err);
      const errorMessage = err?.message || err?.error || 'Failed to run appraisal. Please check your connection and try again.';
      setError(errorMessage);
      setStage('error');
    }
  };

  const handleReset = () => {
    setStage('locked');
    setReport(null);
    setError(null);
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-[0_8px_24px_rgba(18,28,50,0.08)]">
      <div className="p-4 flex items-center justify-between border-b border-slate-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <div className="bg-[#121c32] p-1.5 rounded-md text-white">
            <Activity size={14} />
          </div>
          <span className="text-[11px] font-semibold text-[#121c32]">Stitch Appraisal</span>
        </div>
      </div>

      <div className="p-5">
        {stage === 'locked' && (
          <div className="space-y-3">
            <p className="text-[12px] text-slate-600 leading-relaxed font-medium">Get an item-specific buy score and negotiation anchors based on local market data.</p>
            <button 
              onClick={handleInitialize} 
              className="w-full py-2.5 bg-[#121c32] text-white rounded-md font-semibold text-sm tracking-tight hover:bg-[#0f1728] transition-colors flex items-center justify-center gap-2"
            >
              <Cpu size={14} /> Run appraisal
            </button>
          </div>
        )}

        {stage === 'initializing' && (
          <div className="py-4 flex flex-col items-center gap-2">
            <RefreshCw className="animate-spin text-[#FF6B35]" size={18} />
            <p className="text-[11px] font-semibold text-slate-500">Checking comparable listings</p>
          </div>
        )}

        {stage === 'error' && (
          <div className="space-y-4">
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-[11px] font-semibold text-red-700 mb-1">Appraisal Failed</p>
              <p className="text-[11px] text-red-600 leading-relaxed">{error}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleInitialize} 
                className="flex-1 py-2 bg-[#121c32] text-white rounded-md font-semibold text-xs tracking-tight hover:bg-[#0f1728] transition-colors"
              >
                Try Again
              </button>
              <button 
                onClick={handleReset} 
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-md font-semibold text-xs hover:bg-slate-50 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {stage === 'ready' && (
          <div className="space-y-4">
            <div className="text-[12px] text-slate-700 space-y-2 whitespace-pre-wrap leading-relaxed">
              {report}
            </div>
            <button 
              onClick={handleReset} 
              className="text-[10px] font-semibold text-slate-400 hover:text-[#121c32] transition-colors"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// --- SUB-COMPONENTS FOR LAYOUT ---
const SpecRow = ({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) => (
  <div className="flex border-b border-slate-100 py-2 last:border-0">
    <div className="w-1/3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}:</div>
    <div className={`w-2/3 text-[12px] font-semibold tracking-tight ${highlight ? 'text-[#FF6B35]' : 'text-[#121c32]'}`}>{value}</div>
  </div>
);

const SellerBox = ({ product }: { product: Product }) => {
  // Use seller object from API if available, otherwise fallback to old fields
  const seller = product.seller;
  const sellerName = seller?.name || product.sellerName || 'Verified Neighbor';
  const sellerAvatar = seller?.avatar_url || product.sellerAvatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120';
  const rating = seller?.rating_average || product.rating || 5.0;
  const reviewCount = seller?.rating_count || product.reviewCount || 0;
  const isVerified = seller?.verified !== false && (product.isVerified !== false);
  
  // Format location for display (extract neighborhood and city/state)
  const locationText = product.location || 'Location not available';
  const { neighborhood, cityState } = formatLocation(locationText);
  const displayLocation = neighborhood ? `${neighborhood}, ${cityState}` : cityState;
  
  return (
    <div className="p-4 border border-slate-200 rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200 shrink-0">
          <Img 
            src={sellerAvatar} 
            alt={sellerName} 
            className="w-full h-full object-cover" 
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-bold text-[#121c32] text-sm truncate">{sellerName}</h4>
            {isVerified && <CheckCircle2 size={14} className="text-blue-500" />}
          </div>
          <div className="flex items-center gap-1">
            <div className="flex">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} size={8} className={i <= Math.round(rating) ? "fill-[#121c32] text-[#121c32]" : "text-slate-300"} />
              ))}
            </div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">
              {reviewCount > 0 ? `${reviewCount} reviews` : 'New seller'}
            </span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-slate-100 pt-3">
        <div>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Response Time</p>
          <p className="text-[11px] font-bold text-[#121c32]">&lt; 1 hour</p>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Location</p>
          <p className="text-[11px] font-bold text-[#121c32] truncate" title={locationText}>{displayLocation}</p>
        </div>
      </div>
    </div>
  );
};

// --- PRODUCT DETAIL PAGE ---
const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { authToken } = usePersistence();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>(FALLBACK_IMAGE);
  const [isFavorited, setIsFavorited] = useState(false);
  const [checkingFavorite, setCheckingFavorite] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      setError('');
      try {
        // Try to fetch from API first
        let data: Product | null = null;
        try {
          const apiData = await productsApi.get(id);
          data = apiData as Product;
        } catch (apiError) {
          // Fallback to mock data if API fails
          console.warn('API fetch failed, using mock data:', apiError);
          data = PRODUCTS.find(p => p.id === id) || null;
        }

        if (!data) {
          setError('Product not found');
          setLoading(false);
          return;
        }

        // Debug: Log seller data to verify it's being received
        if (process.env.NODE_ENV === 'development') {
          console.log('ProductDetailPage - Seller data:', {
            hasSeller: !!data.seller,
            sellerName: data.seller?.name || data.sellerName,
            sellerAvatar: data.seller?.avatar_url || data.sellerAvatar,
          });
        }

        setProduct(data);
        
        // Extract images using the same logic as ProductCard
        // Handle multiple image formats:
        // 1. product.image (string) - direct image URL
        // 2. product.images (array of strings) - array of URLs
        // 3. product.images (array of objects) - array of { url, is_primary, ... }
        const getImageUrl = (): string => {
          // If there's a direct image property (string) and it's not null/empty
          if (typeof data.image === 'string' && data.image.trim() !== '') {
            return data.image;
          }
          
          // If images is an array
          if (Array.isArray(data.images) && data.images.length > 0) {
            const firstImage = data.images[0];
            
            // If it's an array of strings
            if (typeof firstImage === 'string') {
              return firstImage;
            }
            
            // If it's an array of objects with url property
            if (firstImage && typeof firstImage === 'object' && !Array.isArray(firstImage)) {
              // Try to find primary image first
              const primaryImage = data.images.find((img: any) => 
                img && typeof img === 'object' && !Array.isArray(img) && (img as any).is_primary
              ) as any;
              if (primaryImage && primaryImage.url) {
                return primaryImage.url;
              }
              // Otherwise use first image's url
              return (firstImage as any).url || '';
            }
          }
          
          // Check for image_url property (some APIs use this)
          if ((data as any).image_url && typeof (data as any).image_url === 'string') {
            return (data as any).image_url;
          }
          
          return '';
        };

        // Get all image URLs for the gallery
        const getAllImageUrls = (): string[] => {
          const urls: string[] = [];
          
          // First, try the direct image field
          if (typeof data.image === 'string' && data.image.trim() !== '') {
            urls.push(data.image);
          }
          
          // Then, extract from images array
          if (Array.isArray(data.images) && data.images.length > 0) {
            const imageObjects = data.images.map((img: any) => {
              if (typeof img === 'string') return { url: img, is_primary: false, order_index: 0 };
              return img;
            });
            
            // Sort by is_primary first, then by order_index
            const sorted = [...imageObjects].sort((a: any, b: any) => {
              if (a?.is_primary && !b?.is_primary) return -1;
              if (!a?.is_primary && b?.is_primary) return 1;
              return (a?.order_index || 0) - (b?.order_index || 0);
            });
            
            sorted.forEach((img: any) => {
              if (typeof img === 'string') {
                if (img.trim() !== '' && !urls.includes(img)) {
                  urls.push(img);
                }
              } else if (img && typeof img === 'object' && img.url) {
                const url = img.url;
                if (typeof url === 'string' && url.trim() !== '' && !urls.includes(url)) {
                  urls.push(url);
                }
              }
            });
          }
          
          return urls;
        };
        
        const primaryImage = getImageUrl();
        const allImages = getAllImageUrls();
        
        // Debug logging
        console.log('ProductDetailPage - Image extraction:', {
          hasImageField: !!data.image,
          imageFieldValue: data.image,
          hasImagesArray: Array.isArray(data.images),
          imagesArrayLength: Array.isArray(data.images) ? data.images.length : 0,
          extractedPrimary: primaryImage,
          extractedAll: allImages
        });
        
        // Set the selected image (primary image or fallback)
        setSelectedImage(primaryImage || FALLBACK_IMAGE);
        
        // Fetch similar products (with fallback to mock data)
        if (data.tags && data.tags.length > 0) {
          try {
            const similarResult = await productsApi.list({ 
              category: data.tags[0],
              sort_by: 'newest'
            }) as { products: Product[]; pagination: any };
            const similar = similarResult?.products || [];
            setSimilarProducts(similar.filter((p: Product) => p.id !== id).slice(0, 4));
          } catch (apiError) {
            // Fallback to mock data for similar products
            const similar = PRODUCTS
              .filter((p: Product) => 
                p.id !== id && 
                p.tags && 
                p.tags.some(tag => data.tags?.includes(tag))
              )
              .slice(0, 4);
            setSimilarProducts(similar);
          }
        } else {
          // If no tags, show other products as similar
          const similar = PRODUCTS.filter((p: Product) => p.id !== id).slice(0, 4);
          setSimilarProducts(similar);
        }
      } catch (err: any) {
        console.error('Failed to fetch product:', err);
        setError(err.message || 'Failed to load product');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Load current user id for "own listing" checks (hide Contact Seller on own products)
  useEffect(() => {
    if (!authToken || !supabase) {
      setCurrentUserId(null);
      return;
    }
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUserId(user?.id ?? null);
    });
  }, [authToken]);

  // Check if product is favorited when product loads
  useEffect(() => {
    const checkFavorite = async () => {
      if (!id || !authToken) {
        setIsFavorited(false);
        return;
      }

      setCheckingFavorite(true);
      try {
        const result = await favoritesApi.check(id);
        setIsFavorited(result.is_favorited || false);
      } catch (err) {
        console.error('Failed to check favorite status:', err);
        setIsFavorited(false);
      } finally {
        setCheckingFavorite(false);
      }
    };

    checkFavorite();
  }, [id, authToken]);

  const handleStartMessage = async () => {
    if (!product || !authToken) {
      navigate('/login', { state: { from: { pathname: `/product/${product?.id}` } } });
      return;
    }

    try {
      // Get or create conversation via API
      const conversationId = await conversationsApi.getOrCreate(product.id, authToken);
      navigate(`/inbox?chatId=${conversationId}`);
    } catch (err: any) {
      console.error('Failed to create conversation:', err);
      setError(err.message || 'Failed to start conversation. Please try again.');
    }
  };

  const handleToggleFavorite = async () => {
    if (!product || !authToken) {
      navigate('/login', { state: { from: { pathname: `/product/${product?.id}` } } });
      return;
    }

    try {
      if (isFavorited) {
        await favoritesApi.remove(product.id);
        setIsFavorited(false);
      } else {
        await favoritesApi.add(product.id);
        setIsFavorited(true);
      }
    } catch (err: any) {
      console.error('Failed to toggle favorite:', err);
      setError(err.message || 'Failed to update favorite. Please try again.');
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: product?.title || 'Check out this item',
      text: product?.description || '',
      url: window.location.href,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setError('Link copied to clipboard!');
        setTimeout(() => setError(''), 2000);
      }
    } catch (err: any) {
      // User cancelled share or error occurred
      if (err.name !== 'AbortError') {
        console.error('Failed to share:', err);
        // Try clipboard fallback
        try {
          await navigator.clipboard.writeText(window.location.href);
          setError('Link copied to clipboard!');
          setTimeout(() => setError(''), 2000);
        } catch (clipboardErr) {
          setError('Failed to share. Please copy the URL manually.');
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 text-[#121c32] pt-32 pb-40 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="animate-spin text-[#FF6B35] mx-auto mb-4" size={32} />
          <p className="text-slate-500 font-medium">Loading product...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-50 text-[#121c32] pt-32 pb-40 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error || 'Product not found'}</p>
          <button 
            onClick={() => navigate('/search')} 
            className="bg-[#FF6B35] text-white px-8 py-3 rounded-md font-semibold text-sm tracking-tight hover:bg-[#e85c2e] transition-colors"
          >
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  // Normalize images: extract URLs from images array (which contains objects)
  // Use the same logic as in the useEffect
  const getAllImageUrls = (): string[] => {
    const urls: string[] = [];
    
    // First, try the direct image field
    if (typeof product.image === 'string' && product.image.trim() !== '') {
      urls.push(product.image);
    }
    
    // Then, extract from images array
    if (Array.isArray(product.images) && product.images.length > 0) {
      const imageObjects = product.images.map((img: any) => {
        if (typeof img === 'string') return { url: img, is_primary: false, order_index: 0 };
        return img;
      });
      
      // Sort by is_primary first, then by order_index
      const sorted = [...imageObjects].sort((a: any, b: any) => {
        if (a?.is_primary && !b?.is_primary) return -1;
        if (!a?.is_primary && b?.is_primary) return 1;
        return (a?.order_index || 0) - (b?.order_index || 0);
      });
      
      sorted.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img?.url;
        if (url && typeof url === 'string' && url.trim() !== '' && !urls.includes(url)) {
          urls.push(url);
        }
      });
    }
    
    return urls;
  };
  
  const safeImages = getAllImageUrls();
  
  const savings = product.originalPrice || product.market_average
    ? Math.round(((product.originalPrice || product.market_average || 0) - product.price) / (product.originalPrice || product.market_average || 1) * 100) 
    : null;

  const lat = product.latitude ?? (product as any).lat ?? null;
  const lng = product.longitude ?? (product as any).lng ?? null;
  const privacy = (product.location_privacy || 'neighborhood') as 'exact' | 'neighborhood' | 'city';
  const isOwnListing = currentUserId != null && (product.seller?.id === currentUserId || (product as any).seller_id === currentUserId);

  return (
    <div className="min-h-screen bg-white text-[#121c32] pt-10 pb-20 relative font-sans antialiased selection:bg-[#FF6B35] selection:text-white">
      <DitherOverlay />
      
      <div className="max-w-7xl mx-auto px-5 lg:px-10 relative z-10">
        
        {/* Simple Breadcrumb Nav */}
        <nav className="flex items-center gap-2 py-4 text-[12px] text-slate-500">
          <Link className="font-medium hover:text-[#121c32] transition-colors" to="/">Marketplace</Link>
          <ChevronRight size={12} className="text-slate-300" />
          <Link className="font-medium hover:text-[#121c32] transition-colors" to="/search">{product.tags?.[0] || 'Uncategorized'}</Link>
          <ChevronRight size={12} className="text-slate-300" />
          <span className="text-[#121c32] truncate font-semibold">{product.title}</span>
        </nav>

        {/* ABOVE THE FOLD - GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 border-b border-slate-200 pb-8">
          
          {/* GALLERY COLUMN (7/12) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white border border-slate-200 rounded-lg shadow-[0_8px_24px_rgba(18,28,50,0.08)] overflow-hidden">
              <div className="aspect-[4/3] bg-slate-50">
                <Img src={selectedImage} alt={product.title} className="w-full h-full object-cover" />
              </div>
            </div>
            
            {safeImages.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-2 border-t border-slate-200 pt-4">
                {safeImages.map((img: string, i: number) => (
                  <button 
                    key={`${img}-${i}`} 
                    onClick={() => setSelectedImage(img)}
                    className={`w-20 h-20 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                      selectedImage === img ? 'border-[#FF6B35]' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <Img src={img} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* About this item - moved here to reduce whitespace */}
            <section className="space-y-4 pt-2">
              <h2 className="text-lg font-bold text-[#121c32] border-b border-slate-200 pb-3">About this item</h2>
              <div className="text-slate-600 text-[14px] leading-relaxed">
                <p>{product.description || 'No description provided.'}</p>
              </div>
            </section>
          </div>

          {/* PURCHASE PANEL COLUMN (5/12) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div className="space-y-4">
                <h1 className="text-2xl font-bold tracking-tight text-[#121c32] leading-snug">
                  {product.title}
                </h1>

                <div className="border border-slate-200 rounded-lg p-5 bg-white shadow-[0_10px_28px_rgba(18,28,50,0.06)]">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-widest">Price</p>
                      <div className="flex items-baseline gap-3 mt-1">
                        <span className="text-3xl font-extrabold tracking-tight text-[#121c32]">${product.price}</span>
                        {(product.originalPrice || product.market_average) && (
                          <span className="text-sm text-slate-400 line-through font-semibold">
                            ${product.originalPrice || product.market_average}
                          </span>
                        )}
                      </div>
                    </div>

                    {savings && savings > 0 && (
                      <div className="text-right">
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Savings</p>
                        <p className="text-sm font-bold text-green-700 mt-1">{savings}% below market</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-slate-200 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-slate-500">Neighborhood pickup</span>
                    <span className="text-[11px] font-bold text-[#121c32]">{product.location || 'Location not specified'}</span>
                  </div>
                </div>

              {/* SPECIFICATIONS */}
              <div className="space-y-0 pb-2">
                <SpecRow label="Condition" value={product.specs?.Condition || "Used - Excellent"} />
                <SpecRow label="Category" value={product.tags?.join(', ') || 'N/A'} />
                <SpecRow label="Item Location" value={product.location || 'Location not specified'} />
                <SpecRow label="Listing ID" value={`YF-${id}-${APP_ID.slice(0, 4)}`} />
              </div>

              {/* ACTIONS */}
              <div className="space-y-3 pt-2">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-xs text-red-600 font-medium">{error}</p>
                  </div>
                )}
                
                {isOwnListing ? (
                  <div className="py-3.5 px-4 bg-slate-100 border border-slate-200 rounded-md text-center min-h-[44px] flex items-center justify-center">
                    <p className="text-sm font-medium text-slate-500">This is your listing. You can edit it from your profile.</p>
                  </div>
                ) : (
                  <button 
                    onClick={handleStartMessage}
                    className="w-full min-h-[44px] py-3.5 bg-[#FF6B35] hover:bg-[#e85c2e] text-white rounded-md font-semibold text-sm tracking-tight transition-all shadow-xl shadow-[0_10px_22px_rgba(255,107,53,0.22)] flex items-center justify-center gap-2"
                  >
                    <MessageCircle size={16} /> Contact Seller
                  </button>
                )}
                
                <div className="flex gap-3">
                  <button 
                    onClick={handleToggleFavorite}
                    disabled={checkingFavorite}
                    className={`flex-1 min-h-[44px] py-3 border rounded-md font-semibold text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50 ${
                      isFavorited
                        ? 'border-[#FF6B35] bg-[#FF6B35]/5 text-[#FF6B35]'
                        : 'border-slate-200 text-[#121c32] hover:bg-slate-50'
                    }`}
                  >
                    <Heart size={14} fill={isFavorited ? '#FF6B35' : 'none'} /> {isFavorited ? 'Saved' : 'Save'}
                  </button>
                  <button 
                    onClick={handleShare}
                    className="flex-1 min-h-[44px] py-3 border border-slate-200 text-[#121c32] rounded-md font-semibold text-sm hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <Share2 size={14} /> Share
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#121c32]" />
                  <span className="text-[10px] font-bold text-[#121c32] uppercase tracking-wider">Buyer Protection</span>
                </div>
                <Info size={14} className="text-slate-300" />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">Seller Information</h3>
              <SellerBox product={product} />
            </div>

            <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-100">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-slate-400" />
                <span className="text-[10px] font-bold uppercase text-[#121c32]">Local Pickup</span>
              </div>
              <div className="flex items-center gap-2">
                <Navigation size={16} className="text-slate-400" />
                <span className="text-[10px] font-bold uppercase text-[#121c32]">Safe Meetup</span>
              </div>
            </div>
            </div>
          </div>
        </div>

        {/* BELOW THE FOLD - DETAILS */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* DESCRIPTION COLUMN */}
          <div className="lg:col-span-8 space-y-8">
            <section className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h2 className="text-lg font-bold text-[#121c32]">Pickup Location</h2>
                <div className="flex items-center gap-1.5 text-blue-600">
                  <Shield size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Safe Trade Spot</span>
                </div>
              </div>
              
              {lat != null && lng != null ? (
                <div className="h-[280px] md:h-[200px] w-full rounded-lg overflow-hidden">
                  <DiscoveryMap
                    lat={lat}
                    lng={lng}
                    privacy={privacy}
                    height="100%"
                    showUserLocation={true}
                    interactive={true}
                  />
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg">
                  <p className="text-sm font-medium text-slate-500">Location not specified</p>
                </div>
              )}
              
              <p className="text-[11px] text-slate-400 font-medium">
                For your safety, meeting in public areas or "Safe Trade Spots" at local police stations is highly recommended. 
                Specific address will be shared via secure messaging after negotiation.
              </p>
            </section>
          </div>

          {/* SECONDARY TOOLS COLUMN */}
          <div className="lg:col-span-4 space-y-6">
            <StitchIntelligenceTerminal product={product} />
            
            <div className="p-5 border border-slate-200 rounded-lg space-y-4 bg-slate-50">
              <h4 className="text-[11px] font-bold uppercase tracking-widest text-[#121c32] flex items-center gap-2">
                <Zap size={12} /> Why YardFront?
              </h4>
              <ul className="space-y-3">
                {[
                  'Secure local transactions',
                  'Verified neighborhood sellers',
                  'Market data insights',
                  'Safe meeting radius tracking'
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-slate-500 font-medium">
                    <CheckCircle2 size={12} className="text-[#FF6B35] mt-0.5" />
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* SIMILAR ITEMS GRID */}
        {similarProducts.length > 0 && (
          <section className="mt-16 pt-12 border-t border-slate-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-[#121c32] tracking-tight">You might also like</h2>
              <button 
                onClick={() => navigate('/search')} 
                className="text-[10px] font-bold uppercase tracking-widest text-slate-400 hover:text-[#121c32] transition-colors"
              >
                Explore Marketplace
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {similarProducts.map((p: Product) => (
                <div key={p.id} className="group cursor-pointer rounded-lg p-2 transition-all hover:shadow-[0_12px_26px_rgba(18,28,50,0.08)]" onClick={() => navigate(`/product/${p.id}`)}>
                  <div className="aspect-square rounded-lg overflow-hidden bg-slate-50 border border-slate-200 mb-3 relative">
                    <Img src={p.image} alt={p.title} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-[#121c32] text-xs truncate leading-tight group-hover:text-[#FF6B35]">{p.title}</h3>
                    <div className="flex justify-between items-center">
                      <span className="font-black text-sm text-[#121c32]">${p.price}</span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.location}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
};

export default ProductDetailPage;
