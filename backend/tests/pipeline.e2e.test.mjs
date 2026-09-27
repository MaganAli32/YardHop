/**
 * End-to-end test of the orchestrator with a mocked Gemini API.
 * Exercises: identify → verify (grounded) → comps (grounded) → filter → price → listing,
 * including the "verification corrects the identity" branch and the unidentified path.
 * Run: node --test backend/tests
 */
import { test, before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-key';
delete process.env.SERPAPI_KEY;

const { runAppraisal, toApiResponse } = await import('../services/appraisal/index.js');
const { clearCompsCache } = await import('../services/appraisal/comps.js');

const realFetch = globalThis.fetch;
let calls = [];

function geminiReply(text, { grounded = false } = {}) {
  const candidate = { content: { parts: [{ text }] }, finishReason: 'STOP' };
  if (grounded) candidate.groundingMetadata = { webSearchQueries: ['q'], groundingChunks: [{ web: { title: 'eBay', uri: 'https://ebay.com/x' } }] };
  return new Response(JSON.stringify({ candidates: [candidate], usageMetadata: { totalTokenCount: 10 } }), { status: 200, headers: { 'content-type': 'application/json' } });
}

const IDENTIFY = {
  isItemVisible: true,
  name: 'Cartier Santos 100 steel',
  brand: 'Cartier', model: 'Santos', variant: 'Medium', referenceNumber: null, year: null, size: null, color: 'Silver', materials: ['stainless steel'],
  category: 'Watches', subcategory: 'Luxury watches',
  visibleText: ['Cartier', 'Santos de Cartier', 'automatic'], distinguishingFeatures: ['exposed screws on bezel', 'QuickSwitch bracelet'], includedItems: [],
  identityLevel: 'model', identityConfidence: 72,
  alternatives: [{ name: 'Santos de Cartier Medium WSSA0029', likelihood: 40, howToTell: 'caseback reference' }],
  condition: 'Good', conditionNotes: ['light hairline scratches on bracelet'], authenticityRisk: 'high',
  questionsForSeller: ['photo of caseback reference number'],
  searchQueries: { exact: 'Cartier Santos 100 steel medium', model: 'Cartier Santos', broad: 'luxury steel watch' },
  reasoning: 'dial text',
};

const VERIFY_TEXT = `Research shows the dial text "Santos de Cartier" belongs to the 2018+ line, not the Santos 100.
{"verified": true, "canonicalName": "Cartier Santos de Cartier Medium WSSA0029", "brand": "Cartier", "model": "Santos de Cartier", "variant": "Medium, steel", "referenceNumber": "WSSA0029", "msrpUsd": 7050, "releaseYear": "2018", "specs": ["35.1mm steel case", "automatic 1847 MC"], "discontinued": false, "collectible": false, "correction": "Santos de Cartier (2018 line) rather than Santos 100", "compQuery": "Cartier Santos de Cartier Medium WSSA0029", "notes": "confirmed"}`;

const COMPS_TEXT = `COMP: $5,200 | eBay | SOLD | Pre-owned | Cartier Santos de Cartier Medium WSSA0029 Steel Automatic
COMP: $5,450 | eBay | SOLD | Pre-owned | Cartier Santos de Cartier WSSA0029 medium box papers
COMP: $4,900 | Chrono24 | LISTED | Very good | Santos de Cartier Medium WSSA0029
COMP: $5,100 | Mercari | SOLD | Good | Cartier Santos de Cartier Medium
COMP: $180 | eBay | SOLD | New | Cartier Santos WSSA0029 steel bracelet strap only
COMP: $3,950 | eBay | SOLD | Pre-owned | Cartier Santos 100 XL steel automatic`;

const FILTER = { ratings: [
  { i: 0, match: 'exact', partial: false }, { i: 1, match: 'exact', partial: false }, { i: 2, match: 'exact', partial: false },
  { i: 3, match: 'similar', partial: false }, { i: 4, match: 'unrelated', partial: false }, { i: 5, match: 'similar', partial: false },
] };

const LISTING = {
  title: 'Cartier Santos de Cartier Medium WSSA0029 Steel Automatic Watch',
  description: 'Cartier Santos de Cartier in steel...\n\nDetails\n• Reference WSSA0029\n• Condition: Good',
  highlights: ['Reference WSSA0029', 'Automatic movement'], conditionSummary: 'Good with light hairline scratches on bracelet.',
  sellerTips: ['Photograph the caseback', 'Include proof of authenticity', 'List near $5,200'], keywords: ['cartier', 'santos'],
};

function mockFetch(overrides = {}) {
  return async (url, init) => {
    const body = JSON.parse(init.body);
    const prompt = body.contents[0].parts.map((p) => p.text || '').join('\n');
    const label = body.generationConfig?.responseSchema?.properties?.identityLevel ? 'identify'
      : body.generationConfig?.responseSchema?.properties?.ratings ? 'filter'
      : body.generationConfig?.responseSchema?.properties?.sellerTips ? 'listing'
      : /confirm it against real product information/.test(prompt) ? 'verify'
      : /recently sold for/.test(prompt) ? 'comps'
      : 'unknown';
    calls.push({ label, model: decodeURIComponent(String(url).split('/models/')[1].split(':')[0]), search: Boolean(body.tools), prompt });
    if (overrides[label]) return overrides[label](prompt, body);
    switch (label) {
      case 'identify': return geminiReply(JSON.stringify(IDENTIFY));
      case 'verify': return geminiReply(VERIFY_TEXT, { grounded: true });
      case 'comps': return geminiReply(COMPS_TEXT, { grounded: true });
      case 'filter': return geminiReply(JSON.stringify(FILTER));
      case 'listing': return geminiReply(JSON.stringify(LISTING));
      default: throw new Error(`unexpected call: ${prompt.slice(0, 80)}`);
    }
  };
}

before(() => { globalThis.fetch = mockFetch(); });
beforeEach(() => { clearCompsCache(); calls = []; });
after(() => { globalThis.fetch = realFetch; });

const fakeImage = { buffer: Buffer.from('not-really-an-image'), mimeType: 'image/jpeg', filename: 'cartier-santos.jpg' };

test('full pipeline: verification corrects identity, comps are filtered, price is deterministic', async () => {
  calls = [];
  const stages = [];
  const result = await runAppraisal({ images: [fakeImage], hint: 'my friend\'s watch', onStage: (s) => stages.push(s) });

  assert.deepEqual(stages, ['identify', 'verify', 'comps', 'filter', 'price', 'listing']);
  assert.equal(result.status, 'ok');
  assert.equal(result.identification.name, 'Cartier Santos de Cartier Medium WSSA0029');
  assert.equal(result.identification.referenceNumber, 'WSSA0029');
  assert.equal(result.identification.condition, 'Good');
  assert.equal(result.verification.msrp, 7050);
  assert.ok(result.diagnostics.stages.correction, 'correction recorded');
  // Strap-only listing dropped; 5 relevant comps remain.
  assert.equal(result.comps.length, 5);
  assert.ok(!result.comps.some((c) => /strap only/.test(c.title)));
  assert.equal(result.pricing.method, 'comps');
  assert.ok(result.pricing.priceFair >= 4500 && result.pricing.priceFair <= 5500, `fair ${result.pricing.priceFair}`);
  assert.ok(result.pricing.priceHigh <= 7050 * 1.1);
  assert.ok(result.pricing.confidenceScore <= 85, 'capped by model-level identification');
  assert.equal(result.listing.title, LISTING.title);
  assert.equal(result.listing.generated, true);

  // Hints reached the identify prompt; the identify call used the strong model; grounded calls used search.
  const identify = calls.find((c) => c.label === 'identify');
  assert.match(identify.prompt, /Filename hint \(may be wrong\): "cartier santos"/);
  assert.match(identify.prompt, /Seller's note: "my friend's watch"/);
  assert.ok(calls.filter((c) => c.label === 'verify').every((c) => c.search));
  assert.ok(calls.filter((c) => c.label === 'comps').every((c) => c.search));
  // After the correction the comps were re-run with the verified query.
  assert.ok(calls.some((c) => c.label === 'comps' && /WSSA0029/.test(c.prompt)));

  const api = toApiResponse(result, { appraisalId: 'abc' });
  assert.equal(api.appraisalId, 'abc');
  assert.equal(api.item.name, result.identification.name);
  assert.equal(api.item.description, LISTING.description);
  assert.equal(api.pricing.fair, result.pricing.priceFair);
  assert.equal(api.sellerTips.length, 3);
});

test('unidentified photo returns no price and asks for better input', async () => {
  globalThis.fetch = mockFetch({
    identify: () => geminiReply(JSON.stringify({ ...IDENTIFY, isItemVisible: false, name: 'Unidentified item', identityLevel: 'unknown', identityConfidence: 5, questionsForSeller: ['a photo showing the whole item', 'any label or logo'] })),
  });
  const result = await runAppraisal({ images: [fakeImage] });
  assert.equal(result.status, 'unidentified');
  assert.equal(result.pricing, null);
  assert.equal(result.listing, null);
  assert.deepEqual(result.needsInput, ['a photo showing the whole item', 'any label or logo']);
  const api = toApiResponse(result);
  assert.equal(api.pricing, null);
  assert.match(api.message, /could not tell/);
  globalThis.fetch = mockFetch();
});

test('no comps + verified MSRP → msrp-based low-confidence estimate, not a made-up $50', async () => {
  globalThis.fetch = mockFetch({
    comps: () => geminiReply('NONE', { grounded: true }),
    verify: () => geminiReply(VERIFY_TEXT.replace('"correction": "Santos de Cartier (2018 line) rather than Santos 100"', '"correction": null'), { grounded: true }),
  });
  const result = await runAppraisal({ images: [fakeImage] });
  assert.equal(result.pricing.method, 'msrp');
  assert.equal(result.status, 'low_confidence');
  assert.ok(result.pricing.priceFair > 3000 && result.pricing.priceFair < 6000, `fair ${result.pricing.priceFair}`);
  assert.match(result.pricing.sourcesSummary, /original retail price/);
  globalThis.fetch = mockFetch();
});

test('ungrounded verify/comps are discarded → insufficient_data', async () => {
  globalThis.fetch = mockFetch({
    comps: () => geminiReply(COMPS_TEXT, { grounded: false }),
    verify: () => geminiReply(VERIFY_TEXT, { grounded: false }),
  });
  const result = await runAppraisal({ images: [fakeImage] });
  assert.equal(result.verification, null);
  assert.equal(result.comps.length, 0);
  assert.equal(result.pricing, null);
  assert.equal(result.status, 'insufficient_data');
  assert.ok(result.listing, 'listing copy still produced from identification');
  globalThis.fetch = mockFetch();
});

test('text-only input works and seller condition overrides the model', async () => {
  const result = await runAppraisal({ text: 'Cartier Santos medium steel watch', condition: 'Like New' });
  assert.equal(result.identification.condition, 'Like New');
  assert.equal(result.status, 'ok');
  const identify = calls.filter((c) => c.label === 'identify').pop();
  assert.match(identify.prompt, /No photo is available/);
});
