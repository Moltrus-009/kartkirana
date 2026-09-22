import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Target, ZoomIn, ZoomOut } from 'lucide-react';
import { coordinates, remainingStops } from '../lib/deliveryRoute';
import type { Coordinates, MapStop } from '../lib/deliveryRoute';

const TILE_URL = import.meta.env.VITE_MAP_TILE_URL || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION = import.meta.env.VITE_MAP_TILE_ATTRIBUTION || '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
interface Props { riderCoords: Coordinates | null; stops: MapStop[]; currentStopIndex: number; status: string }
export const SVGMap: React.FC<Props> = ({ riderCoords, stops, currentStopIndex }) => {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markers = useRef<L.LayerGroup | null>(null);
  const line = useRef<L.Polyline | null>(null);
  const fittedRoute = useRef('');
  const [message, setMessage] = useState('Loading route…');
  const [path, setPath] = useState<{ points: [number, number][]; road: boolean }>({ points: [], road: false });
  const rider = coordinates(riderCoords);
  const pending = remainingStops(stops, currentStopIndex);
  // Stable keys avoid restarting network requests when an unrelated order field changes.
  const routeKey = JSON.stringify(pending.map(stop => [stop.id, coordinates(stop.coords)]));
  const requestKey = JSON.stringify([rider, pending.map(stop => coordinates(stop.coords))]);
  useEffect(() => {
    if (!container.current) return;
    const map = L.map(container.current, { zoomControl: false }).setView([22.5, 79], 5);
    mapRef.current = map;
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: ATTRIBUTION }).addTo(map)
      .on('tileerror', () => setMessage('Map tiles unavailable. Use Navigate for directions.'));
    markers.current = L.layerGroup().addTo(map);
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(container.current);
    return () => { resize.disconnect(); map.remove(); mapRef.current = null; };
  }, []);
  useEffect(() => {
    const [origin, targets] = JSON.parse(requestKey) as [Coordinates | null, (Coordinates | null)[]];
    const points = [origin, ...targets].filter((p): p is Coordinates => Boolean(p));
    const direct = points.map(p => [p.lat, p.lng] as [number, number]);
    setPath({ points: direct, road: false });
    if (targets.some(p => !p)) { setMessage('A stop has no map pin. Confirm its address before navigating.'); return; }
    if (points.length < 2) { setMessage(origin ? 'No remaining route.' : 'Waiting for GPS. The destination is shown on the map.'); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    let active = true;
    // Debounce successive GPS fixes; an obsolete request must never overwrite a newer route.
    const timer = window.setTimeout(async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${points.map(p => `${p.lng},${p.lat}`).join(';')}?overview=full&geometries=geojson`;
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Routing unavailable');
        const data = await response.json();
        const geometry = data.routes?.[0]?.geometry?.coordinates;
        if (data.code !== 'Ok' || !Array.isArray(geometry) || geometry.length < 2) throw new Error('No driving route');
        if (active) {
          setPath({ points: geometry.map((c: number[]) => [c[1], c[0]]), road: true });
          setMessage(origin ? 'Road route through all remaining stops' : 'Route between stops · waiting for your GPS');
        }
      } catch {
        if (active) setMessage('Road route unavailable. Dashed lines are a stop overview, not driving directions.');
      } finally { window.clearTimeout(timeout); }
    }, 700);
    return () => { active = false; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [requestKey]);
  useEffect(() => {
    const group = markers.current;
    if (!group) return;
    group.clearLayers();
    if (rider) L.marker([rider.lat, rider.lng], { icon: L.divIcon({ className: '', html: '<div style="background:#1664e8;color:white;border:2px solid white;border-radius:50%;padding:6px">🛵</div>', iconSize: [36, 36] }) }).bindPopup('Your location').addTo(group);
    stops.forEach((stop, index) => {
      const point = coordinates(stop.coords);
      if (!point || stop.status === 'completed' || index < currentStopIndex) return;
      const popup = document.createElement('div');
      popup.textContent = `${index + 1}. ${stop.type === 'pickup' ? stop.shopName || 'Pickup' : stop.customerName || 'Delivery'}`;
      L.marker([point.lat, point.lng], { icon: L.divIcon({ className: '', html: `<div style="background:${index === currentStopIndex ? '#1664e8' : '#be123c'};color:white;border:2px solid white;border-radius:50%;width:30px;height:30px;text-align:center;line-height:26px;font-weight:bold">${index + 1}</div>`, iconSize: [30, 30] }) }).bindPopup(popup).addTo(group);
    });
  }, [requestKey, stops, currentStopIndex]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    line.current?.remove();
    if (!path.points.length) return;
    line.current = L.polyline(path.points, { color: '#1664e8', weight: 5, ...(path.road ? {} : { dashArray: '8 8' }) }).addTo(map);
    const fitKey = routeKey + String(path.road);
    if (fittedRoute.current !== fitKey) {
      map.fitBounds(L.latLngBounds(path.points), { padding: [35, 35], maxZoom: 16 });
      fittedRoute.current = fitKey;
    }
  }, [path, routeKey]);
  return <div className="relative w-full h-full">
    <div ref={container} className="w-full h-full z-0" />
    <div className="absolute top-2 left-2 right-2 z-10 bg-white/95 text-slate-800 rounded-lg px-3 py-2 text-xs" role="status">{message}</div>
    <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
      <button aria-label="Show entire route" className="p-2 bg-white rounded-lg" onClick={() => { if (path.points.length) mapRef.current?.fitBounds(L.latLngBounds(path.points), { padding: [35, 35], maxZoom: 16 }); }}><Target /></button>
      <button aria-label="Zoom in" className="p-2 bg-white rounded-lg" onClick={() => mapRef.current?.zoomIn()}><ZoomIn /></button>
      <button aria-label="Zoom out" className="p-2 bg-white rounded-lg" onClick={() => mapRef.current?.zoomOut()}><ZoomOut /></button>
    </div>
  </div>;
};
