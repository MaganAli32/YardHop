/**
 * Appraisal pipeline v2 — orchestrator.
 *
 *   photos/text ─► identify ─┬─► verify (grounded) ─┐
 *                            └─► gather comps ──────┼─► filter comps ─► price ─► listing
 *
 * Every stage has its own time budget and a safe fallback, so a slow comp
 * search degrades the confidence score instead of killing the request.
 * The pipeline never fabricates a price: with no usable evidence it returns
 * status "insufficient_data" and tells the seller what would help.
 */
import { hasGeminiKey } from '../gemini.js';
import { withBudget } from '../gemini.js';
import { prepareImage } from './images.js';
import { identifyItem } from './identify.js';
import { verifyIdentification } from './verify.js';
import { gatherComps, filterComps } from './comps.js';
import { computeMarketPrice, overallConfidence } from './price.js';
import { writeListing, fallbackListing } from './listing.js';

export const PIPELINE_VERSION = '2.0.0';

const DEFAULT_BUDGET_MS = Number(process.env.APPRAISAL_BUDGET_MS || 85000);
const BUDGETS = {
  identify: Number(process.env.APPRAISAL_IDENTIFY_MS || 40000),
  verify: Number(process.env.APPRAISAL_VERIFY_MS || 25000),
  comps: Number(process.env.APPRAISAL_COMPS_MS || 28000),
  filter: Number(process.env.APPRAISAL_FILTER_MS || 15000),
  listing: Number(process.env.APPRAISAL_LISTING_MS || 20000),
};

function similarName(a, b) {
  const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2);
  const A = new Set(norm(a));
  const B = new Set(norm(b));
  if (!A.size || !B.size) return false;
  let shared = 0;
  for (const w of A) if (B.has(w)) shared++;
  return shared / Math.min(A.size, B.size) >= 0.6;
}

function decideStatus({ identification, pricing, confidence }) {
  if (!identification.isItemVisible || identification.identityLevel === 'unknown') return 'unidentified';
  if (!pricing) return 'insufficient_data';
  if (identification.identityLevel === 'category') return 'low_confidence';
  if (pricing.method !== 'comps' || confidence < 55) return 'low_confidence';
  return 'ok';
}

/**
 * @param {object} input
 * @param {Array<{buffer: Buffer, mimeType: string, filename?: string}>} [input.images]
 * @param {string} [input.text]         description when there is no photo
 * @param {string} [input.hint]         free-text note from the seller
 * @param {string} [input.condition]    seller-stated condition
 * @param {string} [input.category]     seller-stated category
 * @param {number} [input.budgetMs]     overall wall-clock budget
 * @param {(stage: string, data: any) => void} [input.onStage]  progress callback (eval/logging)
 */
