/**
 * Minimal Gemini REST client used by the appraisal pipeline.
 *
 * Talks to the generateContent endpoint directly (no SDK) so one code path
 * handles structured JSON output, Google Search grounding, thinking config,
 * timeouts and retries the same way for every stage.
 */

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const MODELS = {
  // Strong multimodal model for identification (reads dials, tags, engravings).
  identify: process.env.GEMINI_IDENTIFY_MODEL || 'gemini-pro-latest',
  // Fast model for grounded lookups, comp filtering and listing copy.
  fast: process.env.GEMINI_FAST_MODEL || 'gemini-flash-latest',
};

export function hasGeminiKey() {
  return Boolean(process.env.GEMINI_API_KEY);
}

export class GeminiError extends Error {
  constructor(message, { status, retriable = false, body } = {}) {
    super(message);
    this.name = 'GeminiError';
    this.status = status;
    this.retriable = retriable;
    this.body = body;
  }
}

/**
 * Pull a JSON object out of model text. Handles bare JSON, ```json fences,
 * and prose around the object. Returns null when nothing parses.
 */
export function extractJson(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  const candidates = [];
  candidates.push(trimmed);
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) candidates.push(trimmed.slice(first, last + 1));
  for (const c of candidates) {
    try {
      const parsed = JSON.parse(c);
      if (parsed && typeof parsed === 'object') return parsed;
    } catch (_) {
      /* try next */
    }
  }
  return null;
}

function buildBody({ parts, system, schema, json, tools, temperature, thinking, maxOutputTokens }) {
  const generationConfig = {
    temperature: temperature ?? 0,
    topP: 0.95,
  };
  if (maxOutputTokens) generationConfig.maxOutputTokens = maxOutputTokens;
  // Structured output cannot be combined with search grounding on all models,
  // so callers that pass tools get plain text and parse JSON themselves.
  if ((schema || json) && !tools) {
    generationConfig.responseMimeType = 'application/json';
    if (schema) generationConfig.responseSchema = schema;
  }
  if (thinking) generationConfig.thinkingConfig = { thinkingLevel: thinking };

  const body = {
    contents: [{ role: 'user', parts }],
    generationConfig,
  };
  if (system) body.systemInstruction = { parts: [{ text: system }] };
  if (tools) body.tools = tools;
  return body;
}

/**
 * Call generateContent.
 *
 * @param {object} opts
 * @param {string}  opts.model
 * @param {Array}   opts.parts           Gemini parts: [{text}, {inlineData:{mimeType,data}}]
 * @param {string}  [opts.system]        System instruction
 * @param {object}  [opts.schema]        responseSchema (implies JSON mode)
 * @param {boolean} [opts.json]          JSON mode without a schema
 * @param {boolean} [opts.search]        Enable Google Search grounding
 * @param {number}  [opts.temperature]   Defaults to 0 for reproducibility
 * @param {string}  [opts.thinking]      'low' | 'medium' | 'high' (dropped if the model rejects it)
 * @param {number}  [opts.timeoutMs]
 * @param {string}  [opts.label]         For logs
 * @returns {Promise<{text:string, json:object|null, grounded:boolean, searchQueries:string[], sources:Array, usage:object|null}>}
 */
export async function generate(opts) {
  const {
    model,
    parts,
    system,
    schema,
    json,
    search = false,
    temperature = 0,
    thinking,
    timeoutMs = 30000,
    maxOutputTokens,
    label = 'gemini',
  } = opts;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new GeminiError('GEMINI_API_KEY is not set', { status: 0 });

  const tools = search ? [{ google_search: {} }] : undefined;
  let body = buildBody({ parts, system, schema, json, tools, temperature, thinking, maxOutputTokens });

  const url = `${API_BASE}/${encodeURIComponent(model)}:generateContent`;
  const started = Date.now();
  let lastErr = null;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });

      if (!res.ok) {
        const errText = await res.text();
        // Older models reject thinkingLevel; retry once without it.
        if (res.status === 400 && /thinking/i.test(errText) && body.generationConfig.thinkingConfig) {
          delete body.generationConfig.thinkingConfig;
          continue;
        }
        const retriable = res.status === 429 || res.status >= 500;
        lastErr = new GeminiError(`${label}: HTTP ${res.status} ${errText.slice(0, 300)}`, {
          status: res.status,
          retriable,
          body: errText,
        });
        if (retriable && attempt < 3) {
          await new Promise((r) => setTimeout(r, 600 * attempt));
          continue;
        }
        throw lastErr;
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      if (!candidate) {
        const reason = data?.promptFeedback?.blockReason || 'no candidates';
        throw new GeminiError(`${label}: empty response (${reason})`, { status: 200 });
      }
      const text = (candidate.content?.parts || [])
        .filter((p) => typeof p.text === 'string' && !p.thought)
        .map((p) => p.text)
        .join('')
        .trim();

      const grounding = candidate.groundingMetadata || null;
      const searchQueries = grounding?.webSearchQueries || [];
      const sources = (grounding?.groundingChunks || [])
        .map((c) => c?.web)
        .filter(Boolean)
        .map((w) => ({ title: w.title || null, uri: w.uri || null }));
      const grounded = searchQueries.length > 0 || sources.length > 0;

      const result = {
        text,
        json: extractJson(text),
        grounded,
        searchQueries,
        sources,
        usage: data?.usageMetadata || null,
        finishReason: candidate.finishReason || null,
        elapsedMs: Date.now() - started,
      };
      return result;
    } catch (err) {
      if (err instanceof GeminiError) {
        if (!err.retriable || attempt >= 3) throw err;
        lastErr = err;
        continue;
      }
      // AbortSignal timeout / network errors.
      const isTimeout = err?.name === 'TimeoutError' || err?.name === 'AbortError';
      lastErr = new GeminiError(`${label}: ${isTimeout ? 'timed out' : err.message}`, {
        status: 0,
        retriable: !isTimeout,
      });
      if (isTimeout || attempt >= 3) throw lastErr;
      await new Promise((r) => setTimeout(r, 400 * attempt));
    }
  }
  throw lastErr || new GeminiError(`${label}: failed`);
}

/** Wrap a promise with a timeout that resolves to `fallback` instead of throwing. */
export async function withBudget(promise, ms, fallback, label = 'stage') {
  let timer;
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      console.warn(`[appraisal] ${label} exceeded ${ms}ms budget; using fallback`);
      resolve(fallback);
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } catch (err) {
    console.warn(`[appraisal] ${label} failed: ${err?.message}; using fallback`);
    return fallback;
  } finally {
    clearTimeout(timer);
  }
}
