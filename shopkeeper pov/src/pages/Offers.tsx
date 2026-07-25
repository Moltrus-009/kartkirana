import { useState } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import type { OfferDocument } from '../core/store/useAppStore';
import { Plus, Ticket, Calendar, Trash2 } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';

export default function Offers() {
  const { offers, addPromoOffer, removePromoOffer } = useAppStore();
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const defaultForm: Omit<OfferDocument, 'id' | 'shopId'> = {
    code: '',
    description: '',
    discountType: 'percentage',
    value: 10,
    minOrder: 100,
    maxDiscount: 50,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 15 * 24 * 3600 * 1000).toISOString().split('T')[0],
    isActive: true
  };
  const [form, setForm] = useState(defaultForm);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || form.value < 0) return;

    await addPromoOffer({
      ...form,
      code: form.code.toUpperCase().replace(/\s+/g, '')
    });

    setForm(defaultForm);
    setIsFormOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this coupon code permanently?')) {
      await removePromoOffer(id);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-zinc-100">Offers & Coupons</h2>
          <p className="text-xs text-slate-400 dark:text-zinc-500 font-bold mt-0.5">Configure discounts, coupons, free deliveries, & scheduled festival campaigns</p>
        </div>

        <button
          onClick={() => setIsFormOpen(true)}
          className="px-4.5 py-2.5 bg-primary text-white text-xs font-black rounded-xl hover:bg-primary-hover shadow-md shadow-primary/10 hover:shadow-lg transition cursor-pointer flex items-center gap-1.5"
        >
          <Plus className="h-4.5 w-4.5" />
          Create Coupon
        </button>
      </div>

      {/* OFFERS DIRECTORY LIST */}
      {offers.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="No Coupons Active"
          description="Create your first promotional discount coupon to attract shoppers."
          actionText="Create Coupon"
          onAction={() => setIsFormOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {offers.map((offer) => {
            const isExpired = new Date(offer.endDate).getTime() < Date.now();
            const active = offer.isActive && !isExpired;

            return (
              <div 
                key={offer.id} 
                className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl shadow-xs text-xs text-left space-y-4 relative overflow-hidden"
              >
                {/* Coupon Dashed Line Border Style */}
                <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-gradient-to-b from-primary to-emerald-500 rounded-l-3xl"></div>

                <div className="pl-3 flex justify-between items-start">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-sm text-slate-800 dark:text-zinc-100 tracking-wider bg-slate-50 dark:bg-zinc-800 px-2 py-0.5 border border-slate-100 rounded">
                        {offer.code}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                        active 
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400' 
                          : 'bg-red-50 text-red-500 dark:bg-red-950/20'
                      }`}>
                        {active ? 'Active' : isExpired ? 'Expired' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold leading-tight pt-1">{offer.description}</p>
                  </div>

                  <button
                    onClick={() => handleDelete(offer.id)}
                    className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                    title="Delete Coupon"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="pl-3 border-t border-slate-50 dark:border-dark-border/40 pt-3 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">Benefit</span>
                    <span className="font-black text-slate-700 dark:text-zinc-200">
                      {offer.discountType === 'percentage' 
                        ? `${offer.value}% Discount` 
                        : offer.discountType === 'flat' 
                        ? `₹${offer.value} Flat Off` 
                        : offer.discountType === 'free_delivery'
                        ? 'Free Delivery'
                        : 'Buy 1 Get 1 (BOGO)'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block">Min Order</span>
                    <span className="font-black text-slate-700 dark:text-zinc-200">₹{offer.minOrder}</span>
                  </div>
                </div>

                <div className="pl-3 flex items-center gap-1.5 text-[9px] text-slate-400 font-bold bg-slate-50 dark:bg-zinc-900/30 p-2 rounded-xl">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Valid: {offer.startDate} to {offer.endDate}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE OFFER MODAL DIALOG */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl w-full max-w-md shadow-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 text-left">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-dark-border mb-5">
              <h3 className="font-black text-sm text-slate-800 dark:text-zinc-100">Create Discount Coupon</h3>
              <button 
                onClick={() => setIsFormOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-extrabold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold text-slate-600">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Coupon Code</label>
                  <input
                    type="text"
                    required
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s+/g, '') })}
                    placeholder="E.g., FESTIVE50"
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono tracking-wider"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Discount Type</label>
                  <select
                    value={form.discountType}
                    onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Cash (₹)</option>
                    <option value="free_delivery">Free Delivery</option>
                    <option value="bogo">Buy 1 Get 1 (BOGO)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Campaign Description</label>
                <input
                  type="text"
                  required
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Get 20% discount on bakery specials..."
                  className="w-full p-2.5 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Value</label>
                  <input
                    type="number"
                    required
                    disabled={form.discountType === 'free_delivery' || form.discountType === 'bogo'}
                    value={form.discountType === 'free_delivery' || form.discountType === 'bogo' ? 0 : form.value}
                    onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Min Order</label>
                  <input
                    type="number"
                    required
                    value={form.minOrder}
                    onChange={(e) => setForm({ ...form, minOrder: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    disabled={form.discountType !== 'percentage'}
                    value={form.discountType !== 'percentage' ? 0 : form.maxDiscount || ''}
                    onChange={(e) => setForm({ ...form, maxDiscount: parseFloat(e.target.value) || undefined })}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    required
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-dark-border">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-100 dark:border-dark-border text-slate-450 font-black rounded-xl uppercase cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-primary text-white font-black rounded-xl uppercase cursor-pointer shadow-md shadow-primary/10"
                >
                  Create Offer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
