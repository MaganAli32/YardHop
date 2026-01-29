import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import { Product } from '../types';
import { formatLocation } from '../lib/locationUtils';
import { usePersistence } from '../store/PersistenceContext';

// Fallback image when no image is available
const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop';

interface ProductCardProps {
  product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { user, loading } = usePersistence();
  const navigate = useNavigate();
  const [imgError, setImgError] = useState(false);

  const handleProductClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const productPath = `/product/${product.id}`;
    
    console.log('ProductCard clicked:', { hasUser: !!user, loading, productPath });
    
    if (user) {
      // User is logged in, navigate directly
      console.log('User authenticated, navigating to:', productPath);
      navigate(productPath);
    } else {
      // No user or still loading - redirect to login
      console.log('No user, redirecting to login from:', productPath);
      navigate('/login', { state: { from: { pathname: productPath } } });
    }
  };

  // Map Product type to display format
  const displayName = product.title || (product as any).name || 'Untitled Item';
  const displayPrice = product.price || 0;
  const { neighborhood, cityState } = formatLocation(product.location || '');
  const displayLocation = neighborhood ? `${neighborhood} • ${cityState}` : (cityState || 'Unknown');
  
  // Handle multiple image formats:
  // 1. product.image (string) - direct image URL
  // 2. product.images (array of strings) - array of URLs
  // 3. product.images (array of objects) - array of { url, is_primary, ... }
  const getImageUrl = (): string => {
    // If there's a direct image property (string)
    if (typeof product.image === 'string' && product.image) {
      return product.image;
    }
    
    // If images is an array
    if (Array.isArray(product.images) && product.images.length > 0) {
      const firstImage = product.images[0];
      
      // If it's an array of strings
      if (typeof firstImage === 'string') {
        return firstImage;
      }
      
      // If it's an array of objects with url property
      if (firstImage && typeof firstImage === 'object') {
        // Try to find primary image first
        const primaryImage = product.images.find((img: any) => img.is_primary);
        if (primaryImage?.url) {
          return primaryImage.url;
        }
        // Otherwise use first image's url
        return (firstImage as any).url || '';
      }
    }
    
    // Check for image_url property (some APIs use this)
    if ((product as any).image_url) {
      return (product as any).image_url;
    }
    
    return '';
  };

  const imageUrl = getImageUrl();
  const displayImage = imgError || !imageUrl ? FALLBACK_IMAGE : imageUrl;

  return (
    <div
      onClick={handleProductClick}
      className="group bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:border-orange-300 transition-all duration-300 block cursor-pointer"
    >
      {/* Image Container */}
      <div className="aspect-square overflow-hidden relative bg-slate-100">
        <img 
          src={displayImage} 
          alt={displayName} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          onError={() => setImgError(true)}
        />
        {/* Price Badge */}
        <div className="absolute top-3 right-3 bg-[#FF6B35] px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-lg">
          ${displayPrice}
        </div>
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-slate-900 text-sm mb-1.5 truncate group-hover:text-[#FF6B35] transition-colors">
          {displayName}
        </h3>
        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
          <MapPin size={12} className="text-[#FF6B35]" /> 
          <span className="truncate">{displayLocation}</span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
