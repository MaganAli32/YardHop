/**
 * Stage 1 — Identification.
 *
 * One call to the strong multimodal model with every photo plus any seller
 * hints. The model must read visible text (dial names, casebacks, size tags,
 * model labels) before guessing, name the exact product when it can, and say
 * how sure it is. Structured output keeps the result machine-usable.
 */
import { generate, MODELS } from '../gemini.js';
import { buildHintBlock } from './hints.js';
import { imageParts } from './images.js';

export const IDENTITY_LEVELS = ['exact', 'model', 'brand', 'category', 'unknown'];
export const CONDITIONS = ['New', 'Like New', 'Good', 'Fair', 'Poor'];

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    isItemVisible: { type: 'BOOLEAN' },
    name: { type: 'STRING' },
    brand: { type: 'STRING', nullable: true },
    model: { type: 'STRING', nullable: true },
    variant: { type: 'STRING', nullable: true },
    referenceNumber: { type: 'STRING', nullable: true },
    year: { type: 'STRING', nullable: true },
    size: { type: 'STRING', nullable: true },
    color: { type: 'STRING', nullable: true },
    materials: { type: 'ARRAY', items: { type: 'STRING' } },
    category: { type: 'STRING' },
    subcategory: { type: 'STRING', nullable: true },
    visibleText: { type: 'ARRAY', items: { type: 'STRING' } },
    distinguishingFeatures: { type: 'ARRAY', items: { type: 'STRING' } },
    includedItems: { type: 'ARRAY', items: { type: 'STRING' } },
    identityLevel: { type: 'STRING', enum: IDENTITY_LEVELS },
    identityConfidence: { type: 'INTEGER' },
    alternatives: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING' },
          likelihood: { type: 'INTEGER' },
          howToTell: { type: 'STRING' },
        },
        required: ['name', 'likelihood', 'howToTell'],
      },
    },
    condition: { type: 'STRING', enum: CONDITIONS },
    conditionNotes: { type: 'ARRAY', items: { type: 'STRING' } },
    authenticityRisk: { type: 'STRING', enum: ['low', 'medium', 'high'] },
    questionsForSeller: { type: 'ARRAY', items: { type: 'STRING' } },
    searchQueries: {
      type: 'OBJECT',
      properties: {
        exact: { type: 'STRING' },
        model: { type: 'STRING' },
        broad: { type: 'STRING' },
      },
      required: ['exact', 'model', 'broad'],
    },
    reasoning: { type: 'STRING' },
  },
  required: [
    'isItemVisible', 'name', 'category', 'visibleText', 'distinguishingFeatures',
    'identityLevel', 'identityConfidence', 'alternatives', 'condition', 'conditionNotes',
    'authenticityRisk', 'questionsForSeller', 'searchQueries', 'reasoning',
  ],
};

const SYSTEM = `You are a senior resale authenticator and product identifier (watches, sneakers, electronics, DJ/audio gear, tools, furniture, collectibles, fashion, sporting goods). Your identification feeds a pricing engine, so precision matters more than speed.

METHOD — follow in order:
1. READ every piece of visible text first: logos, dial printing, caseback engravings, model/serial labels, size tags, box labels, stickers, screen contents. Quote them exactly in visibleText.
2. From text + design cues, name the product as precisely as the evidence supports: brand → model line → variant/generation/colorway → reference number. Examples of the precision expected: "Cartier Santos de Cartier Medium WSSA0029 steel" not "Cartier watch"; "WHOOP 4.0 fitness tracker with Onyx SuperKnit band" not "fitness band"; "Air Jordan 1 Retro High OG 'Chicago' 2022 size 10.5" not "Jordan sneakers"; "Pioneer DJ DDJ-FLX4 controller" not "DJ equipment".
3. Distinguish look-alikes. If two products are plausible, choose the most likely, list the others in alternatives with what photo or detail would settle it.
4. identityLevel: "exact" = brand+model+variant/reference known; "model" = brand+model, variant unknown; "brand" = brand clear, model unclear; "category" = only the type of object; "unknown" = cannot tell what it is.
5. identityConfidence (0–100) is your honest probability that name is correct at the stated identityLevel. Never inflate it; 95+ only when text on the item confirms the model.
6. Condition from what you can SEE (scratches, scuffs, yellowing, wear, missing parts). Put every observed flaw in conditionNotes. Default to "Good" when nothing is visible either way.
7. authenticityRisk is high for luxury watches, designer goods and hyped sneakers where fakes are common — it does not mean the item is fake.
8. questionsForSeller: the 1–3 photos or details that would most raise confidence (e.g. "photo of caseback reference number", "size tag inside tongue").
9. searchQueries are for finding SOLD listings on eBay: exact = brand model variant (+ reference/size when known); model = brand model only; broad = generic type with the top attribute. No quotes, no filler words, 3–9 words each.

RULES: Never refuse. Never invent text you cannot read. Do not describe a brand/model you did not actually see evidence for — use identityLevel "category" instead. Reply only with the JSON object.`;

