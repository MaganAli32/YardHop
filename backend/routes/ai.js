/**
 * ============================================================
 * AI ROUTES
 * Gemini API integration for image analysis and price suggestions
 * ============================================================
 */

import express from 'express';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { validate, schemas } from '../middleware/validation.js';
import { aiLimiter } from '../middleware/rateLimiter.js';
import { checkScanLimit, recordScan } from '../middleware/scanLimiter.js';

const router = express.Router();

// Helper to get API key at runtime (after dotenv loads)
const getGeminiApiKey = () => process.env.GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

/**
 * POST /api/ai/analyze
 * Analyze item image and generate listing details
 */
router.post('/analyze', requireAuth, aiLimiter, checkScanLimit, validate(schemas.analyzeImage), async (req, res) => {
  try {
    const { image_url, image_base64 } = req.body;

    if (!getGeminiApiKey()) {
      return res.status(503).json({
        error: 'AI Service Unavailable',
        message: 'AI features are not configured',
      });
    }

    // Prepare image for Gemini
    let imageData;
    if (image_base64) {
      imageData = {
        inlineData: {
          mimeType: 'image/jpeg',
          data: image_base64.replace(/^data:image\/\w+;base64,/, ''),
        },
      };
    } else if (image_url) {
      // Fetch image and convert to base64
      const response = await fetch(image_url);
      const arrayBuffer = await response.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      imageData = {
        inlineData: {
          mimeType: response.headers.get('content-type') || 'image/jpeg',
          data: base64,
        },
      };
    }

    const prompt = `You are an expert at identifying items for sale at garage sales and thrift stores. 
Analyze this image and provide:
1. A catchy, descriptive title (max 80 characters)
2. A detailed description highlighting key features, condition, and appeal (150-300 words)
3. Category (choose ONE from: Furniture, Electronics, Clothing, Home Decor, Kitchen, Toys & Games, Sports & Outdoors, Books & Media, Tools & Garden, Vintage & Collectibles, Other)
4. Condition assessment (choose ONE from: New, Like New, Good, Fair, Project Piece)
5. Estimated market value range (low to high)
6. Suggested listing price (what would sell quickly at a garage sale)
7. Any notable features or selling points
8. Is this a potential "steal" if priced below market? (true/false)

Respond in valid JSON format:
{
  "title": "string",
  "description": "string", 
  "category": "string",
  "condition": "string",
  "market_value_low": number,
  "market_value_high": number,
  "suggested_price": number,
  "features": ["string"],
  "is_potential_steal": boolean,
  "confidence": number (0-1)
}`;

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${getGeminiApiKey()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              imageData,
            ],
          },
        ],
        generationConfig: {
          temperature: 0.4,
          topK: 32,
          topP: 1,
          maxOutputTokens: 1024,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('AI analysis failed');
    }

    const geminiData = await geminiResponse.json();
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      throw new Error('No response from AI');
    }

    // Parse JSON from response (handle markdown code blocks)
    let analysis;
    try {
      const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                        textResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
      analysis = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error('Failed to parse AI response:', textResponse);
      throw new Error('Failed to parse AI analysis');
    }

    // Save analysis to database
    await req.supabase.from('price_analyses').insert({
      user_id: req.user.id,
      image_url: image_url || null,
      suggested_price: analysis.suggested_price,
      market_average: (analysis.market_value_low + analysis.market_value_high) / 2,
      condition_assessment: analysis.condition,
      category_suggestion: analysis.category,
      title_suggestion: analysis.title,
      description_suggestion: analysis.description,
      detected_items: analysis,
    });

    // Record AI scan usage
    await recordScan(req, 'analyze', { title: analysis.title });

    res.json({
      success: true,
      analysis: {
        title: analysis.title,
        description: analysis.description,
        category: analysis.category,
        condition: analysis.condition,
        price_range: {
          low: analysis.market_value_low,
          high: analysis.market_value_high,
        },
        suggested_price: analysis.suggested_price,
        market_average: (analysis.market_value_low + analysis.market_value_high) / 2,
        features: analysis.features,
        is_potential_steal: analysis.is_potential_steal,
        confidence: analysis.confidence,
      },
      usage: req.scanUsage,
    });
  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({
      error: 'Analysis Failed',
      message: error.message || 'Failed to analyze image',
    });
  }
});

