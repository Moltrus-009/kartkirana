import { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, deleteDoc, doc, query, runTransaction, getDocs, where } from 'firebase/firestore';
import { Ticket, Plus, Trash2, X, Calendar, ShoppingBag } from 'lucide-react';

interface Coupon {
  id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  minOrderValue: number;
  validUntil: string;
  active: boolean;
  userUsageLimit?: number;
  usedCount?: number;
}

export default function Coupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Form Fields
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState(10);
  const [minPurchase, setMinPurchase] = useState(150);
  const [expiryDate, setExpiryDate] = useState('');

  // 1. Live Sync listener for Coupons
  useEffect(() => {
    if (!db) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'coupons'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
      setCoupons(list);
      setLoading(false);
    }, (err) => {
      console.error('[Admin Coupons] Sync error:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // 2. Submit handler to create coupon
  const handleAddCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || value <= 0 || minPurchase < 0 || !expiryDate) {
      setError('Please fill in all required fields correctly.');
      return;
    }

    try {
      const normalizedCode = code.trim().toUpperCase();
      const duplicateCode = await getDocs(query(collection(db!, 'coupons'), where('code', '==', normalizedCode)));
      if (!duplicateCode.empty) {
        throw new Error(`Coupon code '${normalizedCode}' already exists.`);
      }
      const docData = {
        code: normalizedCode,
        // Canonical fields are read by the server, customer app, and reports.
        type: discountType,
        discountType,
        value,
        discountValue: value,
        minOrderValue: minPurchase,
        validUntil: `${expiryDate}T23:59:59.999`,
        status: 'active',
        active: true,
        userUsageLimit: 1,
        usageLimit: 0,
        usedCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await runTransaction(db!, async (transaction) => {
        const couponRef = doc(db!, 'coupons', normalizedCode);
        const existing = await transaction.get(couponRef);
        if (existing.exists()) throw new Error(`Coupon code '${normalizedCode}' already exists.`);
        transaction.set(couponRef, docData);
      });
      setIsFormOpen(false);
      // Reset form
      setCode('');
      setDiscountType('percentage');
      setValue(10);
      setMinPurchase(150);
      setExpiryDate('');
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to add coupon');
    }
  };

  // 3. Delete Coupon
  const handleDeleteCoupon = async (id: string) => {
    if (!confirm('Are you sure you want to delete this coupon?')) return;
    try {
      await deleteDoc(doc(db!, 'coupons', id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete coupon');
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Header controls */}
      <div className="flex justify-between items-center text-left">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-white">
            🎟️ Coupon Manager
          </h1>
          <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
            Manage discount campaigns and promos
          </p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs py-2.5 px-4 rounded-2xl flex items-center gap-1.5 cursor-pointer shadow-xs transition duration-200 uppercase tracking-wider"
        >
          <Plus className="h-4 w-4" /> Add Coupon
        </button>
      </div>

      {/* Coupons Table/Grid list */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">
          Syncing Campaigns...
        </div>
      ) : coupons.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[32px] p-6 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Ticket className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
          No promotional coupons are currently active.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => (
            <div 
              key={coupon.id}
              className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-850 rounded-[28px] shadow-xs space-y-4 text-left relative overflow-hidden"
            >
              {/* Badge */}
              <div className="absolute top-0 right-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 font-black text-[9px] px-3.5 py-1.5 rounded-bl-2xl uppercase tracking-wider">
                {coupon.discountType === 'percentage' ? `${coupon.value}% Off` : `₹${coupon.value} Off`}
              </div>

              <div className="flex items-center gap-3">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl">
                  <Ticket className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-white tracking-wider font-mono">
                    {coupon.code}
                  </h4>
                  <span className="text-[9px] text-slate-400 font-black uppercase tracking-wider block mt-0.5">
                    Promo Campaign
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5 border-t border-slate-50 dark:border-slate-800/40 pt-3.5 text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <ShoppingBag className="h-3.5 w-3.5 text-slate-400" />
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Min Bill</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300">₹{coupon.minOrderValue}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <div>
                    <span className="text-[8px] text-slate-400 font-bold uppercase block">Expiry</span>
                    <span className="font-bold text-slate-700 dark:text-zinc-300">{new Date(coupon.validUntil).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex justify-end pt-2 border-t border-slate-50 dark:border-slate-800/40">
                <button
                  onClick={() => handleDeleteCoupon(coupon.id)}
                  className="p-2 border border-red-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition cursor-pointer flex items-center justify-center"
                  title="Remove coupon Campaign"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE COUPON MODAL POPUP */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-50 dark:border-slate-800/40 pb-3">
              <h3 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider">
                🎟️ Create Promo Coupon
              </h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-650 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-[10px] font-black">
                {error}
              </div>
            )}

            <form onSubmit={handleAddCoupon} className="space-y-4 text-xs text-left">
              {/* Promo Code */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Coupon Code *</label>
                <input
                  type="text"
                  placeholder="e.g. MONSOON20"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none uppercase font-mono tracking-wider"
                />
              </div>

              {/* Discount Type */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Discount Calculation Type *</label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none"
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed">Flat Amount (₹)</option>
                </select>
              </div>

              {/* Discount Value and Min purchase */}
              <div className="grid grid-cols-2 gap-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase tracking-wider block">Discount Value *</label>
                  <input
                    type="number"
                    value={value || ''}
                    onChange={(e) => setValue(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none font-mono"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-455 uppercase tracking-wider block">Min Purchase (₹) *</label>
                  <input
                    type="number"
                    value={minPurchase || ''}
                    onChange={(e) => setMinPurchase(parseInt(e.target.value) || 0)}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none font-mono"
                  />
                </div>
              </div>

              {/* Expiry Date */}
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Campaign Expiry Date *</label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-slate-800 rounded-xl font-bold outline-none font-mono"
                />
              </div>

              {/* Save Coupon */}
              <div className="pt-2 border-t border-slate-50 dark:border-slate-800/40">
                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-black py-3 rounded-2xl cursor-pointer text-center uppercase tracking-wider text-xs shadow-xs"
                >
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
