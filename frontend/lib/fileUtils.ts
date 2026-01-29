/**
 * Shared utility functions for file and image handling
 */

// Global store to keep File objects associated with their blob URLs
const fileStore = new Map<string, File>();

/**
 * Converts a File to base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
  });
};

/**
 * Creates object URLs from File objects and stores the File references
 */
export const createPhotoUrls = (files: File[]): string[] => {
  return files.map(file => {
    const url = URL.createObjectURL(file as Blob);
    // Store the file reference so we can retrieve it later
    fileStore.set(url, file);
    return url;
  });
};

/**
 * Revokes object URLs to free memory and cleans up file store
 */
export const revokePhotoUrls = (urls: string[]): void => {
  urls.forEach(url => {
    if (url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
      fileStore.delete(url);
    }
  });
};

/**
 * Gets the original File object for a blob URL
 * Returns the stored File if available, otherwise fetches from blob URL
 */
export const getFileFromBlobUrl = async (
  blobUrl: string,
  filename: string = `file-${Date.now()}.jpg`,
  mimeType: string = 'image/jpeg'
): Promise<File> => {
  // #region agent log
  const storeSize = fileStore.size;
  fetch('http://127.0.0.1:7242/ingest/d02755c2-16ed-4073-9690-00cfbedbcd38',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fileUtils:getFileFromBlobUrl:entry',message:'blob to file entry',data:{storeSize,hasBlobUrl:!!blobUrl,blobUrlPrefix:blobUrl?.slice(0,30)},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
  // #endregion
  // First, try to get the stored file
  const storedFile = fileStore.get(blobUrl);
  if (storedFile) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d02755c2-16ed-4073-9690-00cfbedbcd38',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fileUtils:getFileFromBlobUrl:stored',message:'using stored file',data:{size:storedFile?.size,type:storedFile?.type},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return storedFile;
  }

  // Fallback: try to fetch from blob URL (may fail if revoked)
  try {
    const response = await fetch(blobUrl);
    const blob = await response.blob();
    const file = new File([blob], filename, { type: blob.type || mimeType });
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d02755c2-16ed-4073-9690-00cfbedbcd38',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fileUtils:getFileFromBlobUrl:fetched',message:'used fetch fallback',data:{size:file?.size,type:file?.type},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    return file;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d02755c2-16ed-4073-9690-00cfbedbcd38',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'fileUtils:getFileFromBlobUrl:error',message:'blob url failed',data:{errorMsg:(error as Error)?.message},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    throw new Error(`Failed to get file from blob URL. The URL may have been revoked.`);
  }
};

/**
 * Converts blob URL to File object
 * @deprecated Use getFileFromBlobUrl instead
 */
export const blobUrlToFile = async (
  blobUrl: string,
  filename: string = `file-${Date.now()}.jpg`,
  mimeType: string = 'image/jpeg'
): Promise<File> => {
  return getFileFromBlobUrl(blobUrl, filename, mimeType);
};

/**
 * Clears all stored file references
 * Call this when navigating away from the upload page
 */
export const clearFileStore = (): void => {
  fileStore.clear();
};
