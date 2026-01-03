
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePersistence } from '../store/PersistenceContext';
import { salesApi, uploadApi } from '../lib/api';

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
    address: '123 Neighborhood Way, Austin, TX'
  });

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newPhotos = newFiles.map(file => URL.createObjectURL(file as Blob));
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };

  const handlePublish = async () => {
    if (!authToken) {
      alert('Please log in to create a garage sale');
      navigate('/login');
      return;
    }

    if (!eventData.name || !eventData.date || !eventData.address) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Upload images
      const imageUrls: string[] = [];
      
      for (const photoUrl of photos) {
        try {
          const response = await fetch(photoUrl);
          const blob = await response.blob();
          const file = new File([blob], `garage-sale-${Date.now()}.jpg`, { type: 'image/jpeg' });
          const base64 = await fileToBase64(file);
          
          const uploadResult = await uploadApi.uploadImage(
            base64,
            'garage-sale-images',
            `garage-sale-${Date.now()}.jpg`,
            authToken
          );
          
          imageUrls.push(uploadResult.url);
        } catch (error) {
          console.error('Failed to upload image:', error);
        }
      }

      // Create garage sale
      const saleData = {
        title: eventData.name,
        description: eventData.description,
        address: eventData.address,
        start_date: eventData.date,
        end_date: eventData.date,
        start_time: eventData.startTime,
        end_time: eventData.endTime,
        images: imageUrls,
        tags: [],
        is_multi_family: false,
      };

      await salesApi.create(saleData, authToken);
      navigate('/sales');
    } catch (err: any) {
      console.error('Failed to create garage sale:', err);
      setError(err.message || 'Failed to create garage sale');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-20">
      <div className="bg-white dark:bg-surface-dark rounded-[48px] shadow-2xl overflow-hidden border border-gray-100 dark:border-white/5">
        <div className="grid grid-cols-1 md:grid-cols-12">
          {/* Progress Sidebar */}
          <aside className="md:col-span-4 bg-slate-900 p-10 text-white flex flex-col justify-between relative overflow-hidden">
             <div className="absolute top-0 right-0 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10"></div>
             <div className="relative z-10 space-y-12">
                <div>
                   <h2 className="text-3xl font-black mb-2">Host a Sale</h2>
                   <p className="text-slate-400 font-medium">Turn your yard into a local destination.</p>
                </div>
                
                <div className="space-y-10">
                   {[
                     { num: 1, label: 'Event Details', sub: 'Name, time, and place' },
                     { num: 2, label: 'Inventory', sub: 'What are you selling?' },
                     { num: 3, label: 'Publish', sub: 'Go live on the map' }
                   ].map(s => (
                     <div key={s.num} className={`flex items-start gap-4 transition-all ${step === s.num ? 'opacity-100' : 'opacity-40'}`}>
                        <div className={`size-10 rounded-2xl flex items-center justify-center font-black ${step === s.num ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-white/10 text-white'}`}>{s.num}</div>
                        <div>
                           <p className="font-bold text-sm leading-tight">{s.label}</p>
                           <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">{s.sub}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="relative z-10 p-6 bg-white/5 rounded-3xl border border-white/10">
                <p className="text-xs text-slate-400 italic">"Garage sales with 5+ items get 4x more visitors in the first hour."</p>
             </div>
          </aside>

          {/* Form Area */}
          <main className="md:col-span-8 p-10 md:p-16">
             {step === 1 && (
               <div className="space-y-8 animate-fadeIn">
                  <div className="space-y-6">
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Sale Name</label>
                        <input 
                           type="text" 
                           placeholder="e.g. Annual Block Party Sale"
                           value={eventData.name}
                           onChange={e => setEventData({...eventData, name: e.target.value})}
                           className="w-full rounded-2xl border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-4 px-6 text-lg font-bold focus:ring-primary focus:border-primary transition-all" 
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Description</label>
                        <textarea 
                           value={eventData.description}
                           onChange={e => setEventData({...eventData, description: e.target.value})}
                           placeholder="Describe your garage sale..."
                           className="w-full rounded-2xl border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-4 px-6 font-medium min-h-[120px] focus:ring-primary focus:border-primary transition-all"
                        />
                     </div>
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-slate-400">Date</label>
                           <input 
                              type="date" 
                              value={eventData.date}
                              onChange={e => setEventData({...eventData, date: e.target.value})}
                              className="w-full rounded-2xl border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-4 px-6 font-bold" 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-slate-400">Start Time</label>
                           <input 
                              type="time" 
                              value={eventData.startTime}
                              onChange={e => setEventData({...eventData, startTime: e.target.value})}
                              className="w-full rounded-2xl border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-4 px-6 font-bold" 
                           />
                        </div>
                        <div className="space-y-2">
                           <label className="text-xs font-black uppercase tracking-widest text-slate-400">End Time</label>
                           <input 
                              type="time" 
                              value={eventData.endTime}
                              onChange={e => setEventData({...eventData, endTime: e.target.value})}
                              className="w-full rounded-2xl border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-4 px-6 font-bold" 
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Address</label>
                        <div className="relative">
                           <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary">location_on</span>
                           <input 
                              type="text" 
                              value={eventData.address}
                              onChange={e => setEventData({...eventData, address: e.target.value})}
                              className="w-full rounded-2xl border-gray-100 dark:border-white/10 bg-gray-50 dark:bg-white/5 py-4 pl-12 pr-6 font-bold" 
                           />
                        </div>
                     </div>
                     <div className="space-y-2">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">Photos</label>
                        <input 
                           type="file"
                           multiple
                           accept="image/*"
                           onChange={handleFileChange}
                           className="hidden"
                           id="garage-sale-photos"
                        />
                        <label 
                           htmlFor="garage-sale-photos"
                           className="block border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-primary transition-colors"
                        >
                           <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">add_photo_alternate</span>
                           <p className="text-sm font-bold text-slate-600">Click to add photos</p>
                           <p className="text-xs text-slate-400 mt-1">{photos.length} photo(s) selected</p>
                        </label>
                        {photos.length > 0 && (
                          <div className="grid grid-cols-4 gap-4 mt-4">
                            {photos.map((photo, idx) => (
                              <div key={idx} className="relative aspect-square rounded-xl overflow-hidden">
                                <img src={photo} alt="" className="w-full h-full object-cover" />
                                <button
                                  onClick={() => {
                                    URL.revokeObjectURL(photo);
                                    setPhotos(prev => prev.filter((_, i) => i !== idx));
                                  }}
                                  className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                                >
                                  ×
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             )}

             {step === 2 && (
               <div className="space-y-8 animate-fadeIn text-center py-12">
                  <div className="size-24 bg-primary/10 text-primary rounded-[32px] flex items-center justify-center mx-auto mb-6">
                     <span className="material-symbols-outlined !text-5xl">check_circle</span>
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-2xl font-black">Review Your Sale</h3>
                     <p className="text-slate-500">Make sure all details are correct before publishing.</p>
                  </div>
                  
                  <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[40px] text-left border border-gray-100 dark:border-white/5 mt-8">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Preview</p>
                     <div className="flex gap-6 items-center">
                        <div className="size-20 bg-primary rounded-[28px] flex items-center justify-center text-white shadow-lg shadow-primary/30">
                           <span className="material-symbols-outlined text-4xl">storefront</span>
                        </div>
                        <div>
                           <h4 className="font-black text-xl">{eventData.name || 'Your Event Name'}</h4>
                           <p className="text-sm font-bold text-slate-500">{eventData.address}</p>
                           <p className="text-sm font-black text-primary mt-1 uppercase tracking-tighter">
                              {eventData.date ? new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'short' }) : ''}, {eventData.startTime} - {eventData.endTime}
                           </p>
                        </div>
                     </div>
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                      {error}
                    </div>
                  )}
               </div>
             )}

             {step === 3 && (
               <div className="space-y-8 animate-fadeIn text-center">
                  <div className="size-32 bg-green-100 text-green-600 rounded-[40px] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100/50">
                     <span className="material-symbols-outlined !text-6xl animate-bounce">rocket_launch</span>
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-3xl font-black">Ready for Takeoff!</h3>
                     <p className="text-slate-500 max-w-sm mx-auto">Your Garage Sale will be pinned on the Austin map for all neighbors to see. We'll send you a notification 1 hour before it starts.</p>
                  </div>
                  
                  <div className="p-8 bg-slate-50 dark:bg-white/5 rounded-[40px] text-left border border-gray-100 dark:border-white/5">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Live Preview</p>
                     <div className="flex gap-6 items-center">
                        <div className="size-20 bg-primary rounded-[28px] flex items-center justify-center text-white shadow-lg shadow-primary/30">
                           <span className="material-symbols-outlined text-4xl">storefront</span>
                        </div>
                        <div>
                           <h4 className="font-black text-xl">{eventData.name || 'Your Event Name'}</h4>
                           <p className="text-sm font-bold text-slate-500">{eventData.address}</p>
                           <p className="text-sm font-black text-primary mt-1 uppercase tracking-tighter">Sun, 8:00 AM - 2:00 PM</p>
                        </div>
                     </div>
                  </div>
               </div>
             )}

             <div className="flex gap-4 mt-16 pt-8 border-t border-gray-100 dark:border-white/5">
                {step > 1 && (
                  <button onClick={() => setStep(step - 1)} className="flex-1 py-4 bg-gray-50 dark:bg-white/5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100">Back</button>
                )}
                <button 
                  onClick={() => {
                    if (step < 3) {
                      setStep(step + 1);
                    } else {
                      handlePublish();
                    }
                  }}
                  disabled={loading}
                  className="flex-[2] py-4 bg-primary text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:-translate-y-1 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                   {loading ? 'Publishing...' : step === 3 ? 'Publish Event' : 'Continue'}
                </button>
             </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default CreateGarageSalePage;
