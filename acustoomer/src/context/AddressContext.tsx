import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { UserAddress } from '../types';
import { useAppStore } from '../core/store/useAppStore';
import { locationService } from '../services/locationService';
import { useAuth } from './AuthContext';
import {
  CUSTOMER_STORAGE_KEYS,
  getCustomerStorageItem,
  removeCustomerStorageItem,
  setCustomerStorageItem
} from '../utils/customerStorage';

interface AddressContextType {
  addresses: UserAddress[];
  selectedAddress: UserAddress | null;
  addAddress: (address: Omit<UserAddress, 'id'>) => Promise<UserAddress>;
  editAddress: (id: string, address: Partial<UserAddress>) => Promise<UserAddress>;
  deleteAddress: (id: string) => Promise<void>;
  selectAddress: (id: string) => void;
  detectCurrentLocation: () => Promise<Omit<UserAddress, 'id' | 'isDefault'>>;
}

const AddressContext = createContext<AddressContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = CUSTOMER_STORAGE_KEYS.addresses;
const LAST_KNOWN_ADDR_KEY = CUSTOMER_STORAGE_KEYS.selectedAddress;
const CURRENT_LOCATION_ID = 'addr_current_gps';

const isCompleteAddress = (value: Partial<UserAddress> | null): value is UserAddress => Boolean(
  value?.id &&
  value?.name &&
  typeof value?.details === 'string' &&
  typeof value?.area === 'string' &&
  typeof value?.city === 'string' &&
  Number.isFinite(value?.lat) &&
  Number.isFinite(value?.lng)
);

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
  const city = getComp(['administrative_area_level_2', 'locality']) || 'Unknown City';
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

