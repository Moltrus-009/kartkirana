import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import type { RouteStop } from '../services/firestoreService';
import { Target, ZoomIn, ZoomOut } from 'lucide-react';
import { colors } from '../theme/colors';

// Do not use Google raster tile endpoints directly with Leaflet. They are not
// a supported Google Maps Platform integration and the previous hostname was
// invalid (`mt1.google5.com`), leaving riders with an empty map. A tile
// provider can be configured per environment without changing the app.
const MAP_TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_TILE_ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION ||
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface SVGMapProps {
  riderCoords: { lat: number; lng: number } | null;
  stops: RouteStop[];
  currentStopIndex: number;
  status: string;
}

export const SVGMap: React.FC<SVGMapProps> = ({
  riderCoords,
  stops = [],
  currentStopIndex = 0
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const routeLineRef = useRef<L.Polyline | null>(null);

  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);

  // 1. Initialize Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    const initialCenter: [number, number] = riderCoords 
      ? [riderCoords.lat, riderCoords.lng] 
      : [0, 0];

    // Create Leaflet Map
    const map = L.map(mapContainerRef.current, {
      zoomControl: false
    }).setView(initialCenter, 15);

    mapInstanceRef.current = map;

    L.tileLayer(MAP_TILE_URL, {
      maxZoom: 19,
      attribution: MAP_TILE_ATTRIBUTION
    }).addTo(map);

    // Group for markers
    const markerGroup = L.layerGroup().addTo(map);
    markerGroupRef.current = markerGroup;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2. Fetch OSRM driving path between rider and current target stop
  useEffect(() => {
    if (!riderCoords) return;

    const activeStop = stops[currentStopIndex] || stops[0];
    if (!activeStop) {
      setRoutePolyline([]);
      return;
    }

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${riderCoords.lng},${riderCoords.lat};${activeStop.coords.lng},${activeStop.coords.lat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM routing failed');
        const data = await res.json();
        
        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoutePolyline(coords);
        }
      } catch (err) {
        console.warn('[Rider Map] Routing path lookup failed, drawing direct line:', err);
        setRoutePolyline([
          [riderCoords.lat, riderCoords.lng],
          [activeStop.coords.lat, activeStop.coords.lng]
        ]);
      }
    };

    fetchRoute();
  }, [riderCoords, stops, currentStopIndex]);

  // 3. Render and Update markers dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    // 3a. Plot rider marker
    if (riderCoords) {
      const riderIcon = L.divIcon({
        html: `<div class="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
                <span class="text-lg">🛵</span>
               </div>`,
        className: 'custom-rider-pin',
        iconSize: [40, 40],
        iconAnchor: [20, 20]
      });

      L.marker([riderCoords.lat, riderCoords.lng], { icon: riderIcon })
        .bindPopup('<div class="p-1 font-bold text-xs">You (Rider Partner)</div>')
        .addTo(markerGroup);
    }

    // 3b. Plot stops markers
    stops.forEach((stop, index) => {
      const isCurrent = index === currentStopIndex;
      const isPickup = stop.type === 'pickup';

      let htmlContent = '';
      if (isPickup) {
        htmlContent = `<div class="h-9 w-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md border-2 border-white ${
          isCurrent ? 'scale-110 shadow-emerald-500/50' : 'opacity-70'
        }">
                        <span class="text-sm">🏪</span>
                       </div>`;
      } else {
        htmlContent = `<div class="h-9 w-9 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-md border-2 border-white ${
          isCurrent ? 'scale-110 shadow-rose-500/50 animate-bounce' : 'opacity-70'
        }">
                        <span class="text-sm">📍</span>
                       </div>`;
      }

      const icon = L.divIcon({
        html: htmlContent,
        className: `custom-stop-pin-${index}`,
        iconSize: [36, 36],
        iconAnchor: [18, 18]
      });

      L.marker([stop.coords.lat, stop.coords.lng], { icon })
        .bindPopup(`<div class="p-1 font-bold text-xs text-gray-800">
                      <p class="uppercase text-[8px] text-gray-400 font-extrabold">${stop.type}</p>
                      <p>${isPickup ? stop.shopName : stop.customerName}</p>
                    </div>`)
        .addTo(markerGroup);
    });
  }, [riderCoords, stops, currentStopIndex]);

  // 4. Render and Update routing polyline dynamically
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (routeLineRef.current) {
      routeLineRef.current.remove();
      routeLineRef.current = null;
    }

    if (routePolyline.length > 0) {
      const line = L.polyline(routePolyline, {
        color: colors.primary, // Kart Kirana Blue
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 6'
      }).addTo(map);

      routeLineRef.current = line;

      try {
        map.fitBounds(line.getBounds(), { padding: [50, 50] });
      } catch (err) {
        // Fallback on single point
      }
    } else if (riderCoords) {
      map.panTo([riderCoords.lat, riderCoords.lng], { animate: true });
    }
  }, [routePolyline, riderCoords]);

  // Map Controls Handlers
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (map && riderCoords) {
      map.setView([riderCoords.lat, riderCoords.lng], map.getZoom(), { animate: true });
    }
  };

  const handleZoomIn = () => {
    const map = mapInstanceRef.current;
    if (map) map.zoomIn();
  };

  const handleZoomOut = () => {
    const map = mapInstanceRef.current;
    if (map) map.zoomOut();
  };

  return (
    <div className="relative w-full h-full">
      {/* Map Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Floating Controls Overlay */}
      <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="p-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg text-slate-800 dark:text-zinc-200 hover:text-orange-500 transition cursor-pointer active:scale-95 flex items-center justify-center"
          title="Recenter Map"
        >
          <Target className="h-4.5 w-4.5" />
        </button>

        <div className="flex flex-col rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-slate-800 shadow-lg">
          <button
            type="button"
            onClick={handleZoomIn}
            className="p-2 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-zinc-200 hover:text-orange-500 transition cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="p-2 text-slate-800 dark:text-zinc-200 hover:text-orange-500 transition cursor-pointer active:scale-95 flex items-center justify-center"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
