import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import type { OrderDoc, ProductDoc, RiderDoc, ShopDoc, UserDoc } from '../context/AdminContext';

export interface AdminNavigationItem {
  name: string;
  path: string;
  group: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  navigation: AdminNavigationItem[];
  orders: OrderDoc[];
  shops: ShopDoc[];
  products: ProductDoc[];
  users: UserDoc[];
  riders: RiderDoc[];
}

interface SearchResult {
  key: string;
  label: string;
  description: string;
  path: string;
  type: string;
}

export default function AdminCommandPalette({ open, onClose, navigation, orders, shops, products, users, riders }: Props) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  const results = useMemo<SearchResult[]>(() => {
    const term = query.trim().toLowerCase();
    const all: SearchResult[] = [
      ...navigation.map(item => ({ key: `nav-${item.path}`, label: item.name, description: item.group, path: item.path, type: 'Page' })),
      ...orders.slice(0, 250).map(order => ({ key: `order-${order.id}`, label: `Order ${order.id}`, description: `${order.shopName} · ${order.contact.name} · ${order.status}`, path: '/orders', type: 'Order' })),
      ...shops.map(shop => ({ key: `shop-${shop.id}`, label: shop.name, description: `${shop.address} · ${shop.status}`, path: '/shops', type: 'Shop' })),
      ...products.slice(0, 500).map(product => ({ key: `product-${product.id}`, label: product.name, description: `${product.shopName} · ${product.stock} in stock`, path: '/products', type: 'Product' })),
      ...users.slice(0, 500).map(user => ({ key: `user-${user.uid}`, label: user.name || user.fullName || user.phone || user.uid, description: `${user.phone || 'No phone'} · ${user.role || 'customer'}`, path: '/users', type: 'User' })),
      ...riders.map(rider => ({ key: `rider-${rider.uid}`, label: rider.name || rider.phone || rider.uid, description: `${rider.phone || 'No phone'} · ${rider.status}`, path: '/riders', type: 'Rider' }))
    ];
    if (!term) return all.filter(item => item.type === 'Page').slice(0, 12);
    return all.filter(item => `${item.label} ${item.description} ${item.type}`.toLowerCase().includes(term)).slice(0, 18);
  }, [navigation, orders, products, query, riders, shops, users]);

  if (!open) return null;

  const select = (result: SearchResult) => {
    onClose();
    navigate(result.path, { state: { adminSearch: result.label } });
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-950/60 backdrop-blur-sm p-4 pt-[10vh]" onMouseDown={onClose}>
      <div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900" onMouseDown={event => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 dark:border-slate-800">
          <Search className="h-5 w-5 text-emerald-500" />
          <input
            ref={inputRef}
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="Search pages, orders, shops, products, customers or riders…"
            className="h-16 flex-1 bg-transparent text-sm font-semibold text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {results.map(result => (
            <button
              key={result.key}
              type="button"
              onClick={() => select(result)}
              className="flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left hover:bg-emerald-500/10"
            >
              <span className="min-w-0">
                <span className="block truncate text-xs font-black text-slate-900 dark:text-white">{result.label}</span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400">{result.description}</span>
              </span>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800">{result.type}</span>
            </button>
          ))}
          {results.length === 0 && <div className="px-5 py-12 text-center text-xs font-bold text-slate-400">No matching admin records found.</div>}
        </div>
      </div>
    </div>
  );
}
