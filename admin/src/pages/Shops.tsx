import React, { useState, useEffect } from 'react';
import { useAdmin } from '../context/AdminContext';
import { adminService } from '../services/adminService';
import { Store, ToggleLeft, ToggleRight, Plus, MapPin } from 'lucide-react';

export default function Shops() {
  const { shops, updateShopStatus, createNewShop, approveShopAndMerchant } = useAdmin();
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'directory' | 'finances'>('directory');
  const [finances, setFinances] = useState<any[]>([]);
  const [loadingFinances, setLoadingFinances] = useState(false);

  const fetchFinances = async () => {
    try {
      setLoadingFinances(true);
      const data = await adminService.getShopsFinancials();
      setFinances(data);
    } catch (err) {
      console.error('Failed to load shop finances:', err);
    } finally {
      setLoadingFinances(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'finances') {
      fetchFinances();
    }
  }, [activeTab]);

  // New shop fields
  const [shopId, setShopId] = useState('');
  const [name, setName] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [address, setAddress] = useState('');
  const [deliveryTime, setDeliveryTime] = useState(15);
  const [deliveryFee, setDeliveryFee] = useState(20);

  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopId || !name || !ownerId || !address) return;
    try {
      await createNewShop({
        id: shopId,
        name,
        ownerId,
        address,
        deliveryTime,
        deliveryFee,
        status: 'open'
      });
      setShowAddModal(false);
      // Reset
      setShopId('');
      setName('');
      setOwnerId('');
      setAddress('');
    } catch (err) {
      alert("Failed creating shop.");
    }
  };

  return (
    <div className="space-y-6 text-left">
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            🏪 Merchant Stores
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
            Registered Store Directory & Status Control
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-2xl shadow-md text-xs font-black uppercase tracking-wider cursor-pointer transition-colors"
        >
          <Plus className="h-4 w-4" /> Add New Shop
        </button>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'directory' 
              ? 'border-b-2 border-emerald-500 text-slate-950 dark:text-white' 
              : 'text-slate-450 hover:text-slate-750 dark:hover:text-zinc-300'
          }`}
        >
          🏪 Store Directory
        </button>
        <button
          onClick={() => setActiveTab('finances')}
          className={`pb-3 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer ${
            activeTab === 'finances' 
              ? 'border-b-2 border-emerald-500 text-slate-950 dark:text-white' 
              : 'text-slate-450 hover:text-slate-750 dark:hover:text-zinc-300'
          }`}
        >
          📊 Financial Command Center
        </button>
      </div>

      {activeTab === 'directory' ? (
        /* Grid of Shops */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shops.map((shop) => (
            <div 
              key={shop.id}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] overflow-hidden shadow-xs text-xs flex flex-col justify-between"
            >
              {/* Cover image or fallback */}
              <div className="h-28 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border-b border-slate-50 dark:border-slate-850 flex items-center justify-center relative">
                <Store className="h-10 w-10 text-emerald-500/60" />
                <span className="absolute bottom-3 left-4 px-2 py-0.5 rounded-lg bg-slate-900/80 backdrop-blur-md text-[9px] font-black text-white uppercase tracking-wider">
                  ID: {shop.id}
                </span>
              </div>

              {/* Shop Details */}
              <div className="p-5 flex-1 space-y-4">
                <div>
                  <h3 className="text-base font-black text-slate-850 dark:text-white truncate">
                    {shop.name}
                  </h3>
                  <span className="text-[10px] text-slate-450 font-bold block mt-0.5">
                    Owner UID: <span className="font-extrabold text-indigo-500">{shop.ownerId}</span>
                  </span>
                </div>

                <div className="space-y-1.5 text-slate-500 dark:text-slate-400 font-semibold leading-relaxed">
                  <div className="flex items-start gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="truncate">{shop.address}</span>
                  </div>
                  <div>
                    Products: <span className="text-slate-800 dark:text-white font-extrabold">{shop.productsCount || 0}</span>
                  </div>
                  <div>
                    Delivery: <span className="text-slate-800 dark:text-white font-extrabold">{shop.deliveryTime || 15} mins • ₹{shop.deliveryFee || 20} fee</span>
                  </div>
                </div>

                {/* Approval & Status control */}
                <div className="pt-3 border-t border-slate-50 dark:border-slate-800/40 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-800 dark:text-slate-200">
                      Access & Approval
                    </span>
                    {shop.verificationStep === 'approved' || shop.verificationStep === 'live' ? (
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold rounded-lg text-[9px] uppercase tracking-wider">
                        ✓ Approved
                      </span>
                    ) : (
                      <button
                        onClick={() => approveShopAndMerchant(shop.id, shop.ownerId)}
                        className="px-3 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition cursor-pointer"
                      >
                        ⚡ Grant Access
                      </button>
                    )}
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="font-black text-slate-800 dark:text-slate-200">
                      Shop Open Status
                    </span>
                    <button
                      onClick={() => updateShopStatus(shop.id, shop.status === 'open' ? 'closed' : 'open')}
                      className={`flex items-center gap-1 cursor-pointer transition-colors ${
                        shop.status === 'open' ? 'text-emerald-500' : 'text-slate-400'
                      }`}
                      title="Toggle Shop Status"
                    >
                      {shop.status === 'open' ? (
                        <ToggleRight className="h-8 w-8" />
                      ) : (
                        <ToggleLeft className="h-8 w-8" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        /* Financial Dashboard Command Center Table view */
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-slate-805 dark:text-white text-sm">📊 Centralized Merchant Financial Ledger</h3>
            <button
              onClick={fetchFinances}
              className="text-[10px] font-black text-indigo-500 uppercase tracking-wider hover:underline"
            >
              🔄 Refresh Calculations
            </button>
          </div>

          {loadingFinances ? (
            <div className="text-center py-20 text-slate-450 font-bold uppercase tracking-widest animate-pulse text-xs">
              Calculating Shop Performance...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[11px] font-semibold">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-855 text-slate-400 font-black text-[9px] uppercase tracking-wider border-b border-slate-100 dark:border-slate-800/40">
                    <th className="px-5 py-3 min-w-[150px]">Store Details</th>
                    <th className="px-4 py-3 text-center">Orders (Tot/Comp/Canc)</th>
                    <th className="px-4 py-3 text-right">Gross Sales</th>
                    <th className="px-4 py-3 text-right">Commission</th>
                    <th className="px-4 py-3 text-right">Delivery Charges</th>
                    <th className="px-4 py-3 text-right">Refunds</th>
                    <th className="px-4 py-3 text-right">Discounts</th>
                    <th className="px-4 py-3 text-right">Net Earnings</th>
                    <th className="px-4 py-3 text-right">Payout Status</th>
                    <th className="px-4 py-3 text-right">AOV</th>
                    <th className="px-4 py-3 text-right min-w-[140px]">Revenues (Today/Week/Month)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40 text-slate-700 dark:text-zinc-350">
                  {finances.map((fin) => {
                    const shopName = shops.find(s => s.id === fin.shopId)?.name || 'Unknown Store';
                    return (
                      <tr key={fin.shopId} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/20 transition-colors">
                        <td className="px-5 py-4 font-extrabold text-slate-900 dark:text-white">
                          <div className="truncate font-black">{shopName}</div>
                          <div className="text-[9px] font-bold text-slate-400 select-all font-mono mt-0.5">ID: {fin.shopId}</div>
                        </td>
                        <td className="px-4 py-4 text-center font-extrabold text-slate-800 dark:text-white whitespace-nowrap">
                          {fin.totalOrders} / <span className="text-emerald-500">{fin.completedOrders}</span> / <span className="text-red-550">{fin.cancelledOrders}</span>
                        </td>
                        <td className="px-4 py-4 text-right font-extrabold text-slate-800 dark:text-white whitespace-nowrap">₹{fin.grossSales}</td>
                        <td className="px-4 py-4 text-right text-amber-500 whitespace-nowrap">₹{fin.platformCommission}</td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">₹{fin.deliveryCharges}</td>
                        <td className="px-4 py-4 text-right text-red-500 whitespace-nowrap">₹{fin.refunds}</td>
                        <td className="px-4 py-4 text-right text-slate-400 whitespace-nowrap">₹{fin.discounts}</td>
                        <td className="px-4 py-4 text-right font-black text-emerald-550 whitespace-nowrap">₹{fin.netEarnings}</td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <div className="text-amber-550 font-extrabold">Pending: ₹{fin.pendingPayout}</div>
                          <div className="text-emerald-550 font-extrabold">Paid: ₹{fin.paidOut}</div>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">₹{fin.averageOrderValue}</td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <div>Today: ₹{fin.revenueToday}</div>
                          <div>This Week: ₹{fin.revenueThisWeek}</div>
                          <div>This Month: ₹{fin.revenueThisMonth}</div>
                        </td>
                      </tr>
                    );
                  })}
                  {finances.length === 0 && (
                    <tr>
                      <td colSpan={11} className="px-6 py-12 text-center text-slate-400 font-semibold italic">
                        No financial statistics logged. Check order history.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal Add Shop */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-w-md w-full rounded-[32px] p-6 space-y-6 text-slate-800 dark:text-white">
            <div>
              <h3 className="text-lg font-black">Register New Merchant Shop</h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mt-0.5">
                Set up Firestore Shop Profile
              </p>
            </div>

            <form onSubmit={handleCreateShop} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Shop ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="shop-101"
                    value={shopId}
                    onChange={(e) => setShopId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Owner User UID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="fXy3k..."
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Fresh Mart Express"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                  Address
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sector 15 Main Market, Noida"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Delivery Mins
                  </label>
                  <input
                    type="number"
                    value={deliveryTime}
                    onChange={(e) => setDeliveryTime(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none font-bold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">
                    Delivery Fee (₹)
                  </label>
                  <input
                    type="number"
                    value={deliveryFee}
                    onChange={(e) => setDeliveryFee(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs focus:outline-none font-bold"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black py-3 rounded-xl cursor-pointer text-xs uppercase tracking-wider text-center"
                >
                  Create Store
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 font-bold rounded-xl cursor-pointer text-xs"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
