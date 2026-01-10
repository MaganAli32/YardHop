
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { productsApi, aiApi, uploadApi } from '../lib/api';
import { getFileFromBlobUrl, revokePhotoUrls } from '../lib/fileUtils';
import { PhotoUploader } from '../components/PhotoUploader';
import { LocationPrivacySelector } from '../components/maps';

const CATEGORIES = [
  'Furniture',
  'Electronics',
  'Clothing',
  'Kids',
  'Antiques',
  'Tools',
  'Sports',
];

const CONDITIONS = [
  'New',
  'Like New',
  'Good',
  'Fair',
  'Poor'
];

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const { authToken } = usePersistence();
  
  const [step, setStep] = useState(1);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [priceAnalysis, setPriceAnalysis] = useState<any | null>(null);
  const [priceError, setPriceError] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    category: 'Furniture',
    description: '',
    price: '',
    condition: 'Good',
    location: 'Austin, TX'
  });
  const [locationData, setLocationData] = useState<{
    address: string;
    latitude: number;
    longitude: number;
    privacy: 'exact' | 'neighborhood' | 'city';
  } | null>(null);

  // Cleanup photos when component unmounts (user navigates away without publishing)
  useEffect(() => {
    return () => {
      // Only revoke if we still have photos (didn't publish successfully)
      if (photos.length > 0) {
        revokePhotoUrls(photos);
      }
    };
  }, []); // Empty deps - only run on unmount

  const handlePriceCheck = async () => {
    if (photos.length === 0 || !formData.title) return;
    setIsAnalyzing(true);
    setPriceError(false);
    
    try {
      const result = await aiApi.suggestPrice({
        title: formData.title,
        description: formData.description,
        condition: formData.condition,
        category: formData.category,
      });
      
      setPriceAnalysis({
        market_data: {
          recommended_price: result.suggested_price,
          market_average: result.market_average,
          price_range: result.price_range,
          rationale: result.reasoning || `Based on current listings, similar items in ${formData.condition} condition sell between $${result.price_range.low} and $${result.price_range.high}.`
        }
      });
      
      setFormData(prev => ({
        ...prev,
        price: result.suggested_price.toString(),
      }));
      
      setStep(2);
    } catch (error: any) {
      console.error("Price check failed", error);
      setPriceError(true);
      setStep(2);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handlePublish = async () => {
    if (!authToken) {
      alert('Please log in to create a listing');
      navigate('/login');
      return;
    }

    if (photos.length === 0) {
      alert('Please add at least one photo');
      return;
    }

    setIsPublishing(true);

    try {
      // Upload images to Supabase Storage
      const imageUrls: string[] = [];
      
      for (let i = 0; i < photos.length; i++) {
        const photoUrl = photos[i];
        try {
          console.log(`Uploading photo ${i + 1}/${photos.length}:`, photoUrl);
          
          // Get the File object from our store (or fetch from blob URL)
          const file = await getFileFromBlobUrl(
            photoUrl, 
            `product-${Date.now()}-${i}.jpg`
          );
          console.log('File retrieved:', file.name, file.size, file.type);
          
          // Upload to Supabase Storage
          const uploadResult = await uploadApi.uploadImage(file, 'listing-images');
          console.log('Upload successful:', uploadResult.url);
          
          imageUrls.push(uploadResult.url);
        } catch (error) {
          console.error(`Failed to upload image ${i + 1}:`, error);
          // Continue trying other images
        }
      }
      
      console.log('Final imageUrls:', imageUrls);
      
      // Check if we have at least one image
      if (imageUrls.length === 0) {
        throw new Error('Failed to upload images. Please try again.');
      }

      // Create the product with uploaded image URLs
      const productData = {
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        condition: formData.condition,
        category: formData.category,
        tags: [formData.category.toLowerCase()],
        location: locationData?.address || formData.location,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
        location_privacy: locationData?.privacy || 'neighborhood',
        image_urls: imageUrls, // These are now Supabase Storage URLs
        market_average: priceAnalysis?.market_data?.market_average,
        is_steal: priceAnalysis ? Number(formData.price) < (priceAnalysis.market_data?.market_average || 0) * 0.7 : false,
      };

      console.log('Creating product with data:', productData);
      
      const result = await productsApi.create(productData);
      console.log('Product created:', result);
      
      // Clean up blob URLs after successful publish
      revokePhotoUrls(photos);
      setPhotos([]); // Clear photos state
      
      // Navigate to search page
      navigate('/search?mode=items', { replace: true });
    } catch (error: any) {
      console.error('Failed to create listing:', error);
      
      if (error?.message?.includes('Backend') || error?.message?.includes('server')) {
        alert(
          'Backend server is not running.\n\n' +
          'To create listings, start the backend server:\n' +
          '1. Open a terminal\n' +
          '2. Navigate to the project directory\n' +
          '3. Run: npm start'
        );
      } else {
        alert(error.message || 'Failed to create listing. Please try again.');
      }
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Form Column */}
          <div className="lg:col-span-8">
            <header className="mb-8">
              <h1 className="text-2xl font-bold border-b border-slate-100 pb-4">Create listing</h1>
              <div className="mt-6 flex items-center justify-between">
                <div className="flex-1 max-w-xs bg-slate-100 h-1.5 rounded-sm overflow-hidden">
                  <div 
                    className="bg-slate-900 h-full transition-all duration-300" 
                    style={{ width: `${(step / 2) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">Step {step} of 2</span>
              </div>
            </header>

            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <label className="block text-sm font-semibold mb-3">Photos</label>
                  <PhotoUploader
                    photos={photos}
                    onPhotosChange={setPhotos}
                    multiple={true}
                    accept="image/*"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-1">Title</label>
                  <p className="text-xs text-slate-500 mb-2">
                    Be specific — brand, model, size, or year helps buyers find it.
                  </p>
                  <input 
                    type="text" 
                    placeholder="Enter item name"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                    className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-colors"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    onClick={handlePriceCheck}
                    disabled={isAnalyzing || !formData.title || photos.length === 0}
                    className="flex-1 bg-white border border-slate-300 hover:bg-slate-50 text-slate-900 font-semibold py-2.5 px-4 rounded-md transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
                  >
                    {isAnalyzing && (
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-900 rounded-full animate-spin" />
                    )}
                    Check price
                  </button>
                  <button
                    onClick={() => setStep(2)}
                    disabled={!formData.title || photos.length === 0}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-4 rounded-md transition disabled:opacity-50 text-sm shadow-sm"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-10">
                {priceAnalysis ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-md p-5 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Suggested price</p>
                        <p className="text-2xl font-bold text-slate-900">${priceAnalysis.market_data.recommended_price}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Market average</p>
                        <p className="text-lg font-semibold text-slate-700">${priceAnalysis.market_data.market_average}</p>
                      </div>
                    </div>
                    <div className="text-xs leading-relaxed text-slate-600 border-t border-slate-200 pt-4">
                      <p className="font-bold mb-1">Range: ${priceAnalysis.market_data.price_range.low || priceAnalysis.market_data.price_range.min} - ${priceAnalysis.market_data.price_range.high || priceAnalysis.market_data.price_range.max}</p>
                      <p>{priceAnalysis.market_data.rationale}</p>
                    </div>
                  </div>
                ) : priceError ? (
                  <div className="p-3 bg-red-50 border border-red-100 rounded-md text-red-700 text-xs">
                    Price suggestion unavailable. Enter manually.
                  </div>
                ) : null}

                {/* Pricing */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Pricing
                  </h3>
                  <div>
                    <label className="block text-sm font-semibold mb-1">Price ($)</label>
                    <p className="text-xs text-slate-500 mb-2">
                      Buyers respond best to round numbers and fair pricing.
                    </p>
                    <input 
                      type="number" 
                      placeholder="0.00"
                      value={formData.price}
                      onChange={e => setFormData({...formData, price: e.target.value})}
                      className="w-full max-w-xs border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </section>

                {/* Item details */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Item details
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-semibold mb-2">Condition</label>
                      <select 
                        value={formData.condition}
                        onChange={e => setFormData({...formData, condition: e.target.value})}
                        className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-slate-900 bg-white"
                      >
                        {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2">Category</label>
                      <select 
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                        className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-slate-900 bg-white"
                      >
                        {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-sm font-semibold mb-2">Location</label>
                      <LocationPrivacySelector
                        address={formData.location}
                        onLocationChange={(data) => {
                          setLocationData(data);
                          if (data?.address) {
                            setFormData({ ...formData, location: data.address });
                          }
                        }}
                        showPreview={true}
                      />
                    </div>
                  </div>
                </section>

                {/* Description */}
                <section>
                  <h3 className="text-sm font-semibold text-slate-900 mb-4">
                    Description
                  </h3>
                  <textarea 
                    rows={5}
                    placeholder="Describe item features, flaws, or reasons for selling..."
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    className="w-full border border-slate-300 rounded-md px-4 py-2.5 text-sm focus:outline-none focus:border-slate-900 resize-none"
                  />
                </section>

                <div className="flex justify-between items-center pt-12 mt-6 border-t border-slate-200">
                  <button 
                    onClick={() => setStep(1)} 
                    disabled={isPublishing}
                    className="text-sm font-semibold text-slate-500 hover:text-slate-900 transition-colors disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button 
                    onClick={handlePublish}
                    disabled={isPublishing || !formData.price}
                    className="bg-slate-900 text-white font-semibold py-3 px-12 rounded-md hover:bg-slate-800 transition shadow-sm text-sm disabled:opacity-50 flex items-center gap-2"
                  >
                    {isPublishing && (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {isPublishing ? 'Publishing...' : 'Publish listing'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Preview Panel */}
          <aside className="hidden lg:block lg:col-span-4">
            <div className="sticky top-8 border border-slate-200 rounded-md overflow-hidden bg-white shadow-sm">
              <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200">
                <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Listing preview</p>
              </div>
              <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden border-b border-slate-100">
                {photos[0] ? (
                  <img src={photos[0]} className="w-full h-full object-cover" alt="Preview" />
                ) : (
                  <div className="text-slate-300 flex flex-col items-center">
                    <span className="text-[10px] font-bold uppercase">No image</span>
                  </div>
                )}
              </div>
              <div className="p-5 space-y-4">
                <h2 className="font-bold text-lg leading-tight text-slate-900 line-clamp-2">
                  {formData.title || 'Your listing title'}
                </h2>
                <p className="text-2xl font-bold text-slate-900">
                  ${formData.price || '0'}
                </p>
                <div className="flex flex-col gap-2 pt-1 border-t border-slate-100 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-sm uppercase">{formData.category}</span>
                    <span className="text-[11px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-sm uppercase">{formData.condition}</span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium">{formData.location}</p>
                </div>
                {formData.description && (
                  <p className="text-[11px] text-slate-500 line-clamp-3 leading-relaxed italic">
                    {formData.description}
                  </p>
                )}
              </div>
            </div>
          </aside>

        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
