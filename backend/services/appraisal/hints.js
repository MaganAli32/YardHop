/**
 * Turn user-supplied context (filenames, free text) into identification hints.
 *
 * A filename like "cartier-santos-medium.jpg" is a strong clue; "IMG_0421.jpg"
 * is noise. Hints are passed to the vision model as *unverified* context.
 */

const GENERIC_PATTERNS = [
  /^(img|image|dsc[nf]?|dcim|pxl|mvimg|photo|pic|picture|snapshot|screenshot|screen shot|scan|untitled|new|file|download|unnamed|capture|camera|raw|edit|export|copy|temp|tmp|test|upload|attachment|received|whatsapp|signal|telegram|facetune|snapchat|instagram|fb|ig)[\s_\-]*[\d\s_\-]*$/i,
  /^\d+$/,
  /^[a-f0-9]{8,}$/i,
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
  /^\d{4}[-_]?\d{2}[-_]?\d{2}[\s_\-]*\d*$/, // date-stamped
  /^(iphone|android|pixel|samsung|galaxy)[\s_\-]*\d*$/i,
  /^(img|vid|image)\s+\d{6,}\s+[a-z]{1,3}\d+$/i, // WhatsApp: IMG-20260901-WA0004
  /^[a-z]{1,4}\s*\d{6,}(\s+\d+)*$/i,            // any short prefix + long digit run
];

/**
 * @param {string|null|undefined} filename
 * @returns {string|null} cleaned hint, or null when the name carries no information
 */
export function hintFromFilename(filename) {
  if (!filename || typeof filename !== 'string') return null;
  let base = filename.split(/[\\/]/).pop() || '';
  base = base.replace(/\.[a-z0-9]{2,5}$/i, ''); // extension
  base = base.replace(/\s*\(\d+\)\s*$/, ''); // "name (1)"
  base = base.replace(/[_\-.]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!base) return null;
  for (const re of GENERIC_PATTERNS) {
    if (re.test(base)) return null;
  }
  // Strip a trailing photo index ("watch 03" -> "watch", "... 2022 3" -> "... 2022")
  // but keep model numbers ("air jordan 1", "whoop 4 0").
  const words = base.split(' ');
  if (words.length > 1) {
    const last = words[words.length - 1];
    const prev = words[words.length - 2];
    if (/^0\d+$/.test(last) || (/^\d{1,2}$/.test(last) && /^(19|20)\d{2}$/.test(prev))) words.pop();
  }
  const cleaned = words.join(' ').trim();
  const letters = (cleaned.match(/[a-z]/gi) || []).length;
  if (letters < 3) return null;
  return cleaned.slice(0, 120);
}

/**
 * Merge every hint source into one short block for the prompt.
 * @param {{filenames?: string[], userText?: string, condition?: string, category?: string}} src
 */
export function buildHintBlock(src = {}) {
  const lines = [];
  const seen = new Set();
  for (const f of src.filenames || []) {
    const h = hintFromFilename(f);
    if (h && !seen.has(h.toLowerCase())) {
      seen.add(h.toLowerCase());
      lines.push(`Filename hint (may be wrong): "${h}"`);
    }
  }
  if (src.userText && src.userText.trim()) {
    lines.push(`Seller's note: "${src.userText.trim().slice(0, 600)}"`);
  }
  if (src.condition) lines.push(`Seller-stated condition: ${src.condition}`);
  if (src.category) lines.push(`Seller-stated category: ${src.category}`);
  if (!lines.length) return '';
  return `\nCONTEXT FROM THE SELLER (unverified; confirm against the photos, override if the photos disagree):\n${lines.join('\n')}\n`;
}
