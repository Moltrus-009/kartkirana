import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useAddress } from '../context/AddressContext';
import { useCart } from '../context/CartContext';
import { planningRequest } from '../services/planningService';
import { rememberSharedCart, clearSharedCartReturn } from '../utils/planningReturn';
import { Product } from '../types';
import { PlanningAddressPicker } from '../components/PlanningAddressPicker';
type Item = {
    productId: string;
    name: string;
    quantity: number;
    packSize: string;
};
type Shared = {
    items: Item[];
    expiresAt: string;
};
type ShopMatch = {
    shopId: string;
    shopName: string;
    availableCount: number;
    matches: {
        requested: Item;
        product: Product | null;
    }[];
};
export default function SharedCart() {
    const { token = '' } = useParams();
    const navigate = useNavigate();
    const { user, onboardingCompleted } = useAuth();
    const { selectedAddress } = useAddress();
    const { cartItems, importCart } = useCart();
    const [cart, setCart] = useState<Shared | null>(null), [shops, setShops] = useState<ShopMatch[]>([]), [shopId, setShopId] = useState('');
    const [quantities, setQuantities] = useState<Record<string, number>>({}), [error, setError] = useState(''), [busy, setBusy] = useState(false), [matched, setMatched] = useState(false);
    const matchVersion = useRef({ value: 0 });
    useEffect(() => { let active = true; setCart(null); setError(''); planningRequest<Shared>(`/shared-carts/${encodeURIComponent(token)}`, undefined, false).then(r => { if (active)
        setCart(r); }).catch(e => { if (active)
        setError(e.message); }); return () => { active = false; }; }, [token]);
    useEffect(() => { const guard = matchVersion.current; guard.value++; setShops([]); setShopId(''); setMatched(false); setBusy(false); return () => { guard.value++; }; }, [token, selectedAddress?.id, selectedAddress?.lat, selectedAddress?.lng, user?.uid]);
    const shop = shops.find(s => s.shopId === shopId);
    useEffect(() => { if (user?.uid)
        clearSharedCartReturn(); }, [user?.uid]);
    function choose(s: ShopMatch) { setShopId(s.shopId); setQuantities(Object.fromEntries(s.matches.filter(m => m.product).map(m => [m.product!.id, m.requested.quantity]))); }
    async function match() {
        if (!selectedAddress) {
            setError('Choose your delivery address using the address selector above.');
            return;
        }
        setBusy(true);
        setError('');
        const version = ++matchVersion.current.value;
        try {
            const result = await planningRequest<{
                shops: ShopMatch[];
            }>(`/shared-carts/${token}/match`, { address: selectedAddress });
            if (version !== matchVersion.current.value)
                return;
            setShops(result.shops);
            setMatched(true);
            if (result.shops[0])
                choose(result.shops[0]);
        }
        catch (e) {
            if (version === matchVersion.current.value)
                setError(e instanceof Error ? e.message : 'Unable to find nearby shops.');
        }
        finally {
            if (version === matchVersion.current.value)
                setBusy(false);
        }
    }
    function add() {
        try {
            const items = (shop?.matches || []).filter(m => m.product && (quantities[m.product.id] || 0) > 0).map(m => ({ product: { ...m.product!, rating: 0, description: '', isPreorder: false, estimatedDelivery: '15-20 Mins' }, quantity: quantities[m.product!.id], isPreorder: false }));
            if (!items.length) {
                setError('Select at least one available item.');
                return;
            }
            if (cartItems.length && !window.confirm('Replace the items currently in your cart with this selection?'))
                return;
            importCart(items);
            navigate('/cart');
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Unable to update your cart.');
        }
    }
    return <main className="mx-auto max-w-2xl p-4 pb-28 space-y-5">
    <p className="font-bold text-blue-700 dark:text-blue-300">KartKirana · Shared shopping list</p>
    <h1 className="text-2xl font-bold">Shop this cart near you</h1>
    <p className="text-sm text-slate-500">Prices and availability come from your selected nearby shop. No order is placed until you complete checkout.</p>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-800">{error}</p>}
    {!cart && !error && <p role="status">Loading shopping list…</p>}
    {cart && <><p className="text-xs text-slate-500">Link expires {new Date(cart.expiresAt).toLocaleDateString('en-IN')}</p>
      <ul className="divide-y divide-slate-200">{cart.items.map(i => <li key={i.productId} className="py-3 flex justify-between gap-3"><span>{i.name} <span className="text-sm text-slate-500">{i.packSize}</span></span><span>× {i.quantity}</span></li>)}</ul>
      {!user ? <Link className="block rounded-xl bg-blue-700 p-3 text-center text-white" to={onboardingCompleted ? '/login' : '/onboarding'} onClick={() => rememberSharedCart(`/shared-cart/${token}`)}>Sign in to find nearby shops</Link> : <>
        <PlanningAddressPicker />
        <button className="rounded-xl bg-blue-700 px-4 py-3 text-white disabled:opacity-50" disabled={busy} onClick={match}>{busy ? 'Checking current availability…' : 'Find matching items nearby'}</button>
        {matched && !shops.length && <p>No open shops currently deliver to this address. Try again later or select another address.</p>}
        {!!shops.length && <label className="block">Choose one shop<select value={shopId} onChange={e => choose(shops.find(s => s.shopId === e.target.value)!)} className="mt-2 block w-full rounded border p-3 bg-transparent">{shops.map(s => <option key={s.shopId} value={s.shopId}>{s.shopName} · {s.availableCount}/{cart.items.length} available</option>)}</select></label>}
        {shop && <section className="space-y-3"><p className="text-sm text-slate-500">Only exact product matches are selected. Unavailable products are left out; medicines are never substituted.</p>
          {shop.matches.map(m => <div key={m.requested.productId} className="rounded-xl border p-3 flex items-center justify-between gap-3"><div><p>{m.requested.name}</p><p className="text-sm text-slate-500">{m.product ? `₹${m.product.price} · ${m.product.stock} in stock` : 'Unavailable at this shop'}</p></div>{m.product && <input aria-label={`Quantity of ${m.requested.name}`} className="w-20 rounded border p-2 bg-transparent" type="number" min={0} max={Math.min(m.product.stock, 99)} value={quantities[m.product.id] || 0} onChange={e => setQuantities(q => ({ ...q, [m.product!.id]: Number(e.target.value) }))}/>}</div>)}
          <button type="button" className="w-full rounded-xl bg-blue-700 p-3 text-white" onClick={add}>Add selected items to cart</button>
        </section>}
      </>}
    </>}
  </main>;
}
