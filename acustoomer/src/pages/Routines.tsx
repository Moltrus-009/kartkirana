import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useAddress } from '../context/AddressContext';
import { planningRequest } from '../services/planningService';
import { Product, UserAddress } from '../types';
import { PlanningAddressPicker } from '../components/PlanningAddressPicker';
type Routine = {
    id: string;
    version: number;
    name: string;
    status: string;
    nextScheduledFor: string | null;
    shopName: string;
    addressId: string;
    startDate: string;
    endDate: string | null;
    slotId: string;
    recurrenceType: string;
    selectedDays: number[];
    paymentMethod: string;
    merchantFallback?: string;
    itemFallback?: string;
    baselineTotal: number;
    items: {
        productId: string;
        quantity: number;
        name: string;
    }[];
};
type Execution = {
    id: string;
    routineId: string;
    scheduledFor: string;
    status: string;
    reason?: string;
    generatedOrderId?: string;
};
type List = {
    routines: Routine[];
    executions: Execution[];
};
type Config = {
    slots: {
        id: string;
        label: string;
    }[];
    priceIncreasePercent: number;
    priceIncreaseRupees: number;
    enabled?: boolean;
};
const tomorrow = () => new Date(Date.now() + 86400000 + 19800000).toISOString().slice(0, 10);
export default function Routines() {
    const navigate = useNavigate();
    const { user, updateUser } = useAuth();
    const { cartItems, importCart } = useCart();
    const { addresses, selectedAddress, selectAddress } = useAddress();
    const [data, setData] = useState<List>({ routines: [], executions: [] }), [config, setConfig] = useState<Config | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('');
    const [editing, setEditing] = useState<Routine | null>(null), [open, setOpen] = useState(new URLSearchParams(window.location.search).has('create'));
    const [name, setName] = useState('My routine'), [date, setDate] = useState(tomorrow), [end, setEnd] = useState(''), [slot, setSlot] = useState('09-11'), [type, setType] = useState('WEEKLY'), [days, setDays] = useState<number[]>([1]), [method, setMethod] = useState('cod'), [addressId, setAddressId] = useState(selectedAddress?.id || ''), [pauseUntil, setPauseUntil] = useState('');
    const retry = useRef({ fingerprint: '', key: '' });
    const [merchantFallback, setMerchantFallback] = useState('SKIP'), [itemFallback, setItemFallback] = useState('NONE');
    async function refresh() { setData(await planningRequest<List>('/routines')); }
    useEffect(() => { let active = true; Promise.all([planningRequest<List>('/routines'), planningRequest<Config>('/planning/config', undefined, false)]).then(([d, c]) => { if (active) {
        setData(d);
        setConfig(c);
    } }).catch(e => { if (active)
        setError(e.message); }); return () => { active = false; }; }, [user?.uid]);
    useEffect(() => { if (!addressId && selectedAddress)
        setAddressId(selectedAddress.id); }, [selectedAddress, addressId]);
    async function run(fn: () => Promise<void>) { setBusy(true); setError(''); setMessage(''); try {
        await fn();
        await refresh();
    }
    catch (e) {
        setError(e instanceof Error ? e.message : 'Please try again.');
    }
    finally {
        setBusy(false);
    } }
    function edit(r: Routine) { setEditing(r); setName(r.name); setDate(r.nextScheduledFor ? new Date(Date.parse(r.nextScheduledFor) + 19800000).toISOString().slice(0, 10) : tomorrow()); setEnd(r.endDate || ''); setSlot(r.slotId); setType(r.recurrenceType); setDays(r.selectedDays); setMethod(r.paymentMethod); setAddressId(r.addressId); setMerchantFallback(r.merchantFallback || 'SKIP'); setItemFallback(r.itemFallback || 'NONE'); setOpen(true); }
    async function save() {
        await run(async () => {
            const address = addresses.find(a => a.id === addressId);
            if (!address)
                throw new Error('Choose a saved delivery address.');
            const body = { name, startDate: date, endDate: end || null, slotId: slot, recurrenceType: type, selectedDays: days, paymentMethod: method, merchantFallback, itemFallback, addressId, timezone: 'Asia/Kolkata', items: editing ? editing.items.map(i => ({ productId: i.productId, quantity: i.quantity })) : cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity })) };
            if (!body.items.length)
                throw new Error('Add products to your cart first.');
            // Migrate local saved addresses using the existing authenticated profile API.
            const mergedAddresses = Array.from(new Map([...(user?.addresses || []), ...addresses].map(a => [a.id, a])).values());
            await updateUser({ addresses: mergedAddresses });
            const fingerprint = JSON.stringify(body);
            if (retry.current.fingerprint !== fingerprint)
                retry.current = { fingerprint, key: crypto.randomUUID() };
            await planningRequest(editing ? `/routines/${editing.id}/edit` : '/routines', body, true, retry.current.key);
            setOpen(false);
            setEditing(null);
            setMessage('Routine saved. Stock and prices will be checked again before each order.');
        });
    }
    async function action(r: Routine, action: string) {
        if (action === 'CANCEL' && !window.confirm('Cancel future occurrences? Orders already placed remain in Order history and must be cancelled separately.'))
            return;
        await run(async () => { await planningRequest(`/routines/${r.id}/action`, { action, expectedVersion: r.version, ...(action === 'PAUSE' && pauseUntil ? { until: pauseUntil } : {}) }); setMessage('Routine updated. Already placed orders are unchanged.'); });
    }
    async function confirm(e: Execution) {
        await run(async () => {
            const p = await planningRequest<{
                shopName: string;
                products: Product[];
                items: {
                    productId: string;
                    quantity: number;
                }[];
                address: UserAddress;
                breakdown: {
                    grandTotal: number;
                };
                schedule: {
                    date: string;
                    slot: string;
                };
            }>(`/routine-executions/${e.id}/preview`);
            if (!addresses.some(a => a.id === p.address.id))
                throw new Error('This saved address is unavailable on this device. Add or edit your address before continuing.');
            if (!window.confirm(`Shop: ${p.shopName}. Delivery: ${p.schedule.date}, ${p.schedule.slot}. Current total: ₹${p.breakdown.grandTotal.toFixed(2)}. ${cartItems.length ? 'This replaces your current cart.' : ''} Continue to checkout?`))
                return;
            importCart(p.products.map(product => ({ product: { ...product, rating: 0, description: '', isPreorder: false, estimatedDelivery: p.schedule.slot }, quantity: p.items.find(i => i.productId === product.id)!.quantity, isPreorder: false })));
            selectAddress(p.address.id);
            navigate(`/checkout?routineExecutionId=${e.id}`);
        });
    }
    const field = 'w-full rounded-lg border border-slate-300 bg-transparent p-3 dark:border-slate-600';
    return <main className="mx-auto max-w-3xl space-y-5 p-4 pb-28">
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-bold">My Routines</h1><button className="rounded-xl bg-blue-700 px-4 py-3 text-white" onClick={() => { setEditing(null); setOpen(true); }}>Schedule current cart</button></div>
    <p className="text-sm text-slate-500">Plan a one-time delivery or repeat your shopping list. All delivery windows use India Standard Time. <Link to="/preorders" className="text-blue-700 underline">View placed scheduled orders</Link></p>
    <button type="button" disabled={busy} onClick={() => void run(async () => { })} className="text-sm text-blue-700 underline">Refresh routines</button>
    {config?.enabled === false && <p role="status" className="rounded-xl bg-amber-50 p-3 text-amber-900">Routine ordering is not enabled yet. Existing orders are unaffected.</p>}
    {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">{error}</p>}{message && <p role="status" className="rounded-lg bg-green-50 p-3 text-green-800">{message}</p>}
    {open && <form onSubmit={e => { e.preventDefault(); void save(); }} className="rounded-2xl border p-4 space-y-4">
      <h2 className="text-lg font-bold">{editing ? 'Edit routine' : 'Schedule / repeat cart'}</h2>
      <p className="text-sm">{editing ? `${editing.items.length} saved products · ${editing.shopName}` : `${cartItems.length} products from your cart`}</p>
      {editing && <fieldset className="space-y-2"><legend>Products and quantities</legend>{editing.items.map(i => <label className="flex items-center gap-3" key={i.productId}><span className="flex-1">{i.name}</span><input aria-label={`Quantity of ${i.name}`} type="number" min={1} max={99} value={i.quantity} className="w-20 rounded border p-2 bg-transparent" onChange={e => setEditing({ ...editing, items: editing.items.map(x => x.productId === i.productId ? { ...x, quantity: Number(e.target.value) } : x) })}/><button type="button" onClick={() => setEditing({ ...editing, items: editing.items.filter(x => x.productId !== i.productId) })}>Remove</button></label>)}{!!cartItems.length && <button type="button" className="text-blue-700 underline" onClick={() => { if (window.confirm('Replace this routine’s products with your current cart?'))
            setEditing({ ...editing, items: cartItems.map(i => ({ productId: i.product.id, name: i.product.name, quantity: i.quantity })) }); }}>Use current cart products</button>}</fieldset>}
      <label className="block">Name<input className={field} maxLength={80} required value={name} onChange={e => setName(e.target.value)}/></label>
      <div className="grid gap-4 sm:grid-cols-2"><label>Start date<input type="date" className={field} required value={date} onChange={e => setDate(e.target.value)}/></label><label>End date (optional)<input type="date" className={field} value={end} min={date} onChange={e => setEnd(e.target.value)}/></label></div>
      <label className="block">Delivery window (IST)<select className={field} value={slot} onChange={e => setSlot(e.target.value)}>{config?.slots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
      <label className="block">Repeat<select className={field} value={type} onChange={e => setType(e.target.value)}>{[['ONCE', 'Once'], ['DAILY', 'Daily'], ['WEEKDAYS', 'Weekdays'], ['WEEKENDS', 'Weekends'], ['WEEKLY', 'Weekly on start weekday'], ['SELECTED_DAYS', 'Selected weekdays']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      {type === 'SELECTED_DAYS' && <fieldset className="flex flex-wrap gap-3"><legend>Delivery days</legend>{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => <label key={d}><input type="checkbox" checked={days.includes(i)} onChange={e => setDays(v => e.target.checked ? [...v, i] : v.filter(x => x !== i))}/> {d}</label>)}</fieldset>}
      <PlanningAddressPicker value={addressId} onSelect={setAddressId}/>
      <label className="block">Payment<select className={field} value={method} onChange={e => setMethod(e.target.value)}><option value="cod">Cash on Delivery — automatically place each order</option><option value="online">Online — notify me to confirm and pay each time</option></select></label>
      <label className="block">If my shop is unavailable<select className={field} value={merchantFallback} onChange={e => setMerchantFallback(e.target.value)}><option value="SKIP">Skip this occurrence</option><option value="ASK">Find exact items nearby and ask me first</option><option value="AUTO_EXACT">Allow another eligible shop with all exact items</option></select></label>
      <label className="block">If an item is unavailable<select className={field} value={itemFallback} onChange={e => setItemFallback(e.target.value)}><option value="NONE">Do not replace — skip this occurrence</option><option value="ASK">Suggest an exact-item shop and ask me first</option><option value="SAME_ITEM">Allow all exact items from another eligible shop</option></select></label>
      <p className="text-sm text-slate-500">No advance stock reservation. COD orders can be placed automatically up to the saved total plus the lower of {config?.priceIncreasePercent ?? 10}% or ₹{config?.priceIncreaseRupees ?? 50}. Larger increases need confirmation. Online payment always needs your confirmation. Unavailable items are never automatically substituted.</p>
      <div className="flex gap-4"><button disabled={busy || !config || config.enabled === false} className="rounded-xl bg-blue-700 px-4 py-3 text-white disabled:opacity-50">{busy ? 'Saving…' : 'Save routine'}</button><button type="button" onClick={() => setOpen(false)}>Close</button></div>
    </form>}
    <section className="space-y-4"><h2 className="text-lg font-bold">Your routines</h2>{!data.routines.length && <p>No routines yet. Add products to your cart, then schedule a delivery.</p>}
      <label className="block text-sm">Optional resume date when pausing<input type="date" className={field} value={pauseUntil} onChange={e => setPauseUntil(e.target.value)}/></label>
      {data.routines.map(r => <article key={r.id} className="rounded-2xl border p-4 space-y-3"><div><h3 className="font-bold">{r.name}</h3><p className="text-sm">{r.shopName} · {r.status} · {r.paymentMethod === 'cod' ? 'COD' : 'Confirm online payment'}</p><p className="text-sm">{r.nextScheduledFor ? `Next: ${new Date(r.nextScheduledFor).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST` : 'No future deliveries'}</p></div><ul className="text-sm text-slate-500">{r.items.map(i => <li key={i.productId}>{i.name} × {i.quantity}</li>)}</ul>
        {['ACTIVE', 'PAUSED'].includes(r.status) && <div className="flex flex-wrap gap-4 text-sm font-semibold"><button disabled={busy} onClick={() => edit(r)}>Edit</button><button disabled={busy} onClick={() => action(r, r.status === 'PAUSED' ? 'RESUME' : 'PAUSE')}>{r.status === 'PAUSED' ? 'Resume' : 'Pause'}</button><button disabled={busy} onClick={() => action(r, 'SKIP')}>Skip next</button><button disabled={busy} className="text-red-600" onClick={() => action(r, 'CANCEL')}>Cancel routine</button></div>}
      </article>)}
    </section>
    <section className="space-y-3"><h2 className="text-lg font-bold">Occurrence history</h2><p className="text-xs text-slate-500">Most recent 100 occurrences. Payment and delivery status remain in Order history.</p>{data.executions.map(e => <article key={e.id} className="rounded-xl border p-3"><p>{new Date(e.scheduledFor).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p><p className="text-sm">{e.status.replaceAll('_', ' ')}{e.reason ? ` · ${e.reason.replaceAll('_', ' ')}` : ''}</p>{e.generatedOrderId ? <Link className="text-blue-700 underline" to={`/orders/track/${e.generatedOrderId}`}>View order</Link> : e.status === 'AWAITING_CONFIRMATION' && <button disabled={busy} onClick={() => confirm(e)} className="mt-2 rounded-lg bg-blue-700 p-2 text-white">Review and checkout</button>}</article>)}</section>
  </main>;
}
