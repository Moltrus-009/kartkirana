import { logger } from '../core/logger/logger';

export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

type LocationCallback = (coords: LocationCoords) => void;
type ErrorCallback = (err: GeolocationPositionError | Error) => void;

class LocationService {
  private activeWatchId: number | null = null;
  private cachedLocation: LocationCoords | null = null;
  private cacheKey = 'shop_app_last_known_address';

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const stored = localStorage.getItem(this.cacheKey);
      if (stored) {
        this.cachedLocation = JSON.parse(stored);
        logger.info('Location', 'Loaded cached coordinates from localStorage:', this.cachedLocation);
      }
    } catch (err) {
      logger.warn('Location', 'Failed to read cached coordinates:', err);
    }
  }

  private saveCache(coords: LocationCoords) {
    try {
      this.cachedLocation = coords;
      localStorage.setItem(this.cacheKey, JSON.stringify(coords));
    } catch (err) {
      logger.warn('Location', 'Failed to cache coordinates:', err);
    }
  }

  isMobileDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }

  getCachedLocation(): LocationCoords | null {
    return this.cachedLocation;
  }

  async getCurrentLocation(
    options: { enableHighAccuracy?: boolean; timeoutMs?: number } = {}
  ): Promise<LocationCoords> {
    const isMobile = this.isMobileDevice();
    const useHighAccuracy = options.enableHighAccuracy ?? true;
    const timeout = options.timeoutMs ?? 30000;

    logger.info('Location', `Fetching location. Mode: ${isMobile ? 'Mobile' : 'Desktop'}. HighAccuracy: ${useHighAccuracy}`);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    return new Promise<LocationCoords>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          this.saveCache(coords);
          resolve(coords);
        },
        (err) => {
          logger.warn('Location', `Primary location lookup failed: ${err.message}. Retrying with fallback...`);
          
          navigator.geolocation.getCurrentPosition(
            (fallbackPos) => {
              const coords = { lat: fallbackPos.coords.latitude, lng: fallbackPos.coords.longitude, accuracy: fallbackPos.coords.accuracy };
              this.saveCache(coords);
              resolve(coords);
            },
            async (fallbackErr) => {
              logger.warn('Location', `Fallback low-accuracy lookup failed: ${fallbackErr.message}. Checking IP geolocation...`);
              
              if (this.cachedLocation) {
                logger.info('Location', 'Using cached location as last resort fallback.');
                return resolve(this.cachedLocation);
              }

              try {
                const res = await fetch('https://ipapi.co/json/');
                if (res.ok) {
                  const data = await res.json();
                  if (data.latitude && data.longitude) {
                    const coords = { lat: parseFloat(data.latitude), lng: parseFloat(data.longitude), accuracy: 10000 };
                    this.saveCache(coords);
                    return resolve(coords);
                  }
                }
              } catch (ipErr) {
                logger.error('Location', 'IP Geolocation fallback failed:', ipErr);
              }
              
              reject(fallbackErr);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: useHighAccuracy, timeout: timeout, maximumAge: 0 }
      );
    });
  }

  startTracking(onSuccess: LocationCallback, onError?: ErrorCallback): number | null {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (onError) onError(new Error('Geolocation not supported') as any);
      return null;
    }

    this.stopTracking();

    logger.info('Location', 'Starting continuous geolocation watch tracking.');
    const isMobile = this.isMobileDevice();

    this.activeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        this.saveCache(coords);
        onSuccess(coords);
      },
      (err) => {
        logger.warn('Location', `watchPosition encountered warning: ${err.message}. Triggering one-shot fallback.`);
        this.getCurrentLocation()
          .then((coords) => onSuccess(coords))
          .catch((oneShotErr) => {
            if (onError) onError(oneShotErr);
          });
      },
      {
        enableHighAccuracy: isMobile,
        timeout: 30000,
        maximumAge: 10000
      }
    );

    return this.activeWatchId;
  }

  stopTracking() {
    if (this.activeWatchId !== null && typeof navigator !== 'undefined') {
      logger.info('Location', `Stopping active watch ID: ${this.activeWatchId}`);
      navigator.geolocation.clearWatch(this.activeWatchId);
      this.activeWatchId = null;
    }
  }
}

export const locationService = new LocationService();
