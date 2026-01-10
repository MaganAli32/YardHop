import React, { useState } from 'react';
import { DetectedItem } from '../types';
import { aiApi } from '../lib/api';
import { ScanUsageBar } from '../components/ScanUsageBar';
import { UpgradeModal } from '../components/UpgradeModal';

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
  const [error, setError] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [userTier, setUserTier] = useState('free');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedImages(Array.from(e.target.files));
      setError(null);
      setDetectedItems([]);
    }
  };

  const handleScan = async () => {
    if (uploadedImages.length === 0) return;
    
    setIsScanning(true);
    setError(null);
    
    try {
      // Convert first image to base64
      const imageBase64 = await fileToBase64(uploadedImages[0]);
      
      // Call secure backend API
      const result = await aiApi.analyzeImage(imageBase64);
      
      // Transform backend response to match expected DetectedItem format
      if (result.success && result.analysis) {
        const analysis = result.analysis;
        
        // Create a DetectedItem from the analysis
        const item: DetectedItem = {
          id: '1',
          name: analysis.title,
          bounding_box: { 
            x: 50, 
            y: 50, 
            width: 200, 
            height: 200 
          },
          estimated_value: {
            min: analysis.price_range.low,
            max: analysis.price_range.high,
          },
          confidence: analysis.confidence || 0.85,
          location: 'Center of image',
          // Additional fields from analysis
          description: analysis.description,
          category: analysis.category,
          condition: analysis.condition,
          suggested_price: analysis.suggested_price,
          features: analysis.features,
          is_potential_steal: analysis.is_potential_steal,
        };
        
        setDetectedItems([item]);
      } else {
        throw new Error('No analysis data returned');
      }
    } catch (e: any) {
      console.error('Scan error:', e);
      
      // Check for scan limit exceeded error
      const errorCode = e.code || e.errorData?.code;
      const errorMsg = e.message || '';
      
      if (errorCode === 'SCAN_LIMIT_EXCEEDED' || 
          errorMsg.includes('Scan Limit Reached') || 
          errorMsg.includes('SCAN_LIMIT_EXCEEDED')) {
        setShowUpgrade(true);
        // Try to get current tier from error response or fetch it
        try {
          const usage = await aiApi.getUsage();
          setUserTier(usage.tier);
        } catch {
          // If error response has tier info, use it
          if (e.errorData?.usage?.tier) {
            setUserTier(e.errorData.usage.tier);
          }
        }
        setIsScanning(false);
        return;
      }
      
      // Provide helpful error messages
      let errorMessage = errorMsg || 'Unknown error';
      
      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Cannot connect')) {
        errorMessage = 'Cannot connect to server. Make sure the backend is running:\n\nnpm run dev:server';
      } else if (errorMessage.includes('AI Service Unavailable')) {
        errorMessage = 'AI service not configured. Add GEMINI_API_KEY to your backend .env file.';
      } else if (errorMessage.includes('Authentication Required') || errorMessage.includes('AUTH_REQUIRED')) {
        errorMessage = 'Please sign in to use AI scanning features.';
      }
      
      setError(errorMessage);
    } finally {
      setIsScanning(false);
    }
  };

  const totalValue = detectedItems.reduce((sum, item) => sum + item.estimated_value.max, 0);

  // Fetch user tier on mount
  React.useEffect(() => {
    const fetchTier = async () => {
      try {
        const usage = await aiApi.getUsage();
        setUserTier(usage.tier);
      } catch (error) {
        // User might not be logged in, that's okay
        console.error('Failed to fetch usage:', error);
      }
    };
    fetchTier();
  }, []);

  return (
    <div className="min-h-screen bg-white text-[#121c32] font-sans">
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-10 py-8 pb-20">
        {/* Usage Bar */}
        <ScanUsageBar onUpgradeClick={() => setShowUpgrade(true)} />
        
        {/* Upgrade Modal */}
        <UpgradeModal 
          isOpen={showUpgrade} 
          onClose={() => setShowUpgrade(false)} 
          currentTier={userTier}
        />

        {/* Header */}
        <div className="mb-8">
          <p className="text-xs font-medium text-slate-500 mb-2">Photo appraisal</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-[#121c32] mb-3 leading-tight">
            Scanner
          </h1>
          <p className="text-base text-slate-600 max-w-2xl">
            Analyze photos of yard sales to automatically find high-value items for you to buy or list.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-5 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-4">
              <div className="size-10 bg-red-100 rounded-md flex items-center justify-center shrink-0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-600">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-red-800 mb-1">Scan Failed</h3>
                <p className="text-sm text-red-600 leading-relaxed whitespace-pre-wrap">{error}</p>
              </div>
            </div>
          </div>
        )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10">
        {/* Left Column: Upload & Controls */}
        <div className="lg:col-span-7 space-y-6">
          {/* Upload Section */}
          {detectedItems.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-md shadow-[0_8px_24px_rgba(18,28,50,0.08)] p-6">
              <h2 className="text-lg font-bold text-[#121c32] mb-2">Upload photos</h2>
              <p className="text-sm text-slate-600 mb-4">
                Upload garage sale photos to analyze market value instantly.
              </p>
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
                className="cursor-pointer"
              >
                <div className="border-2 border-dashed border-slate-200 rounded-md p-12 text-center bg-slate-50 transition-colors">
                  <div className="size-16 bg-slate-100 rounded-md text-slate-400 flex items-center justify-center mb-4 mx-auto">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                      <polyline points="17 8 12 3 7 8"/>
                      <line x1="12" y1="3" x2="12" y2="15"/>
                    </svg>
                  </div>
                  <button className="bg-[#FF6B35] hover:bg-[#e85c2e] text-white font-semibold py-2.5 px-6 rounded-md shadow-lg transition-colors text-sm uppercase tracking-wide">
                    Choose photos
                  </button>
                </div>
              </label>
            </div>
          )}

          {/* Preview Uploaded Images */}
          {uploadedImages.length > 0 && detectedItems.length === 0 && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                  {uploadedImages.length} photo{uploadedImages.length > 1 ? 's' : ''} staged
                </p>
                <button 
                  onClick={() => { setUploadedImages([]); setError(null); }} 
                  className="text-xs font-bold text-red-500 uppercase tracking-widest hover:underline"
                >
                  Clear all
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {uploadedImages.map((file, idx) => (
                  <div key={idx} className="relative aspect-square rounded-md overflow-hidden border border-slate-200 shadow-[0_8px_24px_rgba(18,28,50,0.08)]">
                    <img 
                      src={URL.createObjectURL(file)} 
                      alt="Target"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={handleScan}
                disabled={isScanning}
                className="w-full bg-[#FF6B35] hover:bg-[#e85c2e] disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-md shadow-xl transition-all flex items-center justify-center gap-3 uppercase tracking-[0.1em] text-sm"
              >
                {isScanning ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing photo...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <circle cx="11" cy="11" r="8"/>
                      <path d="m21 21-4.3-4.3"/>
                    </svg>
                    Analyze photo
                  </>
                )}
              </button>
            </div>
          )}

          {/* Scanning Progress */}
          {isScanning && (
            <div className="bg-white border border-slate-200 rounded-md shadow-[0_10px_28px_rgba(18,28,50,0.06)] p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-5 h-5 border-2 border-[#FF6B35] border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm font-bold text-[#121c32] uppercase tracking-wide">Checking comparable listings...</p>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-[#FF6B35] h-full rounded-full transition-all duration-700" style={{ width: '65%' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Summary & Results (Sticky) */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-6">

            {/* Empty State */}
            {!isScanning && detectedItems.length === 0 && (
              <div className="border border-slate-200 rounded-md bg-slate-50 p-10 text-center space-y-4">
                <div className="size-16 bg-white border border-slate-200 rounded-md flex items-center justify-center mx-auto shadow-sm">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-300">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  Upload and analyze a photo to see market value, condition grading, and resale potential.
                </p>
              </div>
            )}

            {/* Results Section */}
            {detectedItems.length > 0 && !isScanning && (
              <div className="space-y-6 animate-in fade-in duration-500">
                
                {/* Scan Summary Module */}
                <div className="bg-white border border-slate-200 rounded-md shadow-[0_10px_28px_rgba(18,28,50,0.06)] overflow-hidden">
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h2 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Scan results</h2>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Market Value</p>
                        <p className="text-4xl font-bold text-[#121c32] tracking-tight">${totalValue}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Match Score</p>
                        <p className="text-xl font-bold text-[#FF6B35]">{Math.round(detectedItems[0].confidence * 100)}%</p>
                      </div>
                    </div>
                  </div>

                  {/* Photo Well */}
                  <div className="p-4 bg-white">
                    <div className="aspect-square border border-slate-200 rounded-md overflow-hidden bg-slate-100">
                      {uploadedImages[0] && (
                        <img 
                          src={URL.createObjectURL(uploadedImages[0])} 
                          alt="Analyzed item"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>

                  {/* Detailed Analysis */}
                  {detectedItems.map((item, idx) => (
                    <div key={idx} className="p-6 pt-0 space-y-6">
                      <div>
                        <div className="flex items-center gap-3 mb-3">
                          <h3 className="font-bold text-xl text-[#121c32] tracking-tight">{item.name}</h3>
                          {(item as any).is_potential_steal && (
                            <span className="text-[9px] font-black bg-[#FF6B35] text-white px-2 py-0.5 rounded-sm uppercase tracking-tighter">Arbitrage Opportunity</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 leading-relaxed italic border-l-2 border-slate-200 pl-4">
                          {(item as any).description}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-px bg-slate-200 border border-slate-200 rounded-md overflow-hidden">
                        <div className="bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Category</p>
                          <p className="text-sm font-bold text-[#121c32]">{(item as any).category}</p>
                        </div>
                        <div className="bg-white p-4">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Condition</p>
                          <p className="text-sm font-bold text-[#121c32]">{(item as any).condition}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Range</p>
                          <p className="text-lg font-bold text-[#121c32] tracking-tight">
                            ${item.estimated_value.min} – ${item.estimated_value.max}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Suggested Ask</p>
                          <p className="text-xl font-black text-[#FF6B35] tracking-tight">${(item as any).suggested_price}</p>
                        </div>
                      </div>

                      {/* Feature Tags */}
                      <div className="space-y-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Key Markers</p>
                        <div className="flex flex-wrap gap-2">
                          {(item as any).features?.map((feature: string, i: number) => (
                            <span key={i} className="text-[10px] font-bold text-slate-600 border border-slate-200 px-2.5 py-1 rounded-md bg-white tracking-wider uppercase">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Stack */}
                      <div className="flex flex-col gap-3 pt-4 border-t border-slate-100">
                        <button className="w-full py-4 bg-[#FF6B35] hover:bg-[#e85c2e] text-white rounded-md font-bold text-xs uppercase tracking-[0.2em] shadow-lg transition-colors">
                          List on YardFront
                        </button>
                        <button className="w-full py-3.5 border border-slate-200 text-[#121c32] rounded-md font-bold text-xs uppercase tracking-[0.2em] hover:bg-slate-50 transition-colors">
                          Compare Market Data
                        </button>
                        <button 
                          onClick={() => {
                            setDetectedItems([]);
                            setUploadedImages([]);
                            setError(null);
                          }}
                          className="w-full text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#FF6B35] transition-colors py-2"
                        >
                          Scan New Item
                        </button>
                      </div>
                    </div>
                  ))}

                  <button className="w-full py-4 bg-[#121c32] text-white rounded-md font-bold text-xs uppercase tracking-[0.2em] hover:bg-black transition-colors shadow-xl">
                    Save to My Inventory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default GarageSaleScannerPage;