/**
 * POST /api/ai/suggest-price
 * Get price suggestion based on item details
 */
router.post('/suggest-price', requireAuth, aiLimiter, checkScanLimit, async (req, res) => {
  try {
    const { title, description, condition, category, original_price } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!getGeminiApiKey()) {
      // Fallback to simple calculation if AI not available
      const basePrice = original_price || 50;
      const conditionMultiplier = {
        'New': 0.7,
        'Like New': 0.6,
        'Good': 0.4,
        'Fair': 0.25,
        'Project Piece': 0.15,
      }[condition] || 0.4;

      const suggestedPrice = Math.round(basePrice * conditionMultiplier);
      
      return res.json({
        suggested_price: suggestedPrice,
        market_average: basePrice,
        price_range: {
          low: Math.round(suggestedPrice * 0.8),
          high: Math.round(suggestedPrice * 1.3),
        },
        confidence: 0.5,
        source: 'estimate',
      });
    }

    const prompt = `You are a pricing expert for used items at garage sales and thrift stores.

Item Details:
- Title: ${title}
- Description: ${description || 'Not provided'}
- Condition: ${condition || 'Good'}
- Category: ${category || 'General'}
${original_price ? `- Original/Retail Price: $${original_price}` : ''}

Analyze this item and provide pricing recommendations for a garage sale in the US.

Respond in valid JSON format:
{
  "suggested_price": number (optimal price for quick sale),
  "market_average": number (typical resale value),
  "price_range_low": number (minimum reasonable price),
  "price_range_high": number (maximum you might get from the right buyer),
  "confidence": number (0-1, how confident you are in this pricing),
  "reasoning": "string (brief explanation)"
}`;

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${getGeminiApiKey()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error('AI pricing failed');
    }

    const geminiData = await geminiResponse.json();
    const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    let pricing;
    try {
      const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || 
                        textResponse.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : textResponse;
      pricing = JSON.parse(jsonStr);
    } catch {
      throw new Error('Failed to parse pricing response');
    }

    // Record AI scan usage
    await recordScan(req, 'suggest-price', { title });

    res.json({
      suggested_price: pricing.suggested_price,
      market_average: pricing.market_average,
      price_range: {
        low: pricing.price_range_low,
        high: pricing.price_range_high,
      },
      confidence: pricing.confidence,
      reasoning: pricing.reasoning,
      source: 'ai',
      usage: req.scanUsage,
    });
  } catch (error) {
    console.error('Price suggestion error:', error);
    res.status(500).json({
      error: 'Pricing Failed',
      message: error.message || 'Failed to generate price suggestion',
    });
  }
});

/**
 * POST /api/ai/generate-description
 * Generate description from title and images
 */
router.post('/generate-description', requireAuth, aiLimiter, checkScanLimit, async (req, res) => {
  try {
    const { title, condition, category, features } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    if (!getGeminiApiKey()) {
      // Fallback template
      return res.json({
        description: `${title} in ${condition || 'good'} condition. ${features?.join('. ') || ''} Perfect for someone looking for quality ${category || 'items'} at a great price.`,
        source: 'template',
      });
    }

    const prompt = `Write a compelling, honest description for this garage sale item:

Title: ${title}
Condition: ${condition || 'Good'}
Category: ${category || 'General'}
${features ? `Key Features: ${features.join(', ')}` : ''}

Requirements:
- Be honest about condition
- Highlight selling points
- Keep it between 80-150 words
- Sound friendly and approachable (not corporate)
- Mention any potential uses
- Don't use excessive exclamation marks

Just provide the description text, no JSON or formatting.`;

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${getGeminiApiKey()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!geminiResponse.ok) {
      throw new Error('Description generation failed');
    }

    const geminiData = await geminiResponse.json();
    const description = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!description) {
      throw new Error('No description generated');
    }

    // Record AI scan usage
    await recordScan(req, 'generate-description', { title });

    res.json({
      description,
      source: 'ai',
      usage: req.scanUsage,
    });
  } catch (error) {
    console.error('Description generation error:', error);
    res.status(500).json({
      error: 'Generation Failed',
      message: error.message || 'Failed to generate description',
    });
  }
});

