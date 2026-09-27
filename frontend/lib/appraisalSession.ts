/**
 * Persist a Try It appraisal (pipeline v2 response) across /appraise/results
 * and listing prefill, without stuffing the original photo into sessionStorage
 * (5 MB quota).
 *
 * - Appraisal JSON → sessionStorage (small)
 * - Original File → IndexedDB + in-memory blob URL (handles 20 MB photos)
 */
import { createPhotoUrls, getFileFromBlobUrl, revokePhotoUrls } from './fileUtils'

export const APPRAISAL_RESULT_KEY = 'appraisalResult'

const IDB_NAME = 'yardfront-appraisal'
const IDB_STORE = 'images'
const IDB_KEY = 'latest'

export type AppraisalStatus = 'ok' | 'low_confidence' | 'insufficient_data' | 'unidentified'

/** Coarse relevance label the pipeline assigns to a comp after filtering. */
export type CompMatch = 'exact' | 'similar' | string

/** One comparable listing behind the estimate. Real data — see services/appraisal/comps.js. */
export interface AppraisalComp {
  price: number
  site: string | null
  sold: boolean
  condition: string | null
  title: string | null
  match: CompMatch
  url: string | null
}

export interface AppraisalItem {
  name: string
  brand?: string | null
  model?: string | null
  variant?: string | null
  referenceNumber?: string | null
  size?: string | null
  color?: string | null
  year?: string | number | null
  category?: string
  subcategory?: string | null
  condition?: string
  conditionNotes?: string | null
  /** Listing-copy description (from the listing stage), not a raw model guess. */
  description?: string
  identityLevel?: 'exact' | 'model' | 'brand' | 'category' | 'unknown'
  identityConfidence?: number
  verified?: boolean
  msrp?: number | null
  authenticityRisk?: string | null
  alternatives?: Array<{ name: string; likelihood: number; howToTell: string }>
  visibleText?: string | null
}

export interface AppraisalPricing {
  fair: number
  low: number
  high: number
  confidenceScore: number
  priceConfidence?: number
  method?: 'comps' | 'retail' | 'msrp'
  sourcesSummary?: string
  sourcesCount?: number
}

export interface AppraisalListing {
  title?: string
  description?: string
  highlights?: string[]
  conditionSummary?: string
  sellerTips?: string[]
  keywords?: string[]
}

export interface AppraisalResult {
  status?: AppraisalStatus
  message?: string | null
  appraisalId?: string | null
  imageUrls?: string[]
  item: AppraisalItem
  pricing: AppraisalPricing | null
  listing?: AppraisalListing | null
  comps?: AppraisalComp[]
  sellerTips?: string[]
  needsInput?: string[]
  elapsedSeconds?: string
}

export interface AppraisalSession extends AppraisalResult {
  imageUrls: string[]
  imageFile: File | null
}

type MemorySession = {
  data: AppraisalResult
  blobUrl: string
  file: File
}

let memory: MemorySession | null = null

function stripImagePayload(data: AppraisalResult): AppraisalResult {
  const { imageUrls: _ignored, ...rest } = data
  return rest
}

function isUsablePreview(url: string | undefined): url is string {
  if (!url) return false
  if (url.startsWith('blob:')) return true
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')) return true
  // Legacy data URLs: keep only if they are small enough to not blow quota on re-save
  if (url.startsWith('data:')) return url.length < 400_000
  return false
}

function openImageDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error ?? new Error('IndexedDB open failed'))
  })
}

async function putAppraisalImage(file: File): Promise<void> {
  const db = await openImageDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite')
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
    tx.objectStore(IDB_STORE).put(file, IDB_KEY)
  })
  db.close()
}

async function getAppraisalImage(): Promise<File | null> {
  try {
    const db = await openImageDb()
    const file = await new Promise<File | null>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(IDB_KEY)
      req.onsuccess = () => resolve((req.result as File | undefined) ?? null)
      req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed'))
    })
    db.close()
    return file
  } catch {
    return null
  }
}

function persistJson(data: AppraisalResult): void {
  try {
    const raw = sessionStorage.getItem(APPRAISAL_RESULT_KEY)
    if (raw && raw.length > 500_000) {
      sessionStorage.removeItem(APPRAISAL_RESULT_KEY)
    }
  } catch {
    // ignore quota / private-mode errors while cleaning
  }

  try {
    sessionStorage.setItem(APPRAISAL_RESULT_KEY, JSON.stringify(stripImagePayload(data)))
  } catch (err) {
    console.warn('[appraisalSession] sessionStorage write skipped:', err)
  }
}

function readJson(): AppraisalResult | null {
  try {
    const raw = sessionStorage.getItem(APPRAISAL_RESULT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AppraisalResult
    if (!parsed?.item?.name) return null
    return parsed
  } catch {
    return null
  }
}

function rememberFile(file: File): string {
  if (memory?.blobUrl) {
    revokePhotoUrls([memory.blobUrl])
  }
  const [blobUrl] = createPhotoUrls([file])
  return blobUrl
}

export async function saveAppraisalResult(data: AppraisalResult, file: File): Promise<void> {
  const blobUrl = rememberFile(file)
  memory = { data: stripImagePayload(data), blobUrl, file }
  persistJson(data)
  try {
    await putAppraisalImage(file)
  } catch (err) {
    console.warn('[appraisalSession] IndexedDB write skipped:', err)
  }
}

export async function loadAppraisalResult(): Promise<AppraisalSession | null> {
  const json = readJson() ?? memory?.data ?? null
  if (!json) return null

  if (memory?.file) {
    return { ...json, imageUrls: [memory.blobUrl], imageFile: memory.file }
  }

  const storedFile = await getAppraisalImage()
  if (storedFile) {
    const blobUrl = rememberFile(storedFile)
    memory = { data: json, blobUrl, file: storedFile }
    return { ...json, imageUrls: [blobUrl], imageFile: storedFile }
  }

  const leftover = (json.imageUrls ?? []).filter(isUsablePreview)
  let imageFile: File | null = null
  if (leftover[0]?.startsWith('blob:')) {
    try {
      imageFile = await getFileFromBlobUrl(leftover[0])
    } catch {
      imageFile = null
    }
  }

  return { ...json, imageUrls: leftover, imageFile }
}

export function getAppraisalImageFile(): File | null {
  return memory?.file ?? null
}
