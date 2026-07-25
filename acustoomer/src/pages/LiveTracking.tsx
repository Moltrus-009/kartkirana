import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MessageSquare, MapPin, Navigation, Clock, ShieldCheck, Send, Image, X, Video as VideoIcon } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Order, ChatMessage } from '../types';
import { Button } from '../components/ui/Button';
import { LocationMap } from '../components/LocationMap';
import { useAppStore } from '../core/store/useAppStore';
import { VideoCallOverlay } from '../components/VideoCallOverlay';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../infrastructure/firebase/firebase';

export const LiveTracking: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const userProfile = useAppStore(state => state.userProfile);
  const storeOrders = useAppStore(state => state.orders);
  const [directOrder, setDirectOrder] = useState<Order | null>(null);
  const [fetchingOrder, setFetchingOrder] = useState<boolean>(true);

  const order = directOrder || storeOrders.find(o => o.id === id) || null;
  const storeLoading = useAppStore(state => state.loading.orders ?? false);
  const loading = fetchingOrder && storeLoading && !order;

  // Real road route and rider coordinates states
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [riderCoords, setRiderCoords] = useState<[number, number] | null>(null);

  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(15);

  // Chat & Calling States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  
  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Real-time direct order document subscription
  useEffect(() => {
    if (!id) return;
    if (userProfile?.uid) {
      dbService.getOrders(userProfile.uid);
    }
    if (db) {
      const orderDocRef = doc(db, 'orders', id);
      const unsub = onSnapshot(orderDocRef, (snap) => {
        if (snap.exists()) {
          setDirectOrder({ id: snap.id, ...snap.data() } as Order);
        } else {
          setDirectOrder(null);
        }
        setFetchingOrder(false);
      }, (err) => {
        console.error("Firestore live tracking order snapshot error:", err);
        setFetchingOrder(false);
      });
      return () => unsub();
    } else {
      setFetchingOrder(false);
    }
  }, [id, userProfile?.uid]);

  // Subscribe to chat messages
  useEffect(() => {
    if (!id) return;
    const unsub = dbService.subscribeChatMessages(id, (updatedMessages) => {
      setMessages(updatedMessages);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [id]);

  // Auto-scroll messages list
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Listen to incoming calls
  useEffect(() => {
    if (!db || !id) return;
    const callDocRef = doc(db, 'videoCalls', id);
    const unsub = onSnapshot(callDocRef, (snap) => {
      const data = snap.data();
      if (data && data.status === 'initiated' && data.callerRole === 'rider') {
        setIncomingCall(data);
      } else if (data && (data.status === 'ended' || data.status === 'declined' || data.status === 'missed')) {
        setIncomingCall(null);
        setActiveCallId(null);
      } else if (!data) {
        setIncomingCall(null);
        setActiveCallId(null);
      }
    }, (err) => {
      console.warn('Call signaling error listening:', err);
    });
    return () => unsub();
  }, [id]);

  // Synchronize real rider coordinates from database if available
  useEffect(() => {
    if (order?.rider?.coords) {
      setRiderCoords([order.rider.coords.lat, order.rider.coords.lng]);
      if (order.rider.progress !== undefined) {
        setProgress(order.rider.progress);
        setEta(Math.max(1, Math.round(15 * (1 - order.rider.progress / 100))));
      }
    }
  }, [order?.rider]);

  // Fetch routing polyline from OSRM between the shop and customer coordinates
  useEffect(() => {
    if (!order || order.status === 'DELIVERED') return;

    const shops = useAppStore.getState().shops || [];
    const shop = shops.find(s => s.id === order.shopId);

    const shopLat = shop ? shop.lat : 0;
    const shopLng = shop ? shop.lng : 0;

    const destLat = order.deliveryAddress.lat;
    const destLng = order.deliveryAddress.lng;

    const fetchRoute = async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${shopLng},${shopLat};${destLng},${destLat}?overview=full&geometries=geojson`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('OSRM route lookup failed');
        const data = await res.json();

        if (data.routes && data.routes[0]) {
          const coords = data.routes[0].geometry.coordinates.map((c: any) => [c[1], c[0]] as [number, number]);
          setRoutePolyline(coords);
          if (coords.length > 0) {
            setRiderCoords(coords[0]);
          }
          const durationMins = Math.round(data.routes[0].duration / 60) + 2; // Add a small traffic buffer
          setEta(durationMins);
        }
      } catch (err) {
        console.warn('Routing API failed, drawing fallback straight line:', err);
        const fallbackCoords: [number, number][] = [
          [shopLat, shopLng],
          [destLat, destLng]
        ];
        setRoutePolyline(fallbackCoords);
        setRiderCoords(fallbackCoords[0]);
        setEta(12);
      }
    };

    fetchRoute();
  }, [order]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !order || (!inputText.trim() && !selectedImage)) return;

    const text = inputText;
    const imageFile = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setImagePreview('');

    try {
      await dbService.sendChatMessage(
        id,
        text,
        order.userId,
        order.deliveryAddress.name || 'Customer',
        'customer',
        imageFile || undefined
      );
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto px-4 py-6 text-left">
        <div className="w-full aspect-video shimmer rounded-3xl mb-4" />
        <div className="w-2/3 h-5 shimmer rounded mb-2" />
        <div className="w-1/3 h-4 shimmer rounded" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center">
        <span className="text-5xl">📍</span>
        <h3 className="text-base font-bold text-gray-800 mt-2">Active Delivery Tracking Not Found</h3>
        <Button variant="primary" className="mt-4 rounded-xl" onClick={() => navigate('/orders')}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const hasRider = ['rider_assigned', 'rider_picked_up', 'out_for_delivery'].includes(order.status) || !!order.rider?.name;

  return (
    <div className="max-w-xl mx-auto pb-24 text-left">
      
      {/* Header bar */}
      <div className="sticky top-0 z-35 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md px-4 py-3.5 border-b border-gray-100 dark:border-slate-900 flex items-center justify-between">
        <button
          onClick={() => navigate('/orders')}
          className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-[#1E293B] text-gray-500 dark:text-gray-400 cursor-pointer border border-gray-100 dark:border-slate-900 shadow-sm bg-white dark:bg-[#1E293B]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-xs font-black text-gray-800 dark:text-gray-100 uppercase tracking-wider">
            Live Tracking
          </h2>
          <span className="text-[10px] font-semibold text-gray-400">Order Ref: {order.id}</span>
        </div>
        <div />
      </div>

      {/* Real Leaflet Map */}
      <div className="relative w-full aspect-video border-b border-gray-100 dark:border-slate-900 overflow-hidden bg-slate-50 dark:bg-slate-900">
        {routePolyline.length > 0 ? (
          <LocationMap
            center={riderCoords || [order.deliveryAddress.lat, order.deliveryAddress.lng]}
            zoom={15}
            polyline={routePolyline}
            markers={[
              {
                id: 'shop_marker',
                lat: routePolyline[0][0],
                lng: routePolyline[0][1],
                title: order.shopName,
                type: 'shop'
              },
              {
                id: 'customer_marker',
                lat: order.deliveryAddress.lat,
                lng: order.deliveryAddress.lng,
                title: 'Your Location',
                type: 'user'
              },
              ...(riderCoords && hasRider && progress < 100 ? [{
                id: 'rider_marker',
                lat: riderCoords[0],
                lng: riderCoords[1],
                title: order.rider?.name || 'Rider',
                type: 'rider' as const
              }] : [])
            ]}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-gray-400">
            <span>Loading live route map...</span>
          </div>
        )}
      </div>

      {/* ETA & Rider details */}
      <div className="p-4 flex flex-col gap-5">
        
        {/* Delivery ETA header */}
        <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[9px] font-black uppercase text-blue-500 block mb-0.5">Estimated Delivery</span>
            <h3 className="text-2xl font-black text-gray-800 dark:text-gray-100">
              {progress >= 100 ? 'Arrived!' : `${eta} mins`}
            </h3>
            <span className="text-[10px] font-semibold text-gray-400 block mt-0.5">
              {progress >= 100 
                ? 'Your order has been handed over.' 
                : `Rider is ${Math.round(progress)}% along the path.`}
            </span>
          </div>

          <div className="p-3.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Rider card / Allocation state */}
        {!hasRider ? (
          <div className="p-4 rounded-3xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 dark:border-amber-500/10 flex items-center justify-between shadow-sm animate-pulse">
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-amber-200 border-t-amber-600 rounded-full animate-spin shrink-0" />
                <Clock className="absolute h-4.5 w-4.5 text-amber-600" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase text-amber-600 block">Rider Allocation</span>
                <h4 className="text-xs font-black text-gray-800 dark:text-gray-200">
                  Assigning Delivery Partner...
                </h4>
                <span className="text-[9px] font-semibold text-gray-400 block mt-0.5">
                  Finding nearest delivery hero.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold text-sm shrink-0">
                {order.rider?.name ? order.rider.name.split(' ').map((n: string) => n[0]).join('') : 'DP'}
              </div>
              <div className="text-left">
                <span className="text-[10px] font-black uppercase text-orange-500 block">Delivery Hero</span>
                <h4 className="text-sm font-black text-gray-800 dark:text-gray-200">
                  {order.rider?.name || 'Delivery partner'}
                </h4>
                <span className="text-[10px] font-semibold text-gray-400 block">
                  {order.rider?.phone || 'Hero Splendor Plus • UP16-EX-4012'}
                </span>
              </div>
            </div>

            {/* Call & Chat options */}
            <div className="flex items-center gap-2">
              <a
                href={`tel:${order.rider?.phone || '+919876543210'}`}
                className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-500 hover:text-white text-gray-500 transition-colors cursor-pointer"
              >
                <Phone className="h-4.5 w-4.5" />
              </a>
              <button
                onClick={() => setIsChatOpen(true)}
                className="p-3 rounded-xl bg-gray-50 dark:bg-slate-800 hover:bg-blue-500 hover:text-white text-gray-500 transition-colors cursor-pointer"
              >
                <MessageSquare className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

        {hasRider && (
          <div className="bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] p-4.5 rounded-3xl shadow-[0_4px_16px_rgba(46,125,50,0.03)] flex items-center justify-between text-left">
            <div>
              <span className="text-[9px] font-black uppercase text-gray-400 block tracking-widest leading-none">Share Delivery OTP</span>
              <span className="text-[10px] font-semibold text-gray-400 mt-1 block">Provide this code to the rider to confirm delivery.</span>
            </div>
            <div className="bg-blue-500/10 text-[#1565C0] dark:text-[#1E88E5] font-black text-lg px-4.5 py-2.5 rounded-2xl border border-blue-500/20 select-all tracking-wider font-mono">
              {order.id.slice(-4).toUpperCase()}
            </div>
          </div>
        )}

        {/* Health support note */}
        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex items-start gap-2.5 text-xs text-blue-600 dark:text-blue-500 font-bold">
          <ShieldCheck className="h-5 w-5 text-blue-500 flex-shrink-0" />
          <div>
            <span className="block font-black mb-0.5">Safety & Hygiene Verified</span>
            <span>Ramesh Kumar is double vaccinated. Sanitized thermal delivery bags used.</span>
          </div>
        </div>

      </div>

      {/* Chat Drawer Pane */}
      {isChatOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-[#F8FAFC] dark:bg-[#0F172A] h-full flex flex-col shadow-2xl relative animate-slide-in">
            
            {/* Chat Header */}
            <div className="p-4 bg-white dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-orange-500/10 text-orange-550 flex items-center justify-center font-bold text-sm shrink-0">
                  {order.rider?.name ? order.rider.name.split(' ').map((n: string) => n[0]).join('') : 'DP'}
                </div>
                <div className="text-left">
                  <h4 className="text-sm font-black text-gray-850 dark:text-white">
                    {order.rider?.name || 'Delivery partner'}
                  </h4>
                  <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wide">
                    Delivery Hero
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {['RIDER_ASSIGNED', 'ARRIVED_AT_SHOP', 'PICKED_UP', 'OUT_FOR_DELIVERY'].includes(order.status) ? (
                  <button
                    onClick={() => setActiveCallId(id!)}
                    className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-[#334155] text-[#1565C0] dark:text-[#1E88E5] transition-colors cursor-pointer border border-[#E2E8F0] dark:border-[#334155]"
                    title="Video Call"
                  >
                    <VideoIcon className="h-4.5 w-4.5" />
                  </button>
                ) : (
                  <button
                    disabled
                    className="p-2.5 rounded-xl opacity-35 text-gray-400 border border-gray-200 dark:border-zinc-800 cursor-not-allowed"
                    title="Video calling is only available once a rider is assigned and delivering."
                  >
                    <VideoIcon className="h-4.5 w-4.5" />
                  </button>
                )}
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-[#334155] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer border border-[#E2E8F0] dark:border-[#334155]"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400">
                  <span className="text-3xl mb-2">💬</span>
                  <span className="text-xs font-bold">No messages yet</span>
                  <span className="text-[10px] text-gray-400 font-semibold leading-normal">
                    Type a message or send a photo below to coordinate with your rider.
                  </span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.senderRole === 'customer';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isSelf ? 'align-self-end items-end ml-auto' : 'align-self-start items-start mr-auto'}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-sm text-left
                          ${isSelf
                            ? 'bg-emerald-550 text-white rounded-br-none bg-blue-600'
                            : 'bg-white dark:bg-[#1E293B] text-gray-800 dark:text-gray-250 border border-[#E2E8F0] dark:border-[#334155] rounded-bl-none'
                          }`}
                      >
                        {msg.imageUrl && (
                          <div className="mb-1.5 rounded-xl overflow-hidden max-w-[200px] border border-black/10">
                            <img src={msg.imageUrl} alt="Chat Attachment" className="w-full object-cover" />
                          </div>
                        )}
                        <span>{msg.text}</span>
                      </div>
                      <span className="text-[8px] font-bold text-gray-400 mt-1 uppercase">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form Footer */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-[#1E293B] border-t border-[#E2E8F0] dark:border-[#334155] shrink-0">
              {imagePreview && (
                <div className="mb-2 p-2 rounded-xl bg-gray-50 dark:bg-[#334155]/20 border border-[#E2E8F0] dark:border-[#334155] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={imagePreview} alt="Upload preview" className="w-10 h-10 object-cover rounded-lg border border-black/5" />
                    <span className="text-[10px] text-gray-400 truncate max-w-[120px]">Image ready to send</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedImage(null);
                      setImagePreview('');
                    }}
                    className="p-1 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                  >
                    <X className="h-4.5 w-4.5" />
                  </button>
                </div>
              )}
              
              <div className="flex items-center gap-2">
                <label className="p-2.5 rounded-xl hover:bg-gray-150 dark:hover:bg-[#334155] text-gray-500 dark:text-gray-400 cursor-pointer border border-[#E2E8F0] dark:border-[#334155] shrink-0 flex items-center justify-center">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setSelectedImage(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                  <Image className="h-4.5 w-4.5" />
                </label>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type instructions, house no..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#334155] bg-[#F8FAFC] dark:bg-[#1E293B] text-xs font-bold text-gray-800 dark:text-gray-250 outline-none focus:border-[#1E88E5]"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() && !selectedImage}
                  className="p-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white cursor-pointer transition-colors shadow-md shrink-0 flex items-center justify-center"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Video Calling Overlays */}
      {activeCallId && (
        <VideoCallOverlay
          orderId={id!}
          callerRole="customer"
          callerName="Customer"
          calleeName={order.rider?.name || 'Ramesh Kumar'}
          onClose={() => setActiveCallId(null)}
        />
      )}

      {incomingCall && (
        <VideoCallOverlay
          orderId={id!}
          callerRole="rider"
          callerName={incomingCall.callerName}
          calleeName="Customer"
          incomingCallData={incomingCall}
          onClose={() => {
            setIncomingCall(null);
            setActiveCallId(null);
          }}
        />
      )}

    </div>
  );
};