/**
 * POST /api/ai/appraise
 * Get market arbitrage analysis for a product (Stitch Appraisal)
 */
router.post('/appraise', optionalAuth, aiLimiter, async (req, res) => {
  try {
    const { title, price, description } = req.body;

    if (!title || price === undefined) {
      return res.status(400).json({ error: 'Title and price are required' });
    }

    if (!getGeminiApiKey()) {
      // Fallback analysis if AI not available
      return res.json({
        appraisal: `Market Value Gap: Based on typical garage sale pricing, this item at $${price} appears to be priced ${price < 50 ? 'competitively' : price < 100 ? 'moderately' : 'at a premium'} for this category.\n\nRisk Points: Verify item condition matches description, check for any defects not mentioned, confirm seller reliability.\n\nStitch Score: ${price < 50 ? '75' : price < 100 ? '65' : '55'}/100`,
        source: 'estimate',
      });
    }

    const prompt = `Perform a neighborhood market arbitrage analysis for: "${title}" listed at $${price}. Context: ${description || 'No description provided'}. Return 3 clear bullet points: 1. Market Value Gap, 2. Specific risk points to check, 3. A Stitch Score out of 100.`;

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${getGeminiApiKey()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: 'You are Stitch AI, a cold-analytical but neighborhood-friendly market arbitrage expert.' }] },
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 512,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      throw new Error('AI appraisal failed');
    }

    const geminiData = await geminiResponse.json();
    const appraisal = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!appraisal) {
      throw new Error('No appraisal generated');
    }

    // Record AI scan usage if user is authenticated
    if (req.user) {
      await recordScan(req, 'appraise', { title });
    }

    res.json({
      appraisal,
      source: 'ai',
      usage: req.scanUsage || null,
    });
  } catch (error) {
    console.error('Appraisal error:', error);
    res.status(500).json({
      error: 'Appraisal Failed',
      message: error.message || 'Failed to generate appraisal',
    });
  }
});

/**
 * POST /api/ai/detect-steals
 * Analyze multiple items to find deals
 */
router.post('/detect-steals', optionalAuth, aiLimiter, async (req, res) => {
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items array is required' });
    }

    // Calculate steals based on price vs market average
    const steals = items.map(item => {
      const marketAverage = item.market_average || item.original_price || item.price * 1.5;
      const savings = marketAverage - item.price;
      const savingsPercent = Math.round((savings / marketAverage) * 100);
      const isSteal = savingsPercent >= 30;

      return {
        ...item,
        market_average: marketAverage,
        savings,
        savings_percent: savingsPercent,
        is_steal: isSteal,
      };
    });

    // Sort by savings percentage
    steals.sort((a, b) => b.savings_percent - a.savings_percent);

    // Get top steals
    const topSteals = steals.filter(item => item.is_steal);
    const totalSavings = topSteals.reduce((sum, item) => sum + item.savings, 0);

    res.json({
      all_items: steals,
      top_steals: topSteals,
      steal_count: topSteals.length,
      total_potential_savings: Math.round(totalSavings),
    });
  } catch (error) {
    console.error('Steal detection error:', error);
    res.status(500).json({
      error: 'Detection Failed',
      message: error.message || 'Failed to detect steals',
    });
  }
});

/**
 * GET /api/ai/usage
 * Get current user's AI scan usage and limits
 */
