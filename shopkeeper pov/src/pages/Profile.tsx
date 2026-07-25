import { useState, useEffect } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { useDiagnostics } from '../core/diagnostics/diagnostics';
import { useLanguage } from '../context/LanguageContext';
import { 
  MapPin, 
  Save, 
  AlertTriangle,
  Store,
  User,
  Phone,
  Clock,
  LogOut,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { uploadFile, STORAGE_PATHS } from '../infrastructure/storage/localStorage';

export default function Profile() {
  const { shop, user, updateShop, logoutOwner, theme, toggleTheme } = useAppStore();
  const showInternalDiagnostics = import.meta.env.DEV && new URLSearchParams(window.location.search).has('diagnostics');
  const { t } = useLanguage();
  const trackComponent = useDiagnostics(state => state.trackComponent);
  useEffect(() => {
    trackComponent('Profile', 'mount');
  }, [trackComponent]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Upload progress states
  const [logoProgress, setLogoProgress] = useState(0);
  const [bannerProgress, setBannerProgress] = useState(0);

  // Form State
  const [name, setName] = useState(shop?.name || '');
  const [address, setAddress] = useState(shop?.address || '');
  const [openingTime, setOpeningTime] = useState(shop?.openingTime || '09:00');
  const [closingTime, setClosingTime] = useState(shop?.closingTime || '21:00');
  const [deliveryRadius, setDeliveryRadius] = useState(shop?.deliveryRadius || 5.0);
  const [phone, setPhone] = useState(shop?.ownerPhone || '');

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'banner') => {
    const file = e.target.files?.[0];
    if (!file || !shop) return;

    const setProgress = type === 'logo' ? setLogoProgress : setBannerProgress;
    setProgress(1);
    setError(null);
    setSuccess(null);

    try {
      const storagePath = type === 'logo' 
        ? STORAGE_PATHS.shopLogo(shop?.id || '') 
        : STORAGE_PATHS.shopBanner(shop?.id || '');
      
      const downloadUrl = await uploadFile(storagePath, file, {
        compress: true,
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
        onProgress: (p) => setProgress(Math.round(p))
      });

      if (type === 'logo') {
        await updateShop({ image: downloadUrl, logo: downloadUrl, logoUrl: downloadUrl });
      } else {
        await updateShop({ coverImage: downloadUrl, bannerUrl: downloadUrl });
      }
      setSuccess(`${type === 'logo' ? 'Logo' : 'Cover banner'} uploaded successfully!`);
      setTimeout(() => setSuccess(null), 3000);
    } catch {
      setError(`Failed to upload ${type}. Check your connection and image file, then try again.`);
      setTimeout(() => setError(null), 12000);
    } finally {
      setProgress(0);
    }
  };
  
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !address) {
      setError('Shop Name and Address are required.');
      return;
    }

    setLoading(true);
    setSuccess(null);
    setError(null);

    try {
      await updateShop({
        name,
        address,
        ownerPhone: phone,
        openingTime,
        closingTime,
        deliveryRadius
      });
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (e: any) {
      setError(e.message || 'Failed to update store settings.');
    } finally {
      setLoading(false);
    }
  };

  const toggleStoreStatus = async () => {
    if (!shop) return;
    const nextStatus = shop.status === 'open' ? 'closed' : 'open';
    await updateShop({ status: nextStatus });
  };

  useEffect(() => {
    trackComponent('Profile', 'render');
  });
  return (
    <div className="space-y-5 max-w-md mx-auto pb-8 text-xs text-left">
      {/* Header */}
      <div>
        <h1 className="text-xl font-black text-slate-800 dark:text-zinc-150 flex items-center gap-2">
          👤 Profile Settings
        </h1>
        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
          Store Timings & Credentials
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-2xl font-black">
          {success}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl font-black">
          {error}
        </div>
      )}

      {/* STORE STATUS TOGGLE BLOCK */}
      {shop && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-800 dark:text-zinc-200 text-sm">Store Availability</h3>
              <p className="text-[10px] text-slate-450 font-bold leading-none mt-0.5">Toggle to instantly open or close your store</p>
            </div>
            <button
              type="button"
              onClick={toggleStoreStatus}
              className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer select-none ${
                shop.status === 'open' ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-zinc-800'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                  shop.status === 'open' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          
          <div className={`p-3.5 rounded-2xl text-[10px] font-black text-left flex items-start gap-2.5 ${
            shop.status === 'open'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10'
              : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/10'
          }`}>
            <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
            <span>
              {shop.status === 'open' 
                ? 'Your store is currently OPEN. Customers can browse your catalog, add products to cart, and place orders.' 
                : 'Your store is currently CLOSED. Customer checkouts are blocked, but they can still browse products.'}
            </span>
          </div>
        </div>
      )}

      {/* STORE BRANDING UPLOADS */}
      {shop && (
        <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl space-y-4 shadow-xs text-left">
          <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-dark-border/40">Store Branding</h3>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Shop Logo */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Shop Logo Image</span>
              <div className="flex items-center gap-3">
                <div className="h-16 w-16 bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-dark-border rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
                  {shop.logoUrl || shop.logo || shop.image ? (
                    <img src={shop.logoUrl || shop.logo || shop.image} alt="Logo" className="h-full w-full object-cover" />
                  ) : (
                    <Store className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-zinc-800 hover:text-emerald-500 rounded-xl cursor-pointer border border-slate-150 dark:border-dark-border transition text-[10px] font-black uppercase">
                    <Upload className="h-3.5 w-3.5" /> Change Logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'logo')}
                    />
                  </label>
                  {logoProgress > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                      <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{ width: `${logoProgress}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Shop Banner */}
            <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-455 uppercase tracking-wider block">Store Front Cover Banner</span>
              <div className="flex items-center gap-3">
                <div className="h-16 w-24 bg-slate-50 dark:bg-zinc-900 border border-slate-200/50 dark:border-dark-border rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
                  {shop.bannerUrl || shop.coverImage ? (
                    <img src={shop.bannerUrl || shop.coverImage} alt="Banner" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1 space-y-1">
                  <label className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 dark:bg-zinc-800 hover:text-emerald-500 rounded-xl cursor-pointer border border-slate-150 dark:border-dark-border transition text-[10px] font-black uppercase">
                    <Upload className="h-3.5 w-3.5" /> Change Banner
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleImageUpload(e, 'banner')}
                    />
                  </label>
                  {bannerProgress > 0 && (
                    <div className="w-full bg-slate-100 rounded-full h-1 mt-1">
                      <div className="bg-emerald-500 h-1 rounded-full transition-all" style={{ width: `${bannerProgress}%` }}></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* THEME TOGGLE SWITCH BLOCK */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl space-y-3.5 shadow-xs text-left">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-black text-slate-800 dark:text-zinc-200 text-sm">App Theme Style</h3>
            <p className="text-[10px] text-slate-450 font-bold leading-none mt-0.5">Choose between Light (Day) and Dark (Night) mode</p>
          </div>
          <button
            type="button"
            onClick={toggleTheme}
            className={`w-14 h-8 rounded-full p-1 transition-colors cursor-pointer select-none ${
              (theme as string) === 'dark' ? 'bg-primary' : 'bg-slate-200 dark:bg-zinc-800'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                (theme as string) === 'dark' ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* PROFILE DETAILS FORM */}
      <form onSubmit={handleSave} className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-5 rounded-3xl space-y-4 shadow-xs">
        <h3 className="text-[9px] font-black uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-50 dark:border-dark-border/40">Shop Parameters</h3>
        
        {/* Shop Name */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-455 uppercase tracking-wider block">{t('name')} *</label>
          <div className="relative">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none text-slate-800 dark:text-zinc-105"
            />
            <Store className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Owner Name (Read Only) */}
        <div className="space-y-1 opacity-70">
          <label className="text-[10px] font-black text-slate-455 uppercase tracking-wider block">Owner Name</label>
          <div className="relative">
            <input
              type="text"
              value={user?.fullName || ''}
              disabled
              className="w-full p-2.5 pl-9 bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-dark-border rounded-xl font-bold outline-none text-slate-500"
            />
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Owner Phone (Read Only) */}
        <div className="space-y-1 opacity-70">
          <label className="text-[10px] font-black text-slate-455 uppercase tracking-wider block">Owner Phone Number</label>
          <div className="relative">
            <input
              type="text"
              value={user?.phone || ''}
              disabled
              className="w-full p-2.5 pl-9 bg-slate-100 dark:bg-zinc-800/60 border border-slate-200/50 dark:border-dark-border rounded-xl font-bold outline-none text-slate-500 font-mono"
            />
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Store Contact Phone */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('phone')}</label>
          <div className="relative">
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono text-slate-800 dark:text-zinc-105"
            />
            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Opening/Closing Timings */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('store_timings')}</label>
            <div className="relative">
              <input
                type="time"
                value={openingTime}
                onChange={(e) => setOpeningTime(e.target.value)}
                className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono text-slate-800 dark:text-zinc-105"
              />
              <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Closing Time</label>
            <div className="relative">
              <input
                type="time"
                value={closingTime}
                onChange={(e) => setClosingTime(e.target.value)}
                className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono text-slate-800 dark:text-zinc-105"
              />
              <Clock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Delivery Radius */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">Delivery Radius (km)</label>
          <div className="relative">
            <input
              type="number"
              step="0.5"
              value={deliveryRadius}
              onChange={(e) => setDeliveryRadius(parseFloat(e.target.value) || 1.0)}
              className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none font-mono text-slate-800 dark:text-zinc-105"
            />
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Shop Address */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-450 uppercase tracking-wider block">{t('address')} *</label>
          <div className="relative">
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              rows={2}
              className="w-full p-2.5 pl-9 bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border rounded-xl font-bold outline-none text-slate-800 dark:text-zinc-105"
            />
            <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-2 border-t border-slate-50 dark:border-dark-border/40">
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary hover:bg-emerald-600 text-white font-black py-3 rounded-2xl cursor-pointer text-center uppercase tracking-wider text-xs shadow-xs flex items-center justify-center gap-1.5"
          >
            <Save className="h-4 w-4" /> {loading ? t('saving') : t('save_store_details')}
          </button>
        </div>
      </form>

      {/* LOGOUT BLOCK */}
      <div className="bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border p-4 rounded-3xl shadow-xs">
        <button
          onClick={logoutOwner}
          className="w-full bg-red-50 hover:bg-red-100 text-red-505 font-black py-3 rounded-2xl cursor-pointer text-center uppercase tracking-wider text-xs flex items-center justify-center gap-1.5"
        >
          <LogOut className="h-4.5 w-4.5" /> {t('logout')}
        </button>
      </div>

      {showInternalDiagnostics && <div className="mt-8 p-4 bg-slate-900 text-zinc-300 rounded-3xl border border-white/10 space-y-2.5 font-mono text-[10px] text-left">
        <h4 className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">🔒 Auth & Storage Diagnostics</h4>
        <div className="space-y-1">
          <p>• Auth User UID: <span className="text-white font-bold">{user?.uid || 'null'}</span></p>
          <p>• Profile shopId: <span className="text-white font-bold">{user?.shopId || 'null'}</span></p>
          <p>• Shop Doc ID: <span className="text-white font-bold">{shop?.id || 'null'}</span></p>
          <p>• Shop ownerId: <span className="text-white font-bold">{shop?.ownerId || 'null'}</span></p>
          <p>• UID Match status: <span className={user?.uid && shop?.ownerId && user.uid === shop.ownerId ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
            {user?.uid && shop?.ownerId && user.uid === shop.ownerId ? "MATCHED (OK)" : "MISMATCHED / MISSING"}
          </span></p>
          <p>• Storage Rules path format: <span className="text-amber-400">shops/{shop?.id || 'shopId'}/logo.png</span></p>
        </div>
      </div>}
    </div>
  );
}
