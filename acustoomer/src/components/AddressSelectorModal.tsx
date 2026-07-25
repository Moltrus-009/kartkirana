import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Input } from './ui/Input';
import { Button } from './ui/Button';
import { LocationMap } from './LocationMap';
import { UserAddress } from '../types';
import { locationService } from '../services/locationService';
import { Compass, MapPin, Navigation, Search, Check, Info } from 'lucide-react';

interface AddressSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (address: Omit<UserAddress, 'id'>) => Promise<UserAddress | void>;
  initialAddress?: UserAddress | null;
}

const parseGoogleAddress = (result: any) => {
  const comps = result.address_components || [];
  
  const getComp = (types: string[]) => {
    const found = comps.find((c: any) => c.types.some((t: string) => types.includes(t)));
    return found ? found.long_name : '';
  };

  const premise = getComp(['subpremise', 'premise', 'building', 'street_number']);
  const route = getComp(['route']);
  const sublocality = getComp(['sublocality_level_1', 'sublocality', 'neighborhood']);
  const locality = getComp(['locality', 'sublocality_level_2']);
  const city = getComp(['administrative_area_level_2', 'locality']) || 'Noida';
  const state = getComp(['administrative_area_level_1']) || '';
  const postcode = getComp(['postal_code']) || '';

  const details = premise 
    ? (route ? `${premise}, ${route}` : premise)
    : (route || result.formatted_address.split(',')[0] || '');
  const area = sublocality || locality || 'Local Area';

  return {
    name: 'Current Location',
    details: details,
    area: area,
    city: state ? `${city}, ${state}` : city,
    pinCode: postcode,
  };
};

