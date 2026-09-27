# Appraisal pipeline v2

The appraisal backend was rebuilt (September 2026) because the v1 flow — one
Gemini Flash call guessing a name and a 3–5 word eBay query, then a single
grounded search — misidentified items without obvious text (Whoop band,
Cartier Santos), timed out (two 28 s searches inside a 50 s budget), and
fell back to a made-up "$50, confidence 15" result when anything failed.

## Flow

```
photos / text
   │
   ▼
1. identify   gemini-pro-latest, structured JSON, all photos + hints
   │          reads visible text, names brand/model/variant/reference,
   │          identityLevel (exact|model|brand|category|unknown) + confidence,
   │          alternatives, condition notes, questionsForSeller, search queries
   ├──────────────────────────────┐
   ▼                              ▼
2. verify (grounded)           3. comps (parallel sources)
   gemini-flash + Google Search     • grounded search, exact query
   confirms the product exists,     • grounded search, model query
   canonical name, reference,       • SerpAPI eBay SOLD listings   (if SERPAPI_KEY)
   MSRP, release year, specs,       • SerpAPI Google Shopping retail (if SERPAPI_KEY)
   collectible flag, correction     rejected unless grounding metadata proves a search ran
   │                              │
   └──── correction? re-run comps with the verified query ────┘
                    │
                    ▼
4. filter comps   gemini-flash JSON: exact / similar / unrelated, parts-or-bundle
                  drops straps, chargers, boxes, lots, replicas, look-alikes
                    │
                    ▼
5. price          pure function (services/appraisal/price.js)
                  sold ×2, exact ×2 weighting · IQR outlier trim · P25/P50/P75
                  condition factor · MSRP cap for non-collectibles
                  fallbacks: retail×retention → MSRP×depreciation → null
                    │
                    ▼
6. listing        gemini-flash JSON from VERIFIED facts only:
                  title (≤80), description + "Details" bullets, highlights,
                  condition summary, 3 seller tips, keywords (template fallback)
```

Files: `backend/services/gemini.js` (REST client), `backend/services/appraisal/`
(`hints.js`, `images.js`, `identify.js`, `verify.js`, `comps.js`, `price.js`,
`listing.js`, `index.js`). Routes: `backend/routes/appraise.js` (web + v1 API),
`backend/routes/extension.js` (browser extension) — both call `runAppraisal()`.

## Status instead of fake numbers

Every result carries `status`:

| status | meaning | pricing |
|---|---|---|
| `ok` | identity at model/exact level, priced from comps, confidence ≥ 55 | yes |
| `low_confidence` | priced from retail/MSRP, or identity only at category level | yes, flagged |
| `insufficient_data` | identified but no comps, retail or MSRP found | `null` |
| `unidentified` | model could not tell what the item is | `null`, does **not** use a free credit |

`needsInput` lists the photos/details that would raise confidence (e.g. "photo of
caseback reference number"). The frontend shows the message and the list.

Confidence = min(identity confidence, price confidence, cap by identity level).
A perfect comp set for a "category"-level identification never shows above 45%.

## Inputs

`POST /api/appraise` (multipart):

| field | notes |
|---|---|
| `image` | single photo (legacy field, still supported) |
| `images` | up to 5 photos of the same item — more angles = better identification |
| `hint` / `description` | free text; with photos it is a hint, without photos it is the item |
| `condition` | New / Like New / Good / Fair / Poor — overrides what the camera guessed |
| `category` | optional |

Filenames are parsed as hints (`cartier-santos-medium.jpg` → "cartier santos
medium"); camera names (`IMG_0421.jpg`, `img.01.png`, WhatsApp names) are ignored.
Hints are always marked *unverified* in the prompt so a wrong filename cannot
override what the photo shows.

Images are downscaled to 1600 px JPEG (EXIF-rotated) before upload to the model.

## Response (superset of v1)

```jsonc
{
  "status": "ok",
  "message": null,
  "item": { "name", "brand", "model", "variant", "referenceNumber", "size", "color", "year",
            "category", "condition", "conditionNotes", "description",   // description = listing copy
            "identityLevel", "identityConfidence", "verified", "msrp", "authenticityRisk", "alternatives" },
  "pricing": { "fair", "low", "high", "confidenceScore", "priceConfidence", "method", "sourcesSummary", "sourcesCount" },
  "listing": { "title", "description", "highlights", "conditionSummary", "sellerTips", "keywords" },
  "comps": [ { "price", "site", "sold", "condition", "title", "match", "url" } ],
  "sellerTips": [...], "needsInput": [...], "appraisalId", "elapsedSeconds"
}
```

## Database

Run `database/migrations/021_appraisals_v2.sql`. New columns on `appraisals`:
`item_model`, `item_variant`, `item_reference`, `item_attributes` (JSONB),
`identity_level`, `identity_confidence`, `verified`, `msrp`, `comp_query`,
`listing_title`, `listing_description`, `listing_highlights`, `comps`,
`price_method`, `status`, `pipeline_version`, `hint`, `diagnostics`.

Until the migration runs, inserts automatically fall back to the legacy columns.
`listing_title` + `listing_description` are what should pre-fill a marketplace
listing; `item_name` stays the canonical product name.

## Configuration

| env | default | purpose |
|---|---|---|
| `GEMINI_API_KEY` | — | required |
| `SERPAPI_KEY` | — | optional; adds real eBay **sold** comps and retail anchor. Strongly recommended for launch |
| `GEMINI_IDENTIFY_MODEL` | `gemini-pro-latest` | vision identification |
| `GEMINI_FAST_MODEL` | `gemini-flash-latest` | verify / comps / filter / listing |
| `GEMINI_IDENTIFY_THINKING` | `high` | thinking level for identification |
| `APPRAISAL_BUDGET_MS` | 85000 | total pipeline budget; stages degrade gracefully |
| `APPRAISAL_TIMEOUT_MS` | 95000 | hard request timeout (504) |
| `APPRAISAL_IDENTIFY_MS` / `_VERIFY_MS` / `_COMPS_MS` / `_FILTER_MS` / `_LISTING_MS` | 40s/25s/28s/15s/20s | per-stage budgets |

`vercel.json` sets `maxDuration: 120` for the API function. Typical runs are
20–40 s; identification with the pro model is the slowest stage.

## Testing

```bash
npm test                                             # unit + mocked end-to-end (no keys needed)
npm run appraise:eval -- photos/cartier.jpg          # real pipeline, prints every stage
npm run appraise:eval -- --dir ./test-images --json out.json
npm run appraise:eval -- photos/whoop.jpg --hint "whoop band" --condition Good
npm run appraise:eval -- --text "Pioneer DDJ-FLX4"
```

The eval script prints identification (with visible text and alternatives),
verification (canonical name, MSRP, correction), every comp kept after
filtering, the price method and the listing copy — so a wrong answer can be
traced to the stage that produced it.

### Launch accuracy checklist

1. Build a folder of 20–30 real seller photos across categories (watches,
   sneakers, DJ gear, wearables, furniture) including "bad" photos.
2. Run `--dir` and check, per item: identity correct at the stated level?
   verified? comps actually the same product? price within the eBay sold range?
3. Anything wrong: look at which stage drifted. Identification → add more photos
   / improve `identify.js` prompt; comps → check `filter` kept the right rows;
   price → check MSRP cap and condition factor.
4. Enable `SERPAPI_KEY` in production: grounded search alone can return few
   comps for niche items; eBay sold data is the most reliable source.
