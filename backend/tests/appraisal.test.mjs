/**
 * Unit tests for the deterministic parts of the appraisal pipeline.
 * Run: node --test backend/tests
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hintFromFilename, buildHintBlock } from '../services/appraisal/hints.js';
import { parseCompLines } from '../services/appraisal/comps.js';
import { computeMarketPrice, overallConfidence, roundPrice } from '../services/appraisal/price.js';
import { extractJson } from '../services/gemini.js';
import { fallbackListing } from '../services/appraisal/listing.js';

test('hintFromFilename ignores camera-generated names', () => {
  for (const f of ['IMG_0421.jpg', 'img.01.png', 'DSC00123.JPG', 'PXL_20260901_101010.jpg', 'Screenshot 2026-09-01.png',
    'photo (3).heic', '2026-09-01.jpg', 'a3f9c2d1e0b4.jpg', 'unnamed.png', 'image 2.jpeg', 'IMG-20260901-WA0004.jpg']) {
    assert.equal(hintFromFilename(f), null, f);
  }
});

test('hintFromFilename keeps descriptive names and strips extension/separators', () => {
  assert.equal(hintFromFilename('cartier-santos-medium.jpg'), 'cartier santos medium');
  assert.equal(hintFromFilename('Whoop_4.0_band (1).HEIC'), 'Whoop 4 0 band');
  assert.equal(hintFromFilename('jordan 1 chicago 2022 03.jpg'), 'jordan 1 chicago 2022');
  assert.equal(hintFromFilename('/uploads/Pioneer DDJ-FLX4.png'), 'Pioneer DDJ FLX4');
});

test('buildHintBlock dedupes filenames and includes the note', () => {
  const block = buildHintBlock({ filenames: ['rolex-sub.jpg', 'rolex_sub.jpg', 'IMG_1.jpg'], userText: 'bought 2019', condition: 'Good' });
  assert.equal((block.match(/Filename hint/g) || []).length, 1);
  assert.match(block, /Seller's note: "bought 2019"/);
  assert.match(block, /Seller-stated condition: Good/);
  assert.equal(buildHintBlock({}), '');
});

test('parseCompLines handles 4- and 5-field lines, bullets and commas', () => {
  const text = `Here is what I found:
COMP: $1,250.00 | eBay | SOLD | Pre-owned | Cartier Santos de Cartier Medium WSSA0029 Steel
- COMP: $980 | Chrono24 | LISTED | Cartier Santos Medium steel
COMP: $45 | Mercari | SOLD | Cartier Santos strap only
COMP: $0 | eBay | SOLD | junk
not a comp line`;
  const comps = parseCompLines(text, 'q');
  assert.equal(comps.length, 3);
  assert.deepEqual(comps[0], { price: 1250, site: 'eBay', sold: true, condition: 'Pre-owned', title: 'Cartier Santos de Cartier Medium WSSA0029 Steel', source: 'grounded_search', query: 'q' });
  assert.equal(comps[1].sold, false);
  assert.equal(comps[1].condition, null);
  assert.equal(comps[1].title, 'Cartier Santos Medium steel');
});

test('computeMarketPrice weights sold + exact comps and trims outliers', () => {
  const comps = [
    { price: 5000, sold: true, match: 'exact' },
    { price: 5200, sold: true, match: 'exact' },
    { price: 4800, sold: true, match: 'exact' },
    { price: 5500, sold: false, match: 'similar' },
    { price: 90000, sold: false, match: 'similar' }, // outlier
  ];
  const r = computeMarketPrice({ comps, condition: 'Good', category: 'Watches' });
  assert.equal(r.method, 'comps');
  assert.ok(r.priceLow >= 4500 && r.priceLow <= 5100, `low ${r.priceLow}`);
  assert.ok(r.priceHigh >= 5000 && r.priceHigh <= 5600, `high ${r.priceHigh}`);
  assert.ok(r.priceFair >= r.priceLow && r.priceFair <= r.priceHigh);
  assert.ok(r.confidenceScore > 50);
  assert.equal(r.sourcesCount, 5);
  // Deterministic
  assert.deepEqual(computeMarketPrice({ comps, condition: 'Good', category: 'Watches' }), r);
});

test('computeMarketPrice caps non-collectibles at MSRP', () => {
  const comps = [
    { price: 400, sold: true, match: 'exact' },
    { price: 450, sold: true, match: 'exact' },
    { price: 500, sold: true, match: 'exact' },
  ];
  const r = computeMarketPrice({ comps, condition: 'Like New', category: 'Wearables', msrp: 239 });
  assert.ok(r.priceHigh <= roundPrice(239 * 1.1) + 5, `high ${r.priceHigh}`);
  const c = computeMarketPrice({ comps, condition: 'Like New', category: 'Sneakers', msrp: 180, collectible: true });
  assert.ok(c.priceHigh >= 450, `collectible high ${c.priceHigh}`);
});

test('computeMarketPrice falls back to retail then MSRP, never invents', () => {
  const retail = computeMarketPrice({ comps: [], retail: { prices: [100, 110, 120] }, condition: 'Good', category: 'Electronics' });
  assert.equal(retail.method, 'retail');
  assert.ok(retail.priceFair > 30 && retail.priceFair < 80);
  const msrp = computeMarketPrice({ comps: [], condition: 'Fair', category: 'Watches', msrp: 7000 });
  assert.equal(msrp.method, 'msrp');
  assert.ok(msrp.priceFair > 3000 && msrp.priceFair < 5000, `fair ${msrp.priceFair}`);
  const single = computeMarketPrice({ comps: [{ price: 100, sold: true, match: 'exact' }], condition: 'Like New' });
  assert.equal(single.method, 'comps');
  assert.equal(single.confidenceScore, 35);
  assert.equal(single.priceFair, 100);
  assert.equal(computeMarketPrice({ comps: [], condition: 'Good' }), null);
});

test('overallConfidence is capped by identification quality', () => {
  assert.equal(overallConfidence(95, 90, 'exact'), 90);
  assert.equal(overallConfidence(95, 90, 'category'), 45);
  assert.equal(overallConfidence(40, 90, 'exact'), 40);
  assert.equal(overallConfidence(5, 90, 'unknown'), 10);
});

test('extractJson tolerates fences and prose', () => {
  assert.deepEqual(extractJson('{"a":1}'), { a: 1 });
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Based on my search... {"verified": true, "msrpUsd": 7050} hope this helps'), { verified: true, msrpUsd: 7050 });
  assert.equal(extractJson('no json here'), null);
});

test('fallbackListing produces usable copy without a model', () => {
  const l = fallbackListing({
    identification: { name: 'WHOOP 4.0', brand: 'WHOOP', model: '4.0', condition: 'Good', conditionNotes: ['light wear on band'], distinguishingFeatures: ['Onyx SuperKnit band'], authenticityRisk: 'low', category: 'Wearables' },
    verification: null,
    pricing: { priceFair: 60, priceHigh: 80, priceLow: 45 },
  });
  assert.equal(l.title, 'WHOOP 4.0');
  assert.match(l.description, /Details/);
  assert.equal(l.sellerTips.length, 3);
  assert.equal(l.generated, false);
});
