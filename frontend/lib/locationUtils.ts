/**
 * Parses a full address string into neighborhood and city/state for display.
 * Handles:
 * - "123 Main St, Barton Springs, Austin, TX 78704" → neighborhood: "Barton Springs", cityState: "Austin, TX"
 * - "Barton Springs, Austin" or "Zilker, Austin" → neighborhood: "Barton Springs", cityState: "Austin"
 * - "Austin" or single part → neighborhood: "", cityState: address
 */
export function formatLocation(address: string): { neighborhood: string; cityState: string } {
  if (!address || typeof address !== 'string') {
    return { neighborhood: '', cityState: address || '' };
  }
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 3) {
    const neighborhood = parts[parts.length - 3];
    const city = parts[parts.length - 2];
    const lastPart = parts[parts.length - 1];
    const state = lastPart.split(/\s+/)[0] ?? '';
    return {
      neighborhood,
      cityState: state ? `${city}, ${state}` : city,
    };
  }
  if (parts.length === 2) {
    return { neighborhood: parts[0], cityState: parts[1] };
  }
  return { neighborhood: '', cityState: address };
}
