
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { productsApi, aiApi, uploadApi } from '../lib/api';

// Define CATEGORIES for use in the category selection dropdown
const CATEGORIES = [
  { name: 'All', icon: 'grid_view' },
  { name: 'Furniture', icon: 'chair' },
  { name: 'Electronics', icon: 'devices' },
  { name: 'Clothing', icon: 'checkroom' },
  { name: 'Kids', icon: 'child_care' },
  { name: 'Antiques', icon: 'history_edu' },
  { name: 'Tools', icon: 'construction' },
  { name: 'Sports', icon: 'sports_soccer' },
];

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { authToken } = usePersistence();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [priceAnalysis, setPriceAnalysis] = useState<any | null>(null);
  const [groundingSources, setGroundingSources] = useState<any[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Furniture',
    description: '',
    price: '',
    condition: 'Good',
    location: 'Austin, TX'
  });

  // Cleanup effect for object URLs
  useEffect(() => {
    return () => {
      photos.forEach(url => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url);
      });
    };
  }, [photos]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      // Fixed: Explicitly casting file to Blob to satisfy URL.createObjectURL type requirements
      const newPhotos = newFiles.map(file => URL.createObjectURL(file as Blob));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const handlePriceCheck = async () => {
    if (photos.length === 0) return;
    setIsAnalyzing(true);
    
    try {
      // Convert first photo to base64
      const file = await fetch(photos[0]).then(r => r.blob());
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const result = await aiApi.suggestPrice(
            formData.title,
            formData.description,
            formData.condition,
            formData.category,
            authToken
          );
          
          setPriceAnalysis({
            item_details: { name: formData.title, category: formData.category },
            market_data: {
              recommended_price: result.suggestedPrice,
              market_average: result.marketAverage,
              rationale: `Based on market data, similar items sell for $${result.priceRange.min}-$${result.priceRange.max}.`
            }
          });
          
          setFormData({
            ...formData,
            price: result.suggestedPrice.toString(),
          });
          
          setStep(2);
        } catch (error) {
          console.error("Price check failed", error);
          setStep(2);
        } finally {
          setIsAnalyzing(false);
        }
      };
    } catch (error) {
      console.error("Price check failed", error);
      setStep(2);
      setIsAnalyzing(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
    });
  };

  const handlePublish = async () => {
    if (!authToken) {
      alert('Please log in to create a listing');
      navigate('/login');
      return;
    }

    try {
      // Upload images
      const imageUrls: string[] = [];
      
      for (const photoUrl of photos) {
        try {
          // Get file from blob URL
          const response = await fetch(photoUrl);
          const blob = await response.blob();
          const file = new File([blob], `product-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const base64 = await fileToBase64(file);
          
          const uploadResult = await uploadApi.uploadImage(
            base64,
            'product-images',
            `product-${Date.now()}.jpg`,
            authToken
          );
          
          imageUrls.push(uploadResult.url);
        } catch (error) {
          console.error('Failed to upload image:', error);
          // Fallback to original URL if upload fails
          imageUrls.push(photoUrl);
        }
      }

      // Create product
      const productData = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        condition: formData.condition,
        category: formData.category,
        tags: [formData.category.toLowerCase()],
        location: formData.location,
        images: imageUrls,
        market_average: priceAnalysis?.market_data?.market_average,
        isSteal: priceAnalysis ? Number(formData.price) < (priceAnalysis.market_data?.market_average || 0) * 0.7 : false,
        stealPercentage: priceAnalysis ? Math.round(((priceAnalysis.market_data?.market_average || 0 - Number(formData.price)) / (priceAnalysis.market_data?.market_average || 1)) * 100) : undefined,
      };

      await productsApi.create(productData, authToken);
      navigate('/search');
    } catch (error: any) {
      console.error('Failed to create listing:', error);
      alert(error.message || 'Failed to create listing. Please try again.');
    }
  };

  return (
    <div className="flex-grow w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 bg-[#F8FAFC] dark:bg-background-dark">
      <div className="flex flex-col gap-10">
        <div className="flex flex-col gap-4">
           <div className="flex justify-between items-end">
             <h1 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white">List a Treasure</h1>
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Phase {step} of 2</span>
           </div>
           <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
             <div className="h-full bg-primary transition-all duration-700 ease-out shadow-[0_0_15px_#ff7b00]" style={{ width: `${(step / 2) * 100}%` }}></div>
           </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8 space-y-10">
            
            {step === 1 && (
              <div className="space-y-8 animate-fadeInUp">
                 <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[48px] p-24 text-center cursor-pointer hover:border-primary/40 transition-all bg-white dark:bg-surface-dark shadow-sm"
                 >
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple className="hidden" accept="image/*" />
                    <div className="size-24 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform shadow-inner">
                       <span className="material-symbols-outlined !text-4xl">add_a_photo</span>
                    </div>
                    <h3 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">Capture Your Find</h3>
                    <p className="text-slate-500 font-medium">Clear photos from multiple angles help Stitch appraise it faster.</p>
                 </div>

                 {photos.length > 0 && (
                   <div className="grid grid-cols-3 sm:grid-cols-4 gap-6 animate-fadeIn">
                      {photos.map((src, i) => (
                        <div key={i} className="relative group aspect-square rounded-[32px] overflow-hidden shadow-xl border-4 border-white dark:border-gray-800">
                           <img src={src} className="w-full h-full object-cover" alt="" />
                           <button onClick={(e) => { 
                             e.stopPropagation(); 
                             URL.revokeObjectURL(src);
                             setPhotos(prev => prev.filter((_, idx) => idx !== i)); 
                           }} className="absolute top-2 right-2 size-8 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-md flex items-center justify-center">
                              <span className="material-symbols-outlined !text-sm">close</span>
                           </button>
                        </div>
                      ))}
                      <button onClick={() => fileInputRef.current?.click()} className="aspect-square rounded-[32px] border-2 border-dashed border-slate-200 dark:border-white/10 flex items-center justify-center text-slate-300 hover:text-primary transition-colors">
                        <span className="material-symbols-outlined text-4xl">add</span>
                      </button>
                   </div>
                 )}

                 {photos.length > 0 && (
                   <div className="space-y-4 animate-fadeIn">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Initial Title</label>
                        <input 
                          type="text" 
                          placeholder="e.g. Vintage Eames Chair"
                          value={formData.title}
                          onChange={e => setFormData({...formData, title: e.target.value})}
                          className="w-full rounded-2xl border-slate-100 dark:border-white/10 bg-white dark:bg-surface-dark py-5 px-8 text-xl font-bold shadow-sm focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                        />
                     </div>
                     <button
                      onClick={handlePriceCheck}
                      disabled={isAnalyzing}
                      className="w-full bg-slate-900 dark:bg-white text-white dark:text-black font-black py-6 rounded-3xl transition flex items-center justify-center gap-4 shadow-2xl hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                     >
                      {isAnalyzing ? (
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span className="uppercase tracking-widest text-xs">Stitch is searching the web...</span>
                        </div>
                      ) : (
                        <>
                          <span className="material-symbols-outlined">magic_button</span>
                          <span className="uppercase tracking-widest text-xs">Appraise Market Value</span>
                        </>
                      )}
                     </button>
                   </div>
                 )}
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8 animate-fadeIn">
                 <div className="bg-primary text-white rounded-[40px] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full blur-[100px] opacity-20 transition-transform group-hover:scale-110"></div>
                    <div className="relative z-10 space-y-6">
                       <h3 className="font-black uppercase tracking-[0.25em] text-[10px] opacity-80 text-white">Stitch Grounded Appraisal</h3>
                       <div className="flex items-center justify-between gap-8">
                          <div>
                             <p className="text-[10px] font-black uppercase opacity-60 mb-2">Recommended Neighborhood Price</p>
                             <p className="text-5xl font-black">${priceAnalysis?.market_data.recommended_price || 120}</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[10px] font-black uppercase opacity-60 mb-2">Web Average</p>
                             <p className="text-2xl font-black opacity-80">${priceAnalysis?.market_data.market_average || 250}</p>
                          </div>
                       </div>
                       
                       {groundingSources.length > 0 && (
                         <div className="pt-6 border-t border-white/10 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Reference Sources</p>
                            <div className="flex flex-wrap gap-2">
                               {groundingSources.map((source, idx) => (
                                 source.web && (
                                   <a 
                                    key={idx} 
                                    href={source.web.uri} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="bg-white/10 hover:bg-white/20 px-4 py-2 rounded-xl text-[10px] font-bold flex items-center gap-2 transition-all"
                                   >
                                      <span className="material-symbols-outlined !text-xs">open_in_new</span>
                                      {source.web.title || 'Market Link'}
                                   </a>
                                 )
                               ))}
                            </div>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Final Listing Price ($)</label>
                       <input 
                         type="number" 
                         value={formData.price}
                         onChange={e => setFormData({...formData, price: e.target.value})}
                         className="w-full rounded-2xl border-slate-100 dark:border-white/10 bg-white dark:bg-surface-dark py-5 px-8 text-2xl font-black shadow-sm outline-none"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Neighborhood Category</label>
                       <select 
                         value={formData.category}
                         onChange={e => setFormData({...formData, category: e.target.value})}
                         className="w-full rounded-2xl border-slate-100 dark:border-white/10 bg-white dark:bg-surface-dark py-5 px-8 text-lg font-bold shadow-sm outline-none"
                       >
                          {CATEGORIES.slice(1).map(cat => <option key={cat.name}>{cat.name}</option>)}
                       </select>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Stitch Narrative (Description)</label>
                    <textarea 
                     rows={5}
                     value={formData.description}
                     onChange={e => setFormData({...formData, description: e.target.value})}
                     className="w-full rounded-2xl border-slate-100 dark:border-white/10 bg-white dark:bg-surface-dark py-5 px-8 text-lg font-medium leading-relaxed outline-none"
                    />
                 </div>

                 <div className="flex justify-between items-center pt-10 border-t border-slate-100 dark:border-white/5">
                    <button onClick={() => setStep(1)} className="px-10 py-5 font-black text-[10px] uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-colors">Go Back</button>
                    <button onClick={handlePublish} className="px-16 py-5 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 hover:-translate-y-1 active:scale-95 transition-all">
                       Publish Listing
                    </button>
                 </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <div className="hidden lg:block lg:col-span-4">
             <div className="sticky top-28 bg-white dark:bg-surface-dark rounded-[48px] overflow-hidden shadow-2xl border border-slate-100 dark:border-white/5 p-4">
                <div className="aspect-[1/1] relative bg-slate-50 dark:bg-white/5 rounded-[36px] overflow-hidden mb-8">
                   {photos[0] ? (
                     <img src={photos[0]} className="w-full h-full object-cover" alt="" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-slate-200 gap-4">
                        <span className="material-symbols-outlined !text-6xl">photo_frame</span>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Live Preview</p>
                     </div>
                   )}
                </div>
                <div className="px-6 pb-8 space-y-5">
                   <h4 className="text-2xl font-black leading-tight line-clamp-2 text-slate-900 dark:text-white">{formData.title || 'Your Treasure Name'}</h4>
                   <div className="flex items-center justify-between">
                      <p className="text-4xl font-black text-primary">${formData.price || '0'}</p>
                      <span className="px-3 py-1 bg-slate-100 dark:bg-white/10 rounded-lg text-[9px] font-black uppercase tracking-widest text-slate-400">{formData.category}</span>
                   </div>
                   <div className="flex items-center gap-3 pt-6 border-t border-slate-50 dark:border-white/5">
                      <div className="size-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <span className="material-symbols-outlined !text-lg">account_circle</span>
                      </div>
                      <div>
                        <p className="text-[11px] font-black text-slate-900 dark:text-white">Alex G. (You)</p>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Austin, TX • Neighbor Seller</p>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
