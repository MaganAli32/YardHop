import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, Shield, Navigation } from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type LocationPrivacy = 'exact' | 'neighborhood' | 'city';

interface DiscoveryMapProps {
  lat?: number;
  lng?: number;
  privacy?: LocationPrivacy;
  radiusMeters?: number;
  title?: string;
  height?: string;
  showUserLocation?: boolean;
  interactive?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const DEFAULT_LAT = 33.4936; // Temecula, CA
const DEFAULT_LNG = -117.1484;
const YARDHOP_ORANGE = '#FF6B35';

// Privacy radius settings (in meters)
const PRIVACY_RADIUS: Record<LocationPrivacy, number> = {
  exact: 0,
  neighborhood: 800,  // ~0.5 miles
  city: 5000,         // ~3 miles
};

// =============================================================================
// LEAFLET LOADER - ensures CSS and JS are loaded once
// =============================================================================

let leafletLoaded = false;
let leafletLoading = false;
const leafletCallbacks: (() => void)[] = [];

function ensureLeafletLoaded(): Promise<void> {
  return new Promise((resolve) => {
    // Already loaded
    if (leafletLoaded && (window as any).L) {
      resolve();
      return;
    }

    // Add to callback queue
    leafletCallbacks.push(resolve);

    // Already loading, just wait
    if (leafletLoading) return;
    leafletLoading = true;

    // Load CSS
    if (!document.getElementById('leaflet-css')) {
      const link = document.createElement('link');
      link.id = 'leaflet-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
    }

    // Load JS
    if (!document.getElementById('leaflet-js')) {
      const script = document.createElement('script');
      script.id = 'leaflet-js';
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        leafletLoaded = true;
        leafletLoading = false;
        leafletCallbacks.forEach(cb => cb());
        leafletCallbacks.length = 0;
      };
      document.head.appendChild(script);
    }
  });
}

// =============================================================================
// HIGH ACCURACY GEOLOCATION
// =============================================================================

export function getHighAccuracyLocation(): Promise<{ lat: number; lng: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => {
        reject(error);
      },
      {
        enableHighAccuracy: true,   // KEY: Request GPS-level accuracy
        timeout: 15000,              // Wait up to 15 seconds
        maximumAge: 0,               // Don't use cached position
      }
    );
  });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DiscoveryMap: React.FC<DiscoveryMapProps> = ({
  lat,
  lng,
  privacy = 'neighborhood',
  radiusMeters,
  title,
  height = '280px',
  showUserLocation = false,
  interactive = true,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  
  const [isMapReady, setIsMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  // Use provided coords or defaults
  const finalLat = lat ?? DEFAULT_LAT;
  const finalLng = lng ?? DEFAULT_LNG;
  
  // Determine radius based on privacy level or explicit value
  const finalRadius = radiusMeters ?? PRIVACY_RADIUS[privacy];

  // Initialize map
  useEffect(() => {
    let mounted = true;

    const initMap = async () => {
      await ensureLeafletLoaded();
      
      if (!mounted || !mapContainer.current || mapInstance.current) return;

      const L = (window as any).L;
      if (!L || typeof L.map !== 'function') return;

      // Create map
      mapInstance.current = L.map(mapContainer.current, {
        zoomControl: false,
        attributionControl: false,
        scrollWheelZoom: interactive,
        dragging: interactive,
        touchZoom: interactive,
        doubleClickZoom: interactive,
      }).setView([finalLat, finalLng], privacy === 'city' ? 11 : 14);

      // Add tile layer (clean, minimal style)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(mapInstance.current);

      // Add privacy circle if not exact location
      if (privacy !== 'exact' && finalRadius > 0) {
        L.circle([finalLat, finalLng], {
          color: YARDHOP_ORANGE,
          fillColor: YARDHOP_ORANGE,
          fillOpacity: 0.08,
          radius: finalRadius,
          weight: 2,
        }).addTo(mapInstance.current);
      }

      // Add marker
      const markerIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${YARDHOP_ORANGE};
          width: ${privacy === 'exact' ? '14px' : '10px'};
          height: ${privacy === 'exact' ? '14px' : '10px'};
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 10px rgba(255,107,53,0.4);
          ${privacy !== 'exact' ? 'opacity: 0.7;' : ''}
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      L.marker([finalLat, finalLng], { icon: markerIcon })
        .addTo(mapInstance.current);

      setIsMapReady(true);
    };

    initMap();

    return () => {
      mounted = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [finalLat, finalLng, privacy, finalRadius, interactive]);

  // Handle user location
  const handleGetUserLocation = async () => {
    if (locating || !mapInstance.current) return;
    
    setLocating(true);
    
    try {
      const pos = await getHighAccuracyLocation();
      setUserLocation(pos);

      const L = (window as any).L;
      
      // Remove old user marker
      if (userMarkerRef.current) {
        mapInstance.current.removeLayer(userMarkerRef.current);
      }

      // Add user location marker (blue dot)
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `<div style="
          background-color: #4285F4;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 0 0 2px rgba(66,133,244,0.3), 0 2px 10px rgba(0,0,0,0.2);
        "></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
      });

      userMarkerRef.current = L.marker([pos.lat, pos.lng], { 
        icon: userIcon,
        zIndexOffset: 1000,
      }).addTo(mapInstance.current);

      // Add accuracy circle
      L.circle([pos.lat, pos.lng], {
        color: '#4285F4',
        fillColor: '#4285F4',
        fillOpacity: 0.15,
        radius: Math.min(pos.accuracy, 100), // Cap at 100m for visibility
        weight: 1,
      }).addTo(mapInstance.current);

    } catch (err) {
      console.warn('Could not get user location:', err);
    } finally {
      setLocating(false);
    }
  };

  // Auto-fetch user location if requested
  useEffect(() => {
    if (showUserLocation && isMapReady && !userLocation) {
      handleGetUserLocation();
    }
  }, [showUserLocation, isMapReady]);

  return (
    <div 
      className="relative w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200"
      style={{ height }}
    >
      {/* Loading state */}
      {!isMapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50 z-10">
          <RefreshCw className="animate-spin text-slate-300" size={20} />
        </div>
      )}

      {/* Map container */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Privacy badge */}
      {privacy !== 'exact' && (
        <div className="absolute top-3 left-3 z-[1000]">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
            <Shield size={12} className="text-blue-500" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
              {privacy === 'neighborhood' ? 'Area Only' : 'City Only'}
            </span>
          </div>
        </div>
      )}

      {/* User location button */}
      {interactive && (
        <button
          onClick={handleGetUserLocation}
          disabled={locating}
          className="absolute bottom-3 right-3 z-[1000] w-9 h-9 bg-white rounded-lg border border-slate-200 shadow-lg flex items-center justify-center hover:bg-slate-50 transition-colors disabled:opacity-50"
          title="Show my location"
        >
          {locating ? (
            <RefreshCw size={14} className="text-blue-500 animate-spin" />
          ) : (
            <Navigation 
              size={14} 
              className={userLocation ? 'text-blue-500' : 'text-slate-400'} 
            />
          )}
        </button>
      )}
    </div>
  );
};

export default DiscoveryMap;
