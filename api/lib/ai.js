import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI = null;

function getGenAI() {
  if (!genAI) {
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    genAI = new GoogleGenerativeAI(geminiApiKey);
  }
  return genAI;
}

/**
 * Analyze an image for garage sale items and estimate pricing
 */
export async function analyzeImage(imageBase64, mimeType = 'image/jpeg') {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this garage sale photo and identify items that could be sold.
For each item, provide:
- name: descriptive name of the item
- bounding_box: {x, y, width, height} in pixels (estimated position in image)
- estimated_value: {min, max} in USD based on current market value
- confidence: 0-1 score for detection confidence
- location: description of where item appears in the image (e.g., "Left side, on blue table")

Return ONLY a JSON array of objects with this exact structure. No markdown, no explanation.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();
    // Try to extract JSON from response (handle markdown code blocks if present)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    const jsonText = jsonMatch ? jsonMatch[0] : responseText;
    
    const items = JSON.parse(jsonText);
    
    // Add IDs if missing
    return items.map((item, idx) => ({
      ...item,
      id: item.id || `item-${idx + 1}`,
    }));
  } catch (error) {
    console.error('AI analysis error:', error);
    throw new Error('Failed to analyze image');
  }
}

/**
 * Suggest price for a product based on title, description, condition, and category
 */
export async function suggestPrice(
  title,
  description,
  condition,
  category
) {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Based on the following product information, suggest an appropriate selling price for a local marketplace:

Title: ${title}
${description ? `Description: ${description}` : ''}
${condition ? `Condition: ${condition}` : ''}
${category ? `Category: ${category}` : ''}

Provide:
- suggestedPrice: recommended listing price in USD
- marketAverage: average market price for similar items
- priceRange: {min, max} typical price range in USD

Consider this is for a local garage sale marketplace, so prices should be competitive.
Return ONLY JSON with this exact structure. No markdown.`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : responseText;
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Price suggestion error:', error);
    // Fallback pricing
    return {
      suggestedPrice: 50,
      marketAverage: 75,
      priceRange: { min: 25, max: 100 },
    };
  }
}

/**
 * Generate listing description from image
 */
export async function generateDescription(imageBase64, mimeType = 'image/jpeg') {
  const model = getGenAI().getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `Analyze this product image and generate:
- title: concise, descriptive product title (max 60 characters)
- description: detailed description highlighting features, condition, and notable details
- category: single category name (e.g., "Furniture", "Electronics", "Collectibles")
- tags: array of 3-5 relevant tags

Return ONLY JSON with this exact structure. No markdown.`;

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      prompt,
    ]);

    const responseText = result.response.text();
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonText = jsonMatch ? jsonMatch[0] : responseText;
    
    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Description generation error:', error);
    throw new Error('Failed to generate description');
  }
}

