/**
 * Stage 2 — Verification against the live web.
 *
 * The vision model can name a product that does not exist or mix up two
 * similar models. Here a Google-Search-grounded call checks the candidate
 * name, returns the canonical product name, reference, MSRP and release year,
 * and proposes a correction when the identification looks wrong. Results
 * without grounding metadata are discarded (the model answered from memory).
 */
import { generate, MODELS } from '../gemini.js';

function describeCandidate(id) {
  const lines = [
    `Best guess: ${id.name}`,
    id.brand ? `Brand: ${id.brand}` : null,
    id.model ? `Model: ${id.model}` : null,
    id.variant ? `Variant: ${id.variant}` : null,
    id.referenceNumber ? `Reference/model number seen: ${id.referenceNumber}` : null,
    id.size ? `Size: ${id.size}` : null,
    id.color ? `Color: ${id.color}` : null,
    id.visibleText?.length ? `Text visible on the item: ${id.visibleText.map((t) => `"${t}"`).join(', ')}` : null,
    id.distinguishingFeatures?.length ? `Features: ${id.distinguishingFeatures.join('; ')}` : null,
    id.alternatives?.length ? `Other possibilities: ${id.alternatives.map((a) => `${a.name} (${a.likelihood}%)`).join(', ')}` : null,
    `Identification level: ${id.identityLevel}, confidence ${id.identityConfidence}%`,
  ];
  return lines.filter(Boolean).join('\n');
}

function normalise(parsed, id) {
  if (!parsed || typeof parsed !== 'object') return null;
  const str = (v) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const num = (v) => {
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) return v;
    if (typeof v === 'string') {
      const n = parseFloat(v.replace(/[^0-9.]/g, ''));
      if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
  };
  return {
    verified: parsed.verified === true,
    canonicalName: str(parsed.canonicalName) || id.name,
    brand: str(parsed.brand) || id.brand,
    model: str(parsed.model) || id.model,
    variant: str(parsed.variant) || id.variant,
    referenceNumber: str(parsed.referenceNumber) || id.referenceNumber,
    msrp: num(parsed.msrpUsd),
    releaseYear: str(parsed.releaseYear) || id.year,
    specs: Array.isArray(parsed.specs) ? parsed.specs.filter((s) => typeof s === 'string').slice(0, 8) : [],
    discontinued: parsed.discontinued === true,
    collectible: parsed.collectible === true,
    correction: str(parsed.correction),
    compQuery: str(parsed.compQuery) || id.searchQueries.exact,
    notes: str(parsed.notes),
  };
}

/**
 * @param {object} id   result of identifyItem
 * @param {{timeoutMs?: number}} [opts]
 * @returns {Promise<object|null>} null when verification could not be grounded
 */
export async function verifyIdentification(id, opts = {}) {
  const { timeoutMs = 25000 } = opts;
  if (!id || id.identityLevel === 'unknown' || id.identityLevel === 'category') return null;

  const prompt = `I identified a secondhand item from photos and need to confirm it against real product information before pricing it.

${describeCandidate(id)}

Please search the web and answer these questions about this product:
1. Does this exact product exist under this name? What is its official, canonical product name and model/reference number?
2. What was its original retail price in USD (MSRP) and release year?
3. What are its key specs or defining details (2–6 short facts)?
4. Is it discontinued, limited, or collectible (sells above retail on the secondhand market)?
5. If my identification looks wrong, confused with a similar model, or too vague, what is the most likely correct product given the visible text and features above?
6. What is the best 4–8 word eBay search to find SOLD listings of this exact item?

After researching, finish your answer with a single JSON object in this exact shape (no markdown fence):
{"verified": true|false, "canonicalName": "...", "brand": "...", "model": "...", "variant": "..." or null, "referenceNumber": "..." or null, "msrpUsd": number or null, "releaseYear": "..." or null, "specs": ["..."], "discontinued": true|false, "collectible": true|false, "correction": "explanation if my identification was wrong, else null", "compQuery": "...", "notes": "one sentence"}`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await generate({
      model: MODELS.fast,
      parts: [{ text: prompt }],
      search: true,
      temperature: 0,
      thinking: 'low',
      timeoutMs,
      label: 'verify',
    });
    if (!res.grounded) {
      console.warn(`[appraisal] verify: model skipped web search (attempt ${attempt})`);
      continue;
    }
    const out = normalise(res.json, id);
    if (!out) {
      console.warn('[appraisal] verify: no JSON in grounded answer');
      return null;
    }
    out._meta = { model: MODELS.fast, elapsedMs: res.elapsedMs, searchQueries: res.searchQueries, sources: res.sources.slice(0, 8) };
    return out;
  }
  return null;
}
