import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Clock3, PackageOpen, Pencil } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Order, Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useData';
import { Button } from '../components/ui/Button';
import { PreorderModal } from '../components/PreorderModal';
import { PreorderSchedule } from '../utils/preorder';

const EDITABLE_STATUSES = ['upcoming', 'PLACED', 'ORDER_PLACED'];

export const PreOrders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orders = useOrders(user?.uid);
  const [preorderItems, setPreorderItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'scheduled' | 'catalogue'>('scheduled');
  const [editing, setEditing] = useState<Order | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    dbService.getProducts()
      .then(products => setPreorderItems(products.filter(product => product.isPreorder)))
      .catch(error => console.error('Unable to load preorder catalogue:', error))
      .finally(() => setLoading(false));
  }, []);

  const scheduled = useMemo(() => orders
    .filter(order => Boolean(order.preorderDate || order.preorderSlot || order.items.some(item => item.isPreorder)))
    .filter(order => !['cancelled', 'SHOP_REJECTED', 'DELIVERED', 'COMPLETED'].includes(order.status))
    .sort((first, second) => `${first.preorderDate || first.createdAt}${first.preorderSlot || ''}`.localeCompare(`${second.preorderDate || second.createdAt}${second.preorderSlot || ''}`)), [orders]);

  const saveSchedule = async (schedule: PreorderSchedule) => {
    if (!editing) return;
    setSaving(true);
    try {
      await dbService.updateScheduledOrder(editing.id, {
        preorderDate: schedule.date,
        preorderSlot: schedule.slot,
        preorderTime: schedule.time,
      });
      setEditing(null);
    } catch (error) {
      console.error('Unable to update scheduled order:', error);
      alert('We could not update this delivery slot. Please try again.');
      throw error;
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-page w-full max-w-xl mx-auto px-4 pb-24 text-left">
      <div className="app-page-header sticky top-0 z-30 -mx-4 px-4 py-3.5 flex items-center gap-3">
        <button onClick={() => navigate(-1)} aria-label="Go back" className="app-icon-button">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-lg font-black text-slate-900 dark:text-white">Pre-orders</h1>
          <p className="text-[11px] font-semibold text-slate-500">Plan a convenient delivery window</p>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-2 rounded-2xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900">
        {([['scheduled', 'Upcoming'], ['catalogue', 'Browse items']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`min-h-10 rounded-xl px-2 text-[11px] font-black transition ${tab === id ? 'bg-[#0B74E8] text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>
            {label}
          </button>
        ))}
      </div>

      {tab === 'scheduled' && (
        <div className="space-y-3">
          {scheduled.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-200 py-14 text-center dark:border-slate-800">
              <CalendarClock className="mx-auto mb-3 h-10 w-10 text-[#0B74E8]" />
              <h2 className="text-sm font-black text-slate-700 dark:text-slate-200">No scheduled deliveries</h2>
              <p className="mx-auto mt-1 max-w-xs text-xs font-semibold text-slate-400">Reserve eligible items and choose a future delivery slot at checkout.</p>
              <Button onClick={() => setTab('catalogue')} className="mt-5 text-xs">Browse preorder items</Button>
            </div>
          ) : scheduled.map(order => {
            const editable = EDITABLE_STATUSES.includes(order.status);
            return (
              <article key={order.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100">{order.shopName}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-[#0B74E8]">Order #{order.id.slice(-6)} · {order.status.replace(/_/g, ' ')}</p>
                  </div>
                  <CalendarClock className="h-5 w-5 text-[#0B74E8]" />
                </div>
                <div className="mt-4 flex items-center gap-2 rounded-2xl bg-blue-50 p-3 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200">
                  <Clock3 className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-black">{order.preorderDate || 'Date to be confirmed'} · {order.preorderSlot || 'Slot to be confirmed'}{order.preorderTime ? ` · ${order.preorderTime}` : ''}</span>
                </div>
                <p className="mt-3 text-xs font-semibold text-slate-500">{order.items.reduce((count, item) => count + item.quantity, 0)} item(s) · ₹{order.priceBreakdown.grandTotal}</p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" onClick={() => navigate(`/orders/track/${order.id}`)} className="flex-1 py-2 text-[10px]">Track order</Button>
                  {editable && <Button onClick={() => setEditing(order)} className="flex-1 py-2 text-[10px]"><Pencil className="mr-1 h-3 w-3" />Edit slot</Button>}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {tab === 'catalogue' && (loading ? (
        <div className="grid grid-cols-2 gap-4"><div className="h-48 shimmer rounded-3xl" /><div className="h-48 shimmer rounded-3xl" /></div>
      ) : preorderItems.length ? (
        <div className="grid grid-cols-2 gap-4">{preorderItems.map(product => <ProductCard key={product.id} product={product} />)}</div>
      ) : (
        <div className="py-14 text-center"><PackageOpen className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-xs font-bold text-slate-500">There are no items available to schedule right now.</p></div>
      ))}

      <PreorderModal
        isOpen={editing !== null}
        onClose={() => !saving && setEditing(null)}
        onConfirm={saveSchedule}
        initialDate={editing?.preorderDate}
        initialSlot={editing?.preorderSlot}
        initialTime={editing?.preorderTime}
        confirmLabel="Update delivery slot"
        isSaving={saving}
      />
    </div>
  );
};
