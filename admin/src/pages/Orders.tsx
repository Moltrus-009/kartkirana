import { useState, useEffect, useRef } from 'react';
import { useAdmin, type OrderDoc } from '../context/AdminContext';
import { MapPin, Truck, Trash2 } from 'lucide-react';
import L from 'leaflet';

export default function Orders() {
  const { orders, updateOrderStatus, deleteOrder } = useAdmin();
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'active' | 'completed'>('active');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Map elements
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const markerGroupRef = useRef<L.LayerGroup | null>(null);
  const polylineRef = useRef<L.Polyline | null>(null);

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || null;

  // Filter orders
  const getTabOrders = () => {
    switch (activeTab) {
      case 'pending':
        return orders.filter(o => o.status === 'confirmed');
      case 'active':
        return orders.filter(o => ['accepted', 'preparing', 'ready_for_pickup', 'rider_assigned', 'rider_picked_up', 'out_for_delivery'].includes(o.status));
      case 'completed':
        return orders.filter(o => ['delivered', 'cancelled', 'returned'].includes(o.status));
      default:
        return orders;
    }
  };

  const filteredOrders = getTabOrders();

  // Set default selected order on tab change
  useEffect(() => {
    if (filteredOrders.length > 0) {
      // Keep selected order if it's in the filtered list
      const stillExists = filteredOrders.some(o => o.id === selectedOrderId);
      if (!stillExists) {
        setSelectedOrderId(filteredOrders[0].id);
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [activeTab, orders]);

  // Leaflet Map Initialization & Rendering
  useEffect(() => {
    if (!selectedOrder || !mapContainerRef.current) {
      // Clean up map if no order is selected
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerGroupRef.current = null;
        polylineRef.current = null;
      }
      return;
    }

    const shopLat = selectedOrder.shopCoords?.lat || 0;
    const shopLng = selectedOrder.shopCoords?.lng || 0;
    const destLat = selectedOrder.deliveryAddress.coords?.lat || selectedOrder.deliveryAddress.lat || 0;
    const destLng = selectedOrder.deliveryAddress.coords?.lng || selectedOrder.deliveryAddress.lng || 0;

    const riderLat = selectedOrder.rider?.coords?.lat;
    const riderLng = selectedOrder.rider?.coords?.lng;

    const mapCenter: [number, number] = riderLat && riderLng ? [riderLat, riderLng] : [destLat, destLng];

    // Initialize Map if not already initialized
    if (!leafletMapRef.current) {
      const map = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(mapCenter, 14);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }).addTo(map);

      leafletMapRef.current = map;
      markerGroupRef.current = L.layerGroup().addTo(map);
    }

    const mapInstance = leafletMapRef.current;
    const markerGroup = markerGroupRef.current;

    if (mapInstance && markerGroup) {
      markerGroup.clearLayers();

      const markers: any[] = [
        {
          lat: shopLat,
          lng: shopLng,
          title: selectedOrder.shopName,
          html: `<div class="h-9 w-9 rounded-2xl bg-white border-2 border-emerald-500 flex items-center justify-center shadow-md"><span class="text-sm">🏪</span></div>`
        },
        {
          lat: destLat,
          lng: destLng,
          title: 'Delivery Address',
          html: `<div class="h-9 w-9 rounded-full bg-white border-2 border-red-500 flex items-center justify-center shadow-md animate-pulse"><span class="text-sm">📍</span></div>`
        }
      ];

      // Add Rider marker if they are assigned
      if (riderLat && riderLng) {
        markers.push({
          lat: riderLat,
          lng: riderLng,
          title: `Rider: ${selectedOrder.rider?.name || 'Rider Partner'}`,
          html: `<div class="h-9 w-9 rounded-full bg-orange-500 text-white flex items-center justify-center shadow-lg border-2 border-white animate-bounce"><span class="text-sm">🛵</span></div>`
        });
      }

      // Plot markers
      markers.forEach(m => {
        const icon = L.divIcon({
          html: m.html,
          className: 'custom-map-icon',
          iconSize: [36, 36],
          iconAnchor: [18, 36]
        });
        L.marker([m.lat, m.lng], { icon })
          .bindPopup(`<div class="p-1 font-bold text-xs text-slate-800">${m.title}</div>`)
          .addTo(markerGroup);
      });

      // Clear previous polyline
      if (polylineRef.current) {
        polylineRef.current.remove();
        polylineRef.current = null;
      }

      // Draw overall routing line
      const routePoints: [number, number][] = riderLat && riderLng 
        ? [[riderLat, riderLng], [destLat, destLng]] 
        : [[shopLat, shopLng], [destLat, destLng]];

      const line = L.polyline(routePoints, {
        color: '#10b981', // emerald-500
        weight: 5,
        opacity: 0.8,
        dashArray: '8, 6'
      }).addTo(mapInstance);

      polylineRef.current = line;

      try {
        mapInstance.fitBounds(line.getBounds(), { padding: [40, 40] });
      } catch (err) {
        // ignore fitbounds checks
      }
    }
  }, [selectedOrderId, selectedOrder?.rider?.coords]);

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this order from history?")) {
      try {
        await deleteOrder(id);
        setSelectedOrderId(null);
      } catch (e) {
        alert("Failed to delete order.");
      }
    }
  };

  const handleForceStatus = async (orderId: string, status: OrderDoc['status']) => {
    try {
      await updateOrderStatus(orderId, status);
    } catch (e) {
      alert("Failed overriding order status.");
    }
  };

  return (
    <div className="space-y-6 text-left select-none">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 dark:text-white">
          📦 Order Fulfillment Queue
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
          Realtime status overrides, order deletion, & live route tracking
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-1.5 rounded-[20px] text-[10px] font-black uppercase tracking-wider w-full md:w-max">
        {['all', 'pending', 'active', 'completed'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as any)}
            className={`px-6 py-2.5 rounded-xl transition cursor-pointer text-center relative ${
              activeTab === tab 
                ? 'bg-slate-100 dark:bg-slate-850 text-emerald-500' 
                : 'text-slate-500 hover:text-slate-700 dark:text-zinc-400'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Orders Queue list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-5 shadow-xs h-[500px] overflow-y-auto space-y-3.5">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block pl-1">
            Queued Orders ({filteredOrders.length})
          </span>

          {filteredOrders.length === 0 ? (
            <div className="py-20 text-center text-slate-400 font-semibold text-xs">
              No orders found in this queue.
            </div>
          ) : (
            filteredOrders.map((order) => {
              const isSelected = order.id === selectedOrderId;
              return (
                <div
                  key={order.id}
                  onClick={() => setSelectedOrderId(order.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer text-xs space-y-2 text-left
                    ${isSelected 
                      ? 'bg-emerald-500/5 border-emerald-500/30' 
                      : 'bg-slate-50/40 dark:bg-slate-850/20 border-slate-100 dark:border-slate-800/40 hover:bg-slate-50 dark:hover:bg-slate-850/50'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      ORD: {order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="font-black text-slate-700 dark:text-zinc-300">
                      ₹{order.total}
                    </span>
                  </div>

                  <div className="text-[10px] text-slate-500 font-semibold flex justify-between">
                    <span>{order.shopName}</span>
                    <span className="font-black uppercase tracking-wider text-amber-500">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Selected Order Detail view & Map */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedOrder ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-12 text-center text-slate-400 font-semibold text-xs h-full flex items-center justify-center">
              Select an order from the list to view live tracking and control details.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
              
              {/* Dispatch overview & Timeline override */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-5 text-xs text-left">
                
                {/* ID Header */}
                <div className="flex justify-between items-start pb-3.5 border-b border-slate-50 dark:border-slate-800/40">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">
                      Order: {selectedOrder.id}
                    </h3>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">
                      Placed: {new Date(selectedOrder.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleDelete(selectedOrder.id)}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors cursor-pointer"
                    title="Delete order permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Details */}
                <div className="space-y-3.5">
                  
                  {/* Shop Details */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Merchant Store</span>
                    <h4 className="font-extrabold text-slate-800 dark:text-zinc-200">{selectedOrder.shopName}</h4>
                  </div>

                  {/* Customer Contact */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Customer contact</span>
                    <h4 className="font-extrabold text-slate-800 dark:text-zinc-200">{selectedOrder.contact.name} ({selectedOrder.contact.phone})</h4>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-0.5 flex items-start gap-0.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{selectedOrder.deliveryAddress.address}</span>
                    </p>
                  </div>

                  {/* Assigned Rider */}
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Assigned Rider Partner</span>
                    {selectedOrder.rider ? (
                      <div>
                        <h4 className="font-extrabold text-slate-850 dark:text-zinc-200">{selectedOrder.rider.name} ({selectedOrder.rider.phone})</h4>
                        <span className="text-[9px] text-slate-400 block mt-0.5">Progress status: {selectedOrder.rider.progress}% along path</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold block italic mt-0.5">No rider assigned yet.</span>
                    )}
                  </div>
                </div>

                {/* Direct Override status controller */}
                <div className="pt-4 border-t border-slate-50 dark:border-slate-800/40 space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Force Status Override</span>
                  <div className="relative">
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleForceStatus(selectedOrder.id, e.target.value as any)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none appearance-none cursor-pointer text-slate-800 dark:text-white"
                    >
                      <option value="confirmed">Confirmed (Placed)</option>
                      <option value="accepted">Accepted</option>
                      <option value="preparing">Preparing (Driver Heading to Shop)</option>
                      <option value="ready_for_pickup">Ready for Pickup (Driver Arrived)</option>
                      <option value="rider_picked_up">Rider Picked Up</option>
                      <option value="out_for_delivery">Out for Delivery</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Leaflet Live Map View */}
              <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs h-[300px] md:h-auto min-h-[300px] relative flex flex-col justify-between">
                {/* Map Div container */}
                <div ref={mapContainerRef} className="w-full h-full z-0" />
                
                {/* Rider status float card */}
                {selectedOrder.rider?.coords && (
                  <div className="absolute top-4 left-4 right-4 z-10 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-lg text-[10px] font-black text-slate-700 dark:text-slate-200 flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-emerald-500 animate-pulse" />
                      <span>Rider is live tracking coords: {selectedOrder.rider.coords.lat.toFixed(4)}, {selectedOrder.rider.coords.lng.toFixed(4)}</span>
                    </div>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

      </div>

    </div>
  );
}
