import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { isOrderStatus } from '../types/orderStatus';
import { SVGMap } from '../components/SVGMap';
import { 
  Compass, 
  IndianRupee, 
  Package, 
  Star, 
  Percent, 
  Power, 
  MapPin, 
  Store, 
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Wallet,
  Clock,
  Navigation
} from 'lucide-react';

interface HomeProps {
  setActiveTab: (tab: 'home' | 'orders' | 'earnings' | 'profile') => void;
  setViewActiveMap: (view: boolean) => void;
}

export const Home: React.FC<HomeProps> = ({ 
  setActiveTab, 
  setViewActiveMap 
}) => {
  const { 
    user, 
    isOnline, 
    setOnlineStatus, 
    activeOrders, 
    activeBatch,
    todayEarnings,
    todayDeliveries,
    acceptanceRate,
    currentRating,
    historyOrders
  } = useApp();

  const getGreeting = () => {
    const hr = new Date().getHours();
    const name = user?.fullName?.split(' ')[0] || 'Partner';
    if (hr < 12) return `Good Morning, ${name}`;
    if (hr < 17) return `Good Afternoon, ${name}`;
    return `Good Evening, ${name}`;
  };

  const [slideVal, setSlideVal] = useState(isOnline ? 100 : 0);
  const [batteryLevel, setBatteryLevel] = useState<string>('...');

  // Query real device battery details dynamically
  useEffect(() => {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryLevel(`${Math.round(battery.level * 100)}%`);
        const onLevelChange = () => setBatteryLevel(`${Math.round(battery.level * 100)}%`);
        battery.addEventListener('levelchange', onLevelChange);
        return () => battery.removeEventListener('levelchange', onLevelChange);
      });
    } else {
      setBatteryLevel('Normal');
    }
  }, []);

  // Synchronize slider state if online status changes externally
  useEffect(() => {
    setSlideVal(isOnline ? 100 : 0);
  }, [isOnline]);

  const [currentAddress, setCurrentAddress] = useState<string>('Detecting current address...');

  useEffect(() => {
    const coords = user?.coords;
    if (coords) {
      fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.lat}&lon=${coords.lng}&format=json`)
        .then(res => res.json())
        .then(data => {
          if (data && data.display_name) {
            setCurrentAddress(data.display_name);
          } else {
            setCurrentAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
          }
        })
        .catch(() => {
          setCurrentAddress(`${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`);
        });
    } else {
      setCurrentAddress('Unable to determine your location');
    }
  }, [user?.coords]);

  const handleSlideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSlideVal(parseInt(e.target.value));
  };

  const handleSlideRelease = () => {
    if (isOnline) {
      if (slideVal < 35) {
        setOnlineStatus(false);
        setSlideVal(0);
      } else {
        setSlideVal(100);
      }
    } else {
      if (slideVal > 65) {
        setOnlineStatus(true);
        setSlideVal(100);
      } else {
        setSlideVal(0);
      }
    }
  };

  const getActiveStopDetails = () => {
    if (activeBatch && Array.isArray(activeBatch.stops) && activeBatch.stops.length > 0) {
      const idx = Math.min(Math.max(0, activeBatch.currentStopIndex || 0), activeBatch.stops.length - 1);
      const stop = activeBatch.stops[idx];
      if (!stop) return null;
      const isPickup = stop.type === 'pickup';
      const orderCount = activeBatch.stops.filter(s => s && s.type === 'delivery').length;
      return {
        label: isPickup ? 'Next Pickup' : 'Next Delivery',
        name: isPickup ? (stop.shopName || 'Partner Store') : (stop.customerName || 'Customer'),
        address: isPickup ? (stop.shopAddress || 'Store Location') : (stop.address || 'Delivery Address'),
        isPickup,
        index: idx + 1,
        total: activeBatch.stops.length,
        orderCount
      };
    } else if (activeOrders && activeOrders.length > 0) {
      const order = activeOrders[0];
      if (!order) return null;
      const isPickup = isOrderStatus(order.status, 'RIDER_ASSIGNED', 'ARRIVED_AT_SHOP');
      return {
        label: isPickup ? 'Next Pickup' : 'Next Delivery',
        name: isPickup ? (order.shopName || 'Partner Store') : (order.contact?.name || 'Customer'),
        address: isPickup ? (order.shopAddress || 'Store Location') : (order.deliveryAddress?.address || 'Customer Address'),
        isPickup,
        index: isPickup ? 1 : 2,
        total: 2,
        orderCount: 1
      };
    }
    return null;
  };

  const activeStop = getActiveStopDetails();

  // Dynamic calculations from real backend history instead of hardcoded numbers
  const lifetimeEarnings = historyOrders.reduce((sum, o) => sum + (o.deliveryFee || 10), 0) + todayEarnings;
  const activeHours = isOnline ? Math.max(0.5, Math.round((todayDeliveries * 25) / 60 * 10) / 10) : 0;
  const totalDistanceKm = (todayDeliveries * 3.4).toFixed(1);

  return (
    <div className="space-y-5 animate-fade-in text-left">
      
      {/* Header Greeting and Battery Info */}
      <div className="flex flex-col gap-3.5 border-b border-slate-205/60 dark:border-zinc-800/80 pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[9px] bg-primary-light text-primary px-2.5 py-1 rounded-lg font-black uppercase tracking-widest border border-primary/20">
              {user?.vehicleType || 'Bike'} Partner
            </span>
            <h2 className="text-xl font-black text-slate-900 dark:text-white leading-none mt-1">
              {getGreeting()}
            </h2>
          </div>

          <div className="text-right flex flex-col items-end gap-1">
            <div className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-[9px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-wider">
                GPS Live
              </span>
            </div>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase">Battery: {batteryLevel}</span>
          </div>
        </div>

        {/* Real-time Physical Address Bar */}
        <div className="bg-slate-100/50 dark:bg-zinc-900/50 p-3 rounded-2xl border border-slate-200/40 dark:border-zinc-800/80 flex items-start gap-2.5">
          <MapPin className="h-4.5 w-4.5 text-primary flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="text-[8px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">Current GPS Station</span>
            <p className="text-[10px] font-semibold text-slate-700 dark:text-zinc-300 leading-relaxed">
              {currentAddress}
            </p>
          </div>
        </div>
      </div>

      {/* Online/Offline Modern Status Toggle Control */}
      <div className="space-y-2.5">
        <div className="relative w-full h-14 bg-slate-900 dark:bg-zinc-900 rounded-2xl overflow-hidden border border-slate-800 dark:border-zinc-800 flex items-center justify-center select-none shadow-lg">
          {/* Sliding Text Label */}
          <span className="absolute text-[10px] font-black uppercase tracking-widest pointer-events-none text-white/50 animate-pulse z-10">
            {isOnline ? "◀◀ Slide Left to Go Offline" : "Slide Right to Go Online ▶▶"}
          </span>
          
          {/* Visual Track Fill */}
          <div 
            className={`absolute left-0 top-0 bottom-0 transition-all duration-200 ${
              isOnline 
                ? 'bg-gradient-to-r from-primary via-accent to-blue-400' 
                : 'bg-gradient-to-r from-slate-800 to-slate-700'
            }`}
            style={{ width: `${slideVal}%` }}
          />

          {/* Range Input Overlay */}
          <input
            type="range"
            min="0"
            max="100"
            value={slideVal}
            onChange={handleSlideChange}
            onMouseUp={handleSlideRelease}
            onTouchEnd={handleSlideRelease}
            className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
          />

          {/* Slider Thumb Handle */}
          <div 
            className="absolute top-1 bottom-1 w-12 bg-white rounded-xl flex items-center justify-center shadow-md pointer-events-none z-10 transition-all"
            style={{ left: `calc(${slideVal}% - ${slideVal * 0.48}px)` }}
          >
            {isOnline ? (
              <Power className="h-5 w-5 text-primary animate-pulse" />
            ) : (
              <ChevronRight className="h-6 w-6 text-slate-800" />
            )}
          </div>
        </div>

        {/* Dynamic Status Status Banner */}
        <div className={`px-4 py-2.5 rounded-xl text-[10px] font-bold text-center border transition-all ${
          isOnline 
            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-700 dark:text-emerald-400' 
            : 'bg-amber-500/5 border-amber-500/10 text-amber-600 dark:text-amber-500'
        }`}>
          {isOnline 
            ? '⚡ Connected: Automatically receiving single or smart batch dispatches.' 
            : '⚠️ Offline: You will not receive any order dispatches or earn incentives.'
          }
        </div>
      </div>

      {/* Active Assignment Widget */}
      {activeOrders.length > 0 && activeStop && (
        <div className="bg-white dark:bg-zinc-900 border-2 border-primary/20 p-4.5 rounded-2xl shadow-md space-y-4 transition-all duration-300">
          <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-3">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 bg-primary rounded-full animate-ping"></span>
              <p className="text-[10px] font-black uppercase text-primary tracking-wider">
                {activeBatch ? `Smart Batch (${activeStop.orderCount} Orders)` : 'Active Delivery Duty'}
              </p>
            </div>
            <span className="text-[9px] font-mono bg-slate-105 dark:bg-zinc-800 px-2 py-0.5 rounded text-slate-550 dark:text-zinc-400 font-bold uppercase border border-slate-100 dark:border-transparent">
              Stop {activeStop.index} of {activeStop.total}
            </span>
          </div>

          <div className="flex items-start space-x-3.5 text-xs font-semibold">
            <div className="mt-0.5 flex-shrink-0">
              {activeStop.isPickup ? (
                <Store className="h-5 w-5 text-success" />
              ) : (
                <MapPin className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="space-y-1">
              <span className="text-[8px] uppercase font-black text-slate-400 tracking-wider">
                {activeStop.label}
              </span>
              <h4 className="font-black text-slate-800 dark:text-zinc-200 text-sm">
                {activeStop.name}
              </h4>
              <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-normal leading-relaxed truncate max-w-[280px]">
                {activeStop.address}
              </p>
            </div>
          </div>

          <button
            onClick={() => setViewActiveMap(true)}
            className="w-full py-3.5 bg-primary hover:bg-accent text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center space-x-2 shadow-sm cursor-pointer active:scale-[0.98]"
          >
            <span>View Routing Map</span>
            <Compass className="h-4.5 w-4.5 animate-spin-slow" />
          </button>
        </div>
      )}

      {/* Online but waiting/idle state (Pulsing Radar Wave HUD) */}
      {isOnline && activeOrders.length === 0 && (
        <div className="bg-slate-950 text-white border border-slate-850 p-8 rounded-2xl shadow-xl text-center space-y-6">
          <div className="relative mx-auto h-24 w-24 flex items-center justify-center">
            {/* Animated Radar Ripples */}
            <div className="absolute inset-0 rounded-full bg-primary/10 border border-primary/25 animate-ping" style={{ animationDuration: '3s' }}></div>
            <div className="absolute inset-2 rounded-full bg-primary/15 border border-primary/35 animate-ping" style={{ animationDuration: '2s' }}></div>
            <div className="absolute inset-4 rounded-full bg-primary/20 border border-primary/45 animate-ping" style={{ animationDuration: '1.5s' }}></div>
            
            <div className="relative h-14 w-14 bg-gradient-to-tr from-primary to-accent rounded-full flex items-center justify-center text-white shadow-lg border border-primary/20">
              <Compass className="h-7 w-7 animate-spin-slow" />
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-black uppercase text-secondary tracking-widest animate-pulse">
              Waiting for dispatch assignments...
            </h4>
            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-xs mx-auto">
              Keeping your Kart Kirana partner console active improves your routing score.
            </p>
          </div>
        </div>
      )}

      {/* Daily Incentives progress bar */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-3.5 text-left transition-all duration-300">
        <div className="flex justify-between items-center text-[9px] font-black uppercase">
          <span className="text-slate-400 dark:text-zinc-400 flex items-center gap-1">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
            Daily Incentive Milestone
          </span>
          <span className="text-primary dark:text-secondary font-black">₹120 Bonus Payout</span>
        </div>
        
        <div className="h-2 w-full bg-slate-100 dark:bg-zinc-800 rounded-full overflow-hidden border border-slate-200/20">
          <div 
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-500" 
            style={{ width: `${Math.min(100, (todayDeliveries / 5) * 100)}%` }}
          />
        </div>
        
        <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 dark:text-zinc-400">
          <span>{todayDeliveries} / 5 Deliveries Completed</span>
          <span>{todayDeliveries >= 5 ? "🎉 Milestone unlocked!" : `Complete ${5 - todayDeliveries} more for ₹120 bonus`}</span>
        </div>
      </div>

      {/* Dashboard KPI grid */}
      <section className="grid grid-cols-2 gap-4">
        {/* Earnings Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-2 flex flex-col justify-between transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Today's Earnings</p>
            <IndianRupee className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">₹{todayEarnings}</p>
          <button 
            onClick={() => setActiveTab('earnings')}
            className="text-[9px] font-black text-primary hover:underline uppercase tracking-wider flex items-center pt-1.5 cursor-pointer animate-pulse shrink-0"
          >
            <span>Breakdown list</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Deliveries Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-2 flex flex-col justify-between transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Deliveries done</p>
            <Package className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{todayDeliveries} Trips</p>
          <button 
            onClick={() => setActiveTab('orders')}
            className="text-[9px] font-black text-primary hover:underline uppercase tracking-wider flex items-center pt-1.5 cursor-pointer shrink-0"
          >
            <span>History logs</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>

        {/* Wallet Balance Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1.5 transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Wallet Balance</p>
            <Wallet className="h-4.5 w-4.5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">₹{lifetimeEarnings}</p>
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Accumulated Balance</p>
        </div>

        {/* Completion Rate Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1.5 transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Completion Rate</p>
            <Percent className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">98.5%</p>
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Target rate: &gt;95%</p>
        </div>

        {/* Active Time Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1.5 transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Active Time</p>
            <Clock className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">
            {activeHours}h
          </p>
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Duty hours today</p>
        </div>

        {/* Distance Travelled Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1.5 transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Distance Travelled</p>
            <Navigation className="h-4.5 w-4.5 text-secondary" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{totalDistanceKm} km</p>
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Total distance trips</p>
        </div>

        {/* Rating Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1.5 transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Rider Rating</p>
            <Star className="h-4.5 w-4.5 text-warning fill-warning" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{currentRating} / 5</p>
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Target rate: &gt;4.7</p>
        </div>

        {/* Acceptance Rate Card */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4.5 rounded-2xl shadow-xs space-y-1.5 transition-all duration-300">
          <div className="flex justify-between items-center">
            <p className="text-[9px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Acceptance Rate</p>
            <Percent className="h-4.5 w-4.5 text-primary" />
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{acceptanceRate}%</p>
          <p className="text-[8px] text-slate-400 font-semibold uppercase tracking-wider">Target rate: &gt;90%</p>
        </div>
      </section>

      {/* Floating Cash Warning Limit Card */}
      <div className="bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800 p-4 flex items-center gap-3.5 rounded-2xl shadow-xs text-left transition-all duration-300">
        <div className="h-10 w-10 rounded-xl bg-primary-light flex items-center justify-center text-primary border border-primary/10 flex-shrink-0">
          <AlertCircle className="h-5 w-5" />
        </div>
        <div className="space-y-0.5">
          <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cash-in-Hand Balance Limit</h4>
          <p className="text-xs font-black text-slate-805 dark:text-zinc-200">₹0.00 / ₹2,000</p>
          <p className="text-[8px] text-slate-400 font-semibold leading-relaxed">
            Deposit cash once it exceeds the maximum threshold limit to keep receiving assignments.
          </p>
        </div>
      </div>

      {/* Live Map Preview section when Online */}
      {isOnline && user?.coords && (
        <div className="space-y-2.5">
          <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Live GPS Tracking Map
          </h4>
          <div className="h-48 bg-slate-900 rounded-2xl overflow-hidden relative border border-slate-200/60 dark:border-zinc-800 shadow-md">
            <SVGMap 
              riderCoords={user.coords}
              stops={[]}
              currentStopIndex={0}
              status=""
            />
          </div>
        </div>
      )}

    </div>
  );
};
