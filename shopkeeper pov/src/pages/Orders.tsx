import { useState, useEffect } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { useDiagnostics } from '../core/diagnostics/diagnostics';
import { useLanguage } from '../context/LanguageContext';
import { 
  ClipboardList, 
  MapPin, 
  Phone, 
  Clock, 
  Check, 
  X,
  MessageSquare,
  Gift,
  Layers,
  AlertTriangle
} from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';

const MIN_BATCH_SIZE = 2;
const MAX_BATCH_SIZE = 3;
const MAX_BATCH_SPREAD_METERS = 1500;
const RIDER_DELIVERY_FEE = 10;
const BATCH_BONUS = 15;

type Coordinates = { lat: number; lng: number };

const hasValidCoordinates = (coords?: Coordinates): coords is Coordinates => Boolean(
  coords &&
  Number.isFinite(Number(coords.lat)) &&
  Number.isFinite(Number(coords.lng)) &&
  Math.abs(Number(coords.lat)) <= 90 &&
  Math.abs(Number(coords.lng)) <= 180 &&
  !(Number(coords.lat) === 0 && Number(coords.lng) === 0)
);

const distanceMeters = (from: Coordinates, to: Coordinates) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const orderDeliveriesByNearestStop = (selectedOrders: any[], shopCoords?: Coordinates) => {
  const remaining = [...selectedOrders];
  const ordered: any[] = [];
  let cursor = hasValidCoordinates(shopCoords) ? shopCoords : remaining[0]?.deliveryAddress?.coords;

  while (remaining.length > 0) {
    let nearestIndex = 0;
    if (hasValidCoordinates(cursor)) {
      let nearestDistance = Number.POSITIVE_INFINITY;
      remaining.forEach((order, index) => {
        const coords = order.deliveryAddress?.coords;
        if (!hasValidCoordinates(coords)) return;
        const candidateDistance = distanceMeters(cursor, coords);
        if (candidateDistance < nearestDistance) {
          nearestDistance = candidateDistance;
          nearestIndex = index;
        }
      });
    }
    const [next] = remaining.splice(nearestIndex, 1);
    ordered.push(next);
    cursor = next.deliveryAddress?.coords;
  }
  return ordered;
};

