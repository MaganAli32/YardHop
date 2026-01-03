
import React, { useState } from 'react';
import { DetectedItem } from '../types';
import { aiApi } from '../lib/api';

// Helper function to convert file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/jpeg;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

const GarageSaleScannerPage: React.FC = () => {
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState<DetectedItem[]>([]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedImages(Array.from(e.target.files));
    }
  };

  const handleScan = async () => {
    if (uploadedImages.length === 0) return;
    
    setIsScanning(true);
    
    try {
      // Convert first image to base64
      const imageBase64 = await fileToBase64(uploadedImages[0]);
      const mimeType = uploadedImages[0].type || 'image/jpeg';
      
      // Call secure backend API
      const result = await aiApi.analyzeImage(imageBase64, mimeType);
      setDetectedItems(result.items || []);
    } catch (e: any) {
      console.error('Scan error:', e);
      alert(`Failed to scan image: ${e.message || 'Unknown error'}`);
    } finally {
      setIsScanning(false);
    }
  };

  const totalValue = detectedItems.reduce((sum, item) => sum + item.estimated_value.max, 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pb-32">
      {/* Header */}
      <div className="mb-12 text-center md:text-left">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary/10 text-primary rounded-full text-xs font-black uppercase tracking-widest mb-4">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
          Powered by Stitch AI
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white mb-4 leading-tight">
          💎 Treasure Scanner
        </h1>
        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl font-medium">
          Stitch analyzes photos of yard sales to automatically find hidden high-value items for you to buy or list.
        </p>
      </div>

      {/* Upload Section */}
      {detectedItems.length === 0 && (
        <div className="bg-white dark:bg-surface-dark border-4 border-dashed border-gray-100 dark:border-white/5 rounded-[48px] p-20 text-center mb-6 shadow-sm transition hover:border-primary/40 group">
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="image-upload"
          />
          <label 
            htmlFor="image-upload"
            className="cursor-pointer flex flex-col items-center"
          >
            <div className="size-24 rounded-[32px] bg-primary/10 text-primary flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
               <span className="material-symbols-outlined !text-5xl">photo_library</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white mb-3">
              Upload Garage Sale Photos
            </p>
            <p className="text-slate-500 font-medium mb-10 max-w-sm">
              Our AI analyzes every object in the photo to check market value instantly.
            </p>
            <div className="bg-slate-900 dark:bg-white text-white dark:text-black font-black px-10 py-5 rounded-2xl shadow-xl transition hover:-translate-y-1">
              Choose Photos to Stitch
            </div>
          </label>
        </div>
      )}

      {/* Preview Uploaded Images */}
      {uploadedImages.length > 0 && detectedItems.length === 0 && (
        <div className="animate-fadeIn">
          <div className="flex justify-between items-center mb-6">
             <p className="text-sm font-black text-slate-400 uppercase tracking-widest">
               {uploadedImages.length} Photo(s) Ready for Scan
             </p>
             <button onClick={() => setUploadedImages([])} className="text-xs font-bold text-red-500 hover:underline">Clear all</button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-10">
            {uploadedImages.map((file, idx) => (
              <div key={idx} className="relative aspect-square rounded-[32px] overflow-hidden border-2 border-white dark:border-gray-800 shadow-lg">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={`Upload ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
          <button
            onClick={handleScan}
            disabled={isScanning}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:from-slate-300 disabled:to-slate-400 text-white font-black py-6 rounded-[32px] transition-all text-xl shadow-2xl shadow-primary/30 flex items-center justify-center gap-4 active:scale-95"
          >
            {isScanning ? (
               <>
                  <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  Stitching Treasures...
               </>
            ) : (
               <>
                  <span className="material-symbols-outlined !text-3xl">magic_button</span>
                  Run Deep Scan
               </>
            )}
          </button>
        </div>
      )}

      {/* Scanning Progress Shimmer */}
      {isScanning && (
        <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] border border-white/10 rounded-[48px] p-12 mb-12 shadow-2xl overflow-hidden relative">
           <div className="absolute top-0 left-0 w-full h-1 bg-primary animate-scanLine opacity-50 shadow-[0_0_20px_#ff7b00]"></div>
           <div className="flex flex-col md:flex-row items-center gap-8 mb-10 relative z-10">
            <div className="size-20 border-8 border-primary border-t-transparent rounded-full animate-spin shadow-lg"></div>
            <div>
              <p className="text-3xl font-black text-white mb-2">Stitch Vision Analyzing...</p>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Cross-referencing neighborhood market data for 47 detected objects</p>
            </div>
          </div>
          <div className="w-full bg-white/5 rounded-full h-4 overflow-hidden relative border border-white/5">
            <div className="bg-primary h-full rounded-full transition-all duration-700 shadow-[0_0_15px_#ff7b00]" style={{ width: '65%' }}></div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {detectedItems.length > 0 && !isScanning && (
        <div className="animate-fadeInUp">
          <div className="bg-white dark:bg-surface-dark border border-gray-100 dark:border-white/5 rounded-[48px] p-10 shadow-2xl overflow-hidden">
            {/* Summary Banner */}
            <div className="bg-slate-900 text-white rounded-[40px] p-10 mb-12 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
               <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/2"></div>
               <div className="text-center md:text-left relative z-10">
                  <h2 className="text-4xl font-black mb-2">
                    💎 Hidden Treasures Found!
                  </h2>
                  <p className="text-slate-400 font-bold">
                    Stitch detected {detectedItems.length} high-value items worth listing separately
                  </p>
               </div>
               <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 text-center min-w-[240px] relative z-10">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Max Potential Value</p>
                  <p className="text-5xl font-black text-primary">${totalValue}</p>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
               {/* Photo Preview with Bounding Boxes (Visual Representation) */}
               <div className="relative rounded-[40px] overflow-hidden border-4 border-gray-50 dark:border-white/5 group shadow-xl">
                  <img 
                    src={uploadedImages[0] ? URL.createObjectURL(uploadedImages[0]) : "https://lh3.googleusercontent.com/aida-public/AB6AXuDxCZQ53CzohQr0hjwQlVR7q9Zo6Gwl8aCEw18BbTIH6VaeHRyWaNA9Y46I3IVmKQAJ8JRBrWTZ5AEBHuHhEXxd2w3gpLyT-mdH3-Ii_64xm59O3FxAEbyb9c-Z2akPEzk4Ug53mb5wOGUVCoXem6ZF6mVq2ddnNiSvKdFjorBe5SP7ZAsiJFwI_Kvkj6lRRE2QtQEYeiHbqkAowjlNn4GwTxlOuNYWSKgq7WRhvjbbdZYhawtJFNNviOAV8qW-DMPrOVxuVbVH"} 
                    alt="Scanned garage sale"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  {/* Fake Bounding Boxes Overlay */}
                  {detectedItems.map(item => (
                    <div 
                      key={item.id}
                      className="absolute border-4 border-primary rounded-2xl animate-pulse shadow-[0_0_15px_#ff7b00]"
                      style={{
                        left: `${item.bounding_box.x / 8}%`, 
                        top: `${item.bounding_box.y / 6}%`,
                        width: `${item.bounding_box.width / 6}%`,
                        height: `${item.bounding_box.height / 4}%`
                      }}
                    >
                       <div className="absolute -top-8 left-0 bg-primary text-white text-[10px] font-black px-3 py-1 rounded-full whitespace-nowrap shadow-lg">
                          ${item.estimated_value.min}+
                       </div>
                    </div>
                  ))}
               </div>

               {/* Detected Items Detailed List */}
               <div className="space-y-6 overflow-y-auto max-h-[700px] pr-2 scrollbar-hide">
                  {detectedItems.map((item, idx) => (
                    <div 
                      key={idx}
                      className="bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-[32px] p-6 hover:shadow-lg transition-all"
                    >
                      <div className="flex flex-col sm:flex-row items-center gap-6">
                        <div className="size-20 bg-white dark:bg-white/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
                           <span className="material-symbols-outlined !text-4xl">inventory_2</span>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row items-center gap-3 mb-2">
                            <h3 className="font-black text-xl text-slate-900 dark:text-white">{item.name}</h3>
                            <span className="text-[10px] font-black bg-green-500 text-white px-2 py-0.5 rounded-full uppercase tracking-tighter">
                              {Math.round(item.confidence * 100)}% Match
                            </span>
                          </div>
                          <p className="text-sm font-medium text-slate-500 flex items-center justify-center sm:justify-start gap-1">
                             <span className="material-symbols-outlined !text-sm">near_me</span> {item.location}
                          </p>
                        </div>
                        <div className="text-center sm:text-right">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Market Avg</p>
                           <p className="text-3xl font-black text-green-600">${item.estimated_value.max}</p>
                        </div>
                      </div>
                      <div className="mt-6 flex gap-3">
                         <button className="flex-1 py-3 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 transition-colors">Compare Near Me</button>
                         <button className="flex-1 py-3 bg-primary text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 transition-transform">Quick Sell Now</button>
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-10 p-8 bg-orange-50 dark:bg-orange-900/10 rounded-[40px] border-2 border-dashed border-orange-200 dark:border-orange-500/20 text-center">
                     <p className="text-sm font-bold text-orange-700 dark:text-orange-400 italic">
                       "Neighbors are searching for {detectedItems[0].name} right now. List it for ${detectedItems[0].estimated_value.min} to sell it today."
                     </p>
                  </div>
               </div>
            </div>

            {/* Final Actions */}
            <div className="mt-16 pt-10 border-t border-gray-100 dark:border-white/5 flex flex-col md:flex-row gap-4">
              <button 
                onClick={() => {
                  setDetectedItems([]);
                  setUploadedImages([]);
                }}
                className="flex-1 py-5 bg-gray-100 dark:bg-white/5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors"
              >
                Scan Another Sale
              </button>
              <button className="flex-[2] py-5 bg-slate-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl transition hover:-translate-y-1">
                Add All To My Watchlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GarageSaleScannerPage;
