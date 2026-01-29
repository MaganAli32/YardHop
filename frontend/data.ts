
import { Product, GarageSale, CommunityPost } from './types';

export const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80';

export const PRODUCTS: Product[] = [
  {
    id: '1',
    title: 'Authentic MCM Eames Lounge Chair',
    price: 425,
    originalPrice: 1200,
    market_average: 1200,
    isSteal: true,
    stealPercentage: 65,
    image: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
    location: 'Zilker, Austin',
    distance: '0.5 mi',
    tags: ['Furniture', 'Vintage'],
    sellerName: 'Alex G.',
    sellerAvatar: 'https://randomuser.me/api/portraits/men/32.jpg',
    rating: 4.9,
    reviewCount: 121,
    isVerified: true,
    description: 'A genuine mid-century piece. Rosewood veneer with black leather. Minor wear on the ottoman.',
    specs: { Condition: 'Good' },
    quantity: 1
  },
  {
    id: '2',
    title: "1974 Schwinn Varsity Road Bike",
    price: 95,
    originalPrice: 280,
    market_average: 250,
    isSteal: true,
    stealPercentage: 66,
    image: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=800&auto=format&fit=crop&q=80',
    location: 'Hyde Park, Austin',
    distance: '1.2 mi',
    tags: ['Sports', 'Vintage'],
    sellerName: 'Mike R.',
    rating: 4.5,
    reviewCount: 42,
    specs: { Condition: 'Like New' },
    quantity: 1
  },
  {
    id: '3',
    title: 'Solid Reclaimed Oak Farmhouse Table',
    price: 180,
    originalPrice: 450,
    market_average: 550,
    isSteal: true,
    stealPercentage: 60,
    image: 'https://images.unsplash.com/photo-1595514535215-9921b7119999?w=800&auto=format&fit=crop&q=80',
    location: 'East Side, Austin',
    distance: '0.8 mi',
    tags: ['Furniture', 'Tools'],
    specs: { Condition: 'Project Piece' },
    quantity: 1
  },
  {
    id: '4',
    title: 'Canon AE-1 with 50mm f/1.8 Lens',
    price: 165,
    originalPrice: 220,
    market_average: 280,
    isSteal: false,
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&auto=format&fit=crop&q=80',
    location: 'North Loop, Austin',
    distance: '2.1 mi',
    tags: ['Electronics', 'Vintage'],
    sellerName: 'Sarah P.',
    rating: 5.0,
    reviewCount: 88,
    isFeatured: true,
    specs: { Condition: 'Good' },
    quantity: 1
  },
  {
    id: '5',
    title: 'Vintage Technics Turntable SL-D2',
    price: 120,
    originalPrice: 300,
    market_average: 300,
    isSteal: true,
    stealPercentage: 60,
    image: 'https://images.unsplash.com/photo-1603048588665-791ca8aea617?w=800&auto=format&fit=crop&q=80',
    location: 'South Congress, Austin',
    distance: '1.2 mi',
    tags: ['Electronics', 'Music'],
    specs: { Condition: 'Like New' },
    quantity: 1
  }
];

export const SALES: GarageSale[] = [
  {
    id: 's1',
    title: 'Barton Hills Huge Multi-Family Sale',
    date: 'Today',
    time: '8:00 AM - 2:00 PM',
    description: 'Moving sale across two adjacent houses. Lots of high-end furniture, kid toys, and kitchen gadgets.',
    image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1200&auto=format&fit=crop&q=80',
    tags: ['Yard Sale', 'Multi-Family', 'Moving'],
    address: 'Barton Hills, Austin, TX',
    latitude: 30.2627,
    longitude: -97.7809,
    display_text: 'Barton Hills, Austin',
    display_latitude: 30.2627,
    display_longitude: -97.7809
  },
  {
    id: 's2',
    title: "Estate Sale: Antique Collector's Treasure",
    date: 'Saturday',
    time: '7:00 AM - 1:00 PM',
    description: 'Downsizing sale with rare glassware, vintage tools, and 1950s collectibles.',
    image: 'https://images.unsplash.com/photo-1520038410233-7141f77e47aa?w=1200&auto=format&fit=crop&q=80',
    tags: ['Estate Sale', 'Antiques'],
    address: 'Hyde Park, Austin, TX',
    latitude: 30.3074,
    longitude: -97.7342,
    display_text: 'Hyde Park, Austin',
    display_latitude: 30.3074,
    display_longitude: -97.7342
  },
  {
    id: 's3',
    title: "Saturday Morning Neighborhood YardFront",
    date: 'Saturday',
    time: '9:00 AM - 3:00 PM',
    description: 'Join the block for 5 houses worth of treasures. Clothing, books, and home decor.',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=1200&auto=format&fit=crop&q=80',
    tags: ['Yard Sale', 'Austin', 'Community'],
    address: 'East Riverside, Austin, TX',
    latitude: 30.2518,
    longitude: -97.7213,
    display_text: 'East Riverside, Austin',
    display_latitude: 30.2518,
    display_longitude: -97.7213
  }
];

export const COMMUNITY_POSTS: CommunityPost[] = [
  {
    id: 'c1',
    authorName: 'Sarah Jenkins',
    authorAvatar: 'https://randomuser.me/api/portraits/women/44.jpg',
    type: 'Free',
    timestamp: '2 hours ago',
    title: 'Free Sofa on Curb!',
    content: 'Putting this beige sofa out on the curb. It has some cat scratches on the side but structurally sound. First come first serve!',
    images: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&auto=format&fit=crop&q=60'],
    location: 'Maple Ave & 4th St',
    distance: '0.2 mi away',
    likes: 12,
    comments: 4
  }
];
