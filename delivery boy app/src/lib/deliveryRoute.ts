export type Coordinates = { lat: number; lng: number };
export function coordinates(value: unknown): Coordinates | null {
  if (!value || typeof value !== 'object') return null;
  const v = value as Record<string, unknown>;
  if (v.lat === null || v.lng === null || v.lat === '' || v.lng === '' || v.lat === undefined || v.lng === undefined) return null;
  const lat = Number(v.lat), lng = Number(v.lng);
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 && (lat !== 0 || lng !== 0) ? { lat, lng } : null;
}
export type MapStop = { id: string; type: 'pickup' | 'delivery'; coords: Coordinates | null; status: string; shopName?: string; customerName?: string; address?: string; shopAddress?: string };
export function remainingStops<T extends MapStop>(stops: T[], index: number): T[] {
  return stops.slice(Math.max(0, index)).filter(stop => stop.status !== 'completed');
}
export function navigationUrl(stops: MapStop[], index: number, allStops = false): string | null {
  const remaining = remainingStops(stops, index);
  const chosen = allStops ? remaining : remaining.slice(0, 1);
  const destinations = chosen.map(stop => {
    const point = coordinates(stop.coords);
    return point ? `${point.lat},${point.lng}` : (stop.type === 'pickup' ? stop.shopAddress : stop.address)?.trim();
  });
  if (!destinations.length || destinations.some(value => !value)) return null;
  const query = new URLSearchParams({ api: '1', destination: destinations.at(-1)!, travelmode: 'driving' });
  if (destinations.length > 1) query.set('waypoints', destinations.slice(0, -1).join('|'));
  else query.set('dir_action', 'navigate');
  return `https://www.google.com/maps/dir/?${query}`;
}
