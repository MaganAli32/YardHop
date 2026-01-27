/**
 * Reverse geocoding utilities
 * Converts coordinates to human-readable addresses
 */

/**
 * Reverse geocode using OpenStreetMap Nominatim (free, no API key required)
 * Usage policy: https://operations.osmfoundation.org/policies/nominatim/
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`
      );
      const data = await response.json();

      if (data.results && data.results[0]) {
        return data.results[0].formatted_address;
      }
    } catch (err) {
      console.warn('Google geocoding failed, falling back to Nominatim:', err);
    }
  }

  // Fallback: OpenStreetMap Nominatim (free, no API key)
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
    { headers: { 'User-Agent': 'YardHop/1.0 (Beta)' } }
  );
  const data = await response.json();

  if (data.display_name) {
    return data.display_name;
  }

  // Last resort: coordinates
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}
