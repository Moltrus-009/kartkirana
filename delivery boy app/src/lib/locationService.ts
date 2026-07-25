import { logger } from './logger';
import { Capacitor } from '@capacitor/core';
import { Geolocation } from '@capacitor/geolocation';

// H-1 fix (partial — see note below): route through @capacitor/geolocation's
// native implementation on Android/iOS instead of the browser
// navigator.geolocation Web API. The native plugin talks to the OS location
// service directly, which survives WebView JS-timer throttling far better
// than watchPosition() does when the app is merely backgrounded (screen off,
// user briefly switches app). It is NOT, by itself, a substitute for a true
// background-location plugin with an Android foreground service — once
// Android fully stops the app process (aggressive battery optimization,
// swipe-to-kill, extended background time) any JS-driven watch, native or
// not, stops updating. For guaranteed continuous tracking during an active
// delivery, a dedicated background-geolocation Capacitor plugin + Android
// foreground service notification (declared in AndroidManifest.xml) is
// still required — see README "Known limitations" for the follow-up needed
// once native build tooling/network access is available to add that
// dependency.

export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy?: number;
}

type LocationCallback = (coords: LocationCoords) => void;
type ErrorCallback = (err: GeolocationPositionError | Error) => void;

class LocationService {
  private activeWatchId: number | null = null;
  private activeNativeWatchId: string | null = null;
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

  async checkAndRequestPermissions(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      try {
        const status = await Geolocation.checkPermissions();
        if (status.location === 'granted' || status.coarseLocation === 'granted') {
          return true;
        }
        const req = await Geolocation.requestPermissions();
        return req.location === 'granted' || req.coarseLocation === 'granted';
      } catch (err) {
        logger.warn('Location', 'Native permissions check failed:', err);
        return false;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.permissions) {
      try {
        const res = await navigator.permissions.query({ name: 'geolocation' });
        return res.state === 'granted' || res.state === 'prompt';
      } catch {
        return true;
      }
    }
    return true;
  }

  async getCurrentLocation(
    options: { enableHighAccuracy?: boolean; timeoutMs?: number; maxRetries?: number } = {}
  ): Promise<LocationCoords> {
    const useHighAccuracy = true; // Enforced high accuracy
    const timeout = options.timeoutMs ?? 15000;
    const maxRetries = options.maxRetries ?? 1;

    logger.info('Location', `Fetching high-accuracy location. MaxRetries: ${maxRetries}`);

    if (!Capacitor.isNativePlatform() && (typeof navigator === 'undefined' || !navigator.geolocation)) {
      throw new Error('Geolocation is not supported by this browser.');
    }

    const getPositionPromise = () =>
      Capacitor.isNativePlatform()
        ? Geolocation.getCurrentPosition({ enableHighAccuracy: useHighAccuracy, timeout }).then((pos) => {
            const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
            this.saveCache(coords);
            return coords;
          })
        : new Promise<LocationCoords>((resolve, reject) => {
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
    this.stopTracking();

    if (Capacitor.isNativePlatform()) {
      logger.info('Location', 'Starting continuous native geolocation watch (Android/iOS).');
      Geolocation.watchPosition(
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 10000 },
        (pos, err) => {
          if (err || !pos) {
            logger.warn('Location', `Native watchPosition warning: ${err?.message}. Triggering one-shot fallback.`);
            this.getCurrentLocation()
              .then((coords) => onSuccess(coords))
              .catch((oneShotErr) => {
                if (onError) onError(oneShotErr);
              });
            return;
          }
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          this.saveCache(coords);
          onSuccess(coords);
        }
      ).then((id) => {
        this.activeNativeWatchId = id;
      }).catch((err) => {
        if (onError) onError(err);
      });
      return null;
    }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      if (onError) onError(new Error('Geolocation not supported') as any);
      return null;
    }

    logger.info('Location', 'Starting continuous geolocation watch tracking (web).');
    const isMobile = this.isMobileDevice();

    this.activeWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
        this.saveCache(coords);
        onSuccess(coords);
      },
      (err) => {
        logger.warn('Location', `watchPosition warning (${err.code}): ${err.message}.`);
        if (this.cachedLocation) {
          onSuccess(this.cachedLocation);
        } else {
          this.getCurrentLocation()
            .then((coords) => onSuccess(coords))
            .catch((oneShotErr) => {
              if (onError) onError(oneShotErr);
            });
        }
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
    if (this.activeNativeWatchId !== null) {
      logger.info('Location', `Stopping active native watch ID: ${this.activeNativeWatchId}`);
      Geolocation.clearWatch({ id: this.activeNativeWatchId }).catch(() => {});
      this.activeNativeWatchId = null;
    }
    if (this.activeWatchId !== null && typeof navigator !== 'undefined') {
      logger.info('Location', `Stopping active watch ID: ${this.activeWatchId}`);
      navigator.geolocation.clearWatch(this.activeWatchId);
      this.activeWatchId = null;
    }
  }
}

export const locationService = new LocationService();
