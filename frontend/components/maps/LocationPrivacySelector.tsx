import React, { useState, useCallback } from 'react';
import { 
  MapPin, 
  Shield, 
  Eye, 
  EyeOff, 
  Lock, 
  Home, 
  Building2,
  Check,
  AlertCircle,
  Navigation,
  RefreshCw,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export type LocationPrivacy = 'exact' | 'neighborhood' | 'city';

interface LocationPrivacySelectorProps {
  onLocationChange: (data: {
    address: string;
    latitude: number;
    longitude: number;
    privacy: LocationPrivacy;
  }) => void;
  initialPrivacy?: LocationPrivacy;
  cityName?: string;
}

// =============================================================================
// PRIVACY OPTIONS
// =============================================================================

const PRIVACY_OPTIONS = [
  {
    value: 'exact' as LocationPrivacy,
    label: 'Exact Address',
    description: 'Show your full address. Best for active garage sales where you want foot traffic.',
    icon: MapPin,
    iconColor: 'text-amber-500',
  },
  {
    value: 'neighborhood' as LocationPrivacy,
    label: 'Neighborhood Only',
    description: 'Shows a ~0.5 mile radius area. Exact address shared only after buyer messages you.',
    icon: Home,
    iconColor: 'text-blue-500',
    recommended: true,
  },
  {
    value: 'city' as LocationPrivacy,
    label: 'City Only',
    description: 'Shows general city area only. Maximum privacy - arrange meetups via messaging.',
    icon: Building2,
    iconColor: 'text-green-500',
  },
];

// =============================================================================
// HIGH ACCURACY GEOLOCATION
// =============================================================================

async function getHighAccuracyLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const LocationPrivacySelector: React.FC<LocationPrivacySelectorProps> = ({
  onLocationChange,
  initialPrivacy = 'neighborhood',
  cityName = 'Temecula, CA',
}) => {
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [privacy, setPrivacy] = useState<LocationPrivacy>(initialPrivacy);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Notify parent of changes
  const notifyChange = useCallback((
    addr: string, 
    lat: number | null, 
    lng: number | null, 
    priv: LocationPrivacy
  ) => {
    if (lat !== null && lng !== null) {
      onLocationChange({
        address: addr,
        latitude: lat,
        longitude: lng,
        privacy: priv,
      });
    }
  }, [onLocationChange]);

  // Handle "Use My Location" button
  const handleGetLocation = async () => {
    setIsLocating(true);
    setError(null);

    try {
      const pos = await getHighAccuracyLocation();
      setLatitude(pos.lat);
      setLongitude(pos.lng);
      
      // Set a placeholder address (in production, use reverse geocoding)
      const placeholderAddress = `${cityName} (${pos.lat.toFixed(4)}, ${pos.lng.toFixed(4)})`;
      setAddress(placeholderAddress);
      
      notifyChange(placeholderAddress, pos.lat, pos.lng, privacy);
    } catch (err: any) {
      setError(
        err.code === 1
          ? 'Location access denied. Please enable location permissions or enter address manually.'
          : 'Could not get your location. Please try again or enter address manually.'
      );
    } finally {
      setIsLocating(false);
    }
  };

  // Handle privacy selection change
  const handlePrivacyChange = (newPrivacy: LocationPrivacy) => {
    setPrivacy(newPrivacy);
    notifyChange(address, latitude, longitude, newPrivacy);
  };

  // Handle address input change
  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(e.target.value);
    // Note: In production, integrate with Google Places Autocomplete
    // to get lat/lng from the address
  };

  return (
    <div className="space-y-6">
      {/* Address Input */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-[#121c32] uppercase tracking-wider">
            Sale Location <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={isLocating}
            className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#FF6B35] hover:text-[#121c32] transition-colors disabled:opacity-50"
          >
            {isLocating ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                Locating...
              </>
            ) : (
              <>
                <Navigation size={12} />
                Use My Location
              </>
            )}
          </button>
        </div>

        <div className="relative">
          <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={address}
            onChange={handleAddressChange}
            placeholder="Enter your address or use location button..."
            className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-[#121c32] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/20 focus:border-[#FF6B35] transition-all"
          />
        </div>

        {/* Location found indicator */}
        {latitude && longitude && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Check size={14} />
            <span>Location set: {latitude.toFixed(4)}, {longitude.toFixed(4)}</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-100 rounded-lg">
            <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
            <p className="text-xs text-red-600 font-medium">{error}</p>
          </div>
        )}
      </div>

      {/* Privacy Level Selector */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Shield size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-[#121c32] uppercase tracking-wider">
            Location Privacy
          </span>
        </div>

        <p className="text-xs text-slate-500 font-medium">
          Choose how your location appears to buyers. Your exact address stays private until you share it.
        </p>

        <div className="space-y-3">
          {PRIVACY_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isSelected = privacy === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => handlePrivacyChange(option.value)}
                className={`
                  w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all
                  ${isSelected
                    ? 'border-[#FF6B35] bg-orange-50/50'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                  }
                `}
              >
                {/* Radio indicator */}
                <div className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5
                  ${isSelected ? 'border-[#FF6B35] bg-[#FF6B35]' : 'border-slate-300'}
                `}>
                  {isSelected && <Check size={12} className="text-white" strokeWidth={3} />}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={16} className={isSelected ? 'text-[#FF6B35]' : option.iconColor} />
                    <span className="font-bold text-[#121c32] text-sm">{option.label}</span>
                    {option.recommended && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[9px] font-black uppercase tracking-wider rounded-full">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed">
                    {option.description}
                  </p>
                </div>

                {/* Privacy indicator icon */}
                <div className="shrink-0">
                  {option.value === 'exact' && <Eye size={16} className="text-slate-300" />}
                  {option.value === 'neighborhood' && <EyeOff size={16} className="text-blue-400" />}
                  {option.value === 'city' && <Lock size={16} className="text-green-500" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Privacy explanation */}
      <div className={`
        flex items-start gap-3 p-4 rounded-xl border
        ${privacy === 'exact' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}
      `}>
        {privacy === 'exact' ? (
          <AlertCircle size={16} className="text-amber-500 mt-0.5 shrink-0" />
        ) : (
          <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
        )}
        <div className="space-y-1">
          <p className={`text-xs font-bold ${privacy === 'exact' ? 'text-amber-700' : 'text-blue-700'}`}>
            {privacy === 'exact'
              ? 'Your exact address will be visible to everyone'
              : privacy === 'neighborhood'
                ? 'Buyers will see a shaded area (~0.5 mile radius)'
                : 'Buyers will only see your city name'}
          </p>
          <p className="text-[11px] text-slate-600 leading-relaxed">
            {privacy === 'exact'
              ? 'Best for active garage sales. Anyone viewing your listing can see your full address.'
              : 'Your exact address stays private until you choose to share it via messaging.'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationPrivacySelector;
