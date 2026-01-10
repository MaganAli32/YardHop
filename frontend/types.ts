
export interface UserProfile {
  name: string;
  email: string;
  bio: string;
  location: string;
  avatar: string;
  role: 'Buyer' | 'Seller' | 'Collector' | 'Neighbor';
  joinedDate: string;
  verified: boolean;
  preferences: {
    safeMeetOnly: boolean;
    notifications: boolean;
  };
}

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: string;
}

export interface Chat {
  id: string;
  productId: string;
  productTitle: string;
  productImage: string;
  productPrice: number;
  participants: string[]; // User names or IDs
  lastMessage?: string;
  lastTimestamp?: string;
  messages: Message[];
  unread: boolean;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  originalPrice?: number;
  market_average?: number;
  isSteal?: boolean;
  stealPercentage?: number;
  image: string;
  location: string;
  distance?: string;
  rating?: number;
  reviewCount?: number;
  sellerName?: string;
  sellerAvatar?: string;
  tags?: string[];
  description?: string;
  images?: string[];
  specs?: Record<string, string>;
  isFeatured?: boolean;
  isVerified?: boolean;
  price_percentage?: number;
  quantity?: number;
  // Location privacy fields
  latitude?: number;
  longitude?: number;
  location_privacy?: LocationPrivacy;
  display_latitude?: number;
  display_longitude?: number;
  privacy_radius_meters?: number;
}

export type LocationPrivacy = 'exact' | 'neighborhood' | 'city';

export interface GarageSale {
  id: string;
  title: string;
  date: string;
  time: string;
  description: string;
  image: string;
  tags: string[];
  // Location privacy fields
  latitude?: number;
  longitude?: number;
  address?: string;
  location_privacy?: LocationPrivacy;
  display_latitude?: number;
  display_longitude?: number;
  display_text?: string;
  privacy_radius_meters?: number;
}

export interface CommunityPost {
  id: string;
  authorName: string;
  authorAvatar: string;
  type: 'Free' | 'Announcement' | 'Event' | 'Question' | 'Lost & Found';
  timestamp: string;
  title: string;
  content: string;
  images?: string[];
  location: string;
  distance: string;
  likes: number;
  comments: number;
  isLiked?: boolean;
}

export interface DetectedItem {
  id: string;
  name: string;
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  estimated_value: {
    min: number;
    max: number;
  };
  confidence: number;
  location: string;
  // Additional fields from AI analysis
  description?: string;
  category?: string;
  condition?: string;
  suggested_price?: number;
  features?: string[];
  is_potential_steal?: boolean;
}