export const AddressProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useAuth();
  const [addresses, setAddresses] = useState<UserAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<UserAddress | null>(null);
  const lastGeocodeTimeRef = useRef<number>(0);

  // Reload only the authenticated customer's addresses on an account change.
  useEffect(() => {
    if (authLoading) return;
    if (!user?.uid) {
      setAddresses([]);
      setSelectedAddress(null);
      locationService.setActiveUser(null);
      return;
    }

    locationService.setActiveUser(user.uid);
    const saved = getCustomerStorageItem(LOCAL_STORAGE_KEY, user.uid);
    const lastKnown = getCustomerStorageItem(LAST_KNOWN_ADDR_KEY, user.uid);
    
    let parsed: UserAddress[] = [];
    if (saved) {
      parsed = JSON.parse(saved) as UserAddress[];
      setAddresses(parsed);
    } else {
      // Start with empty list to avoid Noida fallbacks
      parsed = [];
      setAddresses(parsed);
      setCustomerStorageItem(LOCAL_STORAGE_KEY, user.uid, JSON.stringify(parsed));
    }

    // Set selected address based on last known or default
    if (lastKnown) {
      try {
        const lastKnownAddr = JSON.parse(lastKnown) as UserAddress;
        const def = parsed.find(a => a.isDefault) || parsed[0] || null;
        setSelectedAddress(isCompleteAddress(lastKnownAddr) ? lastKnownAddr : def);
      } catch {
        const def = parsed.find(a => a.isDefault) || parsed[0] || null;
        setSelectedAddress(def);
      }
    } else {
      const def = parsed.find(a => a.isDefault) || parsed[0] || null;
      setSelectedAddress(def);
    }
  }, [authLoading, user?.uid]);

  const saveToStorage = (list: UserAddress[]) => {
    setAddresses(list);
    setCustomerStorageItem(LOCAL_STORAGE_KEY, user?.uid, JSON.stringify(list));
    const active = list.find(a => a.isDefault) || list[0] || null;
    setSelectedAddress(active);
    if (active) {
      setCustomerStorageItem(LAST_KNOWN_ADDR_KEY, user?.uid, JSON.stringify(active));
    } else {
      removeCustomerStorageItem(LAST_KNOWN_ADDR_KEY, user?.uid);
    }
  };

  const addAddress = async (addrData: Omit<UserAddress, 'id'>): Promise<UserAddress> => {
    let updatedList = addresses.map(a => addrData.isDefault ? { ...a, isDefault: false } : a);
    
    const newAddr: UserAddress = {
      ...addrData,
      id: `addr_${Date.now()}`
    };

    updatedList.push(newAddr);
    saveToStorage(updatedList);
    return newAddr;
  };

  const editAddress = async (id: string, addrData: Partial<UserAddress>): Promise<UserAddress> => {
    const updatedList = addresses.map(a => {
      if (a.id === id) {
        const isDefaultChanged = addrData.isDefault !== undefined && addrData.isDefault !== a.isDefault;
        return {
          ...a,
          ...addrData,
          isDefault: isDefaultChanged ? !!addrData.isDefault : a.isDefault
        };
      }
      // If editing default, reset other addresses default attribute
      return addrData.isDefault ? { ...a, isDefault: false } : a;
    });

    saveToStorage(updatedList);
    const edited = updatedList.find(a => a.id === id);
    if (!edited) throw new Error('Address not found');
    return edited;
  };

  const deleteAddress = async (id: string): Promise<void> => {
    const filter = addresses.filter(a => a.id !== id);
    if (addresses.find(a => a.id === id)?.isDefault && filter.length > 0) {
      filter[0].isDefault = true;
    }
    saveToStorage(filter);
  };

  const selectAddress = (id: string) => {
    const found = addresses.find(a => a.id === id);
    if (found) {
      setSelectedAddress(found);
      setCustomerStorageItem(LAST_KNOWN_ADDR_KEY, user?.uid, JSON.stringify(found));
    }
  };

  // High-accuracy browser GPS location and reverse geocoding via Google / Nominatim
  const detectCurrentLocation = async (): Promise<Omit<UserAddress, 'id' | 'isDefault'>> => {
    // Call high-accuracy geolocator which handles permissions and retries
    const coords = await locationService.getCurrentLocation();
    const { lat: latitude, lng: longitude } = coords;

    try {
      const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      if (googleKey) {
        const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}`);
        if (res.ok) {
          const data = await res.json();
          if (data.results && data.results[0]) {
            const parsed = parseGoogleAddress(data.results[0]);
            return {
              ...parsed,
              lat: latitude,
              lng: longitude
            };
          }
        }
      }

      // Nominatim reverse geocoder
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'KartKiranaApp/1.0'
          }
        }
      );

      if (!res.ok) throw new Error('OSM Reverse Geocoding request failed');
      const data = await res.json();
      const addr = data.address || {};
      
      // Map Nominatim parameters
      const area = addr.suburb || addr.neighbourhood || addr.village || addr.quarter || addr.subdivision || 'Local Area';
      const locality = addr.road || addr.pedestrian || addr.suburb || '';
      const city = addr.city || addr.town || addr.city_district || addr.county || 'Unknown City';
      const state = addr.state || '';
      const pinCode = addr.postcode || '';
      
      return {
        name: 'Current Location',
        details: locality ? `${locality}, ${area}` : area,
        area: area,
        city: `${city}, ${state}`.trim(),
        pinCode: pinCode,
        lat: latitude,
        lng: longitude
      };
    } catch (err) {
      console.warn('[AddressContext] Geocoding request throttled or offline, resolving coordinates only.', err);
      return {
        name: 'Current GPS Coordinates',
        details: `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
        area: 'Unknown Locality',
        city: 'Unknown City',
        pinCode: '',
        lat: latitude,
        lng: longitude
      };
    }
  };

  // Continuous background GPS watcher to automatically refresh active location on movement
  useEffect(() => {
    if (authLoading || !user?.uid || !navigator.geolocation) return;
    const userId = user.uid;

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 30000
    };

    let active = true;

    const handlePosition = async (position: GeolocationPosition) => {
        if (!active) return;
        const { latitude, longitude } = position.coords;
        localStorage.setItem('location_permission_prompted', 'true');

        let persistedAddress: UserAddress | null = null;
        try {
          persistedAddress = JSON.parse(getCustomerStorageItem(LAST_KNOWN_ADDR_KEY, userId) || 'null');
        } catch {
          persistedAddress = null;
        }

        // Automatically activate the first successful GPS result. Respect a manually selected address.
        if (!isCompleteAddress(persistedAddress)) {
          const provisionalAddress: UserAddress = {
            id: CURRENT_LOCATION_ID,
            name: 'Current Location',
            details: 'Location detected automatically',
            area: 'Resolving nearby area…',
            city: '',
            pinCode: '',
            lat: latitude,
            lng: longitude,
            isDefault: true
          };

          setAddresses((currentAddresses) => {
            const next = [
              ...currentAddresses
                .filter(address => address.id !== CURRENT_LOCATION_ID)
                .map(address => ({ ...address, isDefault: false })),
              provisionalAddress
            ];
            setCustomerStorageItem(LOCAL_STORAGE_KEY, userId, JSON.stringify(next));
            return next;
          });
          setSelectedAddress(provisionalAddress);
          setCustomerStorageItem(LAST_KNOWN_ADDR_KEY, userId, JSON.stringify(provisionalAddress));

          // Refine the visible address in the background without holding up app startup.
          if (Date.now() - lastGeocodeTimeRef.current > 35000) {
            lastGeocodeTimeRef.current = Date.now();
            void detectCurrentLocation()
              .then((detected) => {
                if (!active) return;
                let latestAddress: UserAddress | null = null;
                try {
                  latestAddress = JSON.parse(getCustomerStorageItem(LAST_KNOWN_ADDR_KEY, userId) || 'null');
                } catch {
                  latestAddress = null;
                }
                if (latestAddress?.id !== CURRENT_LOCATION_ID) return;

                const resolvedAddress: UserAddress = {
                  ...detected,
                  id: CURRENT_LOCATION_ID,
                  isDefault: true
                };
                setAddresses((currentAddresses) => {
                  const next = currentAddresses.some(address => address.id === CURRENT_LOCATION_ID)
                    ? currentAddresses.map(address => address.id === CURRENT_LOCATION_ID ? resolvedAddress : { ...address, isDefault: false })
                    : [...currentAddresses.map(address => ({ ...address, isDefault: false })), resolvedAddress];
                  setCustomerStorageItem(LOCAL_STORAGE_KEY, userId, JSON.stringify(next));
                  return next;
                });
                setSelectedAddress(resolvedAddress);
                setCustomerStorageItem(LAST_KNOWN_ADDR_KEY, userId, JSON.stringify(resolvedAddress));
              })
              .catch(err => console.warn('[AddressContext] Background address resolution failed:', err));
          }
        }
        
        setSelectedAddress((current) => {
          if (!current) return null;
          
          // Only update if selected address is the dynamic current GPS pin
          if (current.name === 'Current Location' || current.id === 'addr_current_gps') {
            const diffLat = Math.abs(current.lat - latitude);
            const diffLng = Math.abs(current.lng - longitude);
            
            // Trigger background geocode update if user moved more than ~20 meters
            if (diffLat > 0.0002 || diffLng > 0.0002) {
              const now = Date.now();
              const updatedAddr = { ...current, lat: latitude, lng: longitude };
              
              // Rate limit reverse-geocoding calls to once every 35 seconds to avoid OpenStreetMap Nominatim throttling
              if (now - lastGeocodeTimeRef.current > 35000) {
                lastGeocodeTimeRef.current = now;

                const googleKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
                if (googleKey) {
                  fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleKey}`)
                    .then(res => res.ok ? res.json() : null)
                    .then(data => {
                      if (!active) return;
                      if (data && data.results && data.results[0]) {
                        const parsed = parseGoogleAddress(data.results[0]);
                        const resolved = {
                          ...current,
                          ...parsed,
                          lat: latitude,
                          lng: longitude
                        };
                        setSelectedAddress(resolved);
                        setCustomerStorageItem(LAST_KNOWN_ADDR_KEY, userId, JSON.stringify(resolved));
                      }
                    })
                    .catch(err => console.warn('Background Google geocoding error:', err));
                } else {
                  fetch(
                    `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
                    { headers: { 'Accept-Language': 'en', 'User-Agent': 'KartKiranaApp/1.0' } }
                  )
                    .then((res) => (res.ok ? res.json() : null))
                    .then((data) => {
                      if (!active) return;
                      if (data && data.address) {
                        const addr = data.address;
                        const area = addr.suburb || addr.neighbourhood || addr.village || addr.quarter || 'Local Area';
                        const locality = addr.road || addr.pedestrian || '';
                        const city = addr.city || addr.town || 'Unknown City';
                        const state = addr.state || '';
                        
                        const resolved = {
                          ...current,
                          details: locality ? `${locality}, ${area}` : area,
                          area,
                          city: `${city}, ${state}`.trim(),
                          pinCode: addr.postcode || '',
                          lat: latitude,
                          lng: longitude
                        };
                        
                        setSelectedAddress(resolved);
                        setCustomerStorageItem(LAST_KNOWN_ADDR_KEY, userId, JSON.stringify(resolved));
                      }
                    })
                    .catch((err) => console.warn('Background watch geocoding throttled:', err));
                }
              }
              
              return updatedAddr;
            }
          }
          
          return current;
        });
      };

    const handleError = (err: GeolocationPositionError) => {
        console.warn('[AddressContext] Background GPS watch error:', err);
      };

    // Get a fast cached/network position first, then refine continuously with high accuracy.
    navigator.geolocation.getCurrentPosition(
      handlePosition,
      handleError,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 300000 }
    );

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      options
    );

    return () => {
      active = false;
      navigator.geolocation.clearWatch(watchId);
    };
  }, [authLoading, user?.uid]);

  // Synchronize store shop distances whenever selectedAddress changes
  useEffect(() => {
    if (selectedAddress) {
      useAppStore.getState().updateShopDistances(selectedAddress.lat, selectedAddress.lng);
    }
  }, [selectedAddress]);

  return (
    <AddressContext.Provider value={{
      addresses,
      selectedAddress,
      addAddress,
      editAddress,
      deleteAddress,
      selectAddress,
      detectCurrentLocation
    }}>
      {children}
    </AddressContext.Provider>
  );
};

export const useAddress = () => {
  const context = useContext(AddressContext);
  if (!context) throw new Error('useAddress must be used within AddressProvider');
  return context;
};
