import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { SVGMap } from '../components/SVGMap';
import { 
  Phone, 
  MapPin, 
  Store, 
  Navigation, 
  Compass, 
  CheckCircle,
  HelpCircle,
  ArrowLeft,
  X,
  MessageSquare,
  Send,
  Image,
  Video
} from 'lucide-react';
import { VideoCallOverlay } from '../components/VideoCallOverlay';
import { sendChatMessage, subscribeChatMessages } from '../services/firestoreService';
import type { ChatMessage } from '../services/firestoreService';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isOrderStatus, normalizeOrderStatus } from '../types/orderStatus';
import { PER_DELIVERY_FEE } from '../constants/earnings';

interface ActiveDeliveryProps {
  setViewActiveMap: (view: boolean) => void;
}

export const ActiveDelivery: React.FC<ActiveDeliveryProps> = ({ setViewActiveMap }) => {
  const { 
    user, 
    activeOrders, 
    activeBatch, 
    updateWorkflowStep 
  } = useApp();

  // Verification checklist state: productId -> boolean
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  // OTP Verification States
  const [isOtpModalOpen, setIsOtpModalOpen] = useState(false);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  // Chat & Video Call States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');

  const [activeCallId, setActiveCallId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<any | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const order = activeOrders[0];

  // Subscribe to chat messages
  useEffect(() => {
    if (!order?.id) return;
    const unsub = subscribeChatMessages(order.id, (updatedMessages) => {
      setMessages(updatedMessages);
    });
    return () => {
      if (unsub) unsub();
    };
  }, [order?.id]);

  // Auto-scroll messages list
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isChatOpen]);

  // Listen for incoming call notifications
  useEffect(() => {
    if (!db || !order?.id) return;
    const callDocRef = doc(db, 'videoCalls', order.id);
    const unsub = onSnapshot(callDocRef, (snap) => {
      const data = snap.data();
      if (data && data.status === 'initiated' && (data.callerRole === 'customer' || (data.customerId && data.customerId !== user?.uid))) {
        // Customer is caller, so show incoming call
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
  }, [order?.id]);

  if (activeOrders.length === 0) {
    return (
      <div className="max-w-md mx-auto py-12 text-center space-y-4 animate-fade-in text-left">
        <div className="h-14 w-14 bg-slate-200 dark:bg-zinc-800 rounded-full flex items-center justify-center text-slate-400 mx-auto">
          <Compass className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-black uppercase text-slate-800 dark:text-zinc-200 tracking-wider">
            No Active Delivery Tasks
          </h3>
          <p className="text-[10px] text-slate-400 dark:text-zinc-550 font-semibold max-w-xs mx-auto">
            You don't have any accepted single deliveries or smart batches at the moment. Return to home.
          </p>
        </div>
        <button
          onClick={() => setViewActiveMap(false)}
          className="px-6 py-2.5 bg-primary text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-xs cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.id || (!inputText.trim() && !selectedImage)) return;

    const text = inputText;
    const imageFile = selectedImage;
    setInputText('');
    setSelectedImage(null);
    setImagePreview('');

    try {
      await sendChatMessage(
        order.id,
        text,
        user?.uid || 'rider_1',
        user?.fullName || 'Rider Ramesh',
        'rider',
        imageFile || undefined
      );
    } catch (err) {
      console.error('Failed to send chat message:', err);
    }
  };

  const getHaversineDistance = (c1: { lat: number; lng: number } | null, c2: { lat: number; lng: number } | null) => {
    if (!c1 || !c2) return null;
    const R = 6371; // Earth radius in km
    const dLat = (c2.lat - c1.lat) * Math.PI / 180;
    const dLon = (c2.lng - c1.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(c1.lat * Math.PI / 180) * Math.cos(c2.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Resolve current active stop details
  const getActiveStop = () => {
    if (activeBatch && Array.isArray(activeBatch.stops) && activeBatch.stops.length > 0) {
      const idx = Math.min(Math.max(0, activeBatch.currentStopIndex || 0), activeBatch.stops.length - 1);
      const stop = activeBatch.stops[idx];
      const isPickup = stop?.type === 'pickup';
      const linkedOrder = (stop?.orderId ? activeOrders.find(o => o.id === stop.orderId) : null) || order;
      return {
        isBatch: true,
        type: stop?.type || 'pickup',
        orderId: stop?.orderId || order?.id || '',
        name: isPickup ? (stop?.shopName || 'Partner Store') : (stop?.customerName || 'Customer'),
        phone: isPickup ? '' : (stop?.customerPhone || ''),
        address: isPickup ? (stop?.shopAddress || 'Store Location') : (stop?.address || 'Delivery Address'),
        coords: stop?.coords || { lat: 28.5835, lng: 77.3142 },
        items: linkedOrder?.items || [],
        instructions: linkedOrder?.instructions || 'Handle with care.',
        status: stop?.status || 'pending',
        stopIndex: idx,
        totalStops: activeBatch.stops.length,
        earnings: activeBatch.totalEarnings || 0
      };
    } else {
      // Single order details
      const isPickup = isOrderStatus(order?.status, 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP');
      return {
        isBatch: false,
        type: isPickup ? ('pickup' as const) : ('delivery' as const),
        orderId: order?.id || '',
        name: isPickup ? (order?.shopName || 'Partner Store') : (order?.contact?.name || 'Customer'),
        phone: isPickup ? '' : (order?.contact?.phone || ''),
        address: isPickup ? (order?.shopAddress || 'Store Location') : (order?.deliveryAddress?.address || 'Delivery Address'),
        coords: isPickup ? (order?.shopCoords || { lat: 28.5835, lng: 77.3142 }) : (order?.deliveryAddress?.coords || { lat: 28.59, lng: 77.33 }),
        items: order?.items || [],
        instructions: order?.instructions || 'N/A',
        status: order?.status || 'PLACED',
        stopIndex: isPickup ? 0 : 1,
        totalStops: 2,
        earnings: order?.deliveryFee || PER_DELIVERY_FEE
      };
    }
  };

  const currentStop = getActiveStop();

  const stopOrder = activeBatch
    ? (activeOrders.find(o => o.id === currentStop.orderId) || order)
    : order;

  // Dynamic coordinates metrics
  const rawDistance = getHaversineDistance(user?.coords || null, currentStop.coords || null);
  const distanceText = rawDistance !== null ? `${rawDistance.toFixed(2)} km away` : 'Calculating...';
  const durationMins = rawDistance !== null ? Math.max(1, Math.round((rawDistance / 25) * 60)) : null;
  const durationText = durationMins !== null ? `${durationMins} mins` : 'Calculating...';

  // Checklist helper
  const toggleItemCheck = (prodId: string) => {
    setCheckedItems(prev => ({
      ...prev,
      [prodId]: !prev[prodId]
    }));
  };

  const isChecklistVerified = () => {
    if (!currentStop.items) return true;
    return currentStop.items.every(item => checkedItems[item.product.id]);
  };

  const handleVerifyDeliveryOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const correctOtp = stopOrder.id.slice(-4).toUpperCase();
    if (enteredOtp.trim().toUpperCase() === correctOtp) {
      setIsOtpModalOpen(false);
      setEnteredOtp('');
      setOtpError('');
      await updateWorkflowStep();
    } else {
      setOtpError('Invalid OTP code. Please ask the customer for the correct 4-digit code.');
    }
  };

  // Sound play confirmation before clicking primary action
  const handlePrimaryAction = async () => {
    if (currentStop.type === 'pickup') {
      // Must verify items checklist if single order is at shop or batch requires pickup
      if (isOrderStatus(currentStop.status, 'ARRIVED_AT_SHOP') || (currentStop.isBatch && !isChecklistVerified())) {
        if (!isChecklistVerified()) {
          setIsChecklistOpen(true);
          return;
        }
      }
    } else if (currentStop.type === 'delivery' && (currentStop.isBatch || isOrderStatus(stopOrder.status, 'OUT_FOR_DELIVERY'))) {
      // Batch delivery stops go straight to "mark delivered" with no
      // intermediate OUT_FOR_DELIVERY state per order, so any batch
      // delivery-type stop is the final action for that order — gate it.
      setIsOtpModalOpen(true);
      return;
    }
    
    await updateWorkflowStep();
  };

  const getWorkflowButtonText = () => {
    if (currentStop.isBatch) {
      if (currentStop.type === 'pickup') {
        return currentStop.status === 'pending' ? 'Arrived at Pickup' : 'Confirm Pickup';
      }
      return 'Confirm Dropoff';
    }

    switch (normalizeOrderStatus(currentStop.status)) {
      case 'RIDER_ASSIGNED':
        return 'Arrived at Shop';
      case 'ARRIVED_AT_SHOP':
        return 'Verify & Depart Store';
      case 'PICKED_UP':
        return 'Start Heading to Customer';
      case 'OUT_FOR_DELIVERY':
        return 'Complete Dropoff';
      default:
        return 'Confirm Step';
    }
  };

  const getWorkflowInstructionText = () => {
    if (currentStop.isBatch) {
      return currentStop.type === 'pickup'
        ? currentStop.status === 'pending'
          ? `Drive to Store: ${currentStop.name}`
          : 'Verify all items, then confirm pickup.'
        : `Deliver package to customer: ${currentStop.name}`;
    }

    switch (normalizeOrderStatus(currentStop.status)) {
      case 'RIDER_ASSIGNED':
        return `Drive to store: ${currentStop.name}`;
      case 'ARRIVED_AT_SHOP':
        return `Arrived! Open checklist and verify.`;
      case 'PICKED_UP':
        return `Checklist verified. Drive to Customer: ${order.contact?.name || 'Customer'}`;
      case 'OUT_FOR_DELIVERY':
        return `Nearing dropoff geofence. Confirm delivery.`;
      default:
        return 'Follow active map route.';
    }
  };

  return (
    <div className="space-y-4.5 animate-fade-in text-left">
      
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-dark-border pb-3">
        <button
          onClick={() => setViewActiveMap(false)}
          className="flex items-center space-x-1.5 text-xs font-black uppercase text-slate-500 hover:text-slate-800 dark:text-zinc-400 dark:hover:text-white cursor-pointer"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
          <span>Dashboard</span>
        </button>
        <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded font-black uppercase">
          Payout: ₹{currentStop.earnings}
        </span>
      </div>

      {/* NOIDA SVG MAP COMPONENT */}
      <div className="w-full h-80 rounded-3xl overflow-hidden border border-slate-100 dark:border-dark-border shadow-sm z-10">
        <SVGMap
          riderCoords={user?.coords || null}
          stops={activeBatch ? activeBatch.stops : [
            {
              id: 'stop-pickup',
              type: 'pickup',
              orderId: order.id,
              shopName: order.shopName,
              coords: order.shopCoords || { lat: 28.5835, lng: 77.3142 },
              status: isOrderStatus(order.status, 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP') ? 'pending' : 'completed'
            },
            {
              id: 'stop-delivery',
              type: 'delivery',
              orderId: order.id,
              customerName: order.contact?.name || 'Customer',
              coords: order.deliveryAddress?.coords || { lat: 28.5912, lng: 77.3412 },
              status: isOrderStatus(order.status, 'DELIVERED', 'COMPLETED') ? 'completed' : 'pending'
            }
          ]}
          currentStopIndex={currentStop.stopIndex}
          status={order.status}
        />
      </div>

      {/* Batch Route stop visual checklist sequence */}
      {activeBatch && (
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/65 dark:border-zinc-800 p-3.5 rounded-2xl shadow-xs space-y-2">
          <p className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
            Optimized Batch Stops Sequence
          </p>
          <div className="flex items-center space-x-2 py-1 overflow-x-auto no-scrollbar">
            {activeBatch.stops.map((stop, index) => {
              const isActive = index === activeBatch.currentStopIndex;
              const isDone = index < activeBatch.currentStopIndex;
              return (
                <div 
                  key={stop.id} 
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase border transition flex-shrink-0 ${
                    isActive
                      ? 'bg-primary/10 border-primary text-primary'
                      : isDone
                        ? 'bg-slate-50 dark:bg-zinc-800 border-slate-200/50 text-slate-400 line-through'
                        : 'bg-slate-50/50 dark:bg-zinc-900 border-slate-250/20 text-slate-550'
                  }`}
                >
                  <span>{stop.type === 'pickup' ? '🏪' : '📍'}</span>
                  <span>{stop.type === 'pickup' ? stop.shopName?.split(' ')[0] : stop.customerName?.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main HUD Stop card panel */}
      <div className="bg-slate-950 text-white border border-slate-850 p-5 rounded-2xl shadow-xl space-y-4">
        
        {/* Distance Remaining & ETA banner */}
        <div className="flex justify-between items-center text-xs font-black border-b border-white/10 pb-3">
          <div className="space-y-0.5 text-left">
            <p className="text-[9px] text-slate-400 uppercase tracking-widest">Next Target Location</p>
            <h3 className="text-base font-black flex items-center space-x-1.5">
              <span>{currentStop.name}</span>
              <span className="text-primary text-[9px] uppercase">
                {currentStop.type === 'pickup' ? 'Store Pickup' : 'Dropoff'}
              </span>
            </h3>
          </div>
          <div className="text-right">
            <p className="text-[14px] text-secondary font-black">{durationText}</p>
            <p className="text-[9px] text-slate-400 uppercase">{distanceText}</p>
          </div>
        </div>

        {/* Address and instructions log */}
        <div className="space-y-3.5 text-xs font-semibold">
          <div className="flex items-start justify-between gap-3 bg-white/5 p-3 rounded-xl border border-white/5 text-left">
            <div className="flex items-start space-x-2">
              <MapPin className="h-4.5 w-4.5 text-slate-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-[9px] text-slate-400 uppercase tracking-wider">Address details</p>
                <p className="text-[11px] text-slate-200 leading-relaxed font-normal mt-0.5">
                  {currentStop.address}
                </p>
              </div>
            </div>
            {currentStop.coords && (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${currentStop.coords.lat},${currentStop.coords.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-[#4CAF50] to-[#2E7D32] text-white text-[9px] font-black uppercase tracking-wider rounded-xl transition flex-shrink-0 shadow-sm active:scale-95 cursor-pointer select-none"
              >
                <Compass className="h-3.5 w-3.5 animate-spin-slow" />
                <span>Navigate</span>
              </a>
            )}
          </div>

          <div className="flex items-start space-x-2 bg-white/5 p-3 rounded-xl text-left">
            <HelpCircle className="h-4.5 w-4.5 text-warning mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[9px] text-slate-400 uppercase tracking-wider">Delivery Instructions</p>
              <p className="text-[10px] text-slate-250 leading-relaxed font-normal mt-0.5">
                "{currentStop.instructions}"
              </p>
            </div>
          </div>
        </div>

        {/* Call options row */}
        <div className={`grid ${currentStop.type === 'delivery' ? 'grid-cols-3' : 'grid-cols-2'} gap-2 pt-1 text-[9px] font-extrabold uppercase`}>
          {currentStop.phone ? (
            <a
              href={`tel:${currentStop.phone}`}
              className="py-3 bg-white/10 hover:bg-white/15 rounded-xl transition flex items-center justify-center space-x-1 text-slate-205 cursor-pointer"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Call</span>
            </a>
          ) : (
            <div
              className="py-3 bg-white/5 opacity-40 rounded-xl flex items-center justify-center space-x-1 text-slate-455 cursor-not-allowed select-none"
              title="Store contact phone number is unavailable"
            >
              <Phone className="h-3.5 w-3.5" />
              <span>Call (N/A)</span>
            </div>
          )}

          {currentStop.type === 'delivery' && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="py-3 bg-white/10 hover:bg-white/15 rounded-xl transition flex items-center justify-center space-x-1 text-slate-205 cursor-pointer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
            </button>
          )}
          
          <button
            onClick={() => setIsChecklistOpen(true)}
            className="py-3 bg-white/10 hover:bg-white/15 rounded-xl transition flex items-center justify-center space-x-1 text-slate-205 cursor-pointer"
          >
            <span>Verify</span>
            {isChecklistVerified() ? (
              <CheckCircle className="h-3.5 w-3.5 text-success" />
            ) : (
              <span className="h-1.5 w-1.5 bg-primary rounded-full"></span>
            )}
          </button>
        </div>

        {/* Main driving workflow driver button */}
        <div className="pt-2">
          <div className="text-[9px] text-slate-455 uppercase font-black tracking-widest text-center mb-2">
            🚦 Workflow step: {getWorkflowInstructionText()}
          </div>
          
          <button
            onClick={handlePrimaryAction}
            className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-98 flex items-center justify-center space-x-2 cursor-pointer ${
              currentStop.type === 'pickup'
                ? 'bg-primary hover:bg-primary-hover text-white'
                : 'bg-success hover:bg-success-hover text-white'
            }`}
          >
            <Navigation className="h-4.5 w-4.5 animate-pulse" />
            <span>{getWorkflowButtonText()}</span>
          </button>
        </div>

      </div>

      {/* ITEMS CHECKLIST DIALOG MODAL */}
      {isChecklistOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in duration-150 flex flex-col max-h-[450px]">
            
            {/* Header */}
            <div className="bg-slate-900 text-white p-4.5 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Store className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-extrabold text-sm uppercase">Verify Package Checklist</h3>
                  <p className="text-[8px] opacity-75">Order: #{currentStop.orderId.substring(0, 12)}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsChecklistOpen(false)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Checklist body */}
            <div className="flex-grow p-5 overflow-y-auto space-y-4">
              <p className="text-[10px] text-slate-455 dark:text-zinc-550 font-semibold leading-relaxed">
                Riders must verify every item is packed before departing. Tap items to check them off.
              </p>

              <div className="space-y-2.5">
                {currentStop.items.map((item) => {
                  const isChecked = checkedItems[item.product.id] || false;
                  return (
                    <div 
                      key={item.product.id}
                      onClick={() => toggleItemCheck(item.product.id)}
                      className={`p-3.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition ${
                        isChecked 
                          ? 'bg-emerald-500/5 border-emerald-500/35 text-emerald-800 dark:text-emerald-400' 
                          : 'bg-slate-50 dark:bg-zinc-800/40 border-slate-200/50 dark:border-transparent text-slate-700 dark:text-zinc-300 hover:bg-slate-100'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        readOnly
                        className="h-4.5 w-4.5 rounded text-primary focus:ring-primary accent-primary" 
                      />
                      <span className={`text-xs font-bold leading-none ${isChecked ? 'line-through opacity-75' : ''}`}>
                        {item.product?.name || 'Product'} (x{item.quantity || 1})
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions footer */}
            <div className="p-4 border-t border-slate-150 dark:border-dark-border flex gap-3">
              <button
                onClick={() => setIsChecklistOpen(false)}
                className="w-full py-3 bg-primary text-white rounded-xl font-black text-xs uppercase tracking-wider hover:bg-primary-hover transition cursor-pointer"
              >
                Done
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Chat Drawer Overlay */}
      {isChatOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-xs flex justify-end transition-opacity">
          <div className="w-full max-w-xl bg-slate-50 dark:bg-zinc-950 h-full flex flex-col shadow-2xl relative animate-slide-in">
            
            {/* Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 text-left">
                <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-sm shrink-0 border border-primary/20">
                  {order.contact?.name ? order.contact.name.split(' ').map(n => n[0]).join('') : 'CU'}
                </div>
                <div>
                  <h4 className="text-sm font-extrabold">{order.contact?.name || 'Customer'}</h4>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Delivery Customer</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setActiveCallId(order.id)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-primary transition-colors cursor-pointer border border-white/10"
                  title="Video Call"
                >
                  <Video className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={() => setIsChatOpen(false)}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-400 hover:text-white transition-colors cursor-pointer border border-white/10"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-455">
                  <span className="text-3xl mb-2">💬</span>
                  <span className="text-xs font-black uppercase">No coordinates yet</span>
                  <span className="text-[10px] text-slate-400 font-semibold leading-normal max-w-xs">
                    Start a chat to clarify building landmarks or delivery gate details.
                  </span>
                </div>
              ) : (
                messages.map((msg) => {
                  const isSelf = msg.senderRole === 'rider';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[80%] ${isSelf ? 'align-self-end items-end ml-auto' : 'align-self-start items-start mr-auto'}`}
                    >
                      <div
                        className={`p-3 rounded-2xl text-xs font-semibold leading-relaxed shadow-xs text-left
                          ${isSelf
                            ? 'bg-primary text-white rounded-br-none'
                            : 'bg-white dark:bg-zinc-905 text-slate-800 dark:text-zinc-200 border border-slate-200/60 dark:border-zinc-800 rounded-bl-none'
                          }`}
                      >
                        {msg.imageUrl && (
                          <div className="mb-1.5 rounded-xl overflow-hidden max-w-[200px] border border-black/10">
                            <img src={msg.imageUrl} alt="Chat Attachment" className="w-full object-cover" />
                          </div>
                        )}
                        <span>{msg.text}</span>
                      </div>
                      <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Footer Input */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-zinc-900 border-t border-slate-200/50 dark:border-zinc-800 shrink-0">
              {imagePreview && (
                <div className="mb-2 p-2 rounded-xl bg-slate-50 dark:bg-zinc-800/35 border border-slate-200/40 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <img src={imagePreview} alt="Upload preview" className="w-10 h-10 object-cover rounded-lg border border-black/5" />
                    <span className="text-[10px] text-slate-400 truncate max-w-[120px]">Image ready to send</span>
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
                <label className="p-2.5 rounded-xl bg-slate-50 dark:bg-zinc-800 text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer border border-slate-250/20 dark:border-transparent shrink-0 flex items-center justify-center">
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
                  placeholder="Ask for directions or send status..."
                  className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-850 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-800 dark:text-zinc-200 outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() && !selectedImage}
                  className="p-2.5 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 text-white cursor-pointer transition-colors shadow-md shrink-0 flex items-center justify-center"
                >
                  <Send className="h-4.5 w-4.5" />
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* Video Call Signaling Windows */}
      {activeCallId && (
        <VideoCallOverlay
          orderId={order.id}
          callerRole="rider"
          callerName={user?.fullName || 'Rider Ramesh'}
          calleeName={order.contact?.name || 'Customer'}
          onClose={() => setActiveCallId(null)}
        />
      )}

      {incomingCall && (
        <VideoCallOverlay
          orderId={order.id}
          callerRole="customer"
          callerName="Customer"
          calleeName={user?.fullName || 'Rider Ramesh'}
          incomingCallData={incomingCall}
          onClose={() => {
            setIncomingCall(null);
            setActiveCallId(null);
          }}
        />
      )}
      {/* OTP verification dialog */}
      {isOtpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs px-4">
          <div className="bg-white dark:bg-dark-card border border-slate-200 dark:border-dark-border rounded-2xl max-w-sm w-full overflow-hidden shadow-2xl animate-in zoom-in duration-150 p-5 space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-dark-border/40 pb-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200 uppercase tracking-wider">
                🔑 Enter Delivery OTP
              </h3>
              <button 
                onClick={() => {
                  setIsOtpModalOpen(false);
                  setEnteredOtp('');
                  setOtpError('');
                }}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-[10px] text-slate-455 dark:text-zinc-400 font-semibold leading-relaxed">
              Ask the customer for the 4-digit verification code shown on their tracking page to complete dropoff.
            </p>

            {otpError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black text-center">
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyDeliveryOtp} className="space-y-4">
              <input
                type="text"
                maxLength={4}
                placeholder="Code"
                value={enteredOtp}
                onChange={(e) => setEnteredOtp(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                className="w-full text-center py-3 bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-dark-border rounded-xl font-mono font-black text-2xl tracking-widest outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 text-slate-800 dark:text-white"
                autoFocus
              />

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsOtpModalOpen(false);
                    setEnteredOtp('');
                    setOtpError('');
                  }}
                  className="flex-1 py-3 border border-slate-200 dark:border-dark-border text-slate-500 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enteredOtp.trim().length !== 4}
                  className="flex-1 py-3 bg-primary text-white disabled:opacity-50 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-primary-hover transition cursor-pointer text-center"
                >
                  Verify
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
