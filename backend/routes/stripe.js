import express from 'express';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

// Lazily-safe initialization: constructing Stripe/Supabase clients with empty
// credentials throws at import time and would crash the whole server.
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-12-18.acacia' })
  : null;

const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
const supabaseAdmin = (process.env.SUPABASE_URL && supabaseServiceKey)
  ? createClient(process.env.SUPABASE_URL, supabaseServiceKey)
  : null;

const APP_URL = process.env.APP_URL || process.env.FRONTEND_URL || 'https://yardfrontend.com';

const PRICE_IDS = {
  starter_monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
  starter_annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  growth_monthly: process.env.STRIPE_PRICE_GROWTH_MONTHLY,
  growth_annual: process.env.STRIPE_PRICE_GROWTH_ANNUAL,
  scale_monthly: process.env.STRIPE_PRICE_SCALE_MONTHLY,
  scale_annual: process.env.STRIPE_PRICE_SCALE_ANNUAL,
};

const PLAN_LIMITS = {
  starter: 500,
  growth: 2000,
  scale: 7500,
};

async function getUserFromAuthHeader(authHeader) {
  if (!authHeader) return { user: null, error: new Error('No auth token') };
  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  return { user, error };
}

router.post('/create-checkout', async (req, res) => {
  try {
    if (!stripe || !supabaseAdmin) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const { user, error: authError } = await getUserFromAuthHeader(req.headers.authorization);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { plan, billing_period } = req.body || {};
    if (!plan || !billing_period) {
      return res.status(400).json({ error: 'plan and billing_period are required' });
    }

    const priceKey = `${plan}_${billing_period}`;
    const priceId = PRICE_IDS[priceKey];
    if (!priceId) {
      return res.status(400).json({ error: `No price found for ${priceKey}` });
    }

    const { data: keyRecord } = await supabaseAdmin
      .from('api_keys')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    let customerId = keyRecord?.stripe_customer_id || null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin
        .from('api_keys')
        .update({ stripe_customer_id: customerId })
        .eq('user_id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      ui_mode: 'embedded',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      return_url: `${APP_URL}/#/dashboard?upgrade=success`,
      metadata: {
        supabase_user_id: user.id,
        plan,
        billing_period,
      },
    });

    return res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

router.post('/create-portal', async (req, res) => {
  try {
    if (!stripe || !supabaseAdmin) {
      return res.status(503).json({ error: 'Stripe is not configured' });
    }

    const { user, error: authError } = await getUserFromAuthHeader(req.headers.authorization);
    if (authError || !user) return res.status(401).json({ error: 'Invalid token' });

    const { data: keyRecord } = await supabaseAdmin
      .from('api_keys')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!keyRecord?.stripe_customer_id) {
      return res.status(400).json({ error: 'No Stripe customer found' });
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: keyRecord.stripe_customer_id,
      return_url: `${APP_URL}/#/dashboard`,
    });

    return res.json({ url: portalSession.url });
  } catch (err) {
    console.error('Stripe portal error:', err);
    return res.status(500).json({ error: 'Failed to create portal session' });
  }
});

router.post('/webhook', async (req, res) => {
  if (!stripe || !supabaseAdmin || !process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('Stripe billing webhook not configured');
    return res.status(503).json({ error: 'Webhook not configured' });
  }

  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ''
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;
        const billingPeriod = session.metadata?.billing_period;

        if (!userId || !plan) break;

        let currentPeriodEnd = null;
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription);
          currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }

        await supabaseAdmin
          .from('api_keys')
          .update({
            plan,
            monthly_limit: PLAN_LIMITS[plan] || 25,
            billing_period: billingPeriod || 'monthly',
            stripe_subscription_id: session.subscription || null,
            current_period_end: currentPeriodEnd,
          })
          .eq('user_id', userId);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = String(subscription.customer);
        const priceId = subscription.items?.data?.[0]?.price?.id;
        const planEntry = Object.entries(PRICE_IDS).find(([, id]) => id === priceId);
        const planName = planEntry ? planEntry[0].split('_')[0] : null;
        const billingPeriod = planEntry ? planEntry[0].split('_')[1] : 'monthly';

        if (planName && PLAN_LIMITS[planName]) {
          await supabaseAdmin
            .from('api_keys')
            .update({
              plan: planName,
              monthly_limit: PLAN_LIMITS[planName],
              billing_period: billingPeriod,
              stripe_subscription_id: subscription.id,
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('stripe_customer_id', customerId);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = String(subscription.customer);

        await supabaseAdmin
          .from('api_keys')
          .update({
            plan: 'free',
            monthly_limit: 25,
            stripe_subscription_id: null,
            current_period_end: null,
            billing_period: 'monthly',
          })
          .eq('stripe_customer_id', customerId);
        break;
      }
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'Webhook handler failed' });
  }
});

export default router;