router.get('/usage', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user's subscription tier
    const { data: profile } = await req.supabase
      .from('profiles')
      .select('subscription_tier, subscription_status, subscription_expires_at')
      .eq('id', userId)
      .single();

    let tier = 'free';
    if (profile) {
      const isActive = 
        profile.subscription_status === 'active' &&
        (!profile.subscription_expires_at || new Date(profile.subscription_expires_at) > new Date());
      tier = isActive ? (profile.subscription_tier || 'free') : 'free';
    }

    const limits = { free: 2, pro: 50, unlimited: Infinity };
    const scanLimit = limits[tier] || 2;

    // Get current month's usage
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { count } = await req.supabase
      .from('ai_usage')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    const currentUsage = count || 0;

    // Get usage breakdown by type
    const { data: breakdown } = await req.supabase
      .from('ai_usage')
      .select('scan_type')
      .eq('user_id', userId)
      .gte('created_at', startOfMonth.toISOString());

    const usageByType = (breakdown || []).reduce((acc, item) => {
      acc[item.scan_type] = (acc[item.scan_type] || 0) + 1;
      return acc;
    }, {});

    function getNextMonthStart() {
      const now = new Date();
      return new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    }

    res.json({
      tier,
      usage: {
        current: currentUsage,
        limit: scanLimit === Infinity ? 'Unlimited' : scanLimit,
        remaining: scanLimit === Infinity ? 'Unlimited' : Math.max(0, scanLimit - currentUsage),
        percentage: scanLimit === Infinity ? 0 : Math.round((currentUsage / scanLimit) * 100),
        byType: usageByType,
      },
      subscription: {
        status: profile?.subscription_status || 'none',
        expiresAt: profile?.subscription_expires_at,
      },
      resetsAt: getNextMonthStart(),
      upgrades: {
        pro: { price: 4.99, scans: 50, savings: 'Best for casual sellers' },
        unlimited: { price: 9.99, scans: 'Unlimited', savings: 'Best for power sellers' },
      },
    });
  } catch (error) {
    console.error('Error fetching usage:', error);
    res.status(500).json({ error: 'Failed to fetch usage' });
  }
});

/**
 * POST /api/ai/consult-negotiation
 * Get AI negotiation advice for a conversation (Stitch Consultation)
 */
router.post('/consult-negotiation', requireAuth, aiLimiter, async (req, res) => {
  try {
    const { product_title, product_price, conversation, user_role } = req.body;

    if (!product_title || product_price === undefined) {
      return res.status(400).json({ error: 'Product title and price are required' });
    }

    if (!getGeminiApiKey()) {
      // Fallback advice if AI not available
      return res.json({
        advice: "This looks like a fair community price! Consider negotiating if you feel it's slightly high, but trust your instincts.",
        source: 'fallback',
      });
    }

    const prompt = `You are the YardHop Stitch Assistant, a friendly neighborhood marketplace advisor.

Product: "${product_title}" listed at $${product_price}
User Role: ${user_role || 'buyer'}
Conversation so far:
${conversation || 'No conversation yet.'}

Provide brief, actionable advice (2-3 sentences max):
- Is this a fair price?
- Should they negotiate?
- What's a reasonable counter-offer if applicable?

Keep it friendly and neighborhood-appropriate. Be concise and helpful.`;

    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${getGeminiApiKey()}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 256,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Gemini API error:', errorText);
      // Return fallback advice instead of failing
      return res.json({
        advice: "Looks like a fair neighborhood deal! Trust your instincts and negotiate if you feel it's reasonable.",
        source: 'fallback',
      });
    }

    const geminiData = await geminiResponse.json();
    const advice = geminiData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!advice) {
      return res.json({
        advice: "Looks like a fair neighborhood deal! Trust your instincts.",
        source: 'fallback',
      });
    }

    // Record AI scan usage
    await recordScan(req, 'consult-negotiation', { title: product_title });

    res.json({
      advice,
      source: 'ai',
      usage: req.scanUsage,
    });
  } catch (error) {
    console.error('Consultation error:', error);
    // Return fallback advice instead of failing
    res.json({
      advice: "Stitch is temporarily unavailable. Trust your instincts and negotiate if you feel it's reasonable!",
      source: 'fallback',
    });
  }
});

/**
 * GET /api/ai/history
 * Get user's AI analysis history
 */
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { data, error, count } = await req.supabase
      .from('price_analyses')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + parseInt(limit) - 1);

    if (error) throw error;

    res.json({
      analyses: data || [],
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count || 0,
        pages: Math.ceil((count || 0) / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Error fetching AI history:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