export const AddressSelectorModal: React.FC<AddressSelectorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAddress = null
}) => {
  // Address fields states
  const [addressName, setAddressName] = useState('Home'); // Home, Work, Other
  const [addressDetails, setAddressDetails] = useState(''); // Flat, house, building
  const [addressArea, setAddressArea] = useState(''); // Street, Area, Locality
  const [addressCity, setAddressCity] = useState('');
  const [addressPinCode, setAddressPinCode] = useState('');
  const [addressDefault, setAddressDefault] = useState(false);
  
  // High-precision delivery attributes
  const [floor, setFloor] = useState('');
  const [landmark, setLandmark] = useState('');
  const [instructions, setInstructions] = useState('');
  const [placeId, setPlaceId] = useState('');
  const [geoWarning, setGeoWarning] = useState<string | null>(null);

  // Location / Map tracking states
  const [mapCenter, setMapCenter] = useState<[number, number]>([0, 0]);
  const [selectedCoords, setSelectedCoords] = useState<[number, number]>([0, 0]);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  
  // Search Autocomplete states
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isDetectingGPS, setIsDetectingGPS] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic Google script loading
  useEffect(() => {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (key && !(window as any).google) {
      const existing = document.getElementById('google-maps-script');
      if (!existing) {
        const script = document.createElement('script');
        script.id = 'google-maps-script';
        script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);
      }
    }
  }, []);

  // Resolve raw coordinates to address attributes (Reverse Geocoding)
  const resolveAddressFromCoords = async (lat: number, lng: number) => {
    const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (googleKey) {
      try {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${googleKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results[0]) {
            const parsed = parseGoogleAddress(data.results[0]);
            setAddressDetails(parsed.details);
            setAddressArea(parsed.area);
            setAddressCity(parsed.city);
            setAddressPinCode(parsed.pinCode);
            setPlaceId(data.results[0].place_id || '');
            return;
          }
        }
      } catch (err) {
        console.warn('Google Reverse geocode error, falling back to OSM:', err);
      }
    }

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'KartKiranaApp/1.0'
          }
        }
      );
      if (!res.ok) throw new Error('OSM geocoding failed');
      const data = await res.json();
      
      const addr = data.address || {};
      
      // Smart extraction for Swiggy-like precise address fields
      const houseNo = addr.house_number || addr.flat || addr.unit || addr.street_number || '';
      const buildingName = addr.building || addr.apartments || addr.subpremise || addr.house || addr.amenity || addr.shop || '';
      const road = addr.road || '';
      
      let details = houseNo;
      if (buildingName) {
        details = details ? `${details}, ${buildingName}` : buildingName;
      }
      if (road) {
        details = details ? `${details}, ${road}` : road;
      }
      if (!details) {
        details = data.display_name.split(',')[0] || '';
      }

      const suburb = addr.suburb || addr.neighbourhood || addr.sublocality || addr.sublocality_level_1 || addr.village || addr.quarter || addr.city_district || '';
      const county = addr.county || addr.district || '';
      
      let area = suburb;
      if (!area && county) {
        area = county;
      }
      if (!area) {
        area = 'Local Area';
      }

      const city = addr.city || addr.town || addr.city_district || addr.county || 'Noida';
      const state = addr.state || 'Uttar Pradesh';
      const postcode = addr.postcode || '';

      setAddressDetails(details);
      setAddressArea(area);
      setAddressCity(`${city}, ${state}`.trim());
      setAddressPinCode(postcode);
      setPlaceId(data.place_id ? String(data.place_id) : '');
    } catch (err) {
      console.warn('Reverse geocoding query failed:', err);
    }
  };

  // High-precision GPS acquisition logic
  const handleGPSDetect = async () => {
    setIsDetectingGPS(true);
    setGeoWarning(null);
    setGpsAccuracy(null);

    try {
      const coords = await locationService.getCurrentLocation();
      setMapCenter([coords.lat, coords.lng]);
      setSelectedCoords([coords.lat, coords.lng]);
      resolveAddressFromCoords(coords.lat, coords.lng);
      if (coords.accuracy !== undefined) {
        setGpsAccuracy(coords.accuracy);
      }
    } catch (err: any) {
      console.warn('GPS detection failed:', err);
      setGeoWarning('Unable to determine your location');
      setMapCenter([0, 0]);
      setSelectedCoords([0, 0]);
    } finally {
      setIsDetectingGPS(false);
    }
  };

  // Initialize form state and trigger automatic locate
  useEffect(() => {
    if (isOpen) {
      if (initialAddress) {
        setAddressName(initialAddress.name);
        setAddressDetails(initialAddress.details);
        setAddressArea(initialAddress.area);
        setAddressCity(initialAddress.city);
        setAddressPinCode(initialAddress.pinCode);
        setAddressDefault(initialAddress.isDefault);
        setFloor(initialAddress.floor || '');
        setLandmark(initialAddress.landmark || '');
        setInstructions(initialAddress.instructions || '');
        setPlaceId(initialAddress.placeId || '');
        setMapCenter([initialAddress.lat, initialAddress.lng]);
        setSelectedCoords([initialAddress.lat, initialAddress.lng]);
      } else {
        // Reset to default coordinates
        setAddressName('Home');
        setAddressDetails('');
        setAddressArea('');
        setAddressCity('');
        setAddressPinCode('');
        setAddressDefault(false);
        setFloor('');
        setLandmark('');
        setInstructions('');
        setPlaceId('');
        
        // Read cached coordinates if available
        const lastKnown = localStorage.getItem('shop_app_last_known_address');
        if (lastKnown) {
          try {
            const parsed = JSON.parse(lastKnown);
            setMapCenter([parsed.lat, parsed.lng]);
            setSelectedCoords([parsed.lat, parsed.lng]);
          } catch {
            setMapCenter([0, 0]);
            setSelectedCoords([0, 0]);
          }
        } else {
          setMapCenter([0, 0]);
          setSelectedCoords([0, 0]);
        }

        // Trigger automatic GPS location lookup immediately on modal open!
        handleGPSDetect();
      }
      setSuggestions([]);
      setSearchQuery('');
      setGpsAccuracy(null);
    }
  }, [isOpen, initialAddress]);

  // Autocomplete Suggestions Query (Google Places or OSM Nominatim)
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSuggestions([]);
      return;
    }

    const delay = setTimeout(async () => {
      setIsLoadingSuggestions(true);

      const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (googleKey && (window as any).google?.maps?.places) {
        try {
          const service = new (window as any).google.maps.places.AutocompleteService();
          const sessionToken = (window as any).google?.maps?.places?.AutocompleteSessionToken 
            ? new (window as any).google.maps.places.AutocompleteSessionToken() 
            : undefined;

          service.getPlacePredictions({
            input: searchQuery,
            sessionToken,
            componentRestrictions: { country: 'in' }
          }, (predictions: any[] | null, status: string) => {
            setIsLoadingSuggestions(false);
            if (status === 'OK' && predictions) {
              const normalized = predictions.map((p: any) => ({
                isGoogle: true,
                place_id: p.place_id,
                display_name: p.description
              }));
              setSuggestions(normalized);
            } else {
              setSuggestions([]);
            }
          });
          return;
        } catch (err) {
          console.warn('Google Places predictions lookup failed:', err);
        }
      }

      // Fallback to OpenStreetMap Nominatim
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&addressdetails=1&limit=5&countrycodes=in`,
          {
            headers: {
              'Accept-Language': 'en',
              'User-Agent': 'KartKiranaApp/1.0'
            }
          }
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data);
        }
      } catch (err) {
        console.warn('Autocomplete lookup error:', err);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 500); // 500ms debounce to prevent API spamming

    return () => clearTimeout(delay);
  }, [searchQuery]);

  // Draggable pin position update callback
  const handleMapPinChange = (lat: number, lng: number) => {
    setSelectedCoords([lat, lng]);
    resolveAddressFromCoords(lat, lng);
  };

  // Autocomplete suggestion select handler
  const handleSelectSuggestion = async (place: any) => {
    const isGoogle = !!place.isGoogle;
    setSuggestions([]);
    setSearchQuery('');

    if (isGoogle && (window as any).google) {
      setIsSaving(true);
      try {
        const geocoder = new (window as any).google.maps.Geocoder();
        geocoder.geocode({ placeId: place.place_id }, (results: any[] | null, status: string) => {
          setIsSaving(false);
          if (status === 'OK' && results && results[0]) {
            const res = results[0];
            const lat = res.geometry.location.lat();
            const lng = res.geometry.location.lng();
            
            setMapCenter([lat, lng]);
            setSelectedCoords([lat, lng]);

            const parsed = parseGoogleAddress(res);
            setAddressDetails(parsed.details);
            setAddressArea(parsed.area);
            setAddressCity(parsed.city);
            setAddressPinCode(parsed.pinCode);
            setPlaceId(place.place_id);
          }
        });
        return;
      } catch (err) {
        console.warn('Google detailed lookup failed, falling back:', err);
        setIsSaving(false);
      }
    }

    // Fallback to OSM
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lon);
    
    setMapCenter([lat, lng]);
    setSelectedCoords([lat, lng]);

    const addr = place.address || {};
    const building = place.display_name.split(',')[0] || addr.building || addr.amenity || '';
    const street = addr.road || '';
    const area = addr.neighbourhood || addr.suburb || addr.village || 'Local Area';
    const city = addr.city || addr.town || 'Noida';
    const state = addr.state || '';
    const postcode = addr.postcode || '';

    setAddressDetails(building);
    setAddressArea(street ? `${street}, ${area}` : area);
    setAddressCity(`${city}, ${state}`.trim());
    setAddressPinCode(postcode);
    setPlaceId(place.place_id ? String(place.place_id) : '');
  };

  // Submit address save
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 1. Coordinates validation
    if (!selectedCoords || (selectedCoords[0] === 0 && selectedCoords[1] === 0)) {
      alert('Please select a valid delivery point on the map or tap "Use Current Location".');
      return;
    }

    // 2. Mandatory details & area validation
    if (!addressDetails.trim()) {
      alert('Please enter Flat / House / Office / Building name.');
      return;
    }

    if (!addressArea.trim()) {
      alert('Please enter Street / Road / Locality name.');
      return;
    }

    // 3. Indian 6-digit PIN code format validation
    const trimmedPin = addressPinCode.trim();
    if (trimmedPin && !/^\d{6}$/.test(trimmedPin)) {
      alert('Please enter a valid 6-digit Indian PIN Code.');
      return;
    }

    setIsSaving(true);

    const payload: Omit<UserAddress, 'id'> = {
      name: addressName,
      details: addressDetails.trim(),
      area: addressArea.trim(),
      city: addressCity.trim() || 'Noida, Uttar Pradesh',
      pinCode: trimmedPin,
      lat: selectedCoords[0],
      lng: selectedCoords[1],
      isDefault: addressDefault,
      floor: floor.trim() || undefined,
      landmark: landmark.trim() || undefined,
      instructions: instructions.trim() || undefined,
      placeId: placeId || undefined
    };

    try {
      await onSave(payload);
      onClose();
    } catch (err) {
      alert('Failed to save address details.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={initialAddress ? 'Edit Location' : 'Select Delivery Point'}
    >
      <div className="flex flex-col gap-4 text-xs font-bold text-gray-700 dark:text-gray-300 text-left max-h-[78vh] overflow-y-auto pr-1">
        
        {/* Real-time Address Search Autocomplete */}
        <div className="relative">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-2xl bg-gray-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800">
            <Search className="h-4.5 w-4.5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search apartment, road, or area..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-gray-800 dark:text-gray-100 outline-none text-xs font-semibold"
            />
            {isLoadingSuggestions && (
              <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0"></div>
            )}
          </div>

          {/* Autocomplete Suggestions dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 z-55 mt-1 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl shadow-2xl max-h-56 overflow-y-auto">
              {suggestions.map((s, idx) => (
                <button
                  key={s.place_id || idx}
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-4 py-3 border-b border-gray-50 dark:border-slate-850 hover:bg-blue-50/10 dark:hover:bg-slate-850 transition-colors flex items-start gap-3 cursor-pointer"
                >
                  <MapPin className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="block font-black text-gray-850 dark:text-gray-250 truncate">
                      {s.display_name.split(',')[0]}
                    </span>
                    <span className="block text-[10px] font-medium text-gray-450 truncate mt-0.5">
                      {s.display_name}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Use Current Location Button & Warning Alerts */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={handleGPSDetect}
            className="flex items-center justify-center gap-2 w-full py-3 bg-blue-500/10 border border-blue-500/20 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-2xl transition-all cursor-pointer font-black text-xs uppercase tracking-wider"
          >
            <Compass className="h-4.5 w-4.5 animate-pulse" />
            {isDetectingGPS ? 'Detecting Location...' : 'Use Current Location'}
          </button>
          
          {geoWarning && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-[10px] font-semibold text-amber-700 dark:text-amber-400 leading-normal flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
              <span>{geoWarning}</span>
            </div>
          )}
        </div>

        {/* Dynamic Map Panel */}
        <div className="relative h-44 w-full rounded-3xl overflow-hidden shrink-0 border border-gray-100 dark:border-slate-850">
          {mapCenter[0] === 0 && mapCenter[1] === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-55 dark:bg-slate-900 text-center p-4">
              <span className="text-gray-400 dark:text-gray-500 font-semibold">
                {isDetectingGPS ? 'Securing GPS location lock...' : 'Unable to determine your location'}
              </span>
            </div>
          ) : (
            <LocationMap
              center={mapCenter}
              zoom={16}
              interactive={true}
              onPositionChange={handleMapPinChange}
            />
          )}
          
          {/* Draggable pin tip */}
          <div className="absolute top-3 left-3 z-10 px-2.5 py-1 bg-slate-950/80 backdrop-blur-md rounded-lg text-[9px] font-black text-white uppercase tracking-wider flex items-center gap-1 select-none">
            <Info className="h-3 w-3 text-blue-500" />
            Drag pin or tap map to adjust
          </div>
        </div>

        {/* GPS accuracy indicator bar */}
        <div className="flex items-center justify-between gap-3 bg-gray-50 dark:bg-slate-900 border border-gray-150 dark:border-slate-800 p-3 rounded-2xl shrink-0">
          <div className="text-left">
            <span className="text-[9px] font-black uppercase text-blue-500 block">GPS Auto-Locator</span>
            <span className="text-[10px] font-semibold text-gray-800 dark:text-gray-250 mt-0.5 block">
              {isDetectingGPS 
                ? `Acquiring position lock... ${gpsAccuracy ? `(acc: ${gpsAccuracy.toFixed(0)}m)` : ''}`
                : gpsAccuracy 
                  ? `Exact coordinates secured (accuracy: ${gpsAccuracy.toFixed(1)}m)`
                  : 'Location resolved successfully.'}
            </span>
          </div>
        </div>

        {/* Address Fields Confirmation Forms */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          
          {/* Custom Tag select buttons (Swiggy style) */}
          <div className="flex flex-col gap-1.5 shrink-0">
            <label className="text-[9px] font-black uppercase tracking-wider text-gray-400">Save Address As</label>
            <div className="grid grid-cols-3 gap-2">
              {['Home', 'Work', 'Other'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setAddressName(tag)}
                  className={`py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all cursor-pointer flex items-center justify-center gap-1
                    ${addressName === tag
                      ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-extrabold'
                      : 'border-gray-150 dark:border-slate-800 text-gray-500 dark:text-gray-450 hover:bg-gray-50 dark:hover:bg-slate-850'
                    }`}
                >
                  {addressName === tag && <Check className="h-3.5 w-3.5" />}
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Input
              label="Flat / House / Office No. / Building Name"
              value={addressDetails}
              onChange={(e) => setAddressDetails(e.target.value)}
              placeholder="e.g. A-12, Shanti Apartments"
              required
            />
            
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Floor / Block"
                value={floor}
                onChange={(e) => setFloor(e.target.value)}
                placeholder="e.g. 4th Floor"
              />
              <Input
                label="Nearby Landmark"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Near Civil Lines Bus Stand"
              />
            </div>

            <Input
              label="Street / Road / Locality Name"
              value={addressArea}
              onChange={(e) => setAddressArea(e.target.value)}
              placeholder="e.g. Civil Lines"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="City / State"
                value={addressCity}
                onChange={(e) => setAddressCity(e.target.value)}
                placeholder="e.g. Prayagraj, Uttar Pradesh"
                required
              />
              <Input
                label="PIN Code"
                value={addressPinCode}
                onChange={(e) => setAddressPinCode(e.target.value)}
                placeholder="e.g. 211001"
                required
              />
            </div>

            <Input
              label="Delivery Instructions for Rider"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g. Avoid calling, leave package at gate."
            />
          </div>

          {/* Set default toggle */}
          <label className="flex items-center gap-2 text-xs font-bold text-gray-650 dark:text-gray-300 mt-1 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={addressDefault}
              onChange={(e) => setAddressDefault(e.target.checked)}
              className="accent-blue-500 rounded border-gray-300 focus:ring-blue-500 h-4 w-4"
            />
            Make this default shipping location
          </label>

          {/* Submit button */}
          <Button
            type="submit"
            isLoading={isSaving}
            className="w-full py-3.5 text-xs font-black uppercase tracking-wider rounded-2xl mt-2 text-white bg-gradient-to-r from-[#1E88E5] to-[#1565C0]"
          >
            {initialAddress ? 'Update Details' : 'Save Delivery Address'}
          </Button>
        </form>
      </div>
    </Dialog>
  );
};
