/**
 * ============================================================
 * GARAGE SALES ROUTES
 * CRUD operations for garage sale events
 * ============================================================
 */

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { standardLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Helper function to calculate distance
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 3959; // Earth's radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Helper to extract primary image URL from images array
 */
function getPrimaryImage(images) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }
  // Sort by order_index first, then find primary or use first
  const sorted = [...images].sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
  const primary = sorted.find(img => img.is_primary);
  return primary?.url || sorted[0]?.url || null;
}

/**
 * GET /api/sales
 * List garage sales with filters
 */
router.get('/', optionalAuth, standardLimiter, async (req, res) => {
  try {
    const {
      date,
      latitude,
      longitude,
      radius = 25,
      status,
      is_multi_family,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Query without rating_average to avoid errors if column doesn't exist
    // Note: Products are not included in list view to avoid relationship ambiguity
    // Products are loaded separately in the detail view where they're actually needed
    let query = req.supabase
      .from('garage_sales')
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        images:garage_sale_images(id, url, is_primary, order_index)
      `, { count: 'exact' })
      .in('status', status ? [status] : ['upcoming', 'active']);

    // Date filter
    if (date) {
      query = query.eq('start_date', date);
    } else {
      // Default to upcoming sales
      const today = new Date().toISOString().split('T')[0];
      query = query.gte('start_date', today);
    }

    // Multi-family filter
    if (is_multi_family !== undefined) {
      query = query.eq('is_multi_family', is_multi_family === 'true');
    }

    // Order by date
    query = query.order('start_date', { ascending: true });
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Calculate distance and filter by radius if location provided
    // Also add image convenience field
    let sales = (data || []).map(sale => {
      const primaryImage = getPrimaryImage(sale.images);
      return { ...sale, image: primaryImage };
    });
    
    if (latitude && longitude) {
      sales = sales.map(sale => {
        if (sale.latitude && sale.longitude) {
          const distance = calculateDistance(
            parseFloat(latitude), parseFloat(longitude),
            sale.latitude, sale.longitude
          );
          return { ...sale, distance: Math.round(distance * 10) / 10 };
        }
        return sale;
      });

      // Filter by radius
      if (radius) {
        sales = sales.filter(s => !s.distance || s.distance <= parseFloat(radius));
      }

      // Sort by distance
      sales.sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));
    }

    res.json({
      sales,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching garage sales:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sales/user/:userId
 * Get garage sales by user
 * IMPORTANT: Must be BEFORE /:id route!
 */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = req.supabase
      .from('garage_sales')
      .select(`
        *,
        images:garage_sale_images(id, url, is_primary, order_index),
        products:products!garage_sale_id(count)
      `)
      .eq('host_id', userId)
      .order('start_date', { ascending: false });

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    } else if (req.user?.id !== userId) {
      // Only show upcoming/active to others
      query = query.in('status', ['upcoming', 'active']);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Add image convenience field
    const sales = (data || []).map(sale => {
      const primaryImage = getPrimaryImage(sale.images);
      return { ...sale, image: primaryImage };
    });

    res.json(sales);
  } catch (error) {
    console.error('Error fetching user garage sales:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sales/:id
 * Get single garage sale details
 * IMPORTANT: Must be AFTER /user/:userId route!
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate UUID format (basic check - UUIDs are 36 chars with hyphens)
    // This prevents PostgreSQL errors when invalid IDs like "s1" are used
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(404).json({ error: 'Garage sale not found' });
    }

    const { data, error } = await req.supabase
      .from('garage_sales')
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url, bio, created_at),
        images:garage_sale_images(id, url, is_primary, order_index),
        products:products!garage_sale_id(
          id, title, description, price, original_price, market_average, 
          is_steal, steal_percentage, condition, category,
          images:product_images(id, url, is_primary, order_index)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Garage sale not found' });
      }
      // Handle UUID format errors from PostgreSQL
      if (error.message && error.message.includes('invalid input syntax for type uuid')) {
        return res.status(404).json({ error: 'Garage sale not found' });
      }
      throw error;
    }

    // Increment view count (don't fail if column doesn't exist)
    try {
      await req.supabase
        .from('garage_sales')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);
    } catch (viewErr) {
      console.warn('Could not update view count:', viewErr.message);
    }

    // Add image convenience field for the sale
    const primaryImage = getPrimaryImage(data.images);
    
    // Also add image convenience field for each product
    const productsWithImages = (data.products || []).map(product => {
      const productImage = getPrimaryImage(product.images);
      return { ...product, image: productImage };
    });

    const saleWithImage = { 
      ...data, 
      image: primaryImage,
      products: productsWithImages
    };

    res.json(saleWithImage);
  } catch (error) {
    console.error('Error fetching garage sale:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sales
 * Create new garage sale
 */
router.post('/', requireAuth, validate(schemas.createGarageSale), async (req, res) => {
  try {
    const { image_urls, ...saleData } = req.body;

    console.log('[GarageSale Create] Received payload:', {
      title: saleData.title,
      address: saleData.address,
      imageCount: image_urls?.length || 0,
      imageUrls: image_urls,
      userId: req.user.id,
    });

    // Create garage sale
    const { data: sale, error } = await req.supabase
      .from('garage_sales')
      .insert({
        ...saleData,
        host_id: req.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[GarageSale Create] Error inserting sale:', error);
      throw error;
    }

    console.log('[GarageSale Create] Sale created with ID:', sale.id);

    // Add images if provided
    if (image_urls && image_urls.length > 0) {
      console.log(`[GarageSale Create] Inserting ${image_urls.length} images...`);
      
      const images = image_urls.map((url, index) => ({
        garage_sale_id: sale.id,
        url,
        is_primary: index === 0,
        order_index: index,
      }));

      console.log('[GarageSale Create] Image records to insert:', images);

      const { data: insertedImages, error: imgError } = await req.supabase
        .from('garage_sale_images')
        .insert(images)
        .select();

      if (imgError) {
        console.error('[GarageSale Create] Error inserting garage sale images:', {
          error: imgError.message,
          code: imgError.code,
          details: imgError.details,
          hint: imgError.hint,
          imagesAttempted: images,
        });
        // Don't throw - continue even if images fail
      } else {
        console.log(`[GarageSale Create] Successfully inserted ${insertedImages?.length || 0} images:`, insertedImages);
      }
    } else {
      console.log('[GarageSale Create] No images provided');
    }

    // Fetch complete sale with relations
    console.log('[GarageSale Create] Fetching complete sale with relations...');
    const { data: completeSale, error: fetchError } = await req.supabase
      .from('garage_sales')
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        images:garage_sale_images(id, url, is_primary, order_index)
      `)
      .eq('id', sale.id)
      .single();

    if (fetchError) {
      console.error('[GarageSale Create] Error fetching complete sale:', fetchError);
      throw fetchError;
    }

    console.log('[GarageSale Create] Complete sale fetched:', {
      id: completeSale.id,
      title: completeSale.title,
      imageCount: completeSale.images?.length || 0,
      images: completeSale.images,
    });

    // Add image convenience field
    const primaryImage = getPrimaryImage(completeSale?.images);
    console.log('[GarageSale Create] Primary image extracted:', primaryImage);
    
    const saleWithImage = { ...completeSale, image: primaryImage };

    res.status(201).json(saleWithImage);
  } catch (error) {
    console.error('[GarageSale Create] Error creating garage sale:', {
      error: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack,
      payload: req.body ? { ...req.body, image_urls: req.body.image_urls?.length ? `[${req.body.image_urls.length} URLs]` : req.body.image_urls } : undefined,
    });
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/sales/:id
 * Update garage sale
 */
router.put('/:id', requireAuth, validate(schemas.updateGarageSale), async (req, res) => {
  try {
    const { id } = req.params;
    const { image_urls, ...updates } = req.body;

    // Verify ownership
    const { data: existing } = await req.supabase
      .from('garage_sales')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Garage sale not found' });
    }

    if (existing.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this garage sale' });
    }

    // Update the garage sale
    const { error: updateError } = await req.supabase
      .from('garage_sales')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    // Handle image updates if provided
    if (image_urls && Array.isArray(image_urls)) {
      // Delete existing images
      await req.supabase
        .from('garage_sale_images')
        .delete()
        .eq('garage_sale_id', id);

      // Insert new images
      if (image_urls.length > 0) {
        const images = image_urls.map((url, index) => ({
          garage_sale_id: id,
          url,
          is_primary: index === 0,
          order_index: index,
        }));

        await req.supabase.from('garage_sale_images').insert(images);
      }
    }

    // Fetch updated sale with relations
    const { data, error } = await req.supabase
      .from('garage_sales')
      .select(`
        *,
        host:profiles!host_id(id, name, avatar_url),
        images:garage_sale_images(id, url, is_primary, order_index)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Add image convenience field
    const primaryImage = getPrimaryImage(data?.images);
    const saleWithImage = { ...data, image: primaryImage };

    res.json(saleWithImage);
  } catch (error) {
    console.error('Error updating garage sale:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/sales/:id
 * Delete/cancel garage sale
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await req.supabase
      .from('garage_sales')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Garage sale not found' });
    }

    if (existing.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this garage sale' });
    }

    // Soft delete by setting status to cancelled
    const { error } = await req.supabase
      .from('garage_sales')
      .update({ status: 'cancelled' })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Garage sale cancelled successfully' });
  } catch (error) {
    console.error('Error deleting garage sale:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sales/:id/images
 * Add images to garage sale
 */
router.post('/:id/images', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { urls } = req.body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return res.status(400).json({ error: 'Image URLs array is required' });
    }

    // Verify ownership
    const { data: existing } = await req.supabase
      .from('garage_sales')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!existing || existing.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get current max order index
    const { data: currentImages } = await req.supabase
      .from('garage_sale_images')
      .select('order_index')
      .eq('garage_sale_id', id)
      .order('order_index', { ascending: false })
      .limit(1);

    const startIndex = (currentImages?.[0]?.order_index ?? -1) + 1;

    const images = urls.map((url, index) => ({
      garage_sale_id: id,
      url,
      is_primary: startIndex === 0 && index === 0, // Only first image is primary if no existing images
      order_index: startIndex + index,
    }));

    const { data, error } = await req.supabase
      .from('garage_sale_images')
      .insert(images)
      .select();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding images:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sales/:id/products
 * Add product to garage sale
 */
router.post('/:id/products', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_id } = req.body;

    // Verify garage sale ownership
    const { data: sale } = await req.supabase
      .from('garage_sales')
      .select('host_id')
      .eq('id', id)
      .single();

    if (!sale || sale.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Verify product ownership
    const { data: product } = await req.supabase
      .from('products')
      .select('seller_id')
      .eq('id', product_id)
      .single();

    if (!product || product.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to add this product' });
    }

    // Link product to garage sale
    const { data, error } = await req.supabase
      .from('products')
      .update({ garage_sale_id: id })
      .eq('id', product_id)
      .select()
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error adding product to garage sale:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