export async function runAppraisal(input) {
  if (!hasGeminiKey()) throw new Error('GEMINI_API_KEY is not configured');
  const { images = [], text, hint, condition, category, budgetMs = DEFAULT_BUDGET_MS, onStage = () => {} } = input;
  if (!images.length && !(text && text.trim())) throw new Error('Provide at least one image or a description');

  const t0 = Date.now();
  const elapsed = () => Date.now() - t0;
  const remaining = () => Math.max(1000, budgetMs - elapsed());
  const timings = {};
  const diagnostics = { pipelineVersion: PIPELINE_VERSION, stages: {} };

  // 0. Prepare images
  let prepared = [];
  if (images.length) {
    const s = Date.now();
    prepared = await Promise.all(images.slice(0, 5).map((im) => prepareImage(im.buffer, im.mimeType)));
    timings.prepare = Date.now() - s;
    diagnostics.images = prepared.map((p) => ({ bytes: p.bytes, mimeType: p.mimeType, width: p.width, height: p.height }));
  }

  // 1. Identify (no fallback — without an identification there is nothing to price)
  let identification;
  {
    const s = Date.now();
    identification = await identifyItem({
      images: prepared,
      text,
      hints: { filenames: images.map((im) => im.filename).filter(Boolean), userText: hint, condition, category },
      timeoutMs: Math.min(BUDGETS.identify, remaining()),
    });
    timings.identify = Date.now() - s;
    diagnostics.stages.identify = { model: identification._meta?.model, level: identification.identityLevel, confidence: identification.identityConfidence };
    onStage('identify', identification);
  }
  if (condition && ['New', 'Like New', 'Good', 'Fair', 'Poor'].includes(condition)) {
    identification.condition = condition; // the seller can see what the camera cannot
  }

  if (!identification.isItemVisible || identification.identityLevel === 'unknown') {
    return finish({ identification, verification: null, comps: [], pricing: null, listing: null, timings, diagnostics, t0, status: 'unidentified' });
  }

  // 2 + 3. Verify identity and gather comps in parallel (comps use the vision query;
  //        they are re-filtered against the verified identity afterwards).
  const s23 = Date.now();
  const [verification, gathered] = await Promise.all([
    withBudget(verifyIdentification(identification, { timeoutMs: Math.min(BUDGETS.verify, remaining()) }), Math.min(BUDGETS.verify, remaining()), null, 'verify'),
    withBudget(gatherComps(identification.searchQueries, { timeoutMs: Math.min(BUDGETS.comps, remaining()) }), Math.min(BUDGETS.comps + 2000, remaining()), { comps: [], retail: null, diagnostics: { error: 'budget' } }, 'comps'),
  ]);
  timings.verifyAndComps = Date.now() - s23;
  diagnostics.stages.verify = verification ? { verified: verification.verified, canonicalName: verification.canonicalName, msrp: verification.msrp, corrected: Boolean(verification.correction), searchQueries: verification._meta?.searchQueries } : { grounded: false };
  diagnostics.stages.comps = gathered.diagnostics;
  onStage('verify', verification);
  onStage('comps', gathered);

  let comps = gathered.comps;
  let retail = gathered.retail;

  // Apply a verified correction to the identity and, if the name changed, re-run comps.
  if (verification?.correction && verification.canonicalName && !similarName(verification.canonicalName, identification.name)) {
    diagnostics.stages.correction = { from: identification.name, to: verification.canonicalName };
    identification.alternatives = [{ name: identification.name, likelihood: 0, howToTell: 'original photo identification, superseded by web lookup' }, ...identification.alternatives].slice(0, 4);
    identification.name = verification.canonicalName;
    identification.brand = verification.brand || identification.brand;
    identification.model = verification.model || identification.model;
    identification.variant = verification.variant || identification.variant;
    identification.referenceNumber = verification.referenceNumber || identification.referenceNumber;
    identification.searchQueries.exact = verification.compQuery || verification.canonicalName;
    if (remaining() > BUDGETS.comps * 0.6) {
      const s = Date.now();
      const again = await withBudget(gatherComps({ exact: identification.searchQueries.exact }, { timeoutMs: Math.min(BUDGETS.comps, remaining()) }), Math.min(BUDGETS.comps + 2000, remaining()), null, 'comps-retry');
      timings.compsRetry = Date.now() - s;
      if (again?.comps?.length) { comps = again.comps; retail = again.retail || retail; }
      diagnostics.stages.compsRetry = again?.diagnostics || { error: 'budget' };
    }
  } else if (verification?.verified) {
    identification.name = verification.canonicalName || identification.name;
    identification.referenceNumber = identification.referenceNumber || verification.referenceNumber;
  }

  // 4. Filter comps for relevance, then price deterministically.
  const s4 = Date.now();
  const relevant = comps.length
    ? await withBudget(filterComps(identification, comps, { timeoutMs: Math.min(BUDGETS.filter, remaining()) }), Math.min(BUDGETS.filter + 1000, remaining()), comps.map((c) => ({ ...c, match: 'similar' })), 'filter-comps')
    : [];
  timings.filter = Date.now() - s4;
  diagnostics.stages.filter = { in: comps.length, kept: relevant.length, exact: relevant.filter((c) => c.match === 'exact').length };
  onStage('filter', relevant);

  const pricing = computeMarketPrice({
    comps: relevant,
    retail,
    condition: identification.condition,
    category: identification.category,
    msrp: verification?.msrp || null,
    collectible: verification?.collectible || false,
  });
  onStage('price', pricing);

  // 5. Listing copy
  const s5 = Date.now();
  const ctx = { identification, verification, pricing };
  const listing = await withBudget(writeListing({ ...ctx, timeoutMs: Math.min(BUDGETS.listing, remaining()) }), Math.min(BUDGETS.listing + 1000, remaining()), fallbackListing(ctx), 'listing');
  timings.listing = Date.now() - s5;
  onStage('listing', listing);

  return finish({ identification, verification, comps: relevant, pricing, listing, timings, diagnostics, t0 });
}

