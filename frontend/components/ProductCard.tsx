
import React, { useState } from 'react';
import { Product } from '../types';
import { Link } from 'react-router-dom';
import { FALLBACK_IMAGE } from '../data';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const [imgSrc, setImgSrc] = useState(product.image);
  
  return (
    <article className="group bg-white rounded border border-slate-200 overflow-hidden hover:border-slate-300 hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col h-full">
      <Link to={`/product/${product.id}`} className="block relative aspect-[4/3] bg-slate-50 overflow-hidden">
        <img 
          src={imgSrc} 
          onError={() => setImgSrc(FALLBACK_IMAGE)}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          alt={product.title} 
        />
        
        {/* STEAL Badge */}
        {product.isSteal && (
          <div className="absolute top-3 left-3">
            <span className="inline-flex items-center gap-1.5 bg-green-600 text-white text-xs font-semibold px-2.5 py-1 rounded shadow-sm uppercase tracking-wide">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
              </svg>
              <span>Major Steal</span>
            </span>
          </div>
        )}
        
        {/* Favorite Action */}
        <button 
          className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-sm transition-all group/fav"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        >
          <svg className="w-4 h-4 text-slate-400 group-hover/fav:text-primary-500 transition-colors" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </Link>

      {/* Card Content */}
      <div className="p-4 flex flex-col flex-grow">
        <Link to={`/product/${product.id}`}>
          <h3 className="text-sm font-medium text-slate-900 mb-1 line-clamp-2 group-hover:text-primary transition-colors leading-tight">
            {product.title}
          </h3>
        </Link>
        
          <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3 mt-auto">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
          </svg>
          <span className="font-medium">{product.location}</span>
        </div>
        
        <div className="flex items-end justify-between pt-3 border-t border-slate-100">
          <div>
            <p className="text-lg font-semibold text-slate-900 leading-none">${product.price}</p>
            {product.originalPrice && (
              <p className="text-xs text-slate-400 line-through mt-1">Retail: ${product.originalPrice}</p>
            )}
          </div>
          
          <span className="text-xs font-medium text-slate-500">Verified</span>
        </div>
      </div>
    </article>
  );
};

export default ProductCard;
