import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Target, ZoomIn, ZoomOut } from 'lucide-react';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  type: 'user' | 'shop' | 'rider';
}

interface LocationMapProps {
  center: [number, number];
  zoom?: number;
  interactive?: boolean;
  onPositionChange?: (lat: number, lng: number) => void;
  markers?: MapMarker[];
  polyline?: [number, number][];
  className?: string;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  center,
  zoom = 15,
  interactive = false,
  onPositionChange,
  markers = [],
  polyline,
  className = 'h-full w-full'
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const dragMarkerRef = useRef<L.Marker | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  // Initialize Map Instance
  useEffect(() => {
    if (!mapRef.current) return;

    // Create Leaflet Map Instance
    const map = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(center, zoom);

    leafletMap.current = map;

    // Load OpenStreetMap standard tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    }).addTo(map);

    // If interactive pin selection is enabled (Swiggy Center-Pin Style)
    if (interactive) {
      map.on('moveend', () => {
        const centerLatLng = map.getCenter();
        if (onPositionChange) {
          onPositionChange(centerLatLng.lat, centerLatLng.lng);
        }
      });

      map.on('click', (e) => {
        map.panTo(e.latlng, { animate: true });
      });
    }

    // Dynamic marker layer group
    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    return () => {
      map.remove();
      leafletMap.current = null;
    };
  }, []);

  // Update map coordinates on center changes
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    const currentCenter = map.getCenter();
    const diffLat = Math.abs(currentCenter.lat - center[0]);
    const diffLng = Math.abs(currentCenter.lng - center[1]);
    
    if (diffLat > 0.00015 || diffLng > 0.00015) {
      map.panTo(center, { animate: true, duration: 0.5 });
      if (dragMarkerRef.current) {
        dragMarkerRef.current.setLatLng(center);
      }
    }
  }, [center]);

  // Update custom markers
  useEffect(() => {
    const map = leafletMap.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    markers.forEach(m => {
      let icon;
      if (m.type === 'user') {
        icon = L.divIcon({
          html: `<div class="h-9 w-9 rounded-full bg-white dark:bg-slate-900 border-2 border-red-500 flex items-center justify-center shadow-md animate-pulse">
                  <span class="text-sm">📍</span>
                 </div>`,
          className: 'custom-user-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });
      } else if (m.type === 'shop') {
        icon = L.divIcon({
          html: `<div class="h-9 w-9 rounded-2xl bg-white dark:bg-slate-900 border-2 border-blue-500 flex items-center justify-center shadow-md">
                  <span class="text-sm">🏪</span>
                 </div>`,
          className: 'custom-shop-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });
      } else { // rider
        icon = L.divIcon({
          html: `<div class="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                  <span class="text-sm">🛵</span>
                 </div>`,
          className: 'custom-rider-pin',
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });
      }

      L.marker([m.lat, m.lng], { icon })
        .bindPopup(`<div class="p-1 font-black text-xs text-gray-800">${m.title}</div>`)
        .addTo(markerGroup);
    });
  }, [markers]);

  // Update routing polyline
  useEffect(() => {
    const map = leafletMap.current;
    if (!map) return;

    if (polylineRef.current) {
      polylineRef.current.remove();
      polylineRef.current = null;
    }

    if (polyline && polyline.length > 0) {
      const line = L.polyline(polyline, {
        color: '#10b981', // blue-500
        weight: 5,
        opacity: 0.8,
        dashArray: '8, 6'
      }).addTo(map);

      polylineRef.current = line;
      
      try {
        map.fitBounds(line.getBounds(), { padding: [40, 40] });
      } catch (err) {
        console.warn('[LocationMap] Bounds error:', err);
      }
    }
  }, [polyline]);

  const handleRecenter = () => {
    const map = leafletMap.current;
    if (map) {
      map.setView(center, map.getZoom(), { animate: true });
    }
  };

  const handleZoomIn = () => {
    const map = leafletMap.current;
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    const map = leafletMap.current;
    if (map) map.zoomOut();
  };

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-inner border border-slate-100 dark:border-slate-900">
      
      {/* Map Canvas */}
      <div 
        ref={mapRef} 
        className={`${className} z-0 dark:filter dark:invert dark:hue-rotate-180 dark:brightness-[1.1] dark:contrast-[0.85]`}
      />

      {/* Stationary Center Pin Overlay (Swiggy-style) */}
      {interactive && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[calc(100%-8px)] pointer-events-none z-10 flex flex-col items-center">
          <div className="h-10 w-10 rounded-full bg-white dark:bg-slate-900 border-2 border-blue-500 flex items-center justify-center shadow-lg transform -translate-y-1 animate-bounce">
            <span className="text-xl">📍</span>
          </div>
          {/* Accent shadow blur ring */}
          <div className="h-1.5 w-3 bg-black/25 dark:bg-blue-500/10 rounded-full blur-[1px] -mt-1 scale-x-110"></div>
        </div>
      )}

      {/* Control overlay */}
      <div className="absolute bottom-5 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-md text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          title="Recenter Map"
        >
          <Target className="h-4.5 w-4.5" />
        </button>

        <div className="flex flex-col rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2.5 border-b border-slate-100 dark:border-slate-800 text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2.5 text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-all cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
