/**
 * Simple browser fingerprint for anonymous usage tracking.
 * Used to prevent users from bypassing free tier limits by clearing cookies.
 */
export function getBrowserFingerprint(): string {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx?.fillText('YardFront', 10, 10);
    const canvasData = canvas.toDataURL?.() ?? '';

    const raw = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset().toString(),
      canvasData,
    ].join('|');

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      const char = raw.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return hash.toString(36);
  } catch {
    return 'unknown';
  }
}
