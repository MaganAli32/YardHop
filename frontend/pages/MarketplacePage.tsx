import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ListingCard, { type ListingCardData } from '../components/ListingCard';
import { marketplaceApi } from '../lib/api';
import { Search } from 'lucide-react';

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

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price Low→High' },
  { value: 'price_desc', label: 'Price High→Low' },
  { value: 'best_deals', label: 'Best Deals' },
];

export default function MarketplacePage() {
  const [listings, setListings] = useState<ListingCardData[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [condition, setCondition] = useState('');
  const [priceMin, setPriceMin] = useState<number | ''>('');
  const [priceMax, setPriceMax] = useState<number | ''>('');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    marketplaceApi
      .list({
        search: search || undefined,
        category: category || undefined,
        condition: condition || undefined,
        price_min: priceMin !== '' ? Number(priceMin) : undefined,
        price_max: priceMax !== '' ? Number(priceMax) : undefined,
        sort,
        page,
        limit: 24,
      })
      .then((data) => {
        if (!cancelled) {
          setListings(data.listings || []);
          setTotal(data.total ?? 0);
          setPages(data.pages ?? 1);
        }
      })
      .catch(() => {
        if (!cancelled) setListings([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [search, category, condition, priceMin, priceMax, sort, page]);

  return (
    <div className="min-h-screen bg-[#F0EAE0] text-[#1A1A1A] font-sans antialiased">
      <Navbar />
      <div className="pt-28 pb-28 px-6 md:px-[56px] max-w-[1220px] mx-auto">
        <p className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.2em] text-[#9E8B6F] mb-5">
          Marketplace
        </p>
        <h1 className="font-['Cormorant_Garamond'] text-[clamp(42px,6vw,82px)] font-light text-[#1A1A18] tracking-[-0.02em] leading-[0.95]">
          Marketplace
        </h1>
        <p className="text-[16px] text-[#6B7A6D] mt-3 max-w-[560px] leading-[1.8]">
          Browse appraised listings priced against real resale market signals.
        </p>

        <div className="relative mt-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A49A8C]" />
          <input
            type="search"
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-5 py-3.5 border border-[#DDD2C1] rounded-sm bg-[#FAF7F2] text-[15px] text-[#0A0A0A] placeholder:text-[#A49A8C] focus:outline-none focus:border-[#B8AB99]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-6 mt-6 pb-6 border-b border-[#DCCFBE]">
          <label className="relative inline-flex items-center gap-1.5 text-[13px] font-medium text-[#666] cursor-pointer hover:text-[#0A0A0A]">
            Category
            <svg className="w-2.5 h-2.5 text-[#888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="w-px h-4 bg-[#DCCFBE]" />
          <label className="relative inline-flex items-center gap-1.5 text-[13px] font-medium text-[#666] cursor-pointer hover:text-[#0A0A0A]">
            Price
            <svg className="w-2.5 h-2.5 text-[#888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
            <select
              value={priceMin !== '' || priceMax !== '' ? 'custom' : ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '') { setPriceMin(''); setPriceMax(''); }
                else if (v === '0-50') { setPriceMin(0); setPriceMax(50); }
                else if (v === '50-200') { setPriceMin(50); setPriceMax(200); }
                else if (v === '200-500') { setPriceMin(200); setPriceMax(500); }
                else if (v === '500+') { setPriceMin(500); setPriceMax(''); }
                setPage(1);
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="">Any</option>
              <option value="0-50">Under $50</option>
              <option value="50-200">$50 – $200</option>
              <option value="200-500">$200 – $500</option>
              <option value="500+">$500+</option>
            </select>
          </label>
          <div className="w-px h-4 bg-[#DCCFBE]" />
          <label className="relative inline-flex items-center gap-1.5 text-[13px] font-medium text-[#666] cursor-pointer hover:text-[#0A0A0A]">
            Condition
            <svg className="w-2.5 h-2.5 text-[#888]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
            <select
              value={condition}
              onChange={(e) => { setCondition(e.target.value); setPage(1); }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
              <option value="">Any</option>
              {CONDITIONS.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[#8D8478]">
            Sort by
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="border-0 bg-transparent font-medium text-[#6B7A6D] cursor-pointer outline-none appearance-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 mt-8 pb-24">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-sm bg-[#E8DED0]" />
                <div className="pt-3 space-y-2">
                  <div className="h-3.5 bg-[#ECECEC] rounded w-4/5" />
                  <div className="h-3 bg-[#ECECEC] rounded w-1/2" />
                  <div className="h-5 bg-[#ECECEC] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 px-6 mt-8 border border-[#E2D8C8] rounded-sm bg-[#FAF7F2]">
            <p className="text-[18px] font-medium text-[#1A1A18] mb-2">
              No listings yet
            </p>
            <p className="text-[15px] text-[#6B7A6D] mb-6 max-w-md mx-auto">
              Be the first to list something! Get an AI appraisal, then list it on YardFront.
            </p>
            <Link
              to="/#try"
              className="inline-flex py-3 px-6 bg-[#1A2A1C] text-[#F0EAE0] rounded-sm font-semibold text-[12px] uppercase tracking-[0.1em] hover:opacity-90 transition-opacity no-underline"
            >
              Try an Appraisal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 mt-8 pb-24">
            {listings.map((listing, i) => (
              <div key={listing.id} className="scroll-reveal">
                <ListingCard listing={listing} animationDelay={i * 50} />
              </div>
            ))}
          </div>
        )}

        {!loading && pages > 1 && (
          <div className="flex justify-center gap-2 mt-12">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="py-2 px-4 rounded-sm border border-[#DCCFBE] bg-[#FAF7F2] text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#B8AB99]"
            >
              Previous
            </button>
            <span className="py-2 px-4 text-[14px] text-[#6B6B6B]">
              Page {page} of {pages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className="py-2 px-4 rounded-sm border border-[#DCCFBE] bg-[#FAF7F2] text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#B8AB99]"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
