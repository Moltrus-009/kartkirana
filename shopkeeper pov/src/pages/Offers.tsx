import { useMemo, useState } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import type { OfferDocument } from '../core/store/useAppStore';
import { BadgePercent, Calendar, Crown, Gift, Plus, Repeat2, Trash2, Users } from 'lucide-react';
import EmptyState from '../components/shared/EmptyState';
import { useLanguage } from '../context/LanguageContext';

type OfferDraft = Omit<OfferDocument, 'id' | 'shopId'>;

const localDate = (daysAhead = 0) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + daysAhead);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const createDefaultForm = (): OfferDraft => ({
  title: '',
  description: '',
  offerType: 'sale',
  discountType: 'percentage',
  value: 20,
  minOrder: 0,
  maxDiscount: 200,
  scope: 'order',
  productIds: [],
  audience: 'all',
  buyQuantity: 1,
  getQuantity: 1,
  subscriptionPrice: 99,
  billingPeriod: 'monthly',
  targetCustomerIds: [],
  startDate: localDate(),
  endDate: localDate(15),
  isActive: true,
  automatic: true,
  promotionVersion: 1,
});

export default function Offers() {
  const { offers, orders, products, addPromoOffer, removePromoOffer } = useAppStore();
  const { t } = useLanguage();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState<OfferDraft>(createDefaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const offerTypes = [
    { id: 'sale' as const, title: t('public_sale'), copy: t('public_sale_desc'), icon: BadgePercent },
    { id: 'loyalty' as const, title: t('loyalty_reward'), copy: t('loyalty_reward_desc'), icon: Crown },
    { id: 'addon' as const, title: t('bogo_deal'), copy: t('bogo_desc'), icon: Gift },
    { id: 'subscription' as const, title: t('subscription_plan'), copy: t('subscription_desc'), icon: Repeat2 },
  ];

  const customers = useMemo(() => {
    const map = new Map<string, { id: string; name: string; phone: string; orders: number; spent: number }>();
    orders.forEach(order => {
      if (!order.userId) return;
      const current = map.get(order.userId) || {
        id: order.userId,
        name: order.contact?.name || t('customer'),
        phone: order.contact?.phone || '',
        orders: 0,
        spent: 0,
      };
      current.orders += 1;
      current.spent += Number(order.total || 0);
      map.set(order.userId, current);
    });
    return [...map.values()].sort((a, b) => b.orders - a.orders || b.spent - a.spent);
  }, [orders, t]);

  const selectType = (offerType: OfferDocument['offerType']) => {
    setForm(current => ({
      ...current,
      offerType,
      discountType: offerType === 'addon' ? 'bogo' : 'percentage',
      scope: offerType === 'addon' ? 'products' : 'order',
      audience: offerType === 'loyalty' ? 'selected_customers' : offerType === 'subscription' ? 'subscribers' : 'all',
      productIds: offerType === 'addon' ? current.productIds : [],
      targetCustomerIds: offerType === 'loyalty' ? current.targetCustomerIds : [],
    }));
  };

  const openCreate = (type: OfferDocument['offerType'] = 'sale') => {
    const next = createDefaultForm();
    setForm({
      ...next,
      offerType: type,
      discountType: type === 'addon' ? 'bogo' : 'percentage',
      scope: type === 'addon' ? 'products' : 'order',
      audience: type === 'loyalty' ? 'selected_customers' : type === 'subscription' ? 'subscribers' : 'all',
    });
    setError('');
    setIsFormOpen(true);
  };

  const validate = () => {
    if (!form.title.trim() || !form.description.trim()) return t('offer_error_title');
    if (form.endDate < form.startDate) return t('offer_error_date');
    if (form.discountType === 'percentage' && (form.value <= 0 || form.value > 90)) return t('offer_error_percent');
    if (form.discountType === 'flat' && form.value <= 0) return t('offer_error_flat');
    if (form.offerType === 'loyalty' && !form.targetCustomerIds?.length) return t('offer_error_customer');
    if (form.offerType === 'addon' && !form.productIds.length) return t('offer_error_product');
    if (form.offerType === 'subscription' && Number(form.subscriptionPrice) < 0) return t('offer_error_subscription');
    return '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const message = validate();
    if (message) return setError(message);
    setSaving(true);
    setError('');
    try {
      await addPromoOffer({
        ...form,
        title: form.title.trim(),
        description: form.description.trim(),
        value: form.offerType === 'subscription' ? Number(form.value || 0) : form.value,
      });
      setIsFormOpen(false);
      setForm(createDefaultForm());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : t('offer_error_create'));
    } finally {
      setSaving(false);
    }
  };

  const describeBenefit = (offer: OfferDocument) => {
    if (offer.offerType === 'subscription') return t('subscription_benefit', { price: offer.subscriptionPrice || 0, period: t(offer.billingPeriod === 'quarterly' ? 'quarter' : 'month'), value: offer.value });
    if (offer.discountType === 'percentage') return t(offer.maxDiscount ? 'percent_off_upto' : 'percent_off', { value: offer.value, max: offer.maxDiscount || 0 });
    if (offer.discountType === 'flat') return t('flat_off', { value: offer.value });
    if (offer.discountType === 'free_delivery') return t('free_delivery');
    return t('buy_get_free', { buy: offer.buyQuantity || 1, get: offer.getQuantity || 1 });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800 dark:text-zinc-100">{t('shop_specials')}</h1>
          <p className="mt-0.5 text-xs font-bold text-slate-400">{t('shop_specials_desc')}</p>
        </div>
        <button onClick={() => openCreate()} className="flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-black text-white shadow-md shadow-primary/10 transition hover:bg-primary-hover">
          <Plus className="h-4 w-4" /> {t('create_special')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {offerTypes.map(type => {
          const Icon = type.icon;
          return (
            <button key={type.id} onClick={() => openCreate(type.id)} className="rounded-2xl border border-slate-100 bg-white p-4 text-left shadow-xs transition hover:border-primary/30 hover:shadow-md dark:border-dark-border dark:bg-dark-card">
              <span className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-4.5 w-4.5" /></span>
              <strong className="block text-xs font-black text-slate-800 dark:text-zinc-100">{type.title}</strong>
              <span className="mt-1 block text-[10px] font-semibold leading-relaxed text-slate-400">{type.copy}</span>
            </button>
          );
        })}
      </div>

      {offers.length === 0 ? (
        <EmptyState icon={Gift} title={t('no_specials')} description={t('no_specials_desc')} actionText={t('create_special')} onAction={() => openCreate()} />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.map(offer => {
            const expired = offer.endDate ? offer.endDate < localDate() : false;
            const active = offer.isActive && !expired;
            return (
              <article key={offer.id} className="relative overflow-hidden rounded-3xl border border-slate-100 bg-white p-5 text-left shadow-xs dark:border-dark-border dark:bg-dark-card">
                <div className="absolute inset-y-0 left-0 w-1.5 bg-primary" />
                <div className="flex items-start justify-between gap-3 pl-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-primary/10 px-2 py-1 text-[8px] font-black uppercase tracking-wider text-primary">{offer.offerType || 'sale'}</span>
                      <span className={`rounded-full px-2 py-1 text-[8px] font-black uppercase ${active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>{active ? t('active') : expired ? t('expired') : t('paused')}</span>
                    </div>
                    <h2 className="mt-3 text-sm font-black text-slate-800 dark:text-zinc-100">{offer.title || offer.code || t('shop_special')}</h2>
                    <p className="mt-1 text-[10px] font-semibold leading-relaxed text-slate-400">{offer.description}</p>
                  </div>
                  <button aria-label={`${t('delete')} ${offer.title}`} onClick={() => confirm(t('delete_special_confirm')) && removePromoOffer(offer.id)} className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"><Trash2 className="h-4 w-4" /></button>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 pl-2 text-xs">
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/40"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">{t('benefit')}</span><strong className="mt-1 block text-slate-700 dark:text-zinc-200">{describeBenefit(offer)}</strong></div>
                  <div className="rounded-xl bg-slate-50 p-3 dark:bg-zinc-900/40"><span className="block text-[8px] font-black uppercase tracking-wider text-slate-400">{t('audience')}</span><strong className="mt-1 block text-slate-700 dark:text-zinc-200">{offer.audience === 'selected_customers' ? t('selected_count', { count: offer.targetCustomerIds?.length || 0 }) : offer.audience === 'subscribers' ? t('members') : t('everyone')}</strong></div>
                </div>
                <div className="mt-3 flex items-center gap-1.5 pl-2 text-[9px] font-bold text-slate-400"><Calendar className="h-3.5 w-3.5" />{offer.startDate} {t('to')} {offer.endDate}</div>
              </article>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-slate-100 bg-white p-5 text-left shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-7 dark:border-dark-border dark:bg-dark-card">
            <div className="mb-5 flex items-start justify-between border-b border-slate-100 pb-4 dark:border-dark-border">
              <div><h2 className="text-base font-black text-slate-800 dark:text-zinc-100">{t('create_shop_special')}</h2><p className="mt-0.5 text-[10px] font-semibold text-slate-400">{t('offer_auto_apply')}</p></div>
              <button aria-label={t('close')} onClick={() => !saving && setIsFormOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 text-xs font-bold text-slate-600">
              <fieldset><legend className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-400">{t('special_type')}</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-4">{offerTypes.map(type => { const Icon = type.icon; const selected = form.offerType === type.id; return <button type="button" key={type.id} onClick={() => selectType(type.id)} className={`min-h-20 rounded-2xl border p-3 text-left transition ${selected ? 'border-primary bg-primary/5 text-primary ring-2 ring-primary/10' : 'border-slate-100 dark:border-dark-border'}`}><Icon className="mb-2 h-4 w-4" /><span className="block text-[10px] font-black">{type.title}</span></button>; })}</div></fieldset>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block"><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('title')}</span><input required value={form.title} onChange={event => setForm({ ...form, title: event.target.value })} placeholder={t('offer_title_placeholder')} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 outline-none focus:border-primary dark:border-dark-border dark:bg-zinc-900" /></label>
                <label className="block"><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('minimum_order')}</span><input type="number" min="0" value={form.minOrder} onChange={event => setForm({ ...form, minOrder: Number(event.target.value) })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 outline-none focus:border-primary dark:border-dark-border dark:bg-zinc-900" /></label>
              </div>
              <label className="block"><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('customer_description')}</span><input required value={form.description} onChange={event => setForm({ ...form, description: event.target.value })} placeholder={t('offer_desc_placeholder')} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 outline-none focus:border-primary dark:border-dark-border dark:bg-zinc-900" /></label>

              {form.offerType !== 'addon' && (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('benefit')}</span><select value={form.discountType} onChange={event => setForm({ ...form, discountType: event.target.value as OfferDocument['discountType'] })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-border dark:bg-zinc-900"><option value="percentage">{t('percentage')}</option><option value="flat">{t('flat_amount')}</option><option value="free_delivery">{t('free_delivery')}</option></select></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{form.discountType === 'percentage' ? t('percent') : t('value')}</span><input type="number" min="0" max={form.discountType === 'percentage' ? 90 : undefined} disabled={form.discountType === 'free_delivery'} value={form.discountType === 'free_delivery' ? 0 : form.value} onChange={event => setForm({ ...form, value: Number(event.target.value) })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 disabled:opacity-50 dark:border-dark-border dark:bg-zinc-900" /></label>
                  <label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('maximum_saving')}</span><input type="number" min="0" disabled={form.discountType !== 'percentage'} value={form.maxDiscount || ''} onChange={event => setForm({ ...form, maxDiscount: Number(event.target.value) || undefined })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 disabled:opacity-50 dark:border-dark-border dark:bg-zinc-900" /></label>
                </div>
              )}

              {form.offerType === 'addon' && <div className="grid grid-cols-2 gap-3"><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('customer_buys')}</span><input type="number" min="1" max="10" value={form.buyQuantity} onChange={event => setForm({ ...form, buyQuantity: Number(event.target.value) })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-border dark:bg-zinc-900" /></label><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('customer_gets_free')}</span><input type="number" min="1" max="5" value={form.getQuantity} onChange={event => setForm({ ...form, getQuantity: Number(event.target.value) })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-border dark:bg-zinc-900" /></label></div>}

              {(form.offerType === 'addon' || form.scope === 'products') && <fieldset><legend className="mb-2 text-[10px] font-black uppercase text-slate-400">{t('eligible_products')}</legend><div className="max-h-40 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 p-3 dark:border-dark-border">{products.filter(product => product.status === 'active').map(product => <label key={product.id} className="flex items-center gap-2 rounded-xl p-2 hover:bg-slate-50 dark:hover:bg-zinc-900"><input type="checkbox" checked={form.productIds.includes(product.id)} onChange={() => setForm(current => ({ ...current, productIds: current.productIds.includes(product.id) ? current.productIds.filter(id => id !== product.id) : [...current.productIds, product.id] }))} /><span className="flex-1 truncate text-[11px] font-bold text-slate-700 dark:text-zinc-200">{product.name}</span><span className="text-[10px] text-slate-400">₹{product.price}</span></label>)}</div></fieldset>}

              {form.offerType === 'loyalty' && <fieldset><legend className="mb-2 flex items-center gap-1 text-[10px] font-black uppercase text-slate-400"><Users className="h-3.5 w-3.5" /> {t('select_loyal_customers')}</legend><div className="max-h-48 space-y-2 overflow-y-auto rounded-2xl border border-slate-100 p-3 dark:border-dark-border">{customers.length ? customers.map(customer => <label key={customer.id} className="flex items-center gap-2 rounded-xl p-2 hover:bg-amber-50/50"><input type="checkbox" checked={form.targetCustomerIds?.includes(customer.id)} onChange={() => setForm(current => ({ ...current, targetCustomerIds: current.targetCustomerIds?.includes(customer.id) ? current.targetCustomerIds.filter(id => id !== customer.id) : [...(current.targetCustomerIds || []), customer.id] }))} /><span className="flex-1"><strong className="block text-[11px] text-slate-700 dark:text-zinc-200">{customer.name}</strong><span className="text-[9px] text-slate-400">{t('customer_order_spend', { orders: customer.orders, spent: Math.round(customer.spent) })}</span></span></label>) : <p className="p-4 text-center text-[10px] text-slate-400">{t('customers_after_order')}</p>}</div></fieldset>}

              {form.offerType === 'subscription' && <div className="grid grid-cols-2 gap-3"><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('plan_price')}</span><input type="number" min="0" value={form.subscriptionPrice} onChange={event => setForm({ ...form, subscriptionPrice: Number(event.target.value) })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-border dark:bg-zinc-900" /></label><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('billing_period')}</span><select value={form.billingPeriod} onChange={event => setForm({ ...form, billingPeriod: event.target.value as 'monthly' | 'quarterly' })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-border dark:bg-zinc-900"><option value="monthly">{t('monthly')}</option><option value="quarterly">{t('quarterly')}</option></select></label></div>}

              <div className="grid grid-cols-2 gap-3"><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('starts')}</span><input required type="date" min={localDate()} value={form.startDate} onChange={event => setForm({ ...form, startDate: event.target.value })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-border dark:bg-zinc-900" /></label><label><span className="mb-1 block text-[10px] font-black uppercase text-slate-400">{t('ends')}</span><input required type="date" min={form.startDate} value={form.endDate} onChange={event => setForm({ ...form, endDate: event.target.value })} className="w-full rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-dark-border dark:bg-zinc-900" /></label></div>

              {error && <p role="alert" className="rounded-xl border border-red-100 bg-red-50 p-3 text-[11px] font-bold text-red-600">{error}</p>}
              <div className="flex justify-end gap-3 border-t border-slate-100 pt-4 dark:border-dark-border"><button type="button" disabled={saving} onClick={() => setIsFormOpen(false)} className="min-h-10 rounded-xl border border-slate-200 px-4 text-xs font-black text-slate-600">{t('cancel')}</button><button type="submit" disabled={saving} className="min-h-10 rounded-xl bg-primary px-5 text-xs font-black text-white disabled:opacity-50">{saving ? t('saving') : t('publish_special')}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
