import { useState, useMemo } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { useLanguage } from '../context/LanguageContext';
import { 
  Users, 
  Search, 
  Phone, 
  ShoppingBag, 
  Star, 
  Clock
} from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';

interface CustomerSummary {
  name: string;
  phone: string;
  totalOrders: number;
  moneySpent: number;
  lastOrderDate: string;
  customerSince: string;
  favoriteProducts: string[];
  isRegular: boolean;
}

export default function Customers() {
  const { orders } = useAppStore();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');

  // 1. Process customer summary profiles from orders log dynamically
  const customers = useMemo(() => {
    const customerMap: Record<string, {
      name: string;
      phone: string;
      totalOrders: number;
      moneySpent: number;
      lastOrderDate: string;
      customerSince: string;
      itemsBought: Record<string, number>;
    }> = {};

    orders.forEach((order) => {
      if (!order.contact || !order.contact.name) return;
      const phone = order.contact.phone || 'no-phone';
      const name = order.contact.name;

      if (!customerMap[phone]) {
        customerMap[phone] = {
          name,
          phone,
          totalOrders: 0,
          moneySpent: 0,
          lastOrderDate: order.createdAt,
          customerSince: order.createdAt,
          itemsBought: {}
        };
      }

      const c = customerMap[phone];
      c.totalOrders += 1;
      c.moneySpent += order.total;

      // Track dates
      if (new Date(order.createdAt).getTime() > new Date(c.lastOrderDate).getTime()) {
        c.lastOrderDate = order.createdAt;
      }
      if (new Date(order.createdAt).getTime() < new Date(c.customerSince).getTime()) {
        c.customerSince = order.createdAt;
      }

      // Track items purchased
      order.items.forEach((it) => {
        const resolvedProduct = (it as any).product || {
          id: (it as any).productId || (it as any).id || '',
          name: (it as any).name || 'Product',
          price: (it as any).price || 0
        };
        const prodName = resolvedProduct.name;
        c.itemsBought[prodName] = (c.itemsBought[prodName] || 0) + it.quantity;
      });
    });

    return Object.values(customerMap).map((c): CustomerSummary => {
      const favs = Object.entries(c.itemsBought)
        .sort((a, b) => b[1] - a[1])
        .map(entry => entry[0])
        .slice(0, 2);

      return {
        name: c.name,
        phone: c.phone,
        totalOrders: c.totalOrders,
        moneySpent: Math.round(c.moneySpent),
        lastOrderDate: c.lastOrderDate,
        customerSince: c.customerSince,
        favoriteProducts: favs.length > 0 ? favs : ['General Products'],
        isRegular: c.totalOrders >= 3
      };
    });
  }, [orders]);

  // 2. Filter customer summaries by search keyword
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  // Divide into Regular and Other
  const regularCustomers = filteredCustomers.filter(c => c.isRegular);
  const otherCustomers = filteredCustomers.filter(c => !c.isRegular);

  return (
    <div className="space-y-5 max-w-md mx-auto pb-8">
      {/* Header */}
      <div className="text-left">
        <h1 className="text-xl font-black text-slate-800 dark:text-zinc-150 flex items-center gap-2">
          👥 {t('customers')}
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
          Your Buyer Directory
        </p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder={t('search_customers')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl outline-none font-bold text-xs shadow-xs focus:border-primary text-slate-800 dark:text-zinc-100"
        />
        <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
      </div>

      {/* Roster list */}
      <div className="space-y-6">
        {filteredCustomers.length === 0 ? (
          <EmptyState
            icon={Users}
            title={t('no_customers')}
            description="Customers will appear automatically as orders are placed and processed."
          />
        ) : (
          <>
            {/* 1. REGULAR CUSTOMERS PANEL */}
            {regularCustomers.length > 0 && (
              <div className="space-y-3 text-left">
                <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Regular Customers
                </h3>
                
                <div className="space-y-3">
                  {regularCustomers.map(c => (
                    <CustomerCard key={c.phone} customer={c} />
                  ))}
                </div>
              </div>
            )}

            {/* 2. OTHER CUSTOMERS PANEL */}
            {otherCustomers.length > 0 && (
              <div className="space-y-3 text-left">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Users className="h-4 w-4" /> Other Customers
                </h3>
                
                <div className="space-y-3">
                  {otherCustomers.map(c => (
                    <CustomerCard key={c.phone} customer={c} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Single Customer Card Component
function CustomerCard({ customer }: { customer: CustomerSummary }) {
  const { t } = useLanguage();
  const formattedSince = new Date(customer.customerSince).toLocaleDateString([], { year: 'numeric', month: 'short' });
  const formattedLast = new Date(customer.lastOrderDate).toLocaleDateString([], { month: 'short', day: 'numeric' });

  return (
    <div className="p-4 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl space-y-3 text-left shadow-xs">
      <div className="flex justify-between items-center">
        {/* Name and Phone */}
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs ${
            customer.isRegular 
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400' 
              : 'bg-slate-100 text-slate-650 dark:bg-zinc-800'
          }`}>
            {customer.name.charAt(0)}
          </div>
          <div>
            <h4 className="font-extrabold text-slate-800 dark:text-zinc-250 flex items-center gap-1">
              {customer.name}
              {customer.isRegular && <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 rounded uppercase leading-none">{t('vip')}</span>}
            </h4>
            <p className="text-[10px] text-slate-400 font-bold">{customer.phone}</p>
          </div>
        </div>

        {/* Quick Phone Call Action */}
        <a 
          href={`tel:${customer.phone}`}
          className="w-8 h-8 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center cursor-pointer transition shadow-xs shadow-emerald-500/10"
          title={`Call ${customer.name}`}
        >
          <Phone className="h-4 w-4" />
        </a>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-3 gap-2 bg-slate-50/50 dark:bg-zinc-900/30 p-2.5 rounded-2xl border border-slate-100/50 dark:border-dark-border/40 text-[10px] font-bold">
        <div className="text-center space-y-0.5 border-r border-slate-100 dark:border-dark-border/40">
          <span className="text-slate-400 block font-normal uppercase text-[8px] tracking-wider">{t('orders')}</span>
          <span className="text-slate-800 dark:text-zinc-200 font-black text-xs">{customer.totalOrders}</span>
        </div>
        <div className="text-center space-y-0.5 border-r border-slate-100 dark:border-dark-border/40">
          <span className="text-slate-400 block font-normal uppercase text-[8px] tracking-wider">{t('total_spent')}</span>
          <span className="text-slate-850 dark:text-zinc-150 font-black text-xs">₹{customer.moneySpent}</span>
        </div>
        <div className="text-center space-y-0.5">
          <span className="text-slate-400 block font-normal uppercase text-[8px] tracking-wider">{t('last_purchase')}</span>
          <span className="text-slate-850 dark:text-zinc-150 font-black text-xs">{formattedLast}</span>
        </div>
      </div>

      {/* Favorite items list & Since details */}
      <div className="space-y-1.5 text-[10px] font-semibold text-slate-450">
        <p className="flex items-center gap-1 truncate">
          <ShoppingBag className="h-3.5 w-3.5 text-slate-350 shrink-0" />
          <span>{t('favourites')}: <strong className="text-slate-700 dark:text-zinc-300 font-extrabold">{customer.favoriteProducts.join(', ')}</strong></span>
        </p>
        <p className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5 text-slate-350 shrink-0" />
          <span>{t('customer_since')} {formattedSince}</span>
        </p>
      </div>
    </div>
  );
}
