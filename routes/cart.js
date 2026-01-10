/**
 * ============================================================
 * CART ROUTES
 * Shopping cart management
 * ============================================================
 */

import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

/**
 * GET /api/cart
 * Get user's cart
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('cart_items')
      .select(`
        id,
        quantity,
        created_at,
        product:products(
          id, title, description, price, original_price, condition, 
          location, status, quantity as available_quantity,
          shipping_available, shipping_price,
          images:product_images(id, url, is_primary),
          seller:profiles!seller_id(id, name, avatar_url)
        )
      `)
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Calculate totals
    const items = data || [];
    const subtotal = items.reduce((sum, item) => {
      return sum + (item.product?.price || 0) * item.quantity;
    }, 0);

    const shipping = items.reduce((sum, item) => {
      return sum + (item.product?.shipping_price || 0);
    }, 0);

    res.json({
      items,
      summary: {
        item_count: items.length,
        subtotal: Math.round(subtotal * 100) / 100,
        shipping: Math.round(shipping * 100) / 100,
        total: Math.round((subtotal + shipping) * 100) / 100,
      },
    });
  } catch (error) {
    console.error('Error fetching cart:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/cart
 * Add item to cart
 */
router.post('/', requireAuth, validate(schemas.addToCart), async (req, res) => {
  try {
    const { product_id, quantity } = req.body;

    // Check product availability
    const { data: product, error: productError } = await req.supabase
      .from('products')
      .select('id, seller_id, status, quantity')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.status !== 'active') {
      return res.status(400).json({ error: 'Product is not available' });
    }

    if (product.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot add your own product to cart' });
    }

    // Check if already in cart
    const { data: existing } = await req.supabase
      .from('cart_items')
      .select('id, quantity')
      .eq('user_id', req.user.id)
      .eq('product_id', product_id)
      .single();

    if (existing) {
      // Update quantity
      const newQuantity = existing.quantity + quantity;
      if (newQuantity > product.quantity) {
        return res.status(400).json({ error: 'Requested quantity not available' });
      }

      const { data, error } = await req.supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', existing.id)
        .select(`
          id, quantity,
          product:products(id, title, price, images:product_images(url))
        `)
        .single();

      if (error) throw error;
      return res.json(data);
    }

    // Add new cart item
    if (quantity > product.quantity) {
      return res.status(400).json({ error: 'Requested quantity not available' });
    }

    const { data, error } = await req.supabase
      .from('cart_items')
      .insert({
        user_id: req.user.id,
        product_id,
        quantity,
      })
      .select(`
        id, quantity,
        product:products(id, title, price, images:product_images(url))
      `)
      .single();

    if (error) throw error;

    res.status(201).json(data);
  } catch (error) {
    console.error('Error adding to cart:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/cart/:itemId
 * Update cart item quantity
 */
router.put('/:itemId', requireAuth, validate(schemas.updateCartItem), async (req, res) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;

    // Verify ownership and get product
    const { data: cartItem } = await req.supabase
      .from('cart_items')
      .select('id, product_id, user_id')
      .eq('id', itemId)
      .single();

    if (!cartItem || cartItem.user_id !== req.user.id) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check availability
    const { data: product } = await req.supabase
      .from('products')
      .select('quantity')
      .eq('id', cartItem.product_id)
      .single();

    if (quantity > product.quantity) {
      return res.status(400).json({ error: 'Requested quantity not available' });
    }

    const { data, error } = await req.supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', itemId)
      .select(`
        id, quantity,
        product:products(id, title, price)
      `)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating cart:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/cart/:itemId
 * Remove item from cart
 */
router.delete('/:itemId', requireAuth, async (req, res) => {
  try {
    const { itemId } = req.params;

    const { error } = await req.supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Error removing from cart:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/cart
 * Clear entire cart
 */
router.delete('/', requireAuth, async (req, res) => {
  try {
    const { error } = await req.supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id);

    if (error) throw error;

    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
