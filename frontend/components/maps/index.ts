// =============================================================================
// YARDHOP MAP SYSTEM - SIMPLE EXPORTS
// =============================================================================

// Components
export { default as DiscoveryMap, getHighAccuracyLocation } from './DiscoveryMap';
export type { LocationPrivacy } from './DiscoveryMap';

export { default as LocationPrivacySelector } from './LocationPrivacySelector';
export type { LocationPrivacy as LocationPrivacyType } from './LocationPrivacySelector';

// =============================================================================
// SIMPLIFIED HOOKS
// =============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getHighAccuracyLocation } from './DiscoveryMap';

/**
 * Hook for getting and tracking user location with high accuracy
 */
export function useUserLocation(options?: {
  autoFetch?: boolean;
  watchPosition?: boolean;
}) {
  const { autoFetch = false, watchPosition = false } = options || {};

  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLocation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const pos = await getHighAccuracyLocation();
      setLocation(pos);
    } catch (err: any) {
      setError(
        err.code === 1
          ? 'Location permission denied'
          : err.code === 2
          ? 'Location unavailable'
          : err.code === 3
          ? 'Location request timed out'
          : 'Failed to get location'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchLocation();
    }
  }, [autoFetch, fetchLocation]);

  useEffect(() => {
    if (!watchPosition || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setError(null);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [watchPosition]);

  return {
    location,
    loading,
    error,
    refetch: fetchLocation,
    hasPermission: error !== 'Location permission denied',
  };
}

/**
 * Hook for calculating distance between user and a target location
 */
export function useDistanceCalculation(
  targetLat?: number,
  targetLng?: number,
  userLat?: number,
  userLng?: number
) {
  const [distance, setDistance] = useState<number | null>(null);

  useEffect(() => {
    if (
      targetLat === undefined ||
      targetLng === undefined ||
      userLat === undefined ||
      userLng === undefined
    ) {
      setDistance(null);
      return;
    }

    // Haversine formula
    const R = 3959; // Earth's radius in miles
    const dLat = toRad(targetLat - userLat);
    const dLng = toRad(targetLng - userLng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(userLat)) *
        Math.cos(toRad(targetLat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c;

    setDistance(Math.round(d * 10) / 10); // Round to 1 decimal
  }, [targetLat, targetLng, userLat, userLng]);

  return distance;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}
