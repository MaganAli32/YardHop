/**
 * CreateListingPage — create a new listing (from appraisal or direct)
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import PriceBadge, { getPriceBadgeType } from '../components/PriceBadge';
import { marketplaceApi, uploadApi } from '../lib/api';
import { usePersistence } from '../store/PersistenceContext';
import { Upload, X } from 'lucide-react';

const CATEGORIES = [
  'Electronics',
  'Furniture',
  'Clothing',
  'Sneakers',
  'Instruments',
  'Collectibles',
  'Sports',
  'Tools',
  'Other',
];

const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

interface PrefillState {
  fromAppraisal: boolean;
  appraisalId?: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  recommendedPrice: number;
  priceLow?: number;
  priceHigh?: number;
  confidenceScore?: number;
  imageUrl?: string;
  sources?: Record<string, unknown>;
}

export default function CreateListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { authToken } = usePersistence();
  const state = location.state as PrefillState | null;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [askingPrice, setAskingPrice] = useState<string>('');
  const [images, setImages] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [locationText, setLocationText] = useState('');
  const [shipping, setShipping] = useState<'local' | 'shipping' | 'both'>('local');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const fromAppraisal = state?.fromAppraisal ?? false;
  const appraisalId = state?.appraisalId ?? null;
  const priceLow = state?.priceLow ?? null;
  const priceHigh = state?.priceHigh ?? null;
  const confidenceScore = state?.confidenceScore ?? 0;
  const sourcesCount = state?.sourcesCount ?? (state?.sources
    ? (Array.isArray(state.sources)
        ? state.sources.length
        : Object.keys(state.sources).length)
    : 0);

  useEffect(() => {
    if (state) {
      setTitle(state.title ?? '');
      setDescription(state.description ?? '');
      setCategory(state.category ?? '');
      setCondition(state.condition ?? '');
      setAskingPrice(String(state.recommendedPrice ?? ''));
      if (state.imageUrl) setImages([state.imageUrl]);
    }
  }, [state]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;
      const toAdd = files.slice(0, 5 - images.length);
      if (toAdd.length === 0) return;

      if (!authToken) {
        setError('Please sign in to upload photos.');
        return;
      }

      setError(null);
      try {
        const results = await uploadApi.uploadImages(toAdd, 'listing-images');
        const urls = results.uploaded?.map((r: { url: string }) => r.url) ?? [];
        setImages((prev) => [...prev, ...urls].slice(0, 5));
        setImageFiles((prev) => [...prev, ...toAdd].slice(0, 5));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
      e.target.value = '';
    },
    [images.length, authToken]
  );

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Title is required');
      return;
    }
    if (!category) {
      setError('Category is required');
      return;
    }
    if (!condition) {
      setError('Condition is required');
      return;
    }
    const price = parseFloat(askingPrice);
    if (isNaN(price) || price <= 0) {
      setError('Please enter a valid price');
      return;
    }
    if (images.length === 0) {
      setError('At least one photo is required');
      return;
    }

    if (!authToken) {
      navigate('/signup', { state: { returnTo: '/marketplace/new', listingForm: { title, description, category, condition, askingPrice: price, images, location: locationText, shipping } } });
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      const listing = await marketplaceApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        category,
        condition,
        asking_price: price,
        images,
        location: locationText.trim() || undefined,
        shipping,
        appraisal_id: appraisalId || undefined,
      });
      navigate(`/marketplace/${listing.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  const badgeType =
    priceLow != null && priceHigh != null && askingPrice
      ? getPriceBadgeType(parseFloat(askingPrice) || 0, priceLow, priceHigh)
      : 'unverified';

  return (
    <div className="min-h-screen bg-[#FFFFFF] text-[#1A1A1A] font-sans antialiased">
      <Navbar />
      <div className="pt-24 pb-32 px-6 md:px-12 max-w-[1200px] mx-auto">
        <Link to="/marketplace" className="inline-flex items-center gap-1 text-[12px] text-[#888] no-underline mt-8 mb-6 hover:text-[#0A0A0A]">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m15 18-6-6 6-6" /></svg>
          Marketplace
        </Link>
        <h1 className="font-serif text-[40px] font-normal text-[#0A0A0A] tracking-[-0.02em] pt-2">
          New Listing
        </h1>

        {error && (
          <div className="mt-6 p-4 text-red-700 text-[14px] border-b border-red-200">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-14 mt-8">
          <div>
            <div className="mb-9">
              <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#AAA] mb-4">Photos</div>
              <label className="block border border-[#ECECEC] rounded-xl p-10 text-center cursor-pointer hover:border-[#AAA]">
                <Upload className="w-5 h-5 mx-auto text-[#AAA]" />
                <p className="text-[13px] text-[#888] mt-2">Drop photos here or <span className="text-[#FF6B35] font-semibold">browse</span></p>
                <p className="text-[11px] text-[#AAA] mt-1">Up to 5 photos</p>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
              </label>
              <div className="flex gap-1.5 mt-2.5">
                {images.map((url, i) => (
                  <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden bg-[#F7F7F7] group">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => removeImage(i)} className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <X size={14} className="text-white" />
                    </button>
                  </div>
                ))}
                {images.length < 5 && <div className="w-14 h-14 rounded-lg bg-[#F7F7F7] flex items-center justify-center text-[#AAA]"><Upload size={12} /></div>}
              </div>
            </div>

            <div className="mb-9">
              <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#AAA] mb-4">Details</div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-[#666] mb-1.5">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Pioneer DDJ-FLX4 DJ Controller" className="w-full py-2.5 px-0 border-0 border-b border-[#ECECEC] bg-transparent text-[15px] text-[#0A0A0A] placeholder:text-[#AAA] focus:outline-none focus:border-[#AAA]" />
              </div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-[#666] mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe your item..." rows={4} className="w-full py-2.5 px-3 border border-[#ECECEC] rounded-lg bg-transparent text-[15px] text-[#0A0A0A] placeholder:text-[#AAA] focus:outline-none focus:border-[#AAA] resize-y leading-relaxed" />
              </div>
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[12px] font-semibold text-[#666] mb-1.5">Category</label>
                  <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full py-2.5 pr-6 border-0 border-b border-[#ECECEC] bg-transparent text-[15px] text-[#0A0A0A] focus:outline-none focus:border-[#AAA] appearance-none bg-[length:10px_10px] bg-[right_4px_center] bg-no-repeat" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23AAA' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
                    <option value="">Select</option>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#666] mb-1.5">Condition</label>
                  <select value={condition} onChange={(e) => setCondition(e.target.value)} className="w-full py-2.5 pr-6 border-0 border-b border-[#ECECEC] bg-transparent text-[15px] text-[#0A0A0A] focus:outline-none focus:border-[#AAA] appearance-none bg-[length:10px_10px] bg-[right_4px_center] bg-no-repeat" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%23AAA' stroke-width='2.5'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")" }}>
                    <option value="">Select</option>
                    {CONDITIONS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mb-9">
              <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#AAA] mb-4">Price</div>
              <div className="relative mb-2">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-[28px] font-semibold text-[#AAA]">$</span>
                <input type="number" min="0" step="1" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} placeholder="0" className="w-full max-w-[180px] pl-6 py-2.5 border-0 border-b border-[#ECECEC] bg-transparent text-[28px] font-semibold tracking-[-0.03em] text-[#0A0A0A] focus:outline-none focus:border-[#AAA]" />
              </div>
              {fromAppraisal && priceLow != null && priceHigh != null && (
                <div className="mt-3">
                  <p className="text-[12px] text-[#888]">Recommended: <strong className="text-[#0A0A0A]">${Math.round((state?.recommendedPrice ?? 0)).toLocaleString()}</strong> · Market: ${Math.round(priceLow).toLocaleString()} – ${Math.round(priceHigh).toLocaleString()}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[11px] text-[#888]">$250</span>
                    <div className="flex-1 h-0.5 bg-[#ECECEC] rounded-sm overflow-hidden"><div className="h-full bg-[#FF6B35] rounded-sm" style={{ width: '75%' }} /></div>
                    <span className="text-[11px] text-[#888]">$300</span>
                  </div>
                  <div className="mt-2"><PriceBadge type={badgeType} size="md" /></div>
                </div>
              )}
            </div>

            <div className="mb-9">
              <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#AAA] mb-4">Location & Shipping</div>
              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-[#666] mb-1.5">Location</label>
                <input type="text" value={locationText} onChange={(e) => setLocationText(e.target.value)} placeholder="e.g. Berkeley, CA" className="w-full py-2.5 px-0 border-0 border-b border-[#ECECEC] bg-transparent text-[15px] text-[#0A0A0A] placeholder:text-[#AAA] focus:outline-none focus:border-[#AAA]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#666] mb-2">Shipping</label>
                <div className="flex gap-0">
                  {[
                    { value: 'local' as const, label: 'Local pickup' },
                    { value: 'shipping' as const, label: 'Will ship' },
                    { value: 'both' as const, label: 'Both' },
                  ].map((opt) => (
                    <button key={opt.value} type="button" onClick={() => setShipping(opt.value)} className={`flex-1 py-2.5 text-center text-[12px] font-medium border-0 border-b-2 border-transparent bg-none cursor-pointer font-inherit ${shipping === opt.value ? 'text-[#0A0A0A] border-[#0A0A0A]' : 'text-[#888] hover:text-[#666]'}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 mt-2">
              <button type="button" onClick={() => setShowPreview(true)} className="py-3 px-7 rounded-[100px] border border-[#D4D4D4] text-[14px] font-semibold hover:border-[#888]">
                Preview
              </button>
              <button type="button" onClick={handleSubmit} disabled={submitting} className="flex-1 py-3 rounded-[100px] bg-[#0A0A0A] text-white text-[14px] font-semibold hover:opacity-90 disabled:opacity-50">
                {submitting ? 'Listing...' : 'List Item'}
              </button>
            </div>
          </div>

          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="text-[10px] font-semibold uppercase tracking-[1.5px] text-[#AAA] mb-3.5">Preview</div>
            <div className="block">
              <div className="aspect-square rounded-xl overflow-hidden bg-[#F7F7F7]">
                {images[0] ? <img src={images[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-[#AAA]">No image</div>}
              </div>
              <div className="pt-3 px-0.5">
                <p className="text-[14px] font-medium text-[#0A0A0A] line-clamp-1">{title || 'Item title'}</p>
                <p className="text-[12px] text-[#888] mt-0.5">{condition || 'Condition'} · {locationText || 'Location'}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-[17px] font-semibold">${askingPrice ? Math.round(parseFloat(askingPrice)).toLocaleString() : '0'}</span>
                  <span className="text-[11px] text-[#AAA]">{priceLow != null && priceHigh != null ? `$${Math.round(priceLow)} – $${Math.round(priceHigh)}` : 'No data'}</span>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#AAA] mt-2.5 text-center">How buyers will see your listing</p>
          </div>
        </div>
      </div>

      {showPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-[400px] w-full overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-[4/3] bg-[#F2F2F2] relative">
              {images[0] ? (
                <img
                  src={images[0]}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-[#9A9A9A]">
                  No image
                </div>
              )}
              <div className="absolute top-3 left-3">
                <PriceBadge
                  type={
                    priceLow != null && priceHigh != null && askingPrice
                      ? getPriceBadgeType(
                          parseFloat(askingPrice) || 0,
                          priceLow,
                          priceHigh
                        )
                      : 'unverified'
                  }
                  size="sm"
                />
              </div>
            </div>
            <div className="p-4">
              <h3 className="font-bold text-[16px] text-[#0A0A0A] mb-0.5">
                {title || 'Item title'}
              </h3>
              <p className="text-[14px] text-[#9A9A9A] mb-3">
                {condition || 'Condition'} · {category || 'Category'}
              </p>
              <p className="text-[24px] font-bold text-[#0A0A0A]">
                ${askingPrice ? Math.round(parseFloat(askingPrice)).toLocaleString() : '0'}
              </p>
            </div>
            <div className="p-4 border-t border-[#E0E0E0]">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="w-full py-3 rounded-[100px] bg-[#0A0A0A] text-white font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
