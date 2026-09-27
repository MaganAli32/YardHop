#!/usr/bin/env node
/**
 * Appraisal pipeline evaluator — run the real pipeline on local photos and
 * see every stage, so accuracy can be checked before launch.
 *
 *   node backend/scripts/appraise-eval.mjs photos/cartier-1.jpg photos/cartier-2.jpg
 *   node backend/scripts/appraise-eval.mjs photos/whoop.jpg --hint "whoop band" --condition Good
 *   node backend/scripts/appraise-eval.mjs --text "Pioneer DDJ-FLX4 DJ controller"
 *   node backend/scripts/appraise-eval.mjs --dir ./test-images        # every image, one appraisal each
 *   node backend/scripts/appraise-eval.mjs --dir ./test-images --json out.json
 *
 * Reads GEMINI_API_KEY / SERPAPI_KEY from the environment or ./.env.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

// Minimal .env loader (no dotenv dependency needed).
const envPath = path.join(root, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const args = process.argv.slice(2);
const opt = { files: [], hint: null, text: null, condition: null, dir: null, json: null, quiet: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--hint') opt.hint = args[++i];
  else if (a === '--text') opt.text = args[++i];
  else if (a === '--condition') opt.condition = args[++i];
  else if (a === '--dir') opt.dir = args[++i];
  else if (a === '--json') opt.json = args[++i];
  else if (a === '--quiet') opt.quiet = true;
  else opt.files.push(a);
}

if (!process.env.GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set (put it in .env or the environment).');
  process.exit(1);
}

const { runAppraisal } = await import('../services/appraisal/index.js');

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.heic': 'image/heic', '.heif': 'image/heif', '.gif': 'image/gif' };

function loadImage(file) {
  const ext = path.extname(file).toLowerCase();
  if (!MIME[ext]) return null;
  return { buffer: fs.readFileSync(file), mimeType: MIME[ext], filename: path.basename(file) };
}

const money = (n) => (n == null ? '—' : `$${Number(n).toLocaleString()}`);
const log = (...a) => { if (!opt.quiet) console.log(...a); };

async function runOne(label, images, text) {
  log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  log(`▶ ${label}`);
  const t0 = Date.now();
  try {
    const result = await runAppraisal({
      images,
      text,
      hint: opt.hint || undefined,
      condition: opt.condition || undefined,
      onStage: (stage, data) => {
        const dt = ((Date.now() - t0) / 1000).toFixed(1);
        if (stage === 'identify') {
          log(`  [${dt}s] identify → ${data.name}`);
          log(`         level=${data.identityLevel} confidence=${data.identityConfidence}% brand=${data.brand} model=${data.model} variant=${data.variant} ref=${data.referenceNumber} size=${data.size}`);
          if (data.visibleText.length) log(`         visible text: ${data.visibleText.join(' | ')}`);
          if (data.alternatives.length) log(`         alternatives: ${data.alternatives.map((a) => `${a.name} (${a.likelihood}%)`).join('; ')}`);
          log(`         condition=${data.condition} notes=${data.conditionNotes.join('; ') || '-'}`);
          log(`         queries: exact="${data.searchQueries.exact}" model="${data.searchQueries.model}"`);
        } else if (stage === 'verify') {
          if (!data) log(`  [${dt}s] verify → (not grounded / skipped)`);
          else log(`  [${dt}s] verify → verified=${data.verified} canonical="${data.canonicalName}" msrp=${money(data.msrp)} year=${data.releaseYear} collectible=${data.collectible}${data.correction ? `\n         CORRECTION: ${data.correction}` : ''}`);
        } else if (stage === 'comps') {
          log(`  [${dt}s] comps → ${data.comps.length} raw comps, retail=${data.retail ? data.retail.count : 0}; ${JSON.stringify(data.diagnostics)}`);
        } else if (stage === 'filter') {
          log(`  [${dt}s] filter → ${data.length} relevant comps`);
          for (const c of data.slice(0, 12)) log(`         ${c.match === 'exact' ? '★' : '·'} ${c.sold ? 'SOLD  ' : 'LISTED'} ${money(c.price).padStart(9)}  ${c.site.padEnd(10)} ${c.title.slice(0, 80)}`);
        } else if (stage === 'price') {
          log(`  [${dt}s] price → ${data ? `${money(data.priceFair)} (${money(data.priceLow)}–${money(data.priceHigh)}) via ${data.method}, ${data.confidenceScore}%` : 'NONE'}`);
        } else if (stage === 'listing') {
          log(`  [${dt}s] listing → "${data.title}" (${data.generated ? 'model' : 'template'})`);
        }
      },
    });
    log(`\n  RESULT: status=${result.status}  ${result.identification.name}`);
    log(`  price: ${result.pricing ? `${money(result.pricing.priceFair)} range ${money(result.pricing.priceLow)}–${money(result.pricing.priceHigh)} confidence ${result.pricing.confidenceScore}%` : 'none'}`);
    if (result.message) log(`  message: ${result.message}`);
    if (result.needsInput?.length) log(`  needs: ${result.needsInput.join(' / ')}`);
    log(`  timings: ${JSON.stringify(result.timings)}`);
    if (result.listing) log(`\n  ${result.listing.description.split('\n').join('\n  ')}`);
    return { label, ok: true, result };
  } catch (err) {
    log(`  ✖ FAILED after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${err.message}`);
    return { label, ok: false, error: err.message };
  }
}

const runs = [];
if (opt.text) {
  runs.push(await runOne(`text: ${opt.text}`, [], opt.text));
}
if (opt.files.length) {
  const images = opt.files.map(loadImage).filter(Boolean);
  runs.push(await runOne(opt.files.join(', '), images, undefined));
}
if (opt.dir) {
  const files = fs.readdirSync(opt.dir).filter((f) => MIME[path.extname(f).toLowerCase()]).sort();
  for (const f of files) {
    const im = loadImage(path.join(opt.dir, f));
    runs.push(await runOne(f, [im], undefined));
  }
}
if (!runs.length) {
  console.error('Nothing to run. Pass image files, --text, or --dir.');
  process.exit(1);
}

console.log('\n══════════════════════════ SUMMARY ══════════════════════════');
for (const r of runs) {
  if (!r.ok) { console.log(`✖ ${r.label}: ${r.error}`); continue; }
  const { result } = r;
  console.log(`${result.status === 'ok' ? '✔' : '△'} ${r.label}\n    → ${result.identification.name} [${result.identification.identityLevel} ${result.identification.identityConfidence}%] ${result.pricing ? `${money(result.pricing.priceFair)} (${result.pricing.confidenceScore}%)` : 'no price'} ${(result.timings.total / 1000).toFixed(1)}s`);
}
if (opt.json) {
  fs.writeFileSync(opt.json, JSON.stringify(runs, null, 2));
  console.log(`\nWrote ${opt.json}`);
}
