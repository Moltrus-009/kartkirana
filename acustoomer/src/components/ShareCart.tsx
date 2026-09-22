import React, { useRef, useState } from 'react';
import { useCart } from '../context/CartContext';
import { planningRequest } from '../services/planningService';
export function ShareCart() {
    const { cartItems } = useCart();
    const [url, setUrl] = useState(''), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
    const retry = useRef({ fingerprint: '', key: '' });
    async function create() {
        setBusy(true);
        setMessage('');
        try {
            const items = cartItems.map(i => ({ productId: i.product.id, quantity: i.quantity }));
            const fingerprint = JSON.stringify(items);
            if (retry.current.fingerprint !== fingerprint)
                retry.current = { fingerprint, key: crypto.randomUUID() };
            const result = await planningRequest<{
                token: string;
            }>('/shared-carts', { items }, true, retry.current.key);
            setUrl(`https://kartkirana.com/shared-cart/${result.token}`);
        }
        catch (e) {
            setMessage(e instanceof Error ? e.message : 'Unable to create a link.');
        }
        finally {
            setBusy(false);
        }
    }
    return <section className="rounded-2xl border border-slate-200 p-4 space-y-3 dark:border-slate-700" aria-label="Share cart">
    <button type="button" disabled={busy || !cartItems.length} onClick={create} className="font-bold text-blue-700 dark:text-blue-300 disabled:opacity-50">{busy ? 'Creating link…' : 'Share cart'}</button>
    <p className="text-sm text-slate-500">Send your shopping list. The recipient chooses their own address and shop. Links expire after 7 days.</p>
    {url && <><input aria-label="Shared cart link" readOnly value={url} className="w-full rounded border p-2 text-sm bg-transparent"/><div className="flex flex-wrap gap-4 text-sm font-semibold">
      <button type="button" onClick={async () => { try {
            await navigator.clipboard.writeText(url);
            setMessage('Link copied.');
        }
        catch {
            setMessage('Select and copy the link above.');
        } }}>Copy link</button>
      <a href={`https://wa.me/?text=${encodeURIComponent(`My KartKirana shopping list: ${url}`)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      {typeof navigator.share === 'function' && <button type="button" onClick={async () => { try {
            await navigator.share({ title: 'KartKirana shopping list', url });
        }
        catch (e) {
            if (!(e instanceof DOMException && e.name === 'AbortError'))
                setMessage('Use Copy link or WhatsApp to share.');
        } }}>More sharing options</button>}
    </div></>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
