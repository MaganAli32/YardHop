/**
 * Stage 5 — Listing copy.
 *
 * Writes a marketplace-ready title and description from VERIFIED facts only.
 * The model is told what was confirmed, what was merely observed, and the
 * computed price, and is forbidden from inventing specs. A template fallback
 * guarantees the appraisal still has usable copy if the call fails.
 */
import { generate, MODELS } from '../gemini.js';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    title: { type: 'STRING' },
    description: { type: 'STRING' },
    highlights: { type: 'ARRAY', items: { type: 'STRING' } },
    conditionSummary: { type: 'STRING' },
    sellerTips: { type: 'ARRAY', items: { type: 'STRING' } },
    keywords: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['title', 'description', 'highlights', 'conditionSummary', 'sellerTips', 'keywords'],
};

const SYSTEM = `You write resale listings (eBay / Facebook Marketplace / Mercari style) for a pricing app. Buyers must be able to trust every word.

RULES
- Use only the facts provided. Never add specs, years, sizes, materials or included items that are not in the facts. If something is unverified, say "appears" or leave it out.
- title: max 80 characters, brand + model + variant + key attribute (size/color/reference) — the words a buyer would type. No emojis, no "L@@K", no price.
- description: 3–6 sentences for a buyer, then a short "Details" list of factual bullets (each bullet on its own line starting with "• "). Mention condition honestly using the observed notes. Do not state the price.
- highlights: 3–5 short selling points, facts only.
- conditionSummary: one sentence a seller could paste as the condition line.
- sellerTips: exactly 3 specific, actionable tips for THIS item (photos to add, authenticity proof to include, where to list it, how to price vs. the computed range).
- keywords: 5–10 search terms.
Reply only with the JSON object.`;

function factsBlock({ identification: id, verification: v, pricing }) {
  const canonical = v?.canonicalName || id.name;
  const lines = [
    `Product (canonical name): ${canonical}`,
    `Identification certainty: ${id.identityLevel} level, ${id.identityConfidence}% confident${v?.verified ? ', confirmed by web lookup' : ', NOT confirmed by web lookup'}`,
    id.brand || v?.brand ? `Brand: ${v?.brand || id.brand}` : null,
    id.model || v?.model ? `Model: ${v?.model || id.model}` : null,
    id.variant || v?.variant ? `Variant: ${v?.variant || id.variant}` : null,
    id.referenceNumber || v?.referenceNumber ? `Reference/model number: ${v?.referenceNumber || id.referenceNumber}` : null,
    id.size ? `Size: ${id.size}` : null,
    id.color ? `Color: ${id.color}` : null,
    id.materials?.length ? `Materials (observed): ${id.materials.join(', ')}` : null,
    v?.releaseYear ? `Release year: ${v.releaseYear}` : id.year ? `Year (estimated from photo): ${id.year}` : null,
    v?.msrp ? `Original retail price: $${Math.round(v.msrp)}` : null,
    v?.specs?.length ? `Verified specs: ${v.specs.join('; ')}` : null,
    id.distinguishingFeatures?.length ? `Observed features: ${id.distinguishingFeatures.join('; ')}` : null,
    id.visibleText?.length ? `Text visible on item: ${id.visibleText.join(' / ')}` : null,
    id.includedItems?.length ? `Included in photos: ${id.includedItems.join(', ')}` : 'Included items: only what is pictured; no box/papers observed',
    `Condition: ${id.condition}`,
    id.conditionNotes?.length ? `Condition notes (observed): ${id.conditionNotes.join('; ')}` : 'Condition notes: no visible flaws noted',
    id.authenticityRisk !== 'low' ? `Authenticity: ${id.authenticityRisk} risk category — value assumes authentic; advise proof` : null,
    pricing ? `Computed price: fair $${pricing.priceFair}, range $${pricing.priceLow}–$${pricing.priceHigh} (${pricing.basis})` : 'Computed price: none (insufficient data)',
  ];
  return lines.filter(Boolean).join('\n');
}

export function fallbackListing({ identification: id, verification: v, pricing }) {
  const name = v?.canonicalName || id.name;
  const bullets = [
    id.brand || v?.brand ? `• Brand: ${v?.brand || id.brand}` : null,
    id.model || v?.model ? `• Model: ${v?.model || id.model}` : null,
    id.variant || v?.variant ? `• Variant: ${v?.variant || id.variant}` : null,
    id.size ? `• Size: ${id.size}` : null,
    id.color ? `• Color: ${id.color}` : null,
    `• Condition: ${id.condition}${id.conditionNotes?.length ? ` (${id.conditionNotes.join('; ')})` : ''}`,
  ].filter(Boolean);
  return {
    title: name.slice(0, 80),
    description: `${name} in ${id.condition.toLowerCase()} condition. ${id.distinguishingFeatures?.slice(0, 3).join('. ') || ''}\n\nDetails\n${bullets.join('\n')}`.trim(),
    highlights: id.distinguishingFeatures?.slice(0, 4) || [],
    conditionSummary: `${id.condition}${id.conditionNotes?.length ? ': ' + id.conditionNotes.join(', ') : ', no visible flaws'}.`,
    sellerTips: [
      'Add close-up photos of any labels, serial or reference numbers and all flaws.',
      id.authenticityRisk !== 'low' ? 'Include proof of authenticity (receipt, box, papers) — it directly raises the sale price.' : 'Mention everything that is included (cables, box, accessories).',
      pricing ? `List near $${pricing.priceFair.toLocaleString()} for a quick sale; hold out for $${pricing.priceHigh.toLocaleString()} only with strong condition proof.` : 'Compare against recent sold listings before setting a price.',
    ],
    keywords: [id.brand, id.model, id.variant, id.category].filter(Boolean),
    generated: false,
  };
}

/**
 * @param {{identification: object, verification: object|null, pricing: object|null, timeoutMs?: number}} ctx
 */
export async function writeListing(ctx) {
  const { timeoutMs = 20000 } = ctx;
  const fallback = fallbackListing(ctx);
  try {
    const res = await generate({
      model: MODELS.fast,
      system: SYSTEM,
      parts: [{ text: `FACTS\n${factsBlock(ctx)}\n\nWrite the listing.` }],
      schema: SCHEMA,
      temperature: 0.2,
      thinking: 'low',
      timeoutMs,
      maxOutputTokens: 2048,
      label: 'listing',
    });
    const j = res.json;
    if (!j || typeof j.title !== 'string' || typeof j.description !== 'string') return fallback;
    const arr = (v, n) => (Array.isArray(v) ? v.filter((s) => typeof s === 'string' && s.trim()).slice(0, n) : []);
    return {
      title: j.title.trim().slice(0, 80) || fallback.title,
      description: j.description.trim() || fallback.description,
      highlights: arr(j.highlights, 5),
      conditionSummary: typeof j.conditionSummary === 'string' && j.conditionSummary.trim() ? j.conditionSummary.trim() : fallback.conditionSummary,
      sellerTips: arr(j.sellerTips, 3).length === 3 ? arr(j.sellerTips, 3) : fallback.sellerTips,
      keywords: arr(j.keywords, 10),
      generated: true,
    };
  } catch (err) {
    console.warn('[appraisal] listing generation failed, using template:', err.message);
    return fallback;
  }
}
