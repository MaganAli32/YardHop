/**
 * MarketplacePage — browse all listings with filters
 */

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
    <div className="min-h-screen bg-[#FFFFFF] text-[#1A1A1A] font-sans antialiased">
      <Navbar />
      <div className="pt-24 pb-32 px-6 md:px-12 max-w-[1200px] mx-auto">
        <h1 className="font-serif text-[40px] font-normal text-[#0A0A0A] tracking-[-0.02em] pt-2">
          Marketplace
        </h1>

        {/* Search — bottom border only */}
        <div className="relative mt-9">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AAA]" />
          <input
            type="search"
            placeholder="Search items..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-11 pr-5 py-3.5 border-0 border-b border-[#ECECEC] bg-transparent text-[15px] text-[#0A0A0A] placeholder:text-[#AAA] focus:outline-none focus:border-[#D4D4D4]"
          />
        </div>

        {/* Filters — single line, dropdowns + separators, sort right */}
        <div className="flex flex-wrap items-center gap-6 mt-6 pb-6 border-b border-[#ECECEC]">
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
          <div className="w-px h-4 bg-[#ECECEC]" />
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
          <div className="w-px h-4 bg-[#ECECEC]" />
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
          <div className="ml-auto flex items-center gap-1.5 text-[12px] text-[#888]">
            Sort by
            <select
              value={sort}
              onChange={(e) => { setSort(e.target.value); setPage(1); }}
              className="border-0 bg-transparent font-medium text-[#666] cursor-pointer outline-none appearance-none"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 mt-8 pb-32">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square rounded-xl bg-[#ECECEC]" />
                <div className="pt-3 space-y-2">
                  <div className="h-3.5 bg-[#ECECEC] rounded w-4/5" />
                  <div className="h-3 bg-[#ECECEC] rounded w-1/2" />
                  <div className="h-5 bg-[#ECECEC] rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-20 px-6 mt-8">
            <p className="text-[18px] font-medium text-[#0A0A0A] mb-2">
              No listings yet
            </p>
            <p className="text-[15px] text-[#666] mb-6 max-w-md mx-auto">
              Be the first to list something! Get an AI appraisal, then list it on YardFront.
            </p>
            <Link
              to="/#upload"
              className="inline-flex py-3 px-6 bg-[#0A0A0A] text-white rounded-[100px] font-semibold text-[15px] hover:opacity-90 transition-opacity no-underline"
            >
              Try an Appraisal
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 mt-8 pb-32">
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
              className="py-2 px-4 rounded-[100px] border border-[#E0E0E0] text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#FF6B35] hover:text-[#FF6B35]"
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
              className="py-2 px-4 rounded-[100px] border border-[#E0E0E0] text-[14px] font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:border-[#FF6B35] hover:text-[#FF6B35]"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
