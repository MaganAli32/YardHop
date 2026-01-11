/**
 * ============================================================
 * ORDERS ROUTES
 * Order management and transactions
 * ============================================================
 */

import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';

const router = express.Router();

// Initialize Stripe for payment verification
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' }) : null;

/**
 * GET /api/orders
 * Get user's orders (as buyer or seller)
 */
router.get('/', requireAuth, async (req, res) => {
  try {
    const { role = 'all', status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    let query = req.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!buyer_id(id, name, avatar_url),
        seller:profiles!seller_id(id, name, avatar_url),
        items:order_items(
          id, quantity, price_at_purchase,
          product:products(id, title, images:product_images(url))
        )
      `, { count: 'exact' });

    // Filter by role
    if (role === 'buyer') {
      query = query.eq('buyer_id', req.user.id);
    } else if (role === 'seller') {
      query = query.eq('seller_id', req.user.id);
    } else {
      query = query.or(`buyer_id.eq.${req.user.id},seller_id.eq.${req.user.id}`);
    }

    // Filter by status
    if (status) {
      query = query.eq('status', status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      orders: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/orders/:id
 * Get single order details
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!buyer_id(id, name, avatar_url, phone, email),
        seller:profiles!seller_id(id, name, avatar_url, phone, email),
        items:order_items(
          id, quantity, price_at_purchase,
          product:products(
            id, title, description, condition, location,
            images:product_images(url)
          )
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Order not found' });
      }
      throw error;
    }

    // Verify user is buyer or seller
    if (data.buyer_id !== req.user.id && data.seller_id !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view this order' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/orders
 * Create new order
 */
router.post('/', requireAuth, validate(schemas.createOrder), async (req, res) => {
  try {
    const {
      seller_id,
      items,
      delivery_method = 'pickup',
      meetup_location,
      meetup_latitude,
      meetup_longitude,
      meetup_time,
      notes,
      shipping_address,
      billing_address,
      // Payment information
      payment_intent_id,
      payment_method_id,
      stripe_customer_id,
    } = req.body;

    // Validate payment was processed
    if (!payment_intent_id) {
      return res.status(400).json({ 
        error: 'Payment Required',
        message: 'Payment must be processed before creating order' 
      });
    }

    // Verify payment intent with Stripe before creating order
    // Payment verification is REQUIRED - orders cannot be created without successful payment
    if (!stripe) {
      return res.status(503).json({
        error: 'Payment Service Unavailable',
        message: 'Payment processing is not configured. Please set STRIPE_SECRET_KEY or STRIPE_SECRET_KEY_TEST in your environment variables.'
      });
    }

    let paymentIntent = null;
    try {
      paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id);
      
      // Verify payment belongs to this user
      if (paymentIntent.metadata.user_id !== req.user.id) {
        return res.status(403).json({
          error: 'Authorization Error',
          message: 'Payment intent does not belong to this user'
        });
      }

      // Verify payment succeeded
      if (paymentIntent.status !== 'succeeded') {
        return res.status(400).json({
          error: 'Payment Not Completed',
          message: `Payment status is ${paymentIntent.status}, expected succeeded`,
          status: paymentIntent.status,
        });
      }
    } catch (stripeError) {
      console.error('Error verifying payment intent:', stripeError);
      return res.status(400).json({
        error: 'Payment Verification Failed',
        message: stripeError.message || 'Failed to verify payment intent'
      });
    }

    if (seller_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot create order with yourself' });
    }

    // Validate items and calculate total
    let total = 0;
    let shippingTotal = 0;
    const orderItems = [];

    for (const item of items) {
      const { data: product, error } = await req.supabase
        .from('products')
        .select('id, title, price, quantity, status, seller_id, shipping_price')
        .eq('id', item.product_id)
        .single();

      if (error || !product) {
        return res.status(400).json({ error: `Product ${item.product_id} not found` });
      }

      if (product.status !== 'active') {
        return res.status(400).json({ error: `Product "${product.title}" is no longer available` });
      }

      if (product.seller_id !== seller_id) {
        return res.status(400).json({ error: 'All items must be from the same seller' });
      }

      if (item.quantity > product.quantity) {
        return res.status(400).json({ error: `Not enough quantity for "${product.title}"` });
      }

      total += product.price * item.quantity;
      if (delivery_method === 'shipping' && product.shipping_price) {
        shippingTotal += (product.shipping_price || 0);
      }

      orderItems.push({
        product_id: product.id,
        quantity: item.quantity,
        price_at_purchase: product.price,
      });
    }

    // Calculate tax (8.25% local tax)
    const taxRate = 0.0825;
    const taxAmount = total * taxRate;
    const finalTotal = total + shippingTotal + taxAmount;

    // Verify payment amount matches order total (if we have payment intent)
    if (stripe && paymentIntent) {
      const paymentAmountInCents = paymentIntent.amount;
      const expectedAmountInCents = Math.round(finalTotal * 100);
      
      // Allow small rounding differences (1 cent)
      if (Math.abs(paymentAmountInCents - expectedAmountInCents) > 1) {
        return res.status(400).json({
          error: 'Payment Amount Mismatch',
          message: `Payment amount ($${(paymentAmountInCents / 100).toFixed(2)}) does not match order total ($${finalTotal.toFixed(2)})`,
        });
      }
    }

    // Create order with payment information
    const orderData = {
      buyer_id: req.user.id,
      seller_id,
      status: 'pending',
      total_amount: finalTotal,
      shipping_amount: shippingTotal,
      tax_amount: taxAmount,
      delivery_method: delivery_method || 'pickup',
      meetup_location,
      meetup_latitude,
      meetup_longitude,
      meetup_time,
      notes,
      // Payment information
      payment_intent_id,
      payment_method_id: payment_method_id || null,
      stripe_customer_id: stripe_customer_id || null,
      payment_status: 'succeeded', // Payment already verified above
    };

    // Add addresses if provided (Supabase handles JSONB conversion automatically)
    if (shipping_address) {
      orderData.shipping_address = typeof shipping_address === 'string' 
        ? JSON.parse(shipping_address) 
        : shipping_address;
    }
    if (billing_address) {
      orderData.billing_address = typeof billing_address === 'string' 
        ? JSON.parse(billing_address) 
        : billing_address;
    }

    // Add Stripe payment ID if we have payment intent
    if (paymentIntent && paymentIntent.latest_charge) {
      orderData.stripe_payment_id = typeof paymentIntent.latest_charge === 'string' 
        ? paymentIntent.latest_charge 
        : paymentIntent.latest_charge.id;
    }

    const { data: order, error: orderError } = await req.supabase
      .from('orders')
      .insert(orderData)
      .select()
      .single();

    if (orderError) throw orderError;

    // Create order items
    const itemsWithOrderId = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await req.supabase
      .from('order_items')
      .insert(itemsWithOrderId);

    if (itemsError) throw itemsError;

    // Update product quantities and status
    for (const item of orderItems) {
      const { data: product } = await req.supabase
        .from('products')
        .select('quantity')
        .eq('id', item.product_id)
        .single();

      const newQuantity = product.quantity - item.quantity;
      await req.supabase
        .from('products')
        .update({
          quantity: newQuantity,
          status: newQuantity === 0 ? 'reserved' : 'active',
        })
        .eq('id', item.product_id);
    }

    // Clear purchased items from cart
    await req.supabase
      .from('cart_items')
      .delete()
      .eq('user_id', req.user.id)
      .in('product_id', orderItems.map(i => i.product_id));

    // Fetch complete order
    const { data: completeOrder } = await req.supabase
      .from('orders')
      .select(`
        *,
        buyer:profiles!buyer_id(id, name, avatar_url),
        seller:profiles!seller_id(id, name, avatar_url),
        items:order_items(
          id, quantity, price_at_purchase,
          product:products(id, title, images:product_images(url))
        )
      `)
      .eq('id', order.id)
      .single();

    res.status(201).json(completeOrder);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/orders/:id
 * Update order status or details
 */
router.put('/:id', requireAuth, validate(schemas.updateOrder), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Get existing order
    const { data: existing } = await req.supabase
      .from('orders')
      .select('buyer_id, seller_id, status')
      .eq('id', id)
      .single();

    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const isBuyer = existing.buyer_id === req.user.id;
    const isSeller = existing.seller_id === req.user.id;

    if (!isBuyer && !isSeller) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Validate status transitions
    if (updates.status) {
      const validTransitions = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['in_transit', 'completed', 'cancelled'],
        in_transit: ['completed', 'disputed'],
        completed: [],
        cancelled: [],
        disputed: ['completed', 'cancelled'],
      };

      if (!validTransitions[existing.status]?.includes(updates.status)) {
        return res.status(400).json({
          error: `Cannot change status from ${existing.status} to ${updates.status}`,
        });
      }

      // Only seller can confirm
      if (updates.status === 'confirmed' && !isSeller) {
        return res.status(403).json({ error: 'Only seller can confirm orders' });
      }

      // Handle completion - update product status
      if (updates.status === 'completed') {
        const { data: orderItems } = await req.supabase
          .from('order_items')
          .select('product_id')
          .eq('order_id', id);

        for (const item of orderItems || []) {
          await req.supabase
            .from('products')
            .update({ status: 'sold' })
            .eq('id', item.product_id);
        }
      }

      // Handle cancellation - restore product quantities
      if (updates.status === 'cancelled') {
        const { data: orderItems } = await req.supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', id);

        for (const item of orderItems || []) {
          const { data: product } = await req.supabase
            .from('products')
            .select('quantity')
            .eq('id', item.product_id)
            .single();

          await req.supabase
            .from('products')
            .update({
              quantity: product.quantity + item.quantity,
              status: 'active',
            })
            .eq('id', item.product_id);
        }
      }
    }

    const { data, error } = await req.supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        buyer:profiles!buyer_id(id, name, avatar_url),
        seller:profiles!seller_id(id, name, avatar_url),
        items:order_items(id, quantity, price_at_purchase, product:products(id, title))
      `)
      .single();

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
