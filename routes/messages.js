/**
 * ============================================================
 * MESSAGES ROUTES
 * Messaging and conversations
 * ============================================================
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { messageLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Helper to get service role client for admin operations
const getServiceRoleClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
};

/**
 * GET /api/messages/conversations
 * Get user's conversations
 */
router.get('/conversations', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use service role client to get participant data (bypasses recursive RLS)
    const adminClient = getServiceRoleClient();
    if (!adminClient) {
      return res.status(500).json({ error: 'Service role key not configured' });
    }

    const { data: participantData } = await adminClient
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', req.user.id);

    const conversationIds = participantData?.map(p => p.conversation_id) || [];

    if (conversationIds.length === 0) {
      return res.json({ conversations: [], pagination: { page: 1, limit, total: 0, pages: 0 } });
    }

    // Get conversations without participants (to avoid RLS recursion)
    const { data, error, count } = await adminClient
      .from('conversations')
      .select(`
        id, product_id, created_at, updated_at,
        product:products(id, title, price, images:product_images(url))
      `, { count: 'exact' })
      .in('id', conversationIds)
      .order('updated_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    // Get participants for each conversation separately using admin client
    const conversationsWithParticipants = await Promise.all(
      (data || []).map(async (conv) => {
        const { data: participants } = await adminClient
          .from('conversation_participants')
          .select('user_id, last_read_at, user:profiles!user_id(id, name, avatar_url)')
          .eq('conversation_id', conv.id);
        
        return { ...conv, participants: participants || [] };
      })
    );

    const conversationsWithMessages = await Promise.all(
      conversationsWithParticipants.map(async (conv) => {
        const { data: lastMessage } = await req.supabase
          .from('messages')
          .select('id, content, created_at, sender_id')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const participantInfo = participantData.find(p => p.conversation_id === conv.id);
        let unreadCount = 0;
        if (participantInfo?.last_read_at) {
          const { count } = await req.supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .neq('sender_id', req.user.id)
            .gt('created_at', participantInfo.last_read_at);
          unreadCount = count || 0;
        }

        const otherParticipant = conv.participants?.find(p => p.user_id !== req.user.id)?.user;

        return { ...conv, last_message: lastMessage, unread_count: unreadCount, other_participant: otherParticipant };
      })
    );

    res.json({
      conversations: conversationsWithMessages,
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, pages: Math.ceil((count || 0) / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages/conversations/get-or-create
 * Get or create a conversation for a product
 */
router.post('/conversations/get-or-create', requireAuth, async (req, res) => {
  try {
    const { product_id } = req.body;

    if (!product_id) {
      return res.status(400).json({ error: 'product_id is required' });
    }

    // Get product to find seller_id
    const { data: product, error: productError } = await req.supabase
      .from('products')
      .select('id, seller_id, title')
      .eq('id', product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.seller_id === req.user.id) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    // Use service role client to bypass RLS (which has recursive policy issues)
    const adminClient = getServiceRoleClient();
    if (!adminClient) {
      throw new Error('Service role key not configured');
    }

    // Check if conversation already exists
    const { data: existingParticipations } = await adminClient
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', req.user.id);

    const userConvIds = existingParticipations?.map(p => p.conversation_id) || [];

    if (userConvIds.length > 0) {
      const { data: sellerParticipations } = await adminClient
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', product.seller_id)
        .in('conversation_id', userConvIds);

      const sharedConvIds = sellerParticipations?.map(p => p.conversation_id) || [];

      if (sharedConvIds.length > 0) {
        const { data: productConv } = await adminClient
          .from('conversations')
          .select('id')
          .eq('product_id', product_id)
          .in('id', sharedConvIds)
          .single();

        if (productConv) {
          return res.json({ conversation_id: productConv.id });
        }
      }
    }

    // Create new conversation
    const { data: newConv, error: convError } = await adminClient
      .from('conversations')
      .insert({ product_id })
      .select()
      .single();

    if (convError) throw convError;

    // Add participants using service role client to bypass RLS
    const { error: participantError } = await adminClient
      .from('conversation_participants')
      .insert([
        { conversation_id: newConv.id, user_id: req.user.id },
        { conversation_id: newConv.id, user_id: product.seller_id },
      ]);

    if (participantError) throw participantError;

    res.json({ conversation_id: newConv.id });
  } catch (error) {
    console.error('Error getting or creating conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messages/conversations/:id
 * Get single conversation with messages
 */
router.get('/conversations/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Use service role client to check participant (bypasses recursive RLS policy)
    const adminClient = getServiceRoleClient();
    if (!adminClient) {
      return res.status(500).json({ error: 'Service role key not configured' });
    }

    const { data: participant } = await adminClient
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', id)
      .eq('user_id', req.user.id)
      .single();

    if (!participant) {
      return res.status(403).json({ error: 'Not authorized to view this conversation' });
    }

    // Get conversation with participants (use admin client for participants to avoid RLS recursion)
    const { data: conversation } = await adminClient
      .from('conversations')
      .select(`
        id, product_id, created_at,
        product:products(id, title, price, status, images:product_images(url), seller:profiles!seller_id(id, name))
      `)
      .eq('id', id)
      .single();

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Get participants separately using admin client
    const { data: participants } = await adminClient
      .from('conversation_participants')
      .select('user_id, user:profiles!user_id(id, name, avatar_url)')
      .eq('conversation_id', id);

    conversation.participants = participants || [];

    // Get messages using user client (messages RLS policy should be fine)
    const { data: messages, error, count } = await req.supabase
      .from('messages')
      .select(`id, content, created_at, sender_id, sender:profiles!sender_id(id, name, avatar_url)`, { count: 'exact' })
      .eq('conversation_id', id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    // Update last_read_at using admin client (bypasses RLS)
    await adminClient
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .eq('user_id', req.user.id);

    res.json({
      conversation,
      messages: (messages || []).reverse(),
      pagination: { page: parseInt(page), limit: parseInt(limit), total: count || 0, pages: Math.ceil((count || 0) / parseInt(limit)) },
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/messages
 * Send a message
 */
router.post('/', requireAuth, messageLimiter, validate(schemas.sendMessage), async (req, res) => {
  try {
    let { conversation_id, recipient_id, product_id, content } = req.body;

    if (!conversation_id && !recipient_id) {
      return res.status(400).json({ error: 'Either conversation_id or recipient_id is required' });
    }

    if (!conversation_id) {
      const { data: existingParticipations } = await req.supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', req.user.id);

      const userConvIds = existingParticipations?.map(p => p.conversation_id) || [];

      if (userConvIds.length > 0) {
        const { data: recipientParticipations } = await req.supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', recipient_id)
          .in('conversation_id', userConvIds);

        const sharedConvIds = recipientParticipations?.map(p => p.conversation_id) || [];

        if (sharedConvIds.length > 0 && product_id) {
          const { data: productConv } = await req.supabase
            .from('conversations')
            .select('id')
            .eq('product_id', product_id)
            .in('id', sharedConvIds)
            .single();
          if (productConv) conversation_id = productConv.id;
        }
      }

      if (!conversation_id) {
        const { data: newConv, error: convError } = await req.supabase
          .from('conversations')
          .insert({ product_id })
          .select()
          .single();

        if (convError) throw convError;
        conversation_id = newConv.id;

        await req.supabase.from('conversation_participants').insert([
          { conversation_id, user_id: req.user.id },
          { conversation_id, user_id: recipient_id },
        ]);
      }
    } else {
      const { data: participant } = await req.supabase
        .from('conversation_participants')
        .select('id')
        .eq('conversation_id', conversation_id)
        .eq('user_id', req.user.id)
        .single();

      if (!participant) {
        return res.status(403).json({ error: 'Not authorized to send to this conversation' });
      }
    }

    const { data: message, error } = await req.supabase
      .from('messages')
      .insert({ conversation_id, sender_id: req.user.id, content })
      .select(`id, content, created_at, sender_id, conversation_id, sender:profiles!sender_id(id, name, avatar_url)`)
      .single();

    if (error) throw error;

    await req.supabase
      .from('conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', conversation_id);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/messages/unread-count
 * Get total unread message count
 */
router.get('/unread-count', requireAuth, async (req, res) => {
  try {
    const { data: participantData } = await req.supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', req.user.id);

    let totalUnread = 0;
    for (const participant of participantData || []) {
      const query = req.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', participant.conversation_id)
        .neq('sender_id', req.user.id);

      if (participant.last_read_at) {
        query.gt('created_at', participant.last_read_at);
      }

      const { count } = await query;
      totalUnread += count || 0;
    }

    res.json({ unread_count: totalUnread });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PUT /api/messages/conversations/:id/read
 * Mark conversation as read
 */
router.put('/conversations/:id/read', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await req.supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', id)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Conversation marked as read' });
  } catch (error) {
    console.error('Error marking as read:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
