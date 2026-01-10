/**
 * ============================================================
 * VALIDATION MIDDLEWARE
 * Request validation using Zod schemas
 * ============================================================
 */

import { z } from 'zod';

/**
 * Create validation middleware from a Zod schema
 * @param {z.ZodSchema} schema - Zod schema to validate against
 * @param {string} source - 'body', 'query', or 'params'
 */
export const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    try {
      const data = req[source];
      const result = schema.safeParse(data);
      
      if (!result.success) {
        const errors = result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
        }));
        
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid request data',
          details: errors,
        });
      }
      
      // Replace with parsed/transformed data
      req[source] = result.data;
      next();
    } catch (error) {
      console.error('Validation error:', error);
      return res.status(500).json({
        error: 'Validation Error',
        message: 'Failed to validate request',
      });
    }
  };
};

// ============================================================
// COMMON SCHEMAS
// ============================================================

export const schemas = {
  // UUID validation
  uuid: z.string().uuid(),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
  
  // Location
  location: z.object({
    latitude: z.coerce.number().min(-90).max(90),
    longitude: z.coerce.number().min(-180).max(180),
    radius: z.coerce.number().min(0.1).max(100).optional().default(10), // miles
  }),
  
  // Product
  createProduct: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(5000).optional(),
    price: z.coerce.number().min(0),
    original_price: z.coerce.number().min(0).optional(),
    condition: z.enum(['New', 'Like New', 'Good', 'Fair', 'Project Piece']).optional(),
    category: z.string().min(1),
    tags: z.array(z.string()).optional(),
    location: z.string().min(1),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    quantity: z.coerce.number().int().min(1).default(1),
    garage_sale_id: z.string().uuid().optional(),
    shipping_available: z.boolean().optional(),
    shipping_price: z.coerce.number().min(0).optional(),
    image_urls: z.array(z.string().url()).optional(),
  }),
  
  updateProduct: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(5000).optional(),
    price: z.coerce.number().min(0).optional(),
    original_price: z.coerce.number().min(0).optional(),
    condition: z.enum(['New', 'Like New', 'Good', 'Fair', 'Project Piece']).optional(),
    category: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    location: z.string().min(1).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    quantity: z.coerce.number().int().min(0).optional(),
    status: z.enum(['active', 'sold', 'reserved', 'deleted']).optional(),
    shipping_available: z.boolean().optional(),
    shipping_price: z.coerce.number().min(0).optional(),
  }),
  
  // Garage Sale
  createGarageSale: z.object({
    title: z.string().min(3).max(200),
    description: z.string().max(5000).optional(),
    address: z.string().min(5),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
    tags: z.array(z.string()).optional(),
    is_multi_family: z.boolean().optional(),
    items_preview: z.array(z.string()).optional(),
    image_urls: z.array(z.string().url()).optional(),
  }),
  
  updateGarageSale: z.object({
    title: z.string().min(3).max(200).optional(),
    description: z.string().max(5000).optional(),
    address: z.string().min(5).optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    end_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
    tags: z.array(z.string()).optional(),
    is_multi_family: z.boolean().optional(),
    status: z.enum(['upcoming', 'active', 'completed', 'cancelled']).optional(),
    items_preview: z.array(z.string()).optional(),
  }),
  
  // Order
  createOrder: z.object({
    seller_id: z.string().uuid(),
    items: z.array(z.object({
      product_id: z.string().uuid(),
      quantity: z.coerce.number().int().min(1).default(1),
    })).min(1),
    delivery_method: z.enum(['pickup', 'shipping', 'meetup']),
    meetup_location: z.string().optional(),
    meetup_latitude: z.coerce.number().min(-90).max(90).optional(),
    meetup_longitude: z.coerce.number().min(-180).max(180).optional(),
    meetup_time: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
    shipping_address: z.object({
      name: z.string(),
      street: z.string(),
      city: z.string(),
      state: z.string(),
      zip: z.string(),
      country: z.string().default('USA'),
    }).optional(),
  }),
  
  updateOrder: z.object({
    status: z.enum(['pending', 'confirmed', 'in_transit', 'completed', 'cancelled', 'disputed']).optional(),
    meetup_location: z.string().optional(),
    meetup_latitude: z.coerce.number().min(-90).max(90).optional(),
    meetup_longitude: z.coerce.number().min(-180).max(180).optional(),
    meetup_time: z.string().datetime().optional(),
    notes: z.string().max(1000).optional(),
    tracking_number: z.string().optional(),
  }),
  
  // Message
  sendMessage: z.object({
    conversation_id: z.string().uuid().optional(),
    recipient_id: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    content: z.string().min(1).max(5000),
  }).refine(
    data => data.conversation_id || data.recipient_id,
    { message: 'Either conversation_id or recipient_id is required' }
  ),
  
  // Community Post
  createPost: z.object({
    type: z.enum(['Free', 'Announcement', 'Event', 'Question', 'Lost & Found']),
    title: z.string().min(3).max(200),
    content: z.string().min(10).max(10000),
    location: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    image_urls: z.array(z.string().url()).optional(),
  }),
  
  // Review
  createReview: z.object({
    reviewee_id: z.string().uuid(),
    order_id: z.string().uuid().optional(),
    rating: z.coerce.number().int().min(1).max(5),
    comment: z.string().max(2000).optional(),
  }),
  
  // Profile
  updateProfile: z.object({
    name: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    location: z.string().optional(),
    avatar_url: z.string().url().optional(),
    role: z.enum(['Buyer', 'Seller', 'Collector', 'Neighbor']).optional(),
    safe_meet_only: z.boolean().optional(),
    notifications_enabled: z.boolean().optional(),
    phone: z.string().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
  }),
  
  // Cart
  addToCart: z.object({
    product_id: z.string().uuid(),
    quantity: z.coerce.number().int().min(1).default(1),
  }),
  
  updateCartItem: z.object({
    quantity: z.coerce.number().int().min(1),
  }),
  
  // AI Analysis
  analyzeImage: z.object({
    image_url: z.string().url().optional(),
    image_base64: z.string().optional(),
  }).refine(
    data => data.image_url || data.image_base64,
    { message: 'Either image_url or image_base64 is required' }
  ),
  
  // Search
  searchProducts: z.object({
    q: z.string().optional(),
    category: z.string().optional(),
    min_price: z.coerce.number().min(0).optional(),
    max_price: z.coerce.number().min(0).optional(),
    condition: z.enum(['New', 'Like New', 'Good', 'Fair', 'Project Piece']).optional(),
    is_steal: z.coerce.boolean().optional(),
    latitude: z.coerce.number().min(-90).max(90).optional(),
    longitude: z.coerce.number().min(-180).max(180).optional(),
    radius: z.coerce.number().min(0.1).max(100).optional(),
    sort_by: z.enum(['created_at', 'price', 'distance']).optional().default('created_at'),
    sort_order: z.enum(['asc', 'desc']).optional().default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

export default { validate, schemas };
