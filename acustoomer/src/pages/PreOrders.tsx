import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarClock, Clock3, PackageOpen, Pencil } from 'lucide-react';
import { dbService } from '../services/dbService';
import { Order, Product } from '../types';
import { ProductCard } from '../components/product/ProductCard';
import { useAuth } from '../context/AuthContext';
import { useOrders } from '../hooks/useData';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';

const EDITABLE_STATUSES = ['upcoming', 'PLACED', 'ORDER_PLACED'];
const slots = ['08:00 AM - 10:00 AM', '10:00 AM - 12:00 PM', '04:00 PM - 06:00 PM', '06:00 PM - 08:00 PM'];

export const PreOrders: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const orders = useOrders(user?.uid);
  const [preorderItems, setPreorderItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'scheduled' | 'catalogue'>('scheduled');
  const [editing, setEditing] = useState<Order | null>(null);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState(slots[0]);
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

  const openEdit = (order: Order) => {
    setEditing(order);
    setDate(order.preorderDate || new Date().toISOString().slice(0, 10));
    setSlot(order.preorderSlot || slots[0]);
  };

  const saveSchedule = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing || !date) return;
    setSaving(true);
    try {
      await dbService.updateScheduledOrder(editing.id, { preorderDate: date, preorderSlot: slot });
      setEditing(null);
    } catch (error) {
      console.error('Unable to update scheduled order:', error);
      alert('We could not update this delivery slot. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="w-full max-w-xl mx-auto px-4 pb-24 text-left">
    <div className="sticky top-0 z-35 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur py-3.5 flex items-center gap-3 border-b border-slate-100 dark:border-slate-900 mb-4">
      <button onClick={() => navigate(-1)} aria-label="Go back" className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 cursor-pointer">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div><h2 className="text-lg font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">Scheduled orders</h2><p className="text-[10px] font-semibold text-slate-400">Choose a slot that works for you</p></div>
    </div>

    <div className="grid grid-cols-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1 mb-5">
      {([['scheduled', 'Upcoming deliveries'], ['catalogue', 'Schedule an order']] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`rounded-xl px-2 py-2.5 text-[10px] font-black transition ${tab === id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500'}`}>{label}</button>)}
    </div>

    {tab === 'scheduled' && <div className="space-y-3">
      {scheduled.length === 0 ? <div className="py-14 text-center rounded-3xl border border-dashed border-slate-200 dark:border-slate-800"><CalendarClock className="mx-auto h-10 w-10 text-blue-500 mb-3" /><h3 className="text-sm font-black text-slate-700 dark:text-slate-200">No scheduled deliveries</h3><p className="mt-1 text-xs font-semibold text-slate-400">Reserve eligible items and choose a future delivery slot at checkout.</p><Button onClick={() => setTab('catalogue')} className="mt-5 rounded-xl text-xs">Browse preorder items</Button></div> : scheduled.map(order => {
        const editable = EDITABLE_STATUSES.includes(order.status);
        return <article key={order.id} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-black text-slate-800 dark:text-slate-100">{order.shopName}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-blue-600">Order #{order.id.slice(-6)} · {order.status.replace(/_/g, ' ')}</p></div><CalendarClock className="h-5 w-5 text-blue-500" /></div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-blue-50 p-3 text-blue-800 dark:bg-blue-950/30 dark:text-blue-200"><Clock3 className="h-4 w-4 shrink-0" /><span className="text-xs font-black">{order.preorderDate || 'Date to be confirmed'} · {order.preorderSlot || 'Slot to be confirmed'}</span></div>
          <p className="mt-3 text-xs font-semibold text-slate-500">{order.items.reduce((count, item) => count + item.quantity, 0)} item(s) · ₹{order.priceBreakdown.grandTotal}</p>
          <div className="mt-4 flex gap-2"><Button variant="outline" onClick={() => navigate(`/orders/track/${order.id}`)} className="flex-1 rounded-xl py-2 text-[10px] font-black">Track order</Button>{editable && <Button onClick={() => openEdit(order)} className="flex-1 rounded-xl py-2 text-[10px] font-black"><Pencil className="mr-1 h-3 w-3" />Edit slot</Button>}</div>
        </article>;
      })}
    </div>}

    {tab === 'catalogue' && (loading ? <div className="grid grid-cols-2 gap-4"><div className="h-48 shimmer rounded-3xl" /><div className="h-48 shimmer rounded-3xl" /></div> : preorderItems.length ? <div className="grid grid-cols-2 gap-4">{preorderItems.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="py-14 text-center"><PackageOpen className="mx-auto h-10 w-10 text-slate-300" /><p className="mt-3 text-xs font-bold text-slate-500">There are no items available to schedule right now.</p></div>)}

    <Dialog isOpen={editing !== null} onClose={() => setEditing(null)} title="Update delivery slot"><form onSubmit={saveSchedule} className="space-y-4"><p className="text-xs font-semibold text-slate-500">You can change this slot until the shop starts processing your order.</p><label className="block text-xs font-black text-slate-700 dark:text-slate-200">Delivery date<input required type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={event => setDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs font-black text-slate-700 dark:text-slate-200">Delivery slot<select value={slot} onChange={event => setSlot(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm dark:border-slate-700 dark:bg-slate-800">{slots.map(value => <option key={value}>{value}</option>)}</select></label><Button type="submit" fullWidth disabled={saving} className="rounded-xl py-3 text-xs font-black">{saving ? 'Saving…' : 'Save delivery slot'}</Button></form></Dialog>
  </div>;
};
