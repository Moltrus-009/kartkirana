import { useAdmin } from '../context/AdminContext';
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation } from 'lucide-react';

export default function LiveMap() {
  const { riders, shops, orders } = useAdmin();
  const [filter, setFilter] = useState<'all' | 'riders' | 'shops' | 'orders'>('all');
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineGroupRef = useRef<L.LayerGroup | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapRef.current) {
      // Noida/NCR default coordinate center
      const defaultCenter: [number, number] = [28.58, 77.31];
      const map = L.map(mapContainerRef.current, {
        zoomControl: true,
        attributionControl: false
      }).setView(defaultCenter, 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      mapRef.current = map;
      markerGroupRef.current = L.layerGroup().addTo(map);
      polylineGroupRef.current = L.layerGroup().addTo(map);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerGroupRef.current = null;
        polylineGroupRef.current = null;
      }
    };
  }, []);

  // Update Markers based on data and active filter selection
  useEffect(() => {
    const mapInstance = mapRef.current;
    const markerGroup = markerGroupRef.current;
    const polylineGroup = polylineGroupRef.current;

    if (!mapInstance || !markerGroup || !polylineGroup) return;

    markerGroup.clearLayers();
    polylineGroup.clearLayers();

    // 1. Draw Shops markers
    if (filter === 'all' || filter === 'shops') {
      shops.forEach(shop => {
        if (shop.lat && shop.lng) {
          const shopIcon = L.divIcon({
            html: `<div class="h-9 w-9 rounded-2xl bg-white border-2 border-emerald-500 flex items-center justify-center shadow-md text-sm">🏪</div>`,
            className: 'custom-map-icon',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          });
          L.marker([shop.lat, shop.lng], { icon: shopIcon })
            .bindPopup(`<div class="p-2.5 space-y-1 text-xs text-slate-800 text-left">
              <h4 class="font-extrabold text-slate-900">${shop.name}</h4>
              <p className="text-slate-450">${shop.address}</p>
              <span class="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-bold block w-max uppercase text-[9px] mt-1">Status: ${shop.status}</span>
            </div>`)
            .addTo(markerGroup);
        }
      });
    }

    // 2. Draw Riders markers
    if (filter === 'all' || filter === 'riders') {
      riders.forEach(rider => {
        const riderLat = rider.coords?.lat || rider.latitude;
        const riderLng = rider.coords?.lng || rider.longitude;

        if (riderLat && riderLng) {
          const riderIcon = L.divIcon({
            html: `<div class="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce text-sm">🛵</div>`,
            className: 'custom-map-icon',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          });
          L.marker([riderLat, riderLng], { icon: riderIcon })
            .bindPopup(`<div class="p-2.5 space-y-1 text-xs text-slate-800 text-left">
              <h4 class="font-extrabold text-slate-900">${rider.name}</h4>
              <p class="text-slate-400">Phone: ${rider.phone} • Status: ${rider.status}</p>
              <span class="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold block w-max uppercase text-[9px] mt-1">${rider.vehicle}</span>
            </div>`)
            .addTo(markerGroup);
        }
      });
    }

    // 3. Draw Active Orders targets and routes mapping
    if (filter === 'all' || filter === 'orders') {
      const activeInTransit = orders.filter(o => ['accepted', 'preparing', 'ready_for_pickup', 'rider_assigned', 'rider_picked_up', 'out_for_delivery'].includes(o.status));
      
      activeInTransit.forEach(order => {
        const shopLat = order.shopCoords?.lat;
        const shopLng = order.shopCoords?.lng;
        const destLat = order.deliveryAddress.coords?.lat || order.deliveryAddress.lat;
        const destLng = order.deliveryAddress.coords?.lng || order.deliveryAddress.lng;
        
        if (shopLat && shopLng && destLat && destLng) {
          // Destination PIN
          const destIcon = L.divIcon({
            html: `<div class="h-9 w-9 rounded-full bg-white border-2 border-red-500 flex items-center justify-center shadow-md animate-pulse text-sm">📍</div>`,
            className: 'custom-map-icon',
            iconSize: [36, 36],
            iconAnchor: [18, 36]
          });
          L.marker([destLat, destLng], { icon: destIcon })
            .bindPopup(`<div class="p-2 text-xs text-slate-800 text-left">
              <h4 class="font-extrabold text-slate-900">Delivery Destination</h4>
              <p class="text-slate-450">${order.deliveryAddress.address}</p>
              <span class="text-[9px] text-slate-400 block mt-1">Client: ${order.contact.name}</span>
            </div>`)
            .addTo(markerGroup);

          // Draw polyline routing path (Shop -> Customer)
          L.polyline([[shopLat, shopLng], [destLat, destLng]], {
            color: '#3b82f6', // blue-500
            weight: 4,
            opacity: 0.7,
            dashArray: '5, 10'
          }).addTo(polylineGroup);

          // If rider coordinates are active, plot rider path also
          const riderLat = order.rider?.coords?.lat;
          const riderLng = order.rider?.coords?.lng;
          if (riderLat && riderLng) {
            L.polyline([[riderLat, riderLng], [destLat, destLng]], {
              color: '#f97316', // orange-500
              weight: 4,
              opacity: 0.8,
              dashArray: '2, 5'
            }).addTo(polylineGroup);
          }
        }
      });
    }

  }, [filter, riders, shops, orders]);

  return (
    <div className="space-y-6 text-left select-none h-[calc(100vh-140px)] flex flex-col justify-between">
      
      {/* Top filter toolbar panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-4.5 rounded-[24px] shadow-xs">
        <div>
          <h1 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-1.5">
            <Navigation className="h-5 w-5 text-emerald-500 animate-spin" /> Live Fleet Tracking
          </h1>
          <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mt-0.5">
            Courier coordinates, active orders routing paths, & stores positions
          </p>
        </div>

        {/* Filter categories tabs */}
        <div className="grid grid-cols-4 bg-slate-50 dark:bg-slate-850 p-1 rounded-xl text-[9px] font-black uppercase tracking-wider w-full md:w-max">
          {(['all', 'riders', 'shops', 'orders'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-2 rounded-lg cursor-pointer transition ${
                filter === tab 
                  ? 'bg-white dark:bg-slate-900 text-emerald-500 shadow-sm' 
                  : 'text-slate-500 dark:text-zinc-400'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Map Division */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs relative mt-4">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
        
        {/* Floating details cards widget */}
        <div className="absolute bottom-4 left-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-lg text-[10px] font-bold text-slate-500 dark:text-zinc-400 space-y-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span>Merchants: {shops.filter(s => s.status === 'open').length} Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span>Riders: {riders.filter(r => r.status === 'online').length} Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
            <span>Active Deliveries: {orders.filter(o => ['accepted', 'preparing', 'ready_for_pickup', 'rider_assigned', 'rider_picked_up', 'out_for_delivery'].includes(o.status)).length}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
