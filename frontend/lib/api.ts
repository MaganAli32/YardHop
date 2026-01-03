// API client for YardHop backend
const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

interface RequestOptions extends RequestInit {
  token?: string | null;
}

// Get auth token from Supabase session
async function getAuthToken(): Promise<string | null> {
  try {
    const { supabase } = await import('./supabase');
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    return null;
  }
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  let { token, ...fetchOptions } = options;
  
  // Auto-get token if not provided
  if (!token) {
    token = await getAuthToken();
  }

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }

  return response.json();
}

// Products API
export const productsApi = {
  list: async (params?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    isSteal?: boolean;
    lat?: number;
    lng?: number;
    radius?: number;
    sortBy?: 'price' | 'distance' | 'newest';
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set('category', params.category);
    if (params?.minPrice) searchParams.set('minPrice', params.minPrice.toString());
    if (params?.maxPrice) searchParams.set('maxPrice', params.maxPrice.toString());
    if (params?.isSteal) searchParams.set('isSteal', 'true');
    if (params?.lat) searchParams.set('lat', params.lat.toString());
    if (params?.lng) searchParams.set('lng', params.lng.toString());
    if (params?.radius) searchParams.set('radius', params.radius.toString());
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);

    const query = searchParams.toString();
    return apiRequest(`/products${query ? `?${query}` : ''}`);
  },

  get: async (id: string) => {
    return apiRequest(`/products/${id}`);
  },

  create: async (product: any, token?: string | null) => {
    return apiRequest('/products', {
      method: 'POST',
      body: JSON.stringify(product),
      token,
    });
  },

  update: async (id: string, updates: any, token?: string | null) => {
    return apiRequest(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
      token,
    });
  },

  delete: async (id: string, token?: string | null) => {
    return apiRequest(`/products/${id}`, {
      method: 'DELETE',
      token,
    });
  },
};

// AI API
export const aiApi = {
  analyzeImage: async (imageBase64: string, mimeType?: string, token?: string) => {
    return apiRequest('/ai/analyze-image', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
      token,
    });
  },

  suggestPrice: async (
    title: string,
    description?: string,
    condition?: string,
    category?: string,
    token?: string
  ) => {
    return apiRequest('/ai/suggest-price', {
      method: 'POST',
      body: JSON.stringify({ title, description, condition, category }),
      token,
    });
  },

  generateDescription: async (imageBase64: string, mimeType?: string, token?: string) => {
    return apiRequest('/ai/generate-description', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, mimeType }),
      token,
    });
  },
};

// Upload API
export const uploadApi = {
  uploadImage: async (imageBase64: string, bucket: string, fileName?: string, token?: string | null) => {
    return apiRequest('/upload', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, bucket, fileName }),
      token,
    });
  },
};

// Garage Sales API
export const salesApi = {
  list: async (params?: { date?: string; lat?: number; lng?: number; radius?: number }) => {
    const searchParams = new URLSearchParams();
    if (params?.date) searchParams.set('date', params.date);
    if (params?.lat) searchParams.set('lat', params.lat.toString());
    if (params?.lng) searchParams.set('lng', params.lng.toString());
    if (params?.radius) searchParams.set('radius', params.radius.toString());

    const query = searchParams.toString();
    return apiRequest(`/sales${query ? `?${query}` : ''}`);
  },

  get: async (id: string) => {
    return apiRequest(`/sales/${id}`);
  },

  create: async (sale: any, token?: string | null) => {
    return apiRequest('/sales', {
      method: 'POST',
      body: JSON.stringify(sale),
      token,
    });
  },
};

// Favorites API
export const favoritesApi = {
  list: async (token?: string | null) => {
    return apiRequest('/favorites', { token });
  },

  add: async (productId: string, token?: string | null) => {
    return apiRequest(`/favorites/${productId}`, {
      method: 'POST',
      token,
    });
  },

  remove: async (productId: string, token?: string | null) => {
    return apiRequest(`/favorites/${productId}`, {
      method: 'DELETE',
      token,
    });
  },
};

// Cart API
export const cartApi = {
  list: async (token?: string | null) => {
    return apiRequest('/cart', { token });
  },

  add: async (productId: string, quantity: number = 1, token?: string | null) => {
    return apiRequest(`/cart/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ quantity }),
      token,
    });
  },

  remove: async (productId: string, token?: string | null) => {
    return apiRequest(`/cart/${productId}`, {
      method: 'DELETE',
      token,
    });
  },
};

// Orders API
export const ordersApi = {
  list: async (token?: string | null) => {
    return apiRequest('/orders', { token });
  },

  create: async (order: any, token?: string | null) => {
    return apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(order),
      token,
    });
  },
};

// Conversations/Messaging API
export const conversationsApi = {
  list: async (token?: string | null) => {
    return apiRequest('/conversations', { token });
  },

  get: async (id: string, token?: string | null) => {
    return apiRequest(`/conversations/${id}`, { token });
  },

  sendMessage: async (conversationId: string, content: string, token?: string | null) => {
    return apiRequest(`/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
      token,
    });
  },
};

// Community API
export const communityApi = {
  list: async (params?: { type?: string }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);

    const query = searchParams.toString();
    return apiRequest(`/community${query ? `?${query}` : ''}`);
  },

  create: async (post: any, token?: string | null) => {
    return apiRequest('/community', {
      method: 'POST',
      body: JSON.stringify(post),
      token,
    });
  },
};

