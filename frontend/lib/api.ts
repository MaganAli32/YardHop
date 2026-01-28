/**
 * ============================================================
 * YARDHOP API CLIENT
 * Centralized API calls to backend
 * ============================================================
 */

import { supabase } from './supabase';

// API base URL - use relative path for universal compatibility
// This works on desktop, mobile, production (Vercel), and all browsers
// Vercel rewrites /api/* to /api/index.js (serverless function)
const API_BASE = '/api';

// Helper to get auth token from Supabase session
const getAuthToken = async (): Promise<string | null> => {
  try {
    if (!supabase) return null;
    
    // Get current session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session for API call:', error);
      return null;
    }
    
    return session?.access_token || null;
  } catch (error) {
    console.error('Error in getAuthToken:', error);
    return null;
  }
};

// Base fetch wrapper with auth and error handling
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      // Handle 401 Unauthorized - token might be expired
      if (response.status === 401) {
        // Try to refresh the session
        if (supabase) {
          try {
            const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError || !session) {
              // Session refresh failed - user needs to log in again
              // Don't clear session here - let the auth state change handler do it
              console.warn('Session expired and refresh failed');
            } else {
              // Retry the request with new token
              const newHeaders = {
                ...headers,
                'Authorization': `Bearer ${session.access_token}`,
              };
              const retryResponse = await fetch(url, {
                ...options,
                headers: newHeaders,
              });
              
              if (!retryResponse.ok) {
                const errorData = await retryResponse.json().catch(() => ({}));
                throw new Error(errorData.message || errorData.error || `API Error: ${retryResponse.status}`);
              }
              
              return retryResponse.json();
            }
          } catch (refreshErr) {
            console.error('Error refreshing session:', refreshErr);
          }
        }
        
        // If refresh didn't work or not available, throw the original 401
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Authentication required. Please log in again.');
      }
      
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || errorData.error || `API Error: ${response.status}`);
      // Attach error data to error object for access to code, usage, etc.
      (error as any).errorData = errorData;
      (error as any).code = errorData.code;
      throw error;
    }

    return response.json();
  } catch (error: any) {
    // Network error - backend might not be running
    if (error.message === 'Failed to fetch' || error.message.includes('Failed to fetch')) {
      throw new Error('Cannot connect to server. Make sure the backend is running on port 3000.');
    }
    throw error;
  }
}

// ============================================================
// AUTH API
// ============================================================
export const authApi = {
  signup: (email: string, password: string, name?: string) =>
    apiFetch<{ user: any; session: any }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    apiFetch<{ user: any; session: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () =>
    apiFetch<{ message: string }>('/auth/logout', { method: 'POST' }),

  me: () =>
    apiFetch<{ user: any }>('/auth/me'),

  refresh: (refresh_token: string) =>
    apiFetch<{ session: any }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token }),
    }),
};

