/**
 * ============================================================
 * PAYMENT ROUTES
 * Stripe payment integration for order processing
 * ============================================================
 */

import express from 'express';
import Stripe from 'stripe';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Initialize Stripe with secret key from environment
const stripeSecretKey = process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_TEST;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2024-12-18.acacia' }) : null;

/**
 * POST /api/payments/create-intent
 * Create a Stripe Payment Intent for an order
 */
router.post('/create-intent', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Payment Service Unavailable',
        message: 'Stripe is not configured. Please set STRIPE_SECRET_KEY in your .env file.',
      });
    }

    const { amount, currency = 'usd', metadata = {} } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be greater than 0',
      });
    }

    // Validate amount is in cents (Stripe uses cents)
    const amountInCents = Math.round(parseFloat(amount) * 100);

    if (amountInCents < 50) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be at least $0.50',
      });
    }

    // Create Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: currency.toLowerCase(),
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: req.user.id,
        user_email: req.user.email || '',
        ...metadata,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({
      error: 'Payment Error',
      message: error.message || 'Failed to create payment intent',
    });
  }
});

/**
 * POST /api/payments/confirm
 * Confirm a payment intent (called after successful payment on frontend)
 */
router.post('/confirm', requireAuth, async (req, res) => {
  try {
    if (!stripe) {
      return res.status(503).json({
        error: 'Payment Service Unavailable',
        message: 'Stripe is not configured.',
      });
    }

    const { paymentIntentId } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Payment Intent ID is required',
      });
    }

    // Retrieve the payment intent to verify it belongs to this user
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Verify the payment intent belongs to this user
    if (paymentIntent.metadata.user_id !== req.user.id) {
      return res.status(403).json({
        error: 'Authorization Error',
        message: 'Payment intent does not belong to this user',
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

    res.json({
      success: true,
      paymentIntentId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount / 100, // Convert from cents to dollars
      currency: paymentIntent.currency,
    });
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({
      error: 'Payment Error',
      message: error.message || 'Failed to confirm payment',
    });
  }
});

// NOTE: Webhook route is handled directly in server.js before JSON parsing
// to preserve raw body for Stripe signature verification

export default router;