function finish({ identification, verification, comps, pricing, listing, timings, diagnostics, t0, status }) {
  const priceConfidence = pricing?.confidenceScore ?? 0;
  const confidence = pricing ? overallConfidence(identification.identityConfidence, priceConfidence, identification.identityLevel) : 0;
  const finalStatus = status || decideStatus({ identification, pricing, confidence });
  timings.total = Date.now() - t0;

  const sourcesSummary = (() => {
    if (!pricing) return 'No comparable sales or retail data could be found for this item.';
    const sites = [...new Set(comps.map((c) => c.site).filter(Boolean))].slice(0, 4);
    if (pricing.method === 'comps') {
      const sold = comps.filter((c) => c.sold).length;
      return `Based on ${comps.length} comparable listings (${sold} sold) from ${sites.join(', ') || 'live market search'}${verification?.verified ? '; product identity confirmed by web lookup' : ''}.`;
    }
    if (pricing.method === 'retail') return `No sold comps found; estimate scaled from ${pricing.sourcesCount} current retail prices.`;
    return `No sold comps found; estimate derived from the original retail price of $${Math.round(verification?.msrp || 0).toLocaleString()}.`;
  })();

  const messages = {
    ok: null,
    low_confidence: 'This estimate is less certain than usual. Adding the photos below would improve it.',
    insufficient_data: 'We identified the item but could not find enough market data to price it confidently.',
    unidentified: 'We could not tell what this item is from the photo. Try a clearer, closer photo that shows any labels or logos.',
  };

  return {
    status: finalStatus,
    message: messages[finalStatus],
    pipelineVersion: PIPELINE_VERSION,
    identification,
    verification,
    pricing: pricing
      ? { ...pricing, confidenceScore: confidence, priceConfidence, sourcesSummary }
      : null,
    listing,
    comps: comps.map((c) => ({ price: c.price, site: c.site, sold: c.sold, condition: c.condition, title: c.title, match: c.match, url: c.url || null })),
    needsInput: identification.questionsForSeller,
    timings,
    diagnostics,
  };
}

/**
 * Shape the pipeline result into the response contract the frontend and
 * extension already consume, plus the new fields.
 */
export function toApiResponse(result, extra = {}) {
  const id = result.identification;
  const p = result.pricing;
  return {
    ...extra,
    status: result.status,
    message: result.message,
    item: {
      name: id.name,
      brand: id.brand,
      model: id.model,
      variant: id.variant,
      referenceNumber: id.referenceNumber,
      size: id.size,
      color: id.color,
      year: result.verification?.releaseYear || id.year,
      category: id.category,
      subcategory: id.subcategory,
      condition: id.condition,
      conditionNotes: id.conditionNotes,
      description: result.listing?.description || '',
      identityLevel: id.identityLevel,
      identityConfidence: id.identityConfidence,
      verified: Boolean(result.verification?.verified),
      msrp: result.verification?.msrp || null,
      authenticityRisk: id.authenticityRisk,
      alternatives: id.alternatives,
      visibleText: id.visibleText,
    },
    pricing: p
      ? {
          fair: p.priceFair,
          low: p.priceLow,
          high: p.priceHigh,
          confidenceScore: p.confidenceScore,
          priceConfidence: p.priceConfidence,
          method: p.method,
          sourcesSummary: p.sourcesSummary,
          sourcesCount: p.sourcesCount,
        }
      : null,
    listing: result.listing,
    comps: result.comps,
    sellerTips: result.listing?.sellerTips || [],
    needsInput: result.needsInput,
    elapsedSeconds: (result.timings.total / 1000).toFixed(1),
  };
}
