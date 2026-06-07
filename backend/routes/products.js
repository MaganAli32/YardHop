/**
 * ============================================================
 * PRODUCTS ROUTES
 * CRUD operations for product listings
 * ============================================================
 */

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { standardLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

/**
 * Helper to extract primary image URL from images array
 */
function getPrimaryImage(images) {
  if (!images || !Array.isArray(images) || images.length === 0) {
    return null;
  }
  
  // Sort by is_primary first, then by order_index
  const sorted = [...images].sort((a, b) => {
    if (a?.is_primary && !b?.is_primary) return -1;
    if (!a?.is_primary && b?.is_primary) return 1;
    return (a?.order_index || 0) - (b?.order_index || 0);
  });
  
  const first = sorted[0];
  
  // If it's a string
  if (typeof first === 'string') {
    return first;
  }
  
  // If it's an object with url property
  if (first && typeof first === 'object' && first.url) {
    return first.url;
  }
  
  return null;
}

/**
 * Add image convenience field to a product
 */
function addImageField(product) {
  if (!product) return product;
  
  const primaryImage = getPrimaryImage(product.images);
  return { ...product, image: primaryImage };
}

/**
 * GET /api/products
 * List products with filters
 */
router.get('/', optionalAuth, standardLimiter, async (req, res) => {
  try {
    if (!req.supabase) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const {
      q,
      category,
      min_price,
      max_price,
      condition,
      is_steal,
      latitude,
      longitude,
      radius = 25,
      sort_by = 'newest',
      sort_order = 'desc',
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = req.supabase
      .from('products')
      .select(`
        *,
        seller:profiles!seller_id(id, name, avatar_url),
        images:product_images(id, url, is_primary, order_index)
      `, { count: 'exact' })
      .eq('status', 'active');

    // Text search
    if (q) {
      query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    }

    // Category filter
    if (category) {
      query = query.contains('tags', [category]);
    }

    // Price range
    if (min_price) {
      query = query.gte('price', parseFloat(min_price));
    }
    if (max_price) {
      query = query.lte('price', parseFloat(max_price));
    }

    // Condition filter
    if (condition) {
      query = query.eq('condition', condition);
    }

    // Steal filter
    if (is_steal === 'true') {
      query = query.eq('is_steal', true);
    }

    // Sorting
    const sortColumn = sort_by === 'price' ? 'price' : 
                       sort_by === 'oldest' ? 'created_at' : 'created_at';
    const ascending = sort_by === 'oldest' || sort_order === 'asc';
    query = query.order(sortColumn, { ascending });

    // Pagination
    query = query.range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    // If images are missing from nested query, fetch them directly
    // This is a workaround for RLS issues with nested queries
    if (data && data.length > 0) {
      const productsWithoutImages = data.filter(p => !p.images || p.images.length === 0);
      
      if (productsWithoutImages.length > 0 && process.env.NODE_ENV === 'development') {
        console.log(`⚠️ ${productsWithoutImages.length} products missing images from nested query`);
      }
      
      // Fetch images directly for products that don't have them
      for (const product of productsWithoutImages) {
        try {
          const { data: directImages } = await req.supabase
            .from('product_images')
            .select('id, url, is_primary, order_index')
            .eq('product_id', product.id)
            .order('is_primary', { ascending: false })
            .order('order_index', { ascending: true });
          
          if (directImages && directImages.length > 0) {
            product.images = directImages;
            if (process.env.NODE_ENV === 'development') {
              console.log(`✅ Fetched ${directImages.length} images directly for product ${product.id}`);
            }
          }
        } catch (imgErr) {
          console.error(`Error fetching images for product ${product.id}:`, imgErr);
        }
      }
    }

    // Debug: Log first product's images to see if they're being fetched
    if (data && data.length > 0 && process.env.NODE_ENV === 'development') {
      console.log('First product images:', JSON.stringify(data[0]?.images, null, 2));
      console.log('First product image field:', data[0]?.image);
    }

    // Add image convenience field to each product
    const products = (data || []).map(addImageField);

    res.json({
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/:id
 * Get single product details
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    if (!req.supabase) {
      return res.status(500).json({ error: 'Database connection unavailable' });
    }

    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('products')
      .select(`
        *,
        seller:profiles!seller_id(id, name, avatar_url, bio, created_at),
        images:product_images(id, url, is_primary, order_index)
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Product not found' });
      }
      throw error;
    }

    // Debug: Check if images were fetched
    console.log(`📦 Product ${id} - Images from nested query:`, JSON.stringify(data?.images, null, 2));
    
    // If images array is empty, try fetching directly (workaround for nested query issues)
    if (!data?.images || data.images.length === 0) {
      console.log(`⚠️ Product ${id} - No images in nested query, fetching directly...`);
      const { data: directImages, error: imgError } = await req.supabase
        .from('product_images')
        .select('id, url, is_primary, order_index')
        .eq('product_id', id)
        .order('is_primary', { ascending: false })
        .order('order_index', { ascending: true });
      
      if (imgError) {
        console.error(`❌ Product ${id} - Error fetching images directly:`, imgError);
        console.error('   Error details:', JSON.stringify(imgError, null, 2));
      } else {
        console.log(`✅ Product ${id} - Found ${directImages?.length || 0} images via direct query`);
        if (directImages && directImages.length > 0) {
          console.log('   Image URLs:', directImages.map(img => img.url));
          // Attach images if found
          data.images = directImages;
        } else {
          console.log(`   ⚠️ Product ${id} - No images found in database`);
          // Check if images exist at all for this product
          const { count, error: countError } = await req.supabase
            .from('product_images')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', id);
          
          if (countError) {
            console.error(`   ❌ Error counting images:`, countError);
          } else {
            console.log(`   Database check: ${count || 0} images exist for product ${id}`);
          }
        }
      }
    }

    // Increment view count
    try {
      await req.supabase
        .from('products')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', id);
    } catch (viewErr) {
      console.warn('Could not update view count:', viewErr.message);
    }

    // Add image convenience field
    const productWithImage = addImageField(data);

    res.json(productWithImage);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products
 * Create new product
 */
router.post('/', requireAuth, validate(schemas.createProduct), async (req, res) => {
  try {
    const { image_urls, ...productData } = req.body;

    // Create product
    const { data: product, error } = await req.supabase
      .from('products')
      .insert({
        ...productData,
        seller_id: req.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add images if provided
    if (image_urls && image_urls.length > 0) {
      const images = image_urls.map((url, index) => ({
        product_id: product.id,
        url,
        is_primary: index === 0,
        order_index: index,
      }));

      const { data: insertedImages, error: imgError } = await req.supabase
        .from('product_images')
        .insert(images)
        .select();
      
      if (imgError) {
        console.error('❌ Error inserting product images:', imgError);
        console.error('   Image URLs:', image_urls);
        console.error('   Product ID:', product.id);
        console.error('   Full error:', JSON.stringify(imgError, null, 2));
        // Don't fail the request, but log the error for debugging
      } else {
        console.log(`✅ Successfully inserted ${insertedImages?.length || 0} images for product ${product.id}`);
        if (insertedImages && insertedImages.length > 0) {
          console.log('   Image URLs:', insertedImages.map(img => img.url));
        }
      }
    }

    // Fetch complete product with relations
    const { data: completeProduct, error: fetchError } = await req.supabase
      .from('products')
      .select(`
        *,
        seller:profiles!seller_id(id, name, avatar_url),
        images:product_images(id, url, is_primary, order_index)
      `)
      .eq('id', product.id)
      .single();

    if (fetchError) {
      console.error('Error fetching created product:', fetchError);
      // Still return the product even if fetch fails
      const productWithImage = addImageField(product);
      return res.status(201).json(productWithImage);
    }

    // Debug: Log images to verify they're being fetched
    if (process.env.NODE_ENV === 'development') {
      console.log('Product images after creation:', JSON.stringify(completeProduct?.images, null, 2));
    }

    // Add image convenience field
    const productWithImage = addImageField(completeProduct);

    res.status(201).json(productWithImage);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/products/:id
 * Update product
 */
router.put('/:id', requireAuth, validate(schemas.updateProduct), async (req, res) => {
  try {
    const { id } = req.params;
    const { image_urls, ...updates } = req.body;

    // Verify ownership
    const { data: existing } = await req.supabase
      .from('products')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this product' });
    }

    // Update product
    const { error: updateError } = await req.supabase
      .from('products')
      .update(updates)
      .eq('id', id);

    if (updateError) throw updateError;

    // Handle image updates if provided
    if (image_urls && Array.isArray(image_urls)) {
      // Delete existing images
      await req.supabase
        .from('product_images')
        .delete()
        .eq('product_id', id);

      // Insert new images
      if (image_urls.length > 0) {
        const images = image_urls.map((url, index) => ({
          product_id: id,
          url,
          is_primary: index === 0,
          order_index: index,
        }));

        await req.supabase.from('product_images').insert(images);
      }
    }

    // Fetch updated product with relations
    const { data, error } = await req.supabase
      .from('products')
      .select(`
        *,
        seller:profiles!seller_id(id, name, avatar_url),
        images:product_images(id, url, is_primary, order_index)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;

    // Add image convenience field
    const productWithImage = addImageField(data);

    res.json(productWithImage);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/products/:id
 * Delete product (soft delete)
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Verify ownership
    const { data: existing } = await req.supabase
      .from('products')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this product' });
    }

    // Soft delete
    const { error } = await req.supabase
      .from('products')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/user/:userId
 * Get products by user
 */
router.get('/user/:userId', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.query;

    let query = req.supabase
      .from('products')
      .select(`
        *,
        images:product_images(id, url, is_primary, order_index)
      `)
      .eq('seller_id', userId)
      .order('created_at', { ascending: false });

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    } else if (req.user?.id !== userId) {
      // Only show active items to others
      query = query.eq('status', 'active');
    } else {
      // Show active and reserved to the owner
      query = query.in('status', ['active', 'reserved']);
    }

    const { data, error } = await query;

    if (error) throw error;

    // Add image convenience field to each product
    const products = (data || []).map(addImageField);

    res.json(products);
  } catch (error) {
    console.error('Error fetching user products:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/products/:id/images
 * Add images to product
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
      .from('products')
      .select('seller_id')
      .eq('id', id)
      .single();

    if (!existing || existing.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get current max order index
    const { data: currentImages } = await req.supabase
      .from('product_images')
      .select('order_index')
      .eq('product_id', id)
      .order('order_index', { ascending: false })
      .limit(1);

    const startIndex = (currentImages?.[0]?.order_index ?? -1) + 1;

    const images = urls.map((url, index) => ({
      product_id: id,
      url,
      is_primary: startIndex === 0 && index === 0,
      order_index: startIndex + index,
    }));

    const { data, error } = await req.supabase
      .from('product_images')
      .insert(images)
      .select();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding images:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
