
import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { productsApi } from '../lib/api';
import ProductCard from '../components/ProductCard';
import { Product } from '../types';

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getOrCreateChat } = usePersistence();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [similarProducts, setSimilarProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string>('');
  const [isFindingSafeZone, setIsFindingSafeZone] = useState(false);
  const [safeZones, setSafeZones] = useState<any[]>([]);

  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) return;
      
      setLoading(true);
      setError('');
      try {
        const data = await productsApi.get(id);
        setProduct(data);
        setSelectedImage(data.image || data.images?.[0] || '');
        
        // Fetch similar products
        if (data.tags && data.tags.length > 0) {
          const similar = await productsApi.list({ 
            category: data.tags[0],
            sortBy: 'newest'
          });
          setSimilarProducts(similar.filter((p: Product) => p.id !== id).slice(0, 4));
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

  const handleStartMessage = () => {
    const chat = getOrCreateChat(product);
    navigate(`/inbox?chatId=${chat.id}`);
  };

  const handleFindSafeZone = async () => {
    if (!product) return;
    
    setIsFindingSafeZone(true);
    try {
      // Simple fallback safe zones
      setSafeZones([
        { maps: { title: "Central Public Library", uri: "https://maps.google.com" } },
        { maps: { title: "Austin Police Station", uri: "https://maps.google.com" } },
        { maps: { title: "Local Coffee Shop", uri: "https://maps.google.com" } },
      ]);
    } catch (e) { 
      console.error(e); 
      setSafeZones([{ maps: { title: "Central Public Library", uri: "https://maps.google.com" } }]);
    } finally { 
      setIsFindingSafeZone(false); 
    }
  };

  if (loading) {
    return (
      <div className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white">
        <div className="text-center py-20">Loading product...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white">
        <div className="text-center py-20">
          <p className="text-red-500">{error || 'Product not found'}</p>
          <button onClick={() => navigate('/search')} className="mt-4 text-primary">
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const images = product.images || [product.image];

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-6 lg:px-8 py-12 bg-white">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
        
        {/* Left: Gallery */}
        <div className="lg:col-span-7 space-y-8">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
             <img src={selectedImage} alt={product.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
          </div>
          {images.length > 1 && (
            <div className="grid grid-cols-5 gap-4">
               {images.map((img, i) => (
                 <button 
                  key={i} 
                  onClick={() => setSelectedImage(img)} 
                  className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${selectedImage === img ? 'border-orange-500' : 'border-transparent opacity-60 hover:opacity-100'}`}
                 >
                   <img src={img} className="w-full h-full object-cover" alt="" />
                 </button>
               ))}
            </div>
          )}
          
          <div className="pt-10 border-t border-slate-100">
             <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Description</h2>
             <p className="text-slate-600 leading-relaxed text-lg font-medium">
                {product.description || "A well-maintained neighborhood find. Perfect for local collection."}
             </p>
          </div>
        </div>

        {/* Right: Info & Actions */}
        <div className="lg:col-span-5 space-y-10">
           <div className="space-y-6">
              <div className="flex items-center gap-3">
                 <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black rounded-full uppercase tracking-[0.2em] border border-green-100">Available</span>
                 <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black rounded-full uppercase tracking-[0.2em]">{product.tags?.[0]}</span>
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 leading-[1.1]">{product.title}</h1>
              <div className="flex items-baseline gap-6">
                 <span className="text-5xl font-black text-orange-500 tracking-tight">${product.price}</span>
                 {product.originalPrice && (
                    <span className="text-xl text-slate-300 line-through font-bold">${product.originalPrice}</span>
                 )}
              </div>
           </div>

           {/* Seller Profile Card */}
           <div className="p-8 bg-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-48 h-48 bg-orange-500 rounded-full blur-[100px] opacity-20 transition-opacity"></div>
              <div className="relative z-10 space-y-8">
                 <div className="flex items-center gap-5">
                    <img src={product.sellerAvatar || 'https://randomuser.me/api/portraits/lego/1.jpg'} className="size-16 rounded-xl object-cover border border-white/10" alt="" />
                    <div>
                       <p className="font-bold text-xl">{product.sellerName || 'Verified Neighbor'}</p>
                       <p className="text-xs text-slate-400 font-medium uppercase tracking-widest">Austin • Member since 2022</p>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Reliability</p>
                       <p className="text-lg font-black text-orange-400">4.9/5</p>
                    </div>
                    <div className="bg-white/5 p-4 rounded-xl border border-white/5 text-center">
                       <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Sales</p>
                       <p className="text-lg font-black text-orange-400">121</p>
                    </div>
                 </div>

                 <button onClick={handleStartMessage} className="w-full py-5 bg-orange-500 text-white rounded-xl font-bold text-sm uppercase tracking-[0.2em] shadow-2xl shadow-orange-500/30 hover:bg-orange-600 transition-all hover:-translate-y-1">
                    START NEGOTIATION
                 </button>
              </div>
           </div>

           {/* Stitch Safe Zone Suggestion */}
           <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 space-y-6">
              <div className="flex items-center justify-between">
                 <h3 className="text-lg font-bold flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-500">verified_user</span>
                    Safe Exchange Zone
                 </h3>
                 <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">STITCH AI</span>
              </div>
              
              {!safeZones.length ? (
                <button 
                  onClick={handleFindSafeZone} 
                  disabled={isFindingSafeZone} 
                  className="w-full py-4 bg-white border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-3 hover:border-orange-500/50 hover:bg-slate-50 shadow-sm"
                >
                  {isFindingSafeZone ? <div className="size-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div> : <span className="material-symbols-outlined !text-lg">location_searching</span>}
                  SUGGEST PUBLIC MEETING SPOTS
                </button>
              ) : (
                <div className="space-y-4">
                   {safeZones.map((chunk, idx) => chunk.maps && (
                     <a 
                      key={idx} 
                      href={chunk.maps.uri} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="flex items-center justify-between p-5 bg-white border border-slate-200 hover:border-orange-500/40 rounded-xl transition-all group shadow-sm"
                     >
                        <div className="min-w-0 flex-1">
                           <p className="font-bold text-slate-900 truncate">{chunk.maps.title}</p>
                           <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1">Verified Safe Spot</p>
                        </div>
                        <span className="material-symbols-outlined text-slate-300 group-hover:text-orange-500 transition-colors">directions</span>
                     </a>
                   ))}
                </div>
              )}
           </div>
        </div>
      </div>

      {/* Similar Items Feed */}
      <section className="mt-32 pt-20 border-t border-slate-100">
         <div className="flex items-end justify-between mb-12">
            <div>
               <h2 className="text-3xl font-bold text-slate-900 tracking-tight">You might also like</h2>
               <p className="text-slate-500 font-medium">Other treasures in the same category.</p>
            </div>
         </div>
         <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {similarItems.map(p => <ProductCard key={p.id} product={p} />)}
         </div>
      </section>
    </div>
  );
};

export default ProductDetailPage;
