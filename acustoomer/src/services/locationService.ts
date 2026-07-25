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
    options: { enableHighAccuracy?: boolean; timeoutMs?: number; maxRetries?: number } = {}
  ): Promise<LocationCoords> {
    const useHighAccuracy = true; // Enforced high accuracy
    const timeout = options.timeoutMs ?? 15000;
    const maxRetries = options.maxRetries ?? 1;

    logger.info('Location', `Fetching high-accuracy location. MaxRetries: ${maxRetries}`);

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    const getPositionPromise = () =>
      new Promise<LocationCoords>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            this.saveCache(coords);
            resolve(coords);
          },
          (err) => reject(err),
          { enableHighAccuracy: useHighAccuracy, timeout: timeout, maximumAge: 0 }
        );
      });

    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        return await getPositionPromise();
      } catch (err: any) {
        if (err.code === 1) { // GeolocationPositionError.PERMISSION_DENIED
          throw new Error('PERMISSION_DENIED');
        }
        attempt++;
        if (attempt > maxRetries) {
          if (this.cachedLocation) {
            logger.info('Location', 'Returning last successful cached location.');
            return this.cachedLocation;
          }
          throw err;
        }
        logger.warn('Location', `GPS attempt ${attempt} failed: ${err.message}. Retrying...`);
      }
    }
    throw new Error('Unable to determine location');
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
