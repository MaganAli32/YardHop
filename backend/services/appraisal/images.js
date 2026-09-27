/**
 * Image preparation for the vision model.
 *
 * Phones upload 5–20 MB HEIC/JPEG files. We downscale to a size the model
 * reads well (details like dial text survive at ~1600px), fix EXIF rotation,
 * and normalise to JPEG so every image goes to Gemini the same way. If sharp
 * cannot decode the file (e.g. HEIC without libheif), the original bytes are
 * sent unchanged — Gemini accepts HEIC/HEIF natively.
 */

const MAX_EDGE = Number(process.env.APPRAISAL_IMAGE_MAX_EDGE || 1600);
const JPEG_QUALITY = 88;

let sharpModule = null;
async function getSharp() {
  if (sharpModule !== null) return sharpModule;
  try {
    const mod = await import('sharp');
    sharpModule = mod.default || mod;
  } catch (err) {
    console.warn('[appraisal] sharp unavailable, sending images as-is:', err?.message);
    sharpModule = false;
  }
  return sharpModule;
}

function normaliseMime(mimeType) {
  const m = (mimeType || '').split(';')[0].trim().toLowerCase();
  if (m === 'image/jpg') return 'image/jpeg';
  if (!m.startsWith('image/')) return 'image/jpeg';
  return m;
}

/**
 * @param {Buffer} buffer
 * @param {string} mimeType
 * @returns {Promise<{data: string, mimeType: string, width?: number, height?: number, bytes: number}>}
 */
export async function prepareImage(buffer, mimeType) {
  const original = {
    data: buffer.toString('base64'),
    mimeType: normaliseMime(mimeType),
    bytes: buffer.length,
  };
  const sharp = await getSharp();
  if (!sharp) return original;
  try {
    const img = sharp(buffer, { failOn: 'none' }).rotate();
    const meta = await img.metadata();
    const out = await img
      .resize(MAX_EDGE, MAX_EDGE, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY, mozjpeg: true })
      .toBuffer();
    return {
      data: out.toString('base64'),
      mimeType: 'image/jpeg',
      width: meta.width,
      height: meta.height,
      bytes: out.length,
    };
  } catch (err) {
    console.warn('[appraisal] image prep failed, using original bytes:', err?.message);
    return original;
  }
}

/** Convert prepared images into Gemini inlineData parts. */
export function imageParts(prepared) {
  return prepared.map((p) => ({ inlineData: { mimeType: p.mimeType, data: p.data } }));
}
