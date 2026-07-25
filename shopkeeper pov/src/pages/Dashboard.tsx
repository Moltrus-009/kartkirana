import { useState, useEffect } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { useDiagnostics } from '../core/diagnostics/diagnostics';
import { useLanguage } from '../context/LanguageContext';
import { 
  ShoppingBag, 
  ChevronRight, 
  Store, 
  Plus,
  ClipboardList,
  RefreshCw,
  DollarSign,
  TrendingUp,
  Clock,
  Check,
  PackageCheck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SalesLineChart, OrdersDonutChart } from '../components/shared/Charts';

export default function Dashboard() {
  const { user, products, orders, shop, updateShop, adjustStockQuantity } = useAppStore();
  const navigate = useNavigate();
  const trackComponent = useDiagnostics(state => state.trackComponent);
  useEffect(() => {
    trackComponent('Dashboard', 'mount');
  }, [trackComponent]);
  const { t } = useLanguage();

  // 1. Time-based dynamic greeting and ticking clock
  const [greeting, setGreeting] = useState('');
  const [currentTime, setCurrentTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = now.getHours();
      let greetStr = 'greeting_evening';
      if (hrs < 12) greetStr = 'greeting_morning';
      else if (hrs < 17) greetStr = 'greeting_afternoon';
      
      setGreeting(greetStr);
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Calculations
  const today = new Date().toISOString().split('T')[0];
  
  // Today's orders
  const todayOrders = orders.filter(o => {
    const created = o.createdAt;
    const dateStr = typeof created === 'string'
      ? created
      : (created && (created as any).seconds
          ? new Date((created as any).seconds * 1000).toISOString()
          : '');
    return dateStr.startsWith(today);
  });
  
  // Today's Earnings
  const todaySales = todayOrders
    .filter(o => o.status !== 'cancelled' && (o.status as any) !== 'returned' && (o.status as any) !== 'refunded' && o.status !== 'SHOP_REJECTED')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  // Status summaries
  const pendingOrders = orders.filter(o => 
    o.status === 'PLACED' || 
    o.status === 'SHOP_ACCEPTED' || 
    o.status === 'SEARCHING_RIDER' || 
    o.status === 'RIDER_ASSIGNED' || 
    o.status === 'ARRIVED_AT_SHOP' || 
    o.status === 'PICKED_UP' || 
    o.status === 'OUT_FOR_DELIVERY' ||
    o.status === 'confirmed' as any || 
    o.status === 'accepted' as any || 
    o.status === 'preparing' as any || 
    o.status === 'ready_for_pickup' as any
  ).length;

  // Stock calculations
  const totalProducts = products.length;
  const lowStockProds = products.filter(p => p.status === 'active' && p.stock > 0 && p.stock <= (p.minStockAlert || 5));
  const outOfStockProds = products.filter(p => p.stock === 0);
  const lowStockCount = lowStockProds.length + outOfStockProds.length;

  // Toggle store status
  const toggleStoreStatus = async () => {
    if (!shop) return;
    const nextStatus = shop.status === 'open' ? 'closed' : 'open';
    await updateShop({ status: nextStatus });
  };

  // Recent 3 orders
  const recentOrders = orders.slice(0, 3);

  // Aggregate Sales trend (Last 7 Days)
  const getLast7DaysSales = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const data = [];
    
    for (let i = 6; i >= 0; i--) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - i);
      const dateStr = targetDate.toISOString().split('T')[0];
      const dayLabel = i === 0 ? 'Today' : days[targetDate.getDay()];
      
      const salesSum = orders
        .filter(o => {
          const created = o.createdAt;
          const targetStr = typeof created === 'string'
            ? created
            : (created && (created as any).seconds
                ? new Date((created as any).seconds * 1000).toISOString()
                : '');
          return targetStr.startsWith(dateStr) && o.status !== 'cancelled' && (o.status as any) !== 'returned' && o.status !== 'SHOP_REJECTED';
        })
        .reduce((sum, o) => sum + (o.total || 0), 0);
        
      data.push({ label: dayLabel, value: salesSum });
    }
    return data;
  };

  // Aggregate order status distributions
  const getOrdersStatusData = () => {
    const statuses = ['delivered', 'preparing', 'accepted', 'cancelled'];
    const data = statuses.map(status => {
      const count = orders.filter((o: any) => o.status.toLowerCase() === status.toLowerCase()).length;
      return { label: status, value: count };
    });
    return data.filter(d => d.value > 0);
  };

  // State to track local quick restock actions
  const [restockedIds, setRestockedIds] = useState<Record<string, boolean>>({});

  const handleQuickRestock = async (productId: string) => {
    try {
      await adjustStockQuantity(productId, 20, 'manual_adjust', 'Quick Refill from Seller Dashboard');
      setRestockedIds(prev => ({ ...prev, [productId]: true }));
      setTimeout(() => {
        setRestockedIds(prev => ({ ...prev, [productId]: false }));
      }, 2000);
    } catch {
    }
  };

  // Filter top 3 products needing restock
  const lowStockItemsList = [...outOfStockProds, ...lowStockProds].slice(0, 3);

  useEffect(() => {
    trackComponent('Dashboard', 'render');
  });
  return (
    <div className="space-y-6 max-w-lg mx-auto pb-8 text-left text-xs font-semibold">
      
      {/* Top Welcome Header Block */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-450 dark:text-zinc-400 font-extrabold uppercase tracking-wider">
            <Clock className="h-3.5 w-3.5 text-emerald-500 animate-pulse-subtle" />
            <span>{currentTime || 'Loading...'}</span>
          </div>
          <h1 className="text-lg font-black text-slate-800 dark:text-zinc-100 capitalize">
            {t(greeting as any)}, {user?.fullName?.split(' ')[0] || 'Partner'}!
          </h1>
          <p className="text-[10px] text-slate-400 font-bold">
            Store: <span className="font-extrabold text-slate-700 dark:text-zinc-300">{shop?.name || 'Loading Store'}</span>
          </p>
        </div>

        {/* Store Status Toggle */}
        {shop && (
          <button 
            onClick={toggleStoreStatus}
            className={`px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-1.5 cursor-pointer shadow-xs transition duration-200 ${
              shop.status === 'open' 
                ? 'bg-emerald-500 text-white shadow-emerald-500/10' 
                : 'bg-red-500 text-white shadow-red-500/10'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
            {shop.status === 'open' ? t('open') : t('closed')}
          </button>
        )}
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-2 gap-3.5">
        {/* Earnings Card */}
        <div className="bg-gradient-to-tr from-emerald-500 to-emerald-600 p-4.5 rounded-3xl text-white shadow-md shadow-emerald-500/15">
          <DollarSign className="h-5 w-5 opacity-80 mb-2" />
          <span className="text-[9px] font-bold uppercase tracking-widest opacity-85 block">{t('today_sales')}</span>
          <h3 className="text-xl font-black mt-0.5">₹{todaySales.toLocaleString()}</h3>
          {/* Sales progress metric bar */}
          <div className="w-full bg-white/20 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-white h-1 rounded-full" style={{ width: `${Math.min(100, (todaySales / 5000) * 100)}%` }}></div>
          </div>
          <span className="text-[8px] opacity-75 mt-1 block">Daily target: ₹5,000</span>
        </div>

        {/* Today's Orders Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-4.5 rounded-3xl shadow-xs">
          <ShoppingBag className="h-5 w-5 text-emerald-500 mb-2" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-extrabold">{t('today_sales')} ({t('orders')})</span>
          <h3 className="text-xl font-black text-slate-800 dark:text-zinc-150 mt-0.5">{todayOrders.length} {t('orders')}</h3>
          <span className="text-[9px] text-slate-400 font-semibold mt-2.5 block">⚡ Fast local delivery active</span>
        </div>

        {/* Pending Orders Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-4.5 rounded-3xl shadow-xs">
          <ClipboardList className="h-5 w-5 text-amber-500 mb-2" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-extrabold">{t('active_orders')}</span>
          <h3 className="text-xl font-black text-slate-800 dark:text-zinc-150 mt-0.5">{pendingOrders} {t('orders')}</h3>
          <span className="text-[9px] text-amber-500 font-black mt-2.5 block">Requires action</span>
        </div>

        {/* Products in Stock Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-4.5 rounded-3xl shadow-xs">
          <Store className="h-5 w-5 text-blue-500 mb-2" />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block font-extrabold">{t('products')}</span>
          <h3 className="text-xl font-black text-slate-800 dark:text-zinc-150 mt-0.5">{totalProducts} {t('items')}</h3>
          <span className="text-[9px] text-slate-400 font-semibold mt-2.5 block">Manage in Inventory</span>
        </div>
      </div>

      {/* DYNAMIC SALES LINE CHART */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200">{t('sales_trend')}</h3>
            <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">Sales progress tracker over last 7 days</p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded-lg">
            <TrendingUp className="h-3 w-3" />
            <span>+15% weekly</span>
          </div>
        </div>
        <div className="pt-2">
          <SalesLineChart data={getLast7DaysSales()} height={160} />
        </div>
      </div>

      {/* LOW STOCK QUICK REFILL MODULE */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200">Quick Inventory Refill</h3>
            <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">Replenish low-stock items with one-tap actions</p>
          </div>
          <span className="px-2 py-0.5 bg-red-500/10 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-wider">
            {lowStockCount} Alerts
          </span>
        </div>

        {lowStockItemsList.length === 0 ? (
          <div className="p-4 border border-dashed border-slate-100 dark:border-dark-border rounded-2xl text-center text-slate-400 font-bold text-[10px] flex items-center justify-center gap-1">
            <PackageCheck className="h-4 w-4 text-emerald-500" />
            All inventory catalog stock items are healthy!
          </div>
        ) : (
          <div className="space-y-2">
            {lowStockItemsList.map(item => (
              <div 
                key={item.id}
                className="p-3 bg-slate-50 dark:bg-zinc-900/60 border border-slate-100/50 dark:border-dark-border/40 rounded-2xl flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0 border border-slate-150">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h5 className="font-extrabold text-slate-800 dark:text-zinc-200 truncate text-[11px]">{item.name}</h5>
                    <span className="text-[9px] text-red-500 font-black block">Stock count: {item.stock} left</span>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickRestock(item.id)}
                  disabled={restockedIds[item.id]}
                  className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider transition flex items-center gap-1 cursor-pointer
                    ${restockedIds[item.id] 
                      ? 'bg-emerald-500 text-white' 
                      : 'bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300'}`}
                >
                  {restockedIds[item.id] ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {restockedIds[item.id] ? 'Refilled' : '+20 Stock'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK ROUTE LINKS PANEL */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs space-y-3.5">
        <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400">Quick Access Utilities</h3>
        <div className="grid grid-cols-2 gap-3">
          <button 
            onClick={() => navigate('/products?add=true')}
            className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100/50 dark:border-dark-border/40 rounded-2xl font-black text-left cursor-pointer hover:bg-slate-100 text-xs"
          >
            <Plus className="h-4.5 w-4.5 text-emerald-500 shrink-0" />
            <span>Add Product</span>
          </button>

          <button 
            onClick={() => navigate('/orders')}
            className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100/50 dark:border-dark-border/40 rounded-2xl font-black text-left cursor-pointer hover:bg-slate-100 text-xs"
          >
            <ClipboardList className="h-4.5 w-4.5 text-primary shrink-0" />
            <span>View Orders</span>
          </button>

          <button 
            onClick={() => navigate('/products')}
            className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100/50 dark:border-dark-border/40 rounded-2xl font-black text-left cursor-pointer hover:bg-slate-100 text-xs"
          >
            <RefreshCw className="h-4.5 w-4.5 text-blue-500 shrink-0" />
            <span>Manage Catalog</span>
          </button>

          <button 
            onClick={toggleStoreStatus}
            className="flex items-center gap-2.5 p-3.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100/50 dark:border-dark-border/40 rounded-2xl font-black text-left cursor-pointer hover:bg-slate-100 text-xs"
          >
            <Store className="h-4.5 w-4.5 text-amber-500 shrink-0" />
            <span>{shop?.status === 'open' ? `${t('cancel')} (${t('store_status')})` : `${t('open')} (${t('store_status')})`}</span>
          </button>
        </div>
      </div>

      {/* STATS SECONDARY GRID (DONUT CHART & RECENT ORDERS side-by-side on desktop) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Donut Chart Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200">Orders Status Mix</h3>
            <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">Overview of store order fulfilments</p>
          </div>
          <div className="flex justify-center py-2">
            {getOrdersStatusData().length === 0 ? (
              <div className="text-center py-8 text-slate-400 font-bold text-[10px] uppercase tracking-wider">
                No orders yet
              </div>
            ) : (
              <OrdersDonutChart data={getOrdersStatusData()} />
            )}
          </div>
        </div>

        {/* Recent Orders List Card */}
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-zinc-200">{t('recent_orders')}</h3>
                <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">Top 3 latest customer orders</p>
              </div>
              <button 
                onClick={() => navigate('/orders')}
                className="text-[9px] font-black text-primary uppercase tracking-wider flex items-center gap-0.5 cursor-pointer hover:underline"
              >
                All <ChevronRight className="h-3 w-3" />
              </button>
            </div>

            <div className="space-y-2.5">
              {recentOrders.length === 0 ? (
                <div className="text-center py-8 text-slate-450 font-bold text-[10px]">
                  {t('no_recent_orders')}
                </div>
              ) : (
                recentOrders.map((order) => (
                  <div 
                    key={order.id}
                    onClick={() => navigate('/orders')}
                    className="p-3 bg-slate-50 dark:bg-zinc-900/60 border border-slate-100/50 dark:border-dark-border/40 rounded-2xl flex items-center justify-between gap-3 text-xs cursor-pointer hover:bg-slate-100/60 transition-colors"
                  >
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-slate-800 dark:text-zinc-200 truncate">{order.contact.name}</span>
                        <span className="text-[9px] font-mono text-slate-400">#{order.id.slice(-4)}</span>
                      </div>
                      <p className="text-[9px] text-slate-400 font-bold mt-0.5">
                        {order.items.length} items • {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <span className="font-black text-slate-800 dark:text-zinc-150 block">₹{order.total}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide inline-block ${
                        order.status === 'DELIVERED' || order.status === 'delivered' as any 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' 
                          : order.status === 'cancelled' || order.status === 'SHOP_REJECTED'
                          ? 'bg-red-50 text-red-500 dark:bg-red-950/20' 
                          : 'bg-amber-50 text-amber-600 dark:bg-amber-950/20'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