export default function Orders() {
  const { orders, changeOrderStatus, getOnlineRidersList, createOrderBatch, shop } = useAppStore();
  const trackComponent = useDiagnostics(state => state.trackComponent);
  useEffect(() => {
    trackComponent('Orders', 'mount');
  }, [trackComponent]);
  const { t } = useLanguage();
  
  // Tabs: new, preparing, ready, completed
  const [activeTab, setActiveTab] = useState<'new' | 'preparing' | 'ready' | 'completed'>('new');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [onlineRiders, setOnlineRiders] = useState<any[]>([]);
  const [selectedRiderId, setSelectedRiderId] = useState<string>('');

  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setSelectedOrderIds([]);
  };

  useEffect(() => {
    if (isBatchModalOpen) {
      getOnlineRidersList().then((riders: any) => {
        setOnlineRiders(riders);
        if (riders.length > 0) {
          setSelectedRiderId(riders[0].uid);
        }
      });
    }
  }, [isBatchModalOpen]);

  // Require real GPS proximity rather than fragile address keyword matching.
  const checkLocalityCompatibility = () => {
    const selectedOrders = orders.filter((o: any) => selectedOrderIds.includes(o.id));
    if (selectedOrders.length < MIN_BATCH_SIZE) {
      return { compatible: false, maxSpreadMeters: 0, reason: 'Select at least two orders.' };
    }
    if (selectedOrders.length > MAX_BATCH_SIZE) {
      return { compatible: false, maxSpreadMeters: 0, reason: `A batch can contain at most ${MAX_BATCH_SIZE} orders.` };
    }
    if (selectedOrders.some((order: any) => !hasValidCoordinates(order.deliveryAddress?.coords))) {
      return { compatible: false, maxSpreadMeters: 0, reason: 'Every selected order needs a valid map location.' };
    }

    let maxSpreadMeters = 0;
    for (let first = 0; first < selectedOrders.length; first += 1) {
      for (let second = first + 1; second < selectedOrders.length; second += 1) {
        maxSpreadMeters = Math.max(
          maxSpreadMeters,
          distanceMeters(selectedOrders[first].deliveryAddress.coords, selectedOrders[second].deliveryAddress.coords)
        );
      }
    }

    return {
      compatible: maxSpreadMeters <= MAX_BATCH_SPREAD_METERS,
      maxSpreadMeters,
      reason: maxSpreadMeters <= MAX_BATCH_SPREAD_METERS
        ? ''
        : `The farthest delivery points are ${(maxSpreadMeters / 1000).toFixed(1)} km apart. The batch limit is ${(MAX_BATCH_SPREAD_METERS / 1000).toFixed(1)} km.`
    };
  };

  // Filter orders by active tabs
  const getTabOrders = () => {
    switch (activeTab) {
      case 'new':
        return orders.filter((o: any) => {
          const s = String(o.status || '').toUpperCase();
          return s === 'PLACED' || s === 'ORDER_PLACED';
        });
      case 'preparing':
        return orders.filter((o: any) => {
          const s = String(o.status || '').toUpperCase();
          return (s === 'SHOP_ACCEPTED' || s === 'ACCEPTED' || s === 'PREPARING') && !o.batchId;
        });
      case 'ready':
        return orders.filter((o: any) => {
          const s = String(o.status || '').toUpperCase();
          return (s === 'SEARCHING_RIDER' || s === 'RIDER_ASSIGNED' || s === 'ARRIVED_AT_SHOP' || s === 'PICKED_UP' || s === 'OUT_FOR_DELIVERY' || s === 'READY_FOR_PICKUP' || s === 'READY') && !o.batchId;
        });
      case 'completed':
        return orders.filter((o: any) => {
          const s = String(o.status || '').toUpperCase();
          return s === 'DELIVERED' || s === 'COMPLETED' || s === 'SHOP_REJECTED' || s === 'REJECTED' || s === 'CANCELLED' || s === 'RETURNED' || s === 'REFUNDED';
        });
      default:
        return [];
    }
  };

  const filteredOrders = getTabOrders();

  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);

  // Status transitions
  const handleAccept = async (orderId: string) => {
    try {
      setProcessingOrderId(orderId);
      await changeOrderStatus(orderId, 'SHOP_ACCEPTED', 'Order accepted by merchant.');
      setActiveTab('preparing');
    } catch (err: any) {
      alert(`Failed to accept order: ${err.message || err}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleReject = async (orderId: string) => {
    if (window.confirm(t('reject_order_confirm'))) {
      try {
        setProcessingOrderId(orderId);
        await changeOrderStatus(orderId, 'SHOP_REJECTED', 'Order rejected by merchant.');
        setActiveTab('completed');
      } catch (err: any) {
        alert(`Failed to reject order: ${err.message || err}`);
      } finally {
        setProcessingOrderId(null);
      }
    }
  };

  const handleReady = async (orderId: string) => {
    try {
      setProcessingOrderId(orderId);
      await changeOrderStatus(orderId, 'SEARCHING_RIDER' as any, 'Order is ready for pickup/delivery partner.');
      setActiveTab('ready');
    } catch (err: any) {
      alert(`Failed to mark order ready: ${err.message || err}`);
    } finally {
      setProcessingOrderId(null);
    }
  };

  const handleCreateBatchSubmit = async () => {
    if (!selectedRiderId || !shop) return;

    const locality = checkLocalityCompatibility();
    if (!locality.compatible) {
      alert(locality.reason || 'These orders cannot be safely batched.');
      return;
    }
    
    const selectedRider = onlineRiders.find(r => r.uid === selectedRiderId);
    if (!selectedRider) return;

    const selectedOrders = orders.filter((o: any) => selectedOrderIds.includes(o.id));
    const candidateShopCoords = { lat: Number(shop.lat), lng: Number(shop.lng) };
    const shopCoords = hasValidCoordinates(candidateShopCoords) ? candidateShopCoords : undefined;
    const routeOrders = orderDeliveriesByNearestStop(selectedOrders, shopCoords);
    
    // Create Route Stops
    const stops: any[] = [];
    
    // Shop pickup stop (only one stop for the shop)
    stops.push({
      id: `stop-p-${shop?.id || 'shop-id'}-${Date.now()}`,
      type: 'pickup',
      orderId: selectedOrders[0].id,
      shopId: shop?.id || 'shop-id',
      shopName: shop?.name || 'Shop',
      shopAddress: shop?.address || 'Shop Address',
      coords: shopCoords || routeOrders[0].deliveryAddress.coords,
      orderIds: routeOrders.map(order => order.id),
      status: 'pending'
    });

    // Customer delivery stops
    routeOrders.forEach((o: any, i: number) => {
      stops.push({
        id: `stop-d-${o.id}-${i}`,
        type: 'delivery',
        orderId: o.id,
        customerName: (o as any).contact.name,
        customerPhone: (o as any).contact.phone,
        address: (o as any).deliveryAddress.address,
        coords: (o as any).deliveryAddress.coords,
        orderIds: [o.id],
        status: 'pending'
      });
    });

    let routeDistanceMeters = 0;
    let routeCursor = stops[0].coords as Coordinates;
    routeOrders.forEach((order: any) => {
      routeDistanceMeters += distanceMeters(routeCursor, order.deliveryAddress.coords);
      routeCursor = order.deliveryAddress.coords;
    });
    const totalDistance = Number((routeDistanceMeters / 1000).toFixed(1));
    const estimatedTime = Math.max(12, Math.ceil((totalDistance / 18) * 60 + selectedOrderIds.length * 4));

    const newBatch = {
      id: `batch-${Math.random().toString(36).substring(2, 9)}`,
      shopId: shop.id,
      shopName: shop.name,
      riderId: selectedRider.uid,
      riderName: selectedRider.fullName,
      riderPhone: selectedRider.phone,
      riderCoords: selectedRider.coords || { lat: 0, lng: 0 },
      status: 'assigned' as const, // Rider gets pop up assignment
      orderIds: selectedOrderIds,
      totalEarnings: selectedOrderIds.length * RIDER_DELIVERY_FEE + BATCH_BONUS,
      totalDistance,
      estimatedTime,
      maxDeliverySpreadMeters: Math.round(locality.maxSpreadMeters),
      stops,
      currentStopIndex: 0,
      orders: selectedOrders.map((order) => ({ id: order.id })),
      createdAt: new Date().toISOString()
    };

    try {
      await createOrderBatch(newBatch);
      alert(t('batch_created', { name: selectedRider.fullName }));
      setSelectedOrderIds([]);
      setIsBatchModalOpen(false);
    } catch (error: any) {
      alert(error?.message || 'Unable to create the delivery batch. Please check the rider and selected orders, then try again.');
    }
  };

  const localityCheck = checkLocalityCompatibility();

  return (
    <div className="space-y-5 max-w-md mx-auto pb-8 relative">
      {/* Page header */}
      <div className="text-left">
        <h1 className="text-xl font-black text-slate-800 dark:text-zinc-100 flex items-center gap-2">
          📦 {t('orders')}
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
          Fulfillment Center
        </p>
      </div>

      {/* Tab Switcher */}
      <div className="grid grid-cols-4 bg-slate-100 dark:bg-zinc-800 p-1 rounded-2xl text-[10px] font-black uppercase tracking-wider">
        <button
          onClick={() => handleTabChange('new')}
          className={`py-2.5 rounded-xl transition cursor-pointer text-center relative ${
            activeTab === 'new' 
              ? 'bg-white dark:bg-dark-card text-primary shadow-xs' 
              : 'text-slate-500 dark:text-zinc-400'
          }`}
        >
          {t('tab_new')}
          {orders.filter((o: any) => o.status === 'PLACED').length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
          )}
        </button>

        <button
          onClick={() => handleTabChange('preparing')}
          className={`py-2.5 rounded-xl transition cursor-pointer text-center ${
            activeTab === 'preparing' 
              ? 'bg-white dark:bg-dark-card text-primary shadow-xs' 
              : 'text-slate-500 dark:text-zinc-400'
          }`}
        >
          {t('tab_preparing')}
        </button>

        <button
          onClick={() => handleTabChange('ready')}
          className={`py-2.5 rounded-xl transition cursor-pointer text-center ${
            activeTab === 'ready' 
              ? 'bg-white dark:bg-dark-card text-primary shadow-xs' 
              : 'text-slate-500 dark:text-zinc-400'
          }`}
        >
          {t('tab_ready')}
        </button>

        <button
          onClick={() => handleTabChange('completed')}
          className={`py-2.5 rounded-xl transition cursor-pointer text-center ${
            activeTab === 'completed' 
              ? 'bg-white dark:bg-dark-card text-primary shadow-xs' 
              : 'text-slate-500 dark:text-zinc-400'
          }`}
        >
          {t('tab_completed')}
        </button>
      </div>

      {/* Orders List Queue */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={t('no_orders')}
            description="Incoming customer orders will appear here automatically."
          />
        ) : (
          filteredOrders.map((order) => {
            const timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            return (
              <div 
                key={order.id}
                className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-5 shadow-xs text-xs space-y-4 text-left border-l-4 border-l-primary relative"
              >
                {/* Header: ID & Time & Checkbox */}
                <div className="flex justify-between items-start pb-3 border-b border-slate-50 dark:border-dark-border/40">
                  <div className="flex items-start gap-2.5">
                    {['preparing', 'ready'].includes(activeTab) && (
                      <input 
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => {
                          setSelectedOrderIds(prev => {
                            if (prev.includes(order.id)) return prev.filter(id => id !== order.id);
                            if (prev.length >= MAX_BATCH_SIZE) {
                              alert(`A delivery batch can contain at most ${MAX_BATCH_SIZE} orders.`);
                              return prev;
                            }
                            return [...prev, order.id];
                          });
                        }}
                        className="mt-1 w-4 h-4 rounded border-slate-350 dark:border-zinc-700 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                      />
                    )}
                    <div className="space-y-0.5">
                      <span className="font-extrabold text-slate-800 dark:text-zinc-200">{t('order_id')}: {order.id.slice(-6).toUpperCase()}</span>
                      {((order as any).preorderDate || (order as any).preorderSlot || (order as any).items?.some((i: any) => i.isPreorder)) && (
                        <div className="flex items-center gap-1 mt-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-2.5 py-1 rounded-xl font-black text-[9px] uppercase tracking-wider">
                          📅 PRE-ORDER: {(order as any).preorderDate || 'Scheduled'} • {(order as any).preorderSlot || 'Assigned Slot'}
                        </div>
                      )}
                      {order.appliedPromotion && (
                        <div className="mt-1 flex items-center gap-1 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                          <Gift className="h-3 w-3" /> {order.appliedPromotion.title} · customer saved ₹{order.appliedPromotion.saving}
                        </div>
                      )}
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold mt-0.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{timeStr}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right space-y-0.5">
                    <span className="font-black text-slate-850 dark:text-zinc-100 text-sm block">₹{order.total}</span>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">{order.paymentMethod}</span>
                  </div>
                </div>

                {/* Customer name and touch call actions */}
                <div className="flex items-center justify-between bg-slate-50 dark:bg-zinc-900/60 p-3 rounded-2xl border border-slate-100/50 dark:border-dark-border/40">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-black">
                      {order.contact.name.charAt(0)}
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-800 dark:text-zinc-200">{order.contact.name}</h4>
                      <p className="text-[10px] text-slate-450 font-bold">{order.contact.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Call shortcut */}
                    <a 
                      href={`tel:${order.contact.phone}`}
                      className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center cursor-pointer hover:bg-emerald-600 transition"
                      title={t('call_customer')}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                    {/* WhatsApp message shortcut */}
                    <a 
                      href={`https://wa.me/${order.contact.phone.replace(/[^0-9]/g, '')}?text=Hello%20${encodeURIComponent(order.contact.name)},%20this%20is%2520regarding%2520your%2520order%2520${order.id.slice(-6).toUpperCase()}%20from%20our%20store.`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center cursor-pointer hover:bg-emerald-700 transition"
                      title={t('whatsapp_customer')}
                    >
                      <MessageSquare className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                {/* Ordered Items List */}
                <div className="space-y-2">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('items')} ({order.items.length})</span>
                  <div className="space-y-1.5 pl-1.5 border-l-2 border-slate-100 dark:border-dark-border/40">
                    {order.items.map((item, index) => {
                      const resolvedProduct = (item as any).product || {
                        id: (item as any).productId || (item as any).id || '',
                        name: (item as any).name || 'Product',
                        price: (item as any).price || 0
                      };
                      return (
                        <div key={index} className="flex justify-between items-center text-slate-700 dark:text-zinc-300 font-extrabold">
                          <span>{item.quantity} × {resolvedProduct.name}</span>
                          <span className="text-slate-400 text-[11px]">₹{resolvedProduct.price * item.quantity}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-1 text-slate-500 dark:text-zinc-400">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('delivery_location')}</span>
                  <p className="flex items-start gap-1 font-bold text-[11px] leading-tight">
                    <MapPin className="h-4 w-4 text-slate-350 shrink-0 mt-0.5" />
                    <span>{order.deliveryAddress.address}</span>
                  </p>
                </div>

                {/* Large Action Buttons */}
                <div className="pt-2 border-t border-slate-50 dark:border-dark-border/40 flex gap-3">
                  {['PLACED', 'ORDER_PLACED'].includes(String(order.status).toUpperCase()) && (
                    <>
                      <button
                        onClick={() => handleAccept(order.id)}
                        disabled={processingOrderId === order.id}
                        className="flex-1 bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-black py-3 rounded-2xl cursor-pointer text-center text-xs uppercase tracking-wider shadow-md shadow-primary/15 flex items-center justify-center gap-1.5 transition-all"
                      >
                        {processingOrderId === order.id ? (
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <Check className="h-4 w-4" /> {t('accept')}
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleReject(order.id)}
                        disabled={processingOrderId === order.id}
                        className="bg-red-50 hover:bg-red-100 text-red-500 disabled:opacity-50 font-black py-3 px-4 rounded-2xl cursor-pointer text-center text-xs flex items-center justify-center"
                        title={t('reject_order')}
                      >
                        <X className="h-4.5 w-4.5" />
                      </button>
                    </>
                  )}

                  {(order.status === 'SHOP_ACCEPTED' || order.status === 'preparing' as any) && (
                    <button
                      onClick={() => handleReady(order.id)}
                      disabled={processingOrderId === order.id}
                      className="w-full bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-black py-3 rounded-2xl cursor-pointer text-center text-xs uppercase tracking-wider shadow-md shadow-primary/15 flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> {t('mark_ready')}
                    </button>
                  )}

                  {order.status === 'ready_for_pickup' as any && (
                    <button
                      onClick={() => handleReady(order.id)}
                      disabled={processingOrderId === order.id}
                      className="w-full bg-primary hover:bg-primary-hover text-white font-black py-3 rounded-2xl cursor-pointer text-center text-xs uppercase tracking-wider shadow-xs flex items-center justify-center gap-1.5"
                    >
                      <Check className="h-4 w-4" /> Send to Delivery Partner
                    </button>
                  )}

                  {['RIDER_ASSIGNED', 'ARRIVED_AT_SHOP', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'rider_assigned' as any, 'rider_picked_up' as any, 'out_for_delivery' as any].includes(order.status) && (
                    <div className="w-full rounded-2xl bg-blue-50 py-3 text-center text-[10px] font-black uppercase tracking-wider text-primary dark:bg-blue-950/20">
                      Delivery is controlled by the assigned partner
                    </div>
                  )}

                  {['DELIVERED', 'COMPLETED', 'CANCELLED', 'RETURNED', 'REFUNDED'].includes(String(order.status).toUpperCase()) && (
                    <div className="w-full text-center py-2 text-slate-400 font-bold uppercase tracking-widest text-[10px] bg-slate-50 dark:bg-zinc-900 rounded-xl">
                      Order: {t(order.status.toLowerCase() as any) || order.status}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating Action Banner for Batching */}
      {selectedOrderIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 max-w-sm w-[90%] bg-slate-900 dark:bg-zinc-900 text-white rounded-3xl p-4.5 shadow-2xl flex items-center justify-between border border-slate-800 dark:border-zinc-800 z-50 animate-fade-in">
          <div className="text-left space-y-0.5 pl-1.5">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">{t('selection')}</span>
            <p className="text-xs font-black">{selectedOrderIds.length} {selectedOrderIds.length === 1 ? 'Order' : 'Orders'} Selected</p>
          </div>
          <button
            onClick={() => setIsBatchModalOpen(true)}
            className="bg-primary hover:bg-primary-hover text-white font-black py-2.5 px-5 rounded-2xl cursor-pointer text-xs uppercase tracking-wider transition-all flex items-center gap-1 shadow-md shadow-primary/15"
          >
            <Layers className="h-4 w-4" /> Batch Delivery
          </button>
        </div>
      )}

      {/* Batching Modal */}
      {isBatchModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in text-left">
          <div className="bg-white dark:bg-zinc-900 max-w-md w-full rounded-[32px] p-6 space-y-5 border border-slate-100 dark:border-zinc-850 shadow-2xl overflow-y-auto max-h-[85vh]">
            
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-800 dark:text-zinc-150 flex items-center gap-1.5">
                  <Layers className="h-5 w-5 text-emerald-500" /> Create Delivery Batch
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
                  Locality Router
                </p>
              </div>
              <button 
                onClick={() => setIsBatchModalOpen(false)}
                className="w-8 h-8 bg-slate-50 dark:bg-zinc-850 text-slate-400 hover:text-slate-600 rounded-full flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Locality Check Warn */}
            {!localityCheck.compatible ? (
              <div className="bg-amber-50 dark:bg-amber-955/20 border border-amber-250/50 dark:border-amber-900/30 p-3 rounded-2xl flex items-start gap-2 text-xs text-amber-700 dark:text-amber-400 font-bold leading-normal">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <span>{localityCheck.reason}</span>
              </div>
            ) : (
              <div className="bg-emerald-50 dark:bg-emerald-955/20 border border-emerald-250/50 dark:border-emerald-900/30 p-3.5 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-450 font-bold leading-relaxed">
                <Check className="h-5 w-5 text-emerald-500 shrink-0" />
                <span>Optimized route verified. The farthest delivery points are {Math.round(localityCheck.maxSpreadMeters)} metres apart.</span>
              </div>
            )}

            {/* Selected Orders list */}
            <div className="space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Selected Orders ({selectedOrderIds.length})</span>
              <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                {orders.filter((o: any) => selectedOrderIds.includes(o.id)).map(ord => (
                  <div key={ord.id} className="bg-slate-50 dark:bg-zinc-850/50 p-3 rounded-xl border border-slate-100/60 dark:border-zinc-800 text-slate-700 dark:text-zinc-300">
                    <div className="flex justify-between font-black text-[11px] mb-1">
                      <span>Order #{ord.id.slice(-6).toUpperCase()}</span>
                      <span className="text-slate-800 dark:text-zinc-150">₹{ord.total}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-455 font-medium">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{ord.deliveryAddress.address}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assign Rider list */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('select_rider')}</label>
              {onlineRiders.length === 0 ? (
                <div className="bg-rose-50 dark:bg-rose-955/15 border border-rose-100 dark:border-transparent p-4 rounded-2xl text-center text-xs text-rose-600 dark:text-rose-455 font-bold">
                  No online delivery executives available. Verify a rider has toggled their workspace online.
                </div>
              ) : (
                <div className="relative">
                  <select
                    value={selectedRiderId}
                    onChange={(e) => setSelectedRiderId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl px-4 py-3.5 text-xs text-slate-700 dark:text-zinc-200 focus:outline-hidden focus:border-emerald-500 font-bold transition-all"
                  >
                    {onlineRiders.map(r => (
                      <option key={r.uid} value={r.uid}>
                        🛵 {r.fullName} ({r.vehicleType || 'Bike'} - {r.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Route Stats estimation */}
            <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-zinc-850 p-4.5 rounded-2xl text-center text-xs font-black">
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t('rider_earnings')}</span>
                <span className="text-slate-800 dark:text-zinc-100 text-sm">₹{selectedOrderIds.length * RIDER_DELIVERY_FEE + BATCH_BONUS}</span>
                <span className="text-[8px] text-emerald-500 block font-black uppercase tracking-wider">+₹15 Batch Bonus</span>
              </div>
              <div className="space-y-0.5">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">{t('estimated_route')}</span>
                <span className="text-slate-800 dark:text-zinc-100 text-sm">≤ {(MAX_BATCH_SPREAD_METERS / 1000).toFixed(1)} km area</span>
                <span className="text-[8px] text-slate-400 block font-bold uppercase tracking-wider">{t('nearest_stop_order')}</span>
              </div>
            </div>

            {/* Confirm Actions */}
            <div className="flex gap-3.5 pt-2">
              <button
                onClick={() => setIsBatchModalOpen(false)}
                className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-slate-700 dark:text-zinc-200 font-black rounded-2xl cursor-pointer text-center text-xs uppercase tracking-wider transition-all"
              >
                Cancel
              </button>
              <button
                disabled={onlineRiders.length === 0 || !localityCheck.compatible}
                onClick={handleCreateBatchSubmit}
                className="flex-1 py-3.5 bg-primary hover:bg-primary-hover disabled:bg-primary/20 disabled:text-slate-500 text-white font-black rounded-2xl cursor-pointer text-center text-xs uppercase tracking-wider shadow-lg shadow-primary/15 transition-all flex items-center justify-center gap-1.5"
              >
                <Check className="h-4.5 w-4.5" /> Assign Batch
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