function normalise(parsed) {
  if (!parsed || typeof parsed !== 'object') return null;
  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const arr = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim()) : []);
  const level = IDENTITY_LEVELS.includes(parsed.identityLevel) ? parsed.identityLevel : 'category';
  const condition = CONDITIONS.includes(parsed.condition) ? parsed.condition : 'Good';
  let confidence = Number(parsed.identityConfidence);
  if (!Number.isFinite(confidence)) confidence = level === 'exact' ? 70 : level === 'model' ? 55 : 30;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));
  const name = str(parsed.name) || 'Unidentified item';
  const sq = parsed.searchQueries || {};
  return {
    isItemVisible: parsed.isItemVisible !== false,
    name,
    brand: str(parsed.brand),
    model: str(parsed.model),
    variant: str(parsed.variant),
    referenceNumber: str(parsed.referenceNumber),
    year: str(parsed.year),
    size: str(parsed.size),
    color: str(parsed.color),
    materials: arr(parsed.materials),
    category: str(parsed.category) || 'General',
    subcategory: str(parsed.subcategory),
    visibleText: arr(parsed.visibleText),
    distinguishingFeatures: arr(parsed.distinguishingFeatures),
    includedItems: arr(parsed.includedItems),
    identityLevel: level,
    identityConfidence: confidence,
    alternatives: Array.isArray(parsed.alternatives)
      ? parsed.alternatives
          .filter((a) => a && typeof a.name === 'string')
          .slice(0, 4)
          .map((a) => ({ name: a.name.trim(), likelihood: Number(a.likelihood) || 0, howToTell: str(a.howToTell) || '' }))
      : [],
    condition,
    conditionNotes: arr(parsed.conditionNotes),
    authenticityRisk: ['low', 'medium', 'high'].includes(parsed.authenticityRisk) ? parsed.authenticityRisk : 'low',
    questionsForSeller: arr(parsed.questionsForSeller).slice(0, 3),
    searchQueries: {
      exact: str(sq.exact) || name,
      model: str(sq.model) || str(sq.exact) || name,
      broad: str(sq.broad) || name,
    },
    reasoning: str(parsed.reasoning) || '',
  };
}

/**
 * @param {object} input
 * @param {Array<{data:string,mimeType:string}>} [input.images]  prepared images
 * @param {string} [input.text]        text-only description (when no images)
 * @param {object} [input.hints]       { filenames, userText, condition, category }
 * @param {number} [input.timeoutMs]
 */
export async function identifyItem(input) {
  const { images = [], text, hints = {}, timeoutMs = 40000 } = input;
  const hintBlock = buildHintBlock(hints);

  let task;
  if (images.length) {
    task = `Identify the item in ${images.length === 1 ? 'this photo' : `these ${images.length} photos (same item, different angles)`}.${hintBlock}`;
  } else {
    task = `No photo is available. Identify the item from this seller description as precisely as the text allows, and set identityConfidence accordingly.\n\nDescription: """${(text || '').slice(0, 2000)}"""${hintBlock}`;
  }

  const parts = [{ text: task }, ...imageParts(images)];
  const res = await generate({
    model: MODELS.identify,
    system: SYSTEM,
    parts,
    schema: SCHEMA,
    temperature: 0,
    thinking: process.env.GEMINI_IDENTIFY_THINKING || 'high',
    timeoutMs,
    maxOutputTokens: 4096,
    label: 'identify',
  });

  const result = normalise(res.json);
  if (!result) {
    throw new Error(`identify: model returned unparseable output (${res.text.slice(0, 120)})`);
  }
  result._meta = { model: MODELS.identify, elapsedMs: res.elapsedMs, usage: res.usage };
  return result;
}
