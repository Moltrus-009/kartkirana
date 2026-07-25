import { useAdmin } from '../context/AdminContext';
import { useState, useEffect } from 'react';
import { adminService } from '../services/adminService';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Clock, 
  Users, 
  Store, 
  Rss, 
  Wallet, 
  Activity, 
  MessageSquare, 
  FileText, 
  Sparkles
} from 'lucide-react';

export default function OperationsCenter() {
  const { users, shops, products, orders, riders } = useAdmin();
  const [health, setHealth] = useState<any>(null);
  const [fraudCount, setFraudCount] = useState(0);

  useEffect(() => {
    async function loadStats() {
      try {
        const hData = await adminService.getSystemHealth();
        setHealth(hData);
        const fData = await adminService.getFraudEvents();
        setFraudCount(fData.length);
      } catch (err) {
        console.warn('Failed loading system health metrics:', err);
      }
    }
    loadStats();
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Compute Live Metrics
  const pendingOrders = orders.filter(o => o.status === 'confirmed' || o.status === 'PLACED');
  const activeOrders = orders.filter(o => ['accepted', 'preparing', 'ready_for_pickup', 'rider_assigned', 'rider_picked_up', 'out_for_delivery'].includes(o.status));
  const shopsAwaitingApproval = shops.filter(s => s.verificationStep !== 'approved' && s.verificationStep !== 'live');
  const ridersAwaitingApproval = riders.filter(r => r.verificationStatus !== 'approved');
  const onlineRiders = riders.filter(r => r.status === 'online' || r.status === 'busy' || r.status === 'idle');
  const lowStockProducts = products.filter(p => p.stock <= 5);

  // Delayed deliveries count (> 20 mins since placement & not finished)
  const delayedOrders = orders.filter(o => {
    if (['delivered', 'cancelled', 'returned', 'COMPLETED', 'DELIVERED'].includes(o.status)) return false;
    const elapsed = Date.now() - new Date(o.createdAt).getTime();
    return elapsed > 20 * 60 * 1000;
  });

  const failedPayments = orders.filter(o => o.paymentStatus === 'failed');

  const revenueToday = orders
    .filter(o => {
      const isDelivered = ['delivered', 'COMPLETED', 'DELIVERED'].includes(o.status);
      const isToday = new Date(o.createdAt).toDateString() === new Date().toDateString();
      return isDelivered && isToday;
    })
    .reduce((sum, o) => sum + (o.total || 0), 0);

  return (
    <div className="space-y-6 text-left">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 rounded-[32px] text-slate-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-lg relative overflow-hidden">
        <div className="space-y-1.5 z-10">
          <h1 className="text-xl md:text-2xl font-black tracking-tight text-white flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" /> Operations Command Center
          </h1>
          <p className="text-xs text-emerald-100 font-bold max-w-xl">
            Hyperlocal dashboard monitor mapping core dispatch networks, vendor checklists, support requests, and fraud scanners.
          </p>
        </div>
        <div className="z-10 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/20 text-white">
          <div className="text-[9px] font-black uppercase tracking-widest opacity-80">Today's Revenue</div>
          <div className="text-xl font-black">₹{revenueToday.toLocaleString()}</div>
        </div>
      </div>

      {/* Grid widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Orders block */}
        <Link to="/operations" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl hover:border-emerald-500/30 transition shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Order Dispatch</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500"><Clock className="h-4 w-4" /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{pendingOrders.length} Waiting</h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              Active in transit: {activeOrders.length} • Delayed: <span className="text-red-500 font-extrabold">{delayedOrders.length}</span>
            </span>
          </div>
        </Link>

        {/* Shops verification */}
        <Link to="/shops" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl hover:border-emerald-500/30 transition shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Merchant Onboarding</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500"><Store className="h-4 w-4" /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{shopsAwaitingApproval.length} Pending</h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              Total shops registered: {shops.length}
            </span>
          </div>
        </Link>

        {/* Riders Block */}
        <Link to="/riders" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl hover:border-emerald-500/30 transition shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Couriers</span>
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-500"><Users className="h-4 w-4" /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{onlineRiders.length} Online</h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              KYC Awaiting check: <span className="text-amber-500 font-extrabold">{ridersAwaitingApproval.length}</span>
            </span>
          </div>
        </Link>

        {/* Risk Alerts */}
        <Link to="/fraud" className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl hover:border-red-500/30 transition shadow-xs flex flex-col justify-between h-36">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Fraud Monitoring</span>
            <div className="p-2 rounded-xl bg-red-500/10 text-red-500"><AlertTriangle className="h-4 w-4" /></div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-red-500">{fraudCount} Events</h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              Failed payments: {failedPayments.length}
            </span>
          </div>
        </Link>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Quick Actions Control Tower */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Active alerts panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
            <h3 className="font-black text-slate-850 dark:text-white text-sm">🚨 Operations Hot Alerts</h3>
            <div className="space-y-3">
              {delayedOrders.map(order => (
                <div key={order.id} className="p-3.5 bg-red-500/5 border border-red-500/15 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-red-500">Delayed Order Triggered</span>
                    <p className="text-[10px] text-slate-450 mt-0.5">Order {order.id.slice(-6).toUpperCase()} placed with {order.shopName} exceeds standard 20min delivery window.</p>
                  </div>
                  <Link to="/operations" className="px-3.5 py-1.5 bg-red-500/10 text-red-500 rounded-xl font-black uppercase tracking-wider text-[10px] hover:bg-red-500 hover:text-white transition">Dispatch</Link>
                </div>
              ))}

              {lowStockProducts.slice(0, 3).map(prod => (
                <div key={prod.id} className="p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-amber-600 dark:text-amber-500">Low Stock Registry Alert</span>
                    <p className="text-[10px] text-slate-450 mt-0.5">Item {prod.name} at {prod.shopName} has only {prod.stock} units remaining.</p>
                  </div>
                  <Link to="/inventory-health" className="px-3.5 py-1.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl font-black uppercase tracking-wider text-[10px] hover:bg-amber-500 hover:text-slate-950 transition">Restock</Link>
                </div>
              ))}

              {delayedOrders.length === 0 && lowStockProducts.length === 0 && (
                <div className="text-center py-8 text-slate-400 font-semibold text-xs">
                  All systems operating normally. No active warnings flagged.
                </div>
              )}
            </div>
          </div>

          {/* System Latency Diagnostics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
            <h3 className="font-black text-slate-850 dark:text-white text-sm">🔌 Platform Telemetry Diagnostics</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Server Status</span>
                <span className="font-black text-emerald-500 text-xs flex items-center justify-center gap-1">
                  <Activity className="h-3.5 w-3.5 animate-pulse" /> Connected
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Database Sync</span>
                <span className="font-black text-emerald-500 text-xs flex items-center justify-center gap-1">
                  <Rss className="h-3.5 w-3.5 animate-pulse" /> Realtime
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Mem load</span>
                <span className="font-black text-slate-800 dark:text-white text-xs">
                  {health ? `${health.memory?.usagePercentage.toFixed(1)}%` : '--'}
                </span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">API Uptime</span>
                <span className="font-black text-slate-800 dark:text-white text-xs">
                  {health ? `${(health.api_uptime / 3600).toFixed(1)} hrs` : '--'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Right side widgets */}
        <div className="space-y-6">
          
          {/* Quick Stats list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
            <h3 className="font-black text-slate-850 dark:text-white text-sm">📊 Platform Ledger</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 dark:border-slate-800/40 pb-2.5">
                <span className="text-slate-500">Registered Users</span>
                <span className="text-slate-855 dark:text-white font-black">{users.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 dark:border-slate-800/40 pb-2.5">
                <span className="text-slate-500">Merchants Stores</span>
                <span className="text-slate-855 dark:text-white font-black">{shops.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 dark:border-slate-800/40 pb-2.5">
                <span className="text-slate-500">Delivery Riders</span>
                <span className="text-slate-855 dark:text-white font-black">{riders.length}</span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold pb-1">
                <span className="text-slate-500">Active Order In Transit</span>
                <span className="text-emerald-500 font-black">{activeOrders.length}</span>
              </div>
            </div>
          </div>

          {/* Quick link actions */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-3.5">
            <h3 className="font-black text-slate-850 dark:text-white text-sm">🛠️ System Control</h3>
            <div className="grid grid-cols-2 gap-2 text-[10px] font-black uppercase tracking-wider">
              <Link to="/settings" className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-zinc-350 hover:bg-emerald-500/10 hover:text-emerald-500 transition rounded-2xl flex items-center justify-center gap-1.5"><Wallet className="h-3.5 w-3.5" /> Flags</Link>
              <Link to="/logs" className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-zinc-350 hover:bg-emerald-500/10 hover:text-emerald-500 transition rounded-2xl flex items-center justify-center gap-1.5"><FileText className="h-3.5 w-3.5" /> Audits</Link>
              <Link to="/complaints" className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-zinc-350 hover:bg-emerald-500/10 hover:text-emerald-500 transition rounded-2xl flex items-center justify-center gap-1.5"><MessageSquare className="h-3.5 w-3.5" /> Helpdesk</Link>
              <Link to="/system-health" className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-zinc-350 hover:bg-emerald-500/10 hover:text-emerald-500 transition rounded-2xl flex items-center justify-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Latencies</Link>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