// ============================================================
// PRODUCTS API
// ============================================================
export const productsApi = {
  list: (params?: {
    q?: string;
    category?: string;
    min_price?: number;
    max_price?: number;
    condition?: string;
    is_steal?: boolean;
    latitude?: number;
    longitude?: number;
    radius?: number;
    sort_by?: string;
    sort_order?: string;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiFetch<{ products: any[]; pagination: any }>(`/products${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    apiFetch<any>(`/products/${id}`),

  create: (data: any) =>
    apiFetch<any>('/products', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/products/${id}`, { method: 'DELETE' }),
};

// ============================================================
// GARAGE SALES API
// ============================================================
export const salesApi = {
  list: (params?: {
    date?: string;
    latitude?: number;
    longitude?: number;
    radius?: number;
    status?: string;
    is_multi_family?: boolean;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }
    const query = searchParams.toString();
    return apiFetch<{ sales: any[]; pagination: any }>(`/sales${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    apiFetch<any>(`/sales/${id}`),

  create: (data: any, _authToken?: string | null) =>
    apiFetch<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/sales/${id}`, { method: 'DELETE' }),
};

// ============================================================
// AI API
// ============================================================
export const aiApi = {
  /**
   * Analyze an image and get AI-generated listing details
   * @param imageBase64 - Base64 encoded image (without data:image prefix)
   * @param imageUrl - Alternative: URL to image
   */
  analyzeImage: (imageBase64?: string, imageUrl?: string) =>
    apiFetch<{
      success: boolean;
      analysis: {
        title: string;
        description: string;
        category: string;
        condition: string;
        price_range: { low: number; high: number };
        suggested_price: number;
        market_average: number;
        features: string[];
        is_potential_steal: boolean;
        confidence: number;
      };
    }>('/ai/analyze', {
      method: 'POST',
      body: JSON.stringify({
        image_base64: imageBase64,
        image_url: imageUrl,
      }),
    }),

  /**
   * Get AI price suggestion based on item details
   */
  suggestPrice: (data: {
    title: string;
    description?: string;
    condition?: string;
    category?: string;
    original_price?: number;
  }) =>
    apiFetch<{
      suggested_price: number;
      market_average: number;
      price_range: { low: number; high: number };
      confidence: number;
      reasoning?: string;
      source: 'ai' | 'estimate';
    }>('/ai/suggest-price', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Generate description from item details
   */
  generateDescription: (data: {
    title: string;
    condition?: string;
    category?: string;
    features?: string[];
  }) =>
    apiFetch<{
      description: string;
      source: 'ai' | 'template';
    }>('/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Get market arbitrage analysis for a product (Stitch Appraisal)
   */
  appraise: (data: {
    title: string;
    price: number;
    description?: string;
  }) =>
    apiFetch<{
      appraisal: string;
      source: 'ai' | 'estimate';
      usage?: any;
    }>('/ai/appraise', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * Detect steals from a list of items
   */
  detectSteals: (items: Array<{
    id: string;
    title: string;
    price: number;
    market_average?: number;
    original_price?: number;
  }>) =>
    apiFetch<{
      all_items: any[];
      top_steals: any[];
      steal_count: number;
      total_potential_savings: number;
    }>('/ai/detect-steals', {
      method: 'POST',
      body: JSON.stringify({ items }),
    }),

  /**
   * Get user's AI analysis history
   */
  getHistory: (page = 1, limit = 20) =>
    apiFetch<{ analyses: any[]; pagination: any }>(`/ai/history?page=${page}&limit=${limit}`),

  /**
   * Get current user's AI scan usage and limits
   */
  getUsage: () =>
    apiFetch<{
      tier: string;
      usage: {
        current: number;
        limit: number | string;
        remaining: number | string;
        percentage: number;
        byType: Record<string, number>;
      };
      subscription: {
        status: string;
        expiresAt: string | null;
      };
      resetsAt: string;
      upgrades: Record<string, { price: number; scans: number | string }>;
    }>('/ai/usage'),

  /**
   * Get AI negotiation consultation advice (Stitch Consultation)
   */
  consultNegotiation: (data: {
    product_title: string;
    product_price: number;
    conversation: string;
    user_role?: string;
  }) =>
    apiFetch<{
      advice: string;
      source: 'ai' | 'fallback';
      usage?: any;
    }>('/ai/consult-negotiation', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// FAVORITES API
// ============================================================
export const favoritesApi = {
  list: (page = 1, limit = 20) =>
    apiFetch<{ favorites: any[]; pagination: any }>(`/favorites?page=${page}&limit=${limit}`),

  add: (product_id: string) =>
    apiFetch<any>('/favorites', {
      method: 'POST',
      body: JSON.stringify({ product_id }),
    }),

  remove: (product_id: string) =>
    apiFetch<{ message: string }>(`/favorites/${product_id}`, { method: 'DELETE' }),

  check: (product_id: string) =>
    apiFetch<{ is_favorited: boolean }>(`/favorites/check/${product_id}`),
};

// ============================================================
// CART API
// ============================================================
export const cartApi = {
  get: () =>
    apiFetch<{ items: any[]; summary: any }>('/cart'),

  // Alias for backward compatibility - returns array of items
  list: async (authToken?: string | null) => {
    const data = await apiFetch<{ items: any[]; summary: any }>('/cart');
    return data?.items || [];
  },

  add: (product_id: string, quantity = 1) =>
    apiFetch<any>('/cart', {
      method: 'POST',
      body: JSON.stringify({ product_id, quantity }),
    }),

  update: (item_id: string, quantity: number) =>
    apiFetch<any>(`/cart/${item_id}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),

  remove: (item_id: string) =>
    apiFetch<{ message: string }>(`/cart/${item_id}`, { method: 'DELETE' }),

  clear: () =>
    apiFetch<{ message: string }>('/cart', { method: 'DELETE' }),
};

// ============================================================
// PAYMENTS API (Stripe Integration)
// ============================================================
export const paymentsApi = {
  /**
   * Create a payment intent for an order
   */
  createIntent: (amount: number, currency = 'usd', metadata?: Record<string, string>) =>
    apiFetch<{ clientSecret: string; paymentIntentId: string }>('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, metadata }),
    }),

  /**
   * Confirm a payment intent after successful payment
   */
  confirm: (paymentIntentId: string) =>
    apiFetch<{
      success: boolean;
      paymentIntentId: string;
      status: string;
      amount: number;
      currency: string;
    }>('/payments/confirm', {
      method: 'POST',
      body: JSON.stringify({ paymentIntentId }),
    }),
};

// ============================================================
// ORDERS API
// ============================================================
export const ordersApi = {
  list: (params?: { role?: string; status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return apiFetch<{ orders: any[]; pagination: any }>(`/orders${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    apiFetch<any>(`/orders/${id}`),

  create: (data: any) =>
    apiFetch<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiFetch<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// ============================================================
// MESSAGES API
// ============================================================
export const messagesApi = {
  getConversations: (page = 1, limit = 20) =>
    apiFetch<{ conversations: any[]; pagination: any }>(`/messages/conversations?page=${page}&limit=${limit}`),

  getConversation: (id: string, page = 1, limit = 50) =>
    apiFetch<{ conversation: any; messages: any[]; pagination: any }>(
      `/messages/conversations/${id}?page=${page}&limit=${limit}`
    ),

  send: (data: {
    conversation_id?: string;
    recipient_id?: string;
    product_id?: string;
    content: string;
  }) =>
    apiFetch<any>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getOrCreateConversation: (product_id: string) =>
    apiFetch<{ conversation_id: string }>('/messages/conversations/get-or-create', {
      method: 'POST',
      body: JSON.stringify({ product_id }),
    }),

  getUnreadCount: () =>
    apiFetch<{ unread_count: number }>('/messages/unread-count'),

  markAsRead: (conversation_id: string) =>
    apiFetch<{ message: string }>(`/messages/conversations/${conversation_id}/read`, {
      method: 'PUT',
    }),
};

// ============================================================
// CONVERSATIONS API (alias for messagesApi with legacy interface)
// ============================================================
export const conversationsApi = {
  list: async (authToken?: string | null) => {
    const result = await messagesApi.getConversations();
    // Transform to match expected format
    return result.conversations || [];
  },

  get: async (conversationId: string, authToken?: string | null) => {
    const result = await messagesApi.getConversation(conversationId);
    // Transform to match expected format (array of messages)
    return result.messages || [];
  },

  sendMessage: async (conversationId: string, content: string, authToken?: string | null) => {
    return messagesApi.send({
      conversation_id: conversationId,
      content,
    });
  },

  getOrCreate: async (product_id: string, authToken?: string | null) => {
    const result = await messagesApi.getOrCreateConversation(product_id);
    return result.conversation_id;
  },
};

// ============================================================
// COMMUNITY API
// ============================================================
export const communityApi = {
  list: (params?: { type?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return apiFetch<{ posts: any[]; pagination: any }>(`/community${query ? `?${query}` : ''}`);
  },

  get: (id: string) =>
    apiFetch<any>(`/community/${id}`),

  create: (data: any) =>
    apiFetch<any>('/community', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  like: (id: string) =>
    apiFetch<{ liked: boolean }>(`/community/${id}/like`, { method: 'POST' }),

  comment: (id: string, content: string) =>
    apiFetch<any>(`/community/${id}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  delete: (id: string) =>
    apiFetch<{ message: string }>(`/community/${id}`, { method: 'DELETE' }),
};

// ============================================================
// SEARCH API
// ============================================================
export const searchApi = {
  search: (params: {
    q?: string;
    type?: 'all' | 'products' | 'sales';
    category?: string;
    min_price?: number;
    max_price?: number;
    latitude?: number;
    longitude?: number;
    radius?: number;
    page?: number;
    limit?: number;
  }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    return apiFetch<{ products: any[]; sales: any[] }>(`/search?${searchParams.toString()}`);
  },

  getSuggestions: (q: string) =>
    apiFetch<Array<{ type: string; text: string }>>(`/search/suggestions?q=${encodeURIComponent(q)}`),

  getRecent: () =>
    apiFetch<any[]>('/search/recent'),

  clearRecent: () =>
    apiFetch<{ message: string }>('/search/recent', { method: 'DELETE' }),

  getSaved: () =>
    apiFetch<any[]>('/search/saved'),

  saveSearch: (name: string, search_criteria: any, notify_enabled = false) =>
    apiFetch<any>('/search/saved', {
      method: 'POST',
      body: JSON.stringify({ name, search_criteria, notify_enabled }),
    }),

  deleteSaved: (id: string) =>
    apiFetch<{ message: string }>(`/search/saved/${id}`, { method: 'DELETE' }),
};

// ============================================================
// UPLOAD API
// ============================================================
export const uploadApi = {
  uploadImage: async (file: File, bucket = 'listing-images'): Promise<{ url: string; path: string }> => {
    const formData = new FormData();
    formData.append('image', file);
    formData.append('bucket', bucket);

    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/upload/image`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  uploadImages: async (files: File[], bucket = 'listing-images'): Promise<{ uploaded: any[]; errors?: any[] }> => {
    const formData = new FormData();
    files.forEach(file => formData.append('images', file));
    formData.append('bucket', bucket);

    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/upload/images`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
  },

  uploadAvatar: async (file: File): Promise<{ url: string }> => {
    const formData = new FormData();
    formData.append('avatar', file);

    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/upload/avatar`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      // Backend returns { error: "message" } not { message: "message" }
      throw new Error(error.error || error.message || `Upload failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
};

// ============================================================
// PROFILES API
// ============================================================
export const profilesApi = {
  get: (id: string) =>
    apiFetch<any>(`/profiles/${id}`),

  update: (id: string, data: any) =>
    apiFetch<any>(`/profiles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  getProducts: (id: string, params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return apiFetch<{ products: any[]; pagination: any }>(`/profiles/${id}/products${query ? `?${query}` : ''}`);
  },

  getSales: (id: string, params?: { status?: string; page?: number; limit?: number }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) searchParams.append(key, String(value));
      });
    }
    const query = searchParams.toString();
    return apiFetch<{ sales: any[]; pagination: any }>(`/profiles/${id}/sales${query ? `?${query}` : ''}`);
  },

  getReviews: (id: string, page = 1, limit = 20) =>
    apiFetch<{ reviews: any[]; pagination: any }>(`/profiles/${id}/reviews?page=${page}&limit=${limit}`),
};

// ============================================================
// REVIEWS API
// ============================================================
export const reviewsApi = {
  getForUser: (userId: string, page = 1, limit = 20) =>
    apiFetch<{ reviews: any[]; stats: any; pagination: any }>(
      `/reviews/user/${userId}?page=${page}&limit=${limit}`
    ),

  create: (data: {
    reviewee_id: string;
    order_id?: string;
    rating: number;
    comment?: string;
  }) =>
    apiFetch<any>('/reviews', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getPending: () =>
    apiFetch<any[]>('/reviews/pending'),
};

// Default export for convenience
export default {
  auth: authApi,
  products: productsApi,
  sales: salesApi,
  ai: aiApi,
  favorites: favoritesApi,
  cart: cartApi,
  orders: ordersApi,
  messages: messagesApi,
  community: communityApi,
  search: searchApi,
  upload: uploadApi,
  profiles: profilesApi,
  reviews: reviewsApi,
};
