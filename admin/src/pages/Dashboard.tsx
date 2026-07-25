import { useAdmin } from '../context/AdminContext';
import { Users, Store, ShoppingCart, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const { users, shops, products, orders, refreshAllData } = useAdmin();

  // Metrics
  const activeOrders = orders.filter(o => !['delivered', 'cancelled', 'returned'].includes(o.status));
  const newOrdersCount = orders.filter(o => o.status === 'confirmed').length;

  const totalRevenue = orders
    .filter(o => o.paymentStatus === 'completed' || o.status === 'delivered')
    .reduce((sum, o) => sum + (o.total || 0), 0);

  const roleCounts = users.reduce((acc, u) => {
    const role = u.role || 'customer';
    acc[role] = (acc[role] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            🛠️ Platform Dashboard
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            Realtime Analytics & Control Room
          </p>
        </div>

        <button
          onClick={refreshAllData}
          className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:text-emerald-500 transition-colors shadow-xs text-xs font-bold cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Refresh Registry
        </button>
      </div>

      {/* Grid Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Total Users
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {users.length}
            </h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              Riders: {roleCounts.rider || 0} • Owners: {roleCounts.owner || 0}
            </span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Active Shops
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
              <Store className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {shops.length}
            </h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              Open: {shops.filter(s => s.status === 'open').length} • Closed: {shops.filter(s => s.status === 'closed').length}
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Realtime Orders
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ShoppingCart className="h-4 w-4" />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              {activeOrders.length}
            </h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              Confirmed Queue: <span className="text-red-500 font-extrabold">{newOrdersCount}</span>
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 p-5 rounded-3xl shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
              Total Revenue
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <span className="font-extrabold text-sm">₹</span>
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-slate-800 dark:text-white">
              ₹{totalRevenue}
            </h3>
            <span className="text-[9px] text-slate-400 font-bold block mt-1">
              Total orders handled: {orders.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Orders List */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-black text-slate-800 dark:text-white text-sm">
                ⚡ Active Order Dispatch Queue
              </h3>
              <p className="text-[9px] text-slate-400 font-semibold">
                Real-time delivery partner status synchronization
              </p>
            </div>
            <Link 
              to="/orders"
              className="text-[10px] font-black text-emerald-500 hover:text-emerald-600 uppercase tracking-widest flex items-center gap-1 cursor-pointer"
            >
              See All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-slate-50 dark:divide-slate-800/40">
            {activeOrders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                No orders are currently in transit.
              </div>
            ) : (
              activeOrders.slice(0, 5).map((order) => (
                <div key={order.id} className="py-3.5 flex justify-between items-center text-xs">
                  <div className="space-y-0.5">
                    <span className="font-extrabold text-slate-800 dark:text-zinc-200">
                      Order: {order.id.slice(-6).toUpperCase()}
                    </span>
                    <div className="text-[10px] text-slate-400 font-bold">
                      {order.shopName} • {order.contact.name}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-black text-slate-700 dark:text-zinc-300">
                      ₹{order.total}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black uppercase tracking-wider">
                      {order.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Database Inventory Summary */}
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-black text-slate-800 dark:text-white text-sm">
              📊 Product Inventory Summary
            </h3>
            <p className="text-[9px] text-slate-400 font-semibold">
              Global catalog stats by shop categories
            </p>
          </div>

          <div className="space-y-4 pt-2">
            
            {/* Metric A */}
            <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 dark:border-slate-800/40 pb-2.5">
              <span className="text-slate-500">Global Products catalog</span>
              <span className="text-slate-800 dark:text-white font-black">{products.length}</span>
            </div>

            {/* Metric B */}
            <div className="flex justify-between items-center text-xs font-bold border-b border-slate-50 dark:border-slate-800/40 pb-2.5">
              <span className="text-slate-500">Low Stock items (&lt; 5)</span>
              <span className="text-amber-500 font-black">
                {products.filter(p => p.stock > 0 && p.stock <= 5).length}
              </span>
            </div>

            {/* Metric C */}
            <div className="flex justify-between items-center text-xs font-bold pb-1">
              <span className="text-slate-500">Out of Stock items</span>
              <span className="text-red-500 font-black">
                {products.filter(p => p.stock === 0).length}
              </span>
            </div>

            {/* Simple visual category breakdown */}
            <div className="pt-2 space-y-2">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">
                Platform Registry Distribution
              </span>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-extrabold text-slate-600 dark:text-slate-400">
                <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl text-center">
                  <div className="text-slate-400">Admins</div>
                  <div className="text-slate-800 dark:text-white font-black text-sm">{roleCounts.admin || 0}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-850 p-2.5 rounded-xl text-center">
                  <div className="text-slate-400">Riders</div>
                  <div className="text-slate-800 dark:text-white font-black text-sm">{roleCounts.rider || 0}</div>
                </div>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
