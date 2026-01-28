import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { salesApi, uploadApi } from '../lib/api';
import { blobUrlToFile } from '../lib/fileUtils';
import { LocationPrivacySelector } from '../components/maps';
import {
  ChevronRight,
  ChevronLeft,
  MapPin,
  Check,
  X,
  Plus,
} from 'lucide-react';

const CreateGarageSalePage: React.FC = () => {
  const navigate = useNavigate();
  const { authToken } = usePersistence();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  
  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    date: '',
    startTime: '08:00',
    endTime: '14:00',
    address: '',
    city: '',
    state: '',
    hideExactAddress: true
  });
  const [locationData, setLocationData] = useState<{
    address: string;
    latitude: number;
    longitude: number;
    privacy: 'exact' | 'neighborhood' | 'city';
  } | null>(null);

  const isValidTimeRange = (start: string, end: string) => start < end;

  const handleContinue = () => {
    if (step === 1) {
      if (!eventData.name || !eventData.date || !locationData) {
        setError('Please fill in all required fields including location');
        return;
      }
      if (!isValidTimeRange(eventData.startTime, eventData.endTime)) {
        setError('End time must be after start time');
        return;
      }
      setError('');
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else {
      handlePublish();
    }
  };


  const handlePublish = async () => {
    if (!authToken) {
      setError('Session expired. Please log in again.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const imageUrls: string[] = [];
      const uploadErrors: string[] = [];
      
      // Upload images with error handling - continue even if some fail
      for (let i = 0; i < photos.length; i++) {
        const photoUrl = photos[i];
        try {
          const uploadId = crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
          console.log(`[Upload ${i + 1}/${photos.length}] Converting blob URL to file...`);
          
          // Convert blob URL to File object
          const file = await blobUrlToFile(photoUrl, `sale-${uploadId}.jpg`);
          
          console.log(`[Upload ${i + 1}/${photos.length}] Uploading to garage-sale-images bucket...`);
          
          // uploadApi.uploadImage expects (file: File, bucket: string)
          const result = await uploadApi.uploadImage(
            file, 
            'garage-sale-images'
          );
          
          console.log(`[Upload ${i + 1}/${photos.length}] Success:`, result.url);
          imageUrls.push(result.url);
        } catch (uploadErr: any) {
          console.error(`[Upload ${i + 1}/${photos.length}] Failed:`, uploadErr);
          uploadErrors.push(`Image ${i + 1}: ${uploadErr.message || 'Upload failed'}`);
          // Continue with other images even if this one fails
        }
      }

      if (uploadErrors.length > 0 && imageUrls.length === 0) {
        throw new Error(`All image uploads failed: ${uploadErrors.join(', ')}`);
      }

      if (uploadErrors.length > 0) {
        console.warn(`Some images failed to upload:`, uploadErrors);
      }

      console.log('Creating garage sale with payload:', {
        title: eventData.name,
        address: locationData?.address || eventData.address,
        imageCount: imageUrls.length,
      });

      // Remove city, state, and is_private - these fields don't exist in DB schema
      const payload = {
        title: eventData.name,
        description: eventData.description,
        address: locationData?.address || eventData.address,
        latitude: locationData?.latitude,
        longitude: locationData?.longitude,
        location_privacy: locationData?.privacy || 'neighborhood',
        start_date: eventData.date,
        end_date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        image_urls: imageUrls, // API expects image_urls, not images
      };

      const finalResult = await salesApi.create(payload, authToken) as { id: string };
      
      console.log('Garage sale created successfully:', finalResult);
      
      if (finalResult.id) {
        if (uploadErrors.length > 0) {
          // Show warning but still navigate
          setError(`Sale created but some images failed: ${uploadErrors.join(', ')}`);
          setTimeout(() => {
            navigate('/search?mode=events', { replace: true });
          }, 2000);
        } else {
          navigate('/search?mode=events', { replace: true });
        }
      }
    } catch (err: any) {
      console.error('Error publishing garage sale:', err);
      setError(err.message || 'Error publishing listing.');
      setLoading(false);
    } finally {
      setLoading(false);
  }
};

// --- PhotoUploader ---
const PhotoUploader: React.FC<{
  photos: string[];
  onPhotosChange: (photos: string[]) => void;
  maxPhotos?: number;
}> = ({ photos, onPhotosChange, maxPhotos = 10 }) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newUrls = Array.from(files).map((file: File) => URL.createObjectURL(file));
    onPhotosChange([...photos, ...newUrls].slice(0, maxPhotos));
  };

  const removePhoto = (idx: number) => {
    const updated = [...photos];
    if (updated[idx] && updated[idx].startsWith('blob:')) {
      URL.revokeObjectURL(updated[idx]);
    }
    updated.splice(idx, 1);
    onPhotosChange(updated);
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-2">
      {photos.map((url, i) => (
        <div key={i} className="relative aspect-square border border-gray-200 bg-gray-50 overflow-hidden rounded-md">
          <img src={url} className="w-full h-full object-cover" alt="Item" />
          <button 
            type="button"
            onClick={() => removePhoto(i)}
            className="absolute top-1 right-1 size-6 bg-white border border-gray-300 text-gray-900 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      ))}
      {photos.length < maxPhotos && (
        <label className="aspect-square border border-dashed border-gray-300 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-white hover:border-gray-400 transition-all rounded-md">
          <Plus size={20} />
          <span className="text-[10px] font-bold uppercase tracking-wider mt-2 text-gray-500">Add Photo</span>
          <input type="file" className="hidden" onChange={handleFileChange} multiple accept="image/*" />
        </label>
      )}
    </div>
  );
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row font-sans text-gray-900">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 p-8 text-white flex flex-col border-r border-slate-800">
        <div className="mb-12">
          <h1 className="text-xl font-bold tracking-tight">YardFront</h1>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Host Portal</p>
        </div>

        <nav className="flex-1 space-y-8">
          {[
            { num: 1, label: 'Event Details' },
            { num: 2, label: 'Review' },
            { num: 3, label: 'Publish' }
          ].map((s) => (
            <div key={s.num} className={`flex items-center gap-4 transition-all ${step === s.num ? 'opacity-100' : 'opacity-40'}`}>
              <div className={`size-8 rounded-sm flex items-center justify-center font-bold text-xs ${step === s.num ? 'bg-primary text-white' : 'bg-slate-800 text-slate-400'}`}>
                {s.num}
              </div>
              <span className="font-bold text-sm">{s.label}</span>
            </div>
          ))}
        </nav>

        <div className="pt-8 border-t border-slate-800 hidden md:block">
          <p className="text-xs text-slate-500 leading-normal">
            Your listing will be visible to nearby users.
          </p>
        </div>
      </aside>

      {/* Main Form Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 md:p-12 overflow-y-auto">
        <div className="w-full max-w-2xl bg-white border border-gray-200 rounded-md p-8 md:p-12 shadow-sm">
          
          {error && (
            <div className="mb-8 p-4 bg-red-50 border border-red-200 text-red-600 rounded-md text-xs font-bold">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8">
              <header>
                <h2 className="text-2xl font-bold text-gray-900">Create event</h2>
                <p className="text-gray-500 text-sm mt-2">Enter the details for your garage sale.</p>
              </header>

              <div className="space-y-6">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Event Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Block Sale"
                    className="w-full border border-gray-300 rounded-md px-4 py-2.5 font-medium text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary transition-all text-base outline-none"
                    value={eventData.name}
                    onChange={(e) => setEventData({ ...eventData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Description</label>
                  <textarea
                    rows={4}
                    placeholder="Describe items for sale..."
                    className="w-full border border-gray-300 rounded-md px-4 py-2.5 font-medium text-gray-900 focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none text-base outline-none"
                    value={eventData.description}
                    onChange={(e) => setEventData({ ...eventData, description: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Date *</label>
                    <input
                      type="date"
                      className="w-full border border-gray-300 rounded-md px-4 py-2.5 font-medium text-gray-900 text-base outline-none"
                      value={eventData.date}
                      onChange={(e) => setEventData({ ...eventData, date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Start Time *</label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-md px-4 py-2.5 font-medium text-gray-900 text-base outline-none"
                      value={eventData.startTime}
                      onChange={(e) => setEventData({ ...eventData, startTime: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">End Time *</label>
                    <input
                      type="time"
                      className="w-full border border-gray-300 rounded-md px-4 py-2.5 font-medium text-gray-900 text-base outline-none"
                      value={eventData.endTime}
                      onChange={(e) => setEventData({ ...eventData, endTime: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="City"
                      className="w-full border border-gray-300 rounded-md px-4 py-2.5 font-medium text-gray-900 text-base outline-none"
                      value={eventData.city}
                      onChange={(e) => setEventData({ ...eventData, city: e.target.value })}
                    />
                    <input
                      type="text"
                      placeholder="State"
                      className="w-full border border-gray-300 rounded-md px-4 py-2.5 font-medium text-gray-900 text-base outline-none"
                      value={eventData.state}
                      onChange={(e) => setEventData({ ...eventData, state: e.target.value })}
                    />
                  </div>

                  <LocationPrivacySelector
                    address={eventData.address}
                    cityName={eventData.city ? `${eventData.city}, ${eventData.state}` : undefined}
                    onLocationChange={(data) => {
                      setLocationData(data);
                      if (data?.address) {
                        setEventData({ ...eventData, address: data.address });
                      }
                    }}
                    showPreview={true}
                    required
                  />
                </div>

                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">Photos (Up to 10)</label>
                  <PhotoUploader photos={photos} onPhotosChange={setPhotos} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8">
              <header>
                <h2 className="text-2xl font-bold text-gray-900">Review listing</h2>
                <p className="text-gray-500 text-sm mt-2">Confirm details before publishing.</p>
              </header>

              <div className="border border-gray-200 rounded-md bg-gray-50 p-6 space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{eventData.name || 'Untitled Event'}</h3>
                  <p className="text-sm font-medium text-gray-600 mt-1 flex items-center gap-2">
                    <MapPin size={16} /> {eventData.address}, {eventData.city} {eventData.state}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 border border-gray-200 rounded-md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Date</p>
                    <p className="font-bold text-gray-800 mt-1 text-sm">{eventData.date || 'TBD'}</p>
                  </div>
                  <div className="bg-white p-4 border border-gray-200 rounded-md">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Hours</p>
                    <p className="font-bold text-gray-800 mt-1 text-sm">{eventData.startTime} - {eventData.endTime}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Description</p>
                  <p className="text-sm text-gray-600 leading-relaxed font-medium">
                    {eventData.description || 'No description.'}
                  </p>
                </div>

                <div className="pt-4 border-t border-gray-200 flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                  <span>{photos.length} Photos added</span>
                  <span className={eventData.hideExactAddress ? 'text-gray-400' : 'text-green-600'}>
                    {eventData.hideExactAddress ? 'Private Location' : 'Public Location'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="py-8 space-y-6 text-center">
              <div className="size-16 bg-gray-100 border border-gray-200 flex items-center justify-center mx-auto text-gray-400 rounded-md">
                <Check size={20} />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900">Ready to publish</h2>
                <p className="text-gray-500 text-sm max-w-sm mx-auto">
                  Your event will be visible to everyone on the YardFront map. You can manage this listing from your host dashboard.
                </p>
              </div>

              <div className="bg-gray-50 border border-gray-200 p-6 text-left rounded-md">
                <h4 className="font-bold text-gray-900 text-xs uppercase tracking-wider">Note on visibility</h4>
                <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
                  Listing addresses that are verified and include multiple photos tend to receive higher engagement from local buyers.
                </p>
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="mt-12 pt-8 border-t border-gray-100 flex gap-4">
            {step > 1 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="px-6 py-3 border border-gray-300 rounded-md font-bold text-xs uppercase tracking-wider text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <ChevronLeft size={18} />
                Back
              </button>
            )}
            
            <button
              type="button"
              onClick={handleContinue}
              disabled={loading}
              className="flex-1 bg-slate-900 text-white px-8 py-3 rounded-md font-bold text-xs uppercase tracking-wider hover:bg-black transition-all flex items-center justify-center gap-3 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="size-4 border-2 border-white/20 border-t-white rounded-full animate-spin" aria-hidden />
                  <span>{step === 3 ? 'Uploading images...' : 'Saving...'}</span>
                </>
              ) : (
                <>
                  {step === 3 ? 'Publish event' : 'Save and Continue'}
                  {step < 3 && <ChevronRight size={18} />}
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateGarageSalePage;
