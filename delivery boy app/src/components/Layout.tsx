import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Home, 
  Package, 
  IndianRupee, 
  User, 
  Power, 
  Wifi, 
  WifiOff, 
  Moon, 
  Sun 
} from 'lucide-react';
import { NotificationToast } from './NotificationToast';
import type { ToastMessage } from './NotificationToast';
import { isOrderStatus } from '../types/orderStatus';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'home' | 'orders' | 'earnings' | 'profile';
  setActiveTab: (tab: 'home' | 'orders' | 'earnings' | 'profile') => void;
}

export const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab 
}) => {
  const { 
    isOnline, 
    setOnlineStatus, 
    newRequest, 
    acceptSingleOrder, 
    rejectSingleOrder, 
    acceptSmartBatch, 
    rejectSmartBatch,
    triggerMockOrderPlacement,
    triggerSimulationTick,
    activeOrders,
    isAccepting
  } = useApp();

  const [darkMode, setDarkMode] = useState(() => {
    return document.body.classList.contains('dark') || 
      (typeof window !== 'undefined' && localStorage.getItem('theme') === 'dark');
  });

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [countdown, setCountdown] = useState(60);

  // Sync theme
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // Countdown timer for incoming request popup
  useEffect(() => {
    let interval: number;
    if (newRequest) {
      const getRemainingTime = () => {
        if (!newRequest.expiresAt) return 30;
        const diff = Math.round((new Date(newRequest.expiresAt).getTime() - Date.now()) / 1000);
        return Math.max(0, diff);
      };
      
      setCountdown(getRemainingTime());
      
      interval = window.setInterval(() => {
        const remaining = getRemainingTime();
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          // Trigger auto-reject on countdown timeout!
          if (newRequest.type === 'batch') {
            rejectSmartBatch();
          } else {
            rejectSingleOrder();
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [newRequest, rejectSingleOrder, rejectSmartBatch]);

  // Push notifications when active order states shift
  useEffect(() => {
    if (activeOrders.length > 0) {
      const activeOrder = activeOrders[0];
      if (isOrderStatus(activeOrder.status, 'RIDER_ASSIGNED')) {
        setToast({
          id: 'status-prep',
          type: 'info',
          title: 'Route Scheduled',
          text: `Heading to merchant: ${activeOrder.shopName}`
        });
      } else if (isOrderStatus(activeOrder.status, 'ARRIVED_AT_SHOP')) {
        setToast({
          id: 'status-arrived',
          type: 'success',
          title: 'Arrived at Shop',
          text: `Within geofence of ${activeOrder.shopName}. Please verify the checklist.`
        });
      } else if (isOrderStatus(activeOrder.status, 'PICKED_UP')) {
        setToast({
          id: 'status-pickup',
          type: 'success',
          title: 'Package Picked Up',
          text: `Departing merchant. Delivery path coordinates loaded.`
        });
      } else if (isOrderStatus(activeOrder.status, 'OUT_FOR_DELIVERY')) {
        setToast({
          id: 'status-out',
          type: 'info',
          title: 'Out for Delivery',
          text: `Heading to customer: ${activeOrder.contact?.name || 'Customer'}`
        });
      }
    }
  }, [activeOrders.map(o => o.status).join(',')]);

  // Custom toast push wrapper
  const triggerDemoToast = (title: string, text: string, type: ToastMessage['type'] = 'info') => {
    setToast({
      id: Math.random().toString(),
      type,
      title,
      text
    });
  };

  const toggleOnline = () => {
    const nextStatus = !isOnline;
    setOnlineStatus(nextStatus);
    triggerDemoToast(
      nextStatus ? 'Rider Status: Online' : 'Rider Status: Offline',
      nextStatus ? 'You are now receiving customer delivery assignments.' : 'New delivery assignments paused.',
      nextStatus ? 'success' : 'warning'
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors text-slate-800 dark:text-zinc-100">
      
      {/* Toast Alert overlay */}
      <NotificationToast toast={toast} onClose={() => setToast(null)} />

      {/* Navigation Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-zinc-800/60 px-4 py-3 shadow-xs">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`h-2.5 w-2.5 rounded-full ${isOnline ? 'bg-success animate-pulse' : 'bg-slate-400'}`}></div>
            <h1 className="text-sm font-black tracking-widest uppercase text-primary dark:text-white flex items-center gap-1">
              <span>Kart Kirana</span>
              <span className="text-[10px] bg-secondary text-slate-900 font-bold px-1.5 py-0.5 rounded-sm">RIDER</span>
            </h1>
          </div>

          <div className="flex items-center space-x-2">
            {/* Local testing controls must never ship in the production rider app. */}
            {import.meta.env.DEV && <div className="flex bg-slate-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-slate-200/40 dark:border-transparent mr-1">
              <button 
                onClick={() => {
                  triggerMockOrderPlacement();
                  triggerDemoToast("Mock Order Injected", "Placed a new customer order. Turn online to receive request.", "info");
                }}
                className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded text-[9px] font-black uppercase text-slate-500 hover:text-primary dark:text-zinc-400 cursor-pointer transition-all active:scale-95"
                title="Simulate placing customer order"
              >
                +Order
              </button>
              {activeOrders.length > 0 && (
                <button 
                  onClick={() => {
                    triggerSimulationTick();
                    triggerDemoToast("Sim GPS Step", "Simulated driving movement closer to target stop.", "info");
                  }}
                  className="p-1.5 hover:bg-white dark:hover:bg-zinc-700 rounded text-[9px] font-black uppercase text-slate-500 hover:text-success dark:text-zinc-400 cursor-pointer transition-all active:scale-95"
                  title="Simulate driving progress steps"
                >
                  Step
                </button>
              )}
            </div>}

            {/* Dark Mode switcher */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 hover:bg-slate-150 dark:hover:bg-zinc-800 rounded-xl text-slate-500 dark:text-zinc-450 cursor-pointer transition-all active:scale-90"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="h-4.5 w-4.5 text-warning" /> : <Moon className="h-4.5 w-4.5 text-slate-650" />}
            </button>

            {/* Wifi Status */}
            <div className="text-slate-400 dark:text-zinc-550 shrink-0">
              {isOnline ? <Wifi className="h-4.5 w-4.5 text-success" /> : <WifiOff className="h-4.5 w-4.5" />}
            </div>

            {/* Online Toggle Pill */}
            <button
              onClick={toggleOnline}
              className={`px-3 py-1.5 rounded-full text-[10px] font-black tracking-wide uppercase flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shadow-xs ${
                isOnline 
                  ? 'bg-success text-white' 
                  : 'bg-slate-205 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport */}
      <main className="flex-grow max-w-md w-full mx-auto px-4 py-4 safe-bottom">
        {children}
      </main>

      {/* Floating Modern Tab Navigation */}
      <nav className="fixed bottom-4 left-4 right-4 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-slate-200/50 dark:border-zinc-850/50 px-4 py-2.5 rounded-3xl shadow-xl max-w-md mx-auto transition-transform duration-300">
        <div className="flex justify-between items-center">
          <button
            onClick={() => setActiveTab('home')}
            className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'home' 
                ? 'bg-primary-light text-primary font-black shadow-xs' 
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Home className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Home</span>
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'orders' 
                ? 'bg-primary-light text-primary font-black shadow-xs' 
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <Package className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Orders</span>
          </button>

          <button
            onClick={() => setActiveTab('earnings')}
            className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'earnings' 
                ? 'bg-primary-light text-primary font-black shadow-xs' 
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <IndianRupee className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Earnings</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center space-x-1.5 py-2 px-3.5 rounded-2xl transition-all duration-300 cursor-pointer active:scale-95 ${
              activeTab === 'profile' 
                ? 'bg-primary-light text-primary font-black shadow-xs' 
                : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-zinc-800/40'
            }`}
          >
            <User className="h-5 w-5" />
            <span className="text-[10px] font-black uppercase tracking-wider">Profile</span>
          </button>
        </div>
      </nav>

      {/* FULL SCREEN NEW ORDER REQUEST POPUP / OVERLAY */}
      {newRequest && (
        <div className="fixed inset-0 z-50 flex flex-col justify-between bg-slate-950 text-white p-6 animate-in slide-in-from-bottom duration-300">
          
          {/* Header Progress and Countdown */}
          <div className="flex justify-between items-center border-b border-white/10 pb-4">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-secondary rounded-full animate-ping"></span>
              <p className="text-[10px] font-black tracking-widest uppercase text-secondary">
                {newRequest.type === 'batch' ? '⚡ SMART BATCH ASSIGNED' : '📦 NEW TRIP MATCHED'}
              </p>
            </div>
            
            {/* Warning color circle based on remaining seconds */}
            <div className={`h-11 w-11 rounded-full flex items-center justify-center font-mono text-sm font-black border transition-all ${
              countdown <= 10 
                ? 'bg-rose-500/20 text-rose-500 border-rose-500 animate-pulse' 
                : 'bg-secondary/15 text-secondary border-secondary/35'
            }`}>
              {countdown}s
            </div>
          </div>

          {/* Details Panel */}
          <div className="flex-grow py-6 overflow-y-auto space-y-6">
            {newRequest.type === 'batch' ? (
              // Batch Layout details
              <div className="space-y-6">
                <div className="bg-primary/25 border-2 border-secondary/20 p-5 rounded-2xl text-center space-y-1.5 shadow-md">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[9px] font-black uppercase tracking-wider mb-1">
                    <span>🏪 Same Shop Pickup</span>
                    <span>•</span>
                    <span>📍 Customers {(newRequest.batchData as any)?.neighborhoodDistanceMeters || 420}m apart</span>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Estimated Total Earnings</p>
                  <p className="text-4xl font-black text-secondary">₹{newRequest.batchData?.totalEarnings}</p>
                  <div className="flex justify-center space-x-4 pt-2 text-[10px] text-slate-300 font-semibold">
                    <span>Distance: {newRequest.batchData?.totalDistance} km</span>
                    <span>•</span>
                    <span>Est Time: {newRequest.batchData?.estimatedTime} mins</span>
                  </div>
                </div>

                {/* Batch stops log */}
                <div className="space-y-4">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Optimized Sequence Route</p>
                  <div className="relative border-l border-white/15 pl-4 ml-2 space-y-4 text-xs font-semibold">
                    {newRequest.batchData?.stops.map((stop, idx) => (
                      <div key={idx} className="relative">
                        {/* Dot indicator */}
                        <div className={`absolute -left-[21px] top-0.5 h-2.5 w-2.5 rounded-full border-2 border-slate-950 ${
                          stop.type === 'pickup' ? 'bg-success' : 'bg-primary'
                        }`}></div>
                        
                        <div className="space-y-0.5 text-left">
                          <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wide">
                            Stop {idx + 1}: {stop.type === 'pickup' ? 'Store Pickup' : 'Customer Drop-off'}
                          </p>
                          <h4 className="font-extrabold text-white text-sm">
                            {stop.type === 'pickup' ? stop.shopName : stop.customerName}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-normal truncate">
                            {stop.type === 'pickup' ? stop.shopAddress : stop.address}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Single order details
              <div className="space-y-6">
                
                {/* Visual Earnings Card */}
                <div className="bg-primary/25 border-2 border-secondary/20 p-5 rounded-2xl text-center space-y-1.5 shadow-md">
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Guaranteed Trip Payout</p>
                  <p className="text-4xl font-black text-secondary">₹{newRequest.earnings || newRequest.orderData?.deliveryFee || 10}</p>
                  <div className="flex justify-center space-x-4 pt-2 text-[10px] text-slate-350 font-semibold">
                    <span>Est Distance: {newRequest.distance ? `${newRequest.distance} km` : '2.1 km'}</span>
                    <span>•</span>
                    <span>Est Duration: 12 mins</span>
                  </div>
                </div>

                {/* Map-first pickup & drop-off locations info */}
                <div className="space-y-5 text-left bg-slate-900/60 p-4.5 rounded-2xl border border-white/5">
                  <div className="flex items-start space-x-3.5">
                    <div className="h-7 w-7 rounded-xl bg-success/20 flex items-center justify-center flex-shrink-0 text-success text-xs border border-success/10">
                      🏪
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Pickup Store Location</p>
                      <h3 className="text-sm font-black mt-0.5 text-white">{newRequest.orderData?.shopName || 'Partner Store'}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-normal leading-normal">{newRequest.orderData?.shopAddress || 'Store Location'}</p>
                    </div>
                  </div>

                  <div className="border-t border-white/5 my-1.5" />

                  <div className="flex items-start space-x-3.5">
                    <div className="h-7 w-7 rounded-xl bg-primary/25 flex items-center justify-center flex-shrink-0 text-primary text-xs border border-primary/10">
                      📍
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-450 font-bold uppercase tracking-wider">Drop Location Address</p>
                      <h3 className="text-sm font-black mt-0.5 text-white">{newRequest.orderData?.contact?.name || 'Customer'}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-normal leading-normal">{newRequest.orderData?.deliveryAddress?.address || 'Customer Address'}</p>
                    </div>
                  </div>
                </div>

                {/* Additional metrics */}
                <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-xs font-bold text-center">
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-slate-450 uppercase font-semibold">Payment Mode</p>
                    <p className="text-white mt-1 uppercase font-black tracking-wider text-[10px]">{newRequest.orderData?.paymentMethod || 'COD'}</p>
                  </div>
                  <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                    <p className="text-[9px] text-slate-450 uppercase font-semibold">Package Size</p>
                    <p className="text-white mt-1 text-[10px] font-black">{newRequest.orderData?.items?.reduce((acc, curr) => acc + (curr.quantity || 1), 0) || 1} items</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex gap-4 border-t border-white/10 pt-4 shrink-0">
            <button
              onClick={() => {
                if (newRequest.type === 'batch') {
                  rejectSmartBatch();
                } else {
                  rejectSingleOrder();
                }
              }}
              className="w-1/2 py-4 bg-white/10 hover:bg-white/15 active:scale-95 rounded-xl font-black text-xs uppercase tracking-widest text-slate-300 transition-all cursor-pointer"
            >
              Reject Request
            </button>
            <button
              disabled={isAccepting}
              onClick={async () => {
                if (isAccepting) return;
                if (newRequest.type === 'batch') {
                  await acceptSmartBatch(newRequest.batchId!);
                } else {
                  await acceptSingleOrder(newRequest.orderId!);
                }
              }}
              className="w-1/2 py-4 bg-secondary hover:bg-secondary-hover active:scale-95 disabled:opacity-50 text-slate-950 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              {isAccepting ? (
                <div className="h-4 w-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                'Accept Request'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
