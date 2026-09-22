import React, { useState, useEffect, useRef } from 'react';
import { readSetupDraft, saveSetupDraft, clearSetupDraft, pendingSetupKey } from '../lib/setupDraft';
import { mapFirestoreDocToProduct } from '../infrastructure/repositories/productRepository';
import { withDeadline } from '../lib/withDeadline';
import { useAppStore } from '../core/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { Store, Plus, Trash2, Camera, CheckCircle, LogOut, FileText, MapPin, Compass, Tag, ArrowRight } from 'lucide-react';
import { shopRepository } from '../infrastructure/repositories/shopRepository';
import { doc, writeBatch } from 'firebase/firestore';
import { db } from '../infrastructure/firebase/firebase';
import { uploadFile } from '../infrastructure/storage/localStorage';
import ProductSuggestions from '../components/ProductSuggestions';
import { useLanguage } from '../context/LanguageContext';

interface TempProduct {
  id: string;
  description: string;
  name: string;
  price: number;
  mrp: number;
  stock: number;
  category: string;
  imageFile: File | null;
  imagePreview: string;
}

export default function Onboarding() {
  const { user, logoutOwner } = useAppStore();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [setupProgress, setSetupProgress] = useState('');
  const [setupError, setSetupError] = useState('');
  const setupId = useRef(`shop_${crypto.randomUUID()}`);
  const submitting = useRef(false);
  const completed = useRef(false);
  const [draftReady, setDraftReady] = useState(false);

  // Step 1: Shop Details States
  const [shopName, setShopName] = useState('');
  const [shopCategories, setShopCategories] = useState<string[]>(['groceries']);

  const [shopAddress, setShopAddress] = useState('');
  const [openingTime, setOpeningTime] = useState('08:00');
  const [closingTime, setClosingTime] = useState('22:00');
  const [deliveryRadius, setDeliveryRadius] = useState(5.0);
  const [shopImageFile, setShopImageFile] = useState<File | null>(null);
  const [shopImagePreview, setShopImagePreview] = useState('');

  // Geolocation Coordinates
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  // Step 2: Product Addition States
  const [prodName, setProdName] = useState('');
  const [prodDescription, setProdDescription] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodMrp, setProdMrp] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCategory, setProdCategory] = useState('groceries');
  const [prodImageFile, setProdImageFile] = useState<File | null>(null);
  const [prodImagePreview, setProdImagePreview] = useState('');

  const [productsList, setProductsList] = useState<TempProduct[]>([]);

  const draft = { setupId: setupId.current, step, shopName, shopCategories, shopAddress, openingTime, closingTime, deliveryRadius, shopImageFile, latitude, longitude, prodName, prodDescription, prodPrice, prodMrp, prodStock, prodCategory, prodImageFile, prodImagePreview: prodImageFile ? '' : prodImagePreview, productsList: productsList.map(p => ({ ...p, imagePreview: p.imageFile ? '' : p.imagePreview })) };
  useEffect(() => {
    if (!user?.uid) return;
    let active = true;
    withDeadline(readSetupDraft<typeof draft>(user.uid), 'Saved setup could not be opened.', 10000).then(saved => {
      if (!active) return;
      if (!saved) { setDraftReady(true); return; }
      setupId.current = saved.setupId;
      setStep(saved.step); setShopName(saved.shopName); setShopCategories(saved.shopCategories);
      setShopAddress(saved.shopAddress); setOpeningTime(saved.openingTime); setClosingTime(saved.closingTime); setDeliveryRadius(saved.deliveryRadius);
      setShopImageFile(saved.shopImageFile); setShopImagePreview(saved.shopImageFile ? URL.createObjectURL(saved.shopImageFile) : '');
      setLatitude(saved.latitude); setLongitude(saved.longitude);
      setProdName(saved.prodName); setProdDescription(saved.prodDescription); setProdPrice(saved.prodPrice); setProdMrp(saved.prodMrp); setProdStock(saved.prodStock); setProdCategory(saved.prodCategory);
      setProdImageFile(saved.prodImageFile); setProdImagePreview(saved.prodImageFile ? URL.createObjectURL(saved.prodImageFile) : saved.prodImagePreview);
      setProductsList(saved.productsList.map(p => ({ ...p, imagePreview: p.imageFile ? URL.createObjectURL(p.imageFile) : p.imagePreview })));
      setDraftReady(true);
    }).catch(() => { if (active) setSetupError('Your saved setup could not be opened. Keep this screen open and retry.'); })
      ;
    return () => { active = false; };
  }, [user?.uid]);
  useEffect(() => {
    if (!draftReady || !user || completed.current) return;
    localStorage.setItem(pendingSetupKey(user.uid), setupId.current);
    void saveSetupDraft(user.uid, draft).catch(() => setSetupError('This device could not save the setup draft. Keep the app open until setup completes.'));
  }, [draftReady, user?.uid, step, shopName, shopCategories, shopAddress, openingTime, closingTime, deliveryRadius, shopImageFile, latitude, longitude, prodName, prodDescription, prodPrice, prodMrp, prodStock, prodCategory, prodImageFile, prodImagePreview, productsList]);

  // Category choices with emojis and titles
  const categoryChoices = [
    { id: 'groceries', name: t('cat_groceries'), emoji: '🍎' },
    { id: 'fruits-veg', name: t('cat_fruits_vegetables'), emoji: '🥦' },
    { id: 'snacks-bev', name: t('cat_snacks_beverages'), emoji: '🍿' },
    { id: 'medical', name: t('cat_medical'), emoji: '💊' },
    { id: 'electronics', name: t('cat_electronics'), emoji: '🔌' },
    { id: 'stationery', name: t('cat_stationery'), emoji: '✏️' },
    { id: 'fashion', name: t('cat_fashion'), emoji: '👕' },
    { id: 'books', name: t('cat_books'), emoji: '📚' },
    { id: 'home-essentials', name: t('cat_home_essentials'), emoji: '🧼' },
    { id: 'pet-supplies', name: t('cat_pet_supplies'), emoji: '🐾' },
    { id: 'beauty', name: t('cat_beauty'), emoji: '💄' }
  ];

  // Try to detect coordinates automatically on mount
  useEffect(() => {
    if (draftReady && step === 1 && latitude === null && longitude === null) {
      handleDetectGPS(true); // silent initial load attempt
    }
  }, [step, draftReady]);

  const handleDetectGPS = (silent = false) => {
    if (!silent) setDetectingGps(true);
    
    if (!navigator.geolocation) {
      if (!silent) alert(t('geolocation_unsupported'));
      setDetectingGps(false);
      return;
    }

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLatitude(position.coords.latitude);
          setLongitude(position.coords.longitude);
          setDetectingGps(false);
        },
        () => {
          setLatitude(0);
          setLongitude(0);
          if (!silent) {
            alert(t('error_location_required'));
          }
          setDetectingGps(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch {
      setLatitude(0);
      setLongitude(0);
      setDetectingGps(false);
    }
  };

  const handleAddProductToList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim() || !prodPrice || !prodStock) return;

    const priceNum = parseFloat(prodPrice);
    const mrpNum = prodMrp ? parseFloat(prodMrp) : priceNum;

    if (mrpNum > 0 && priceNum > mrpNum) {
      alert(t('price_above_mrp', { price: priceNum, mrp: mrpNum }));
      return;
    }

    const newProd: TempProduct = {
      id: `prod_${crypto.randomUUID()}`,
      description: prodDescription,
      name: prodName,
      price: priceNum,
      mrp: mrpNum,
      stock: parseInt(prodStock),
      category: prodCategory,
      imageFile: prodImageFile,
      imagePreview: prodImagePreview
    };

    setProductsList(prev => [...prev, newProd]);
    
    // Reset product inputs
    setProdName('');
    setProdDescription('');
    setProdPrice('');
    setProdMrp('');
    setProdStock('');
    setProdImageFile(null);
    setProdImagePreview('');
  };

  const handleRemoveProductFromList = (index: number) => {
    setProductsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleCompleteSetup = async () => {
    if (!user || submitting.current || !draftReady) return;
    if (prodName.trim()) { setSetupError('Tap Add Product to include the product you are editing before completing setup.'); return; }
    if (!db) { setSetupError('Shop service is unavailable. Please reopen the app.'); return; }
    if (productsList.length > 400) { setSetupError('Add up to 400 products during setup. Add more from Products afterwards.'); return; }
    if (!navigator.onLine) { setSetupError('You are offline. Reconnect and try again.'); return; }
    if (!shopName.trim() || !shopAddress.trim()) {
      alert(t('error_shop_details'));
      setStep(1);
      return;
    }
    if (productsList.length === 0) {
      alert(t('error_add_product'));
      return;
    }

    if (!latitude || !longitude) {
      alert(t('error_location_required'));
      return;
    }

    submitting.current = true;
    setLoading(true);
    setSetupError('');
    const save = <T,>(operation: Promise<T>, stage: string) => {
      setSetupProgress(stage);
      return withDeadline(operation, `${stage} timed out. Check your connection and retry. Your entries are still here.`);
    };

    try {
      const generatedShopId = setupId.current;
      const updatedProfile = {
        ...user,
        shopId: generatedShopId,
        accountStatus: 'pending' as const
      };
      let shopImageUrl = '';

      // Create the shop first so Storage Rules can confirm its ownership before uploads.
      const newShopDoc = {
        id: generatedShopId,
        name: shopName,
        ownerId: user.uid,
        image: shopImageUrl,
        logo: shopImageUrl, // schema alignment
        logoUrl: shopImageUrl, // persistent reference URL
        coverImage: shopImageUrl, // schema alignment
        bannerUrl: shopImageUrl, // persistent reference URL
        rating: 5.0,
        reviewsCount: 0,
        deliveryTime: 20,
        distance: 1.0,
        deliveryFee: 15,
        deliveryRadius: deliveryRadius || 5.0,
        openingTime: openingTime || '08:00',
        closingTime: closingTime || '22:00',
        productsCount: productsList.length,
        status: 'open' as const,
        isOpen: true, // schema alignment
        featured: false,
        address: shopAddress,
        lat: latitude, // resolved GPS coordinate
        lng: longitude, // resolved GPS coordinate
        categories: shopCategories,
        ownerName: user.fullName || (user as any).name || 'Merchant Owner',
        ownerPhone: user.phone || (user as any).phoneNumber || '9999999999'
      };

      await save(shopRepository.createShop(generatedShopId, newShopDoc as any), 'Saving shop details');

      if (shopImageFile) {
        try {
          setSetupProgress('Uploading shop image');
          shopImageUrl = await uploadFile(`shops/${generatedShopId}/logo.png`, shopImageFile, { compress: true, quality: 0.8 });
          Object.assign(newShopDoc, {
            image: shopImageUrl,
            logo: shopImageUrl,
            logoUrl: shopImageUrl,
            coverImage: shopImageUrl,
            bannerUrl: shopImageUrl,
          });
          await save(shopRepository.updateShop(generatedShopId, newShopDoc), 'Saving shop image');
        } catch {
          throw new Error('Your shop photo was not saved. Please retry; all setup entries are retained.');
        }
      }

      // Create the initial products only after the shop exists.
      const batch = writeBatch(db);
      const savedProducts = [];
      for (const tempProd of productsList) {
        const productId = tempProd.id;
        const progress = `${productsList.indexOf(tempProd) + 1}/${productsList.length}: ${tempProd.name}`;
        let prodImageUrl = tempProd.imageFile ? '' : tempProd.imagePreview;
        
        if (tempProd.imageFile) {
          try {
            setSetupProgress(`Uploading product image ${progress}`);
            const path = `products/${generatedShopId}/${productId}/cover.jpg`;
            prodImageUrl = await uploadFile(path, tempProd.imageFile, { compress: true, quality: 0.75 });
          } catch {
            throw new Error(t('product_upload_failed', { name: tempProd.name }));
          }
        }

        const calculatedDiscount = Math.max(0, Math.round(((tempProd.mrp - tempProd.price) / tempProd.mrp) * 100));

        const productData = {
          id: productId,
          shopId: generatedShopId,
          shopName: shopName,
          name: tempProd.name,
          image: prodImageUrl,
          images: [prodImageUrl],
          price: tempProd.price,
          mrp: tempProd.mrp,
          discount: calculatedDiscount,
          category: tempProd.category,
          stock: tempProd.stock,
          totalStock: tempProd.stock,
          reservedStock: 0,
          description: tempProd.description || `${tempProd.name} available at ${shopName}.`,
          specs: { Source: 'Store Owner Upload' },
          tags: [tempProd.category, 'fresh'],
          featured: true,
          rating: 0,
          reviewsCount: 0,
          status: 'active'
        };
        savedProducts.push(mapFirestoreDocToProduct(productId, productData));
        batch.set(doc(db, 'products', productId), productData);
      }

      batch.update(doc(db, 'merchants', user.uid), { shopId: generatedShopId });
      await save(batch.commit(), 'Saving products and linking your shop');
      completed.current = true;
      useAppStore.setState({ shop: newShopDoc, user: updatedProfile, products: savedProducts, orders: [], reviews: [], offers: [], logs: [], notifications: [] });
      try { await clearSetupDraft(user.uid); } catch { localStorage.removeItem(pendingSetupKey(user.uid)); }
      void useAppStore.getState().syncAppData(updatedProfile);

      navigate('/', { replace: true });
    } catch (err: any) {
      setSetupError(t('setup_failed', { error: err.message || err }));
    } finally {
      submitting.current = false;
      setLoading(false);
      setSetupProgress('');
    }
  };

  const handleLogout = async () => {
    if (window.confirm(t('cancel_setup_confirm'))) {
      await logoutOwner();
      navigate('/login');
    }
  };

  // Profit Margin Indicator helper
  const calculatedDiscountPreview = () => {
    const price = parseFloat(prodPrice);
    const mrp = parseFloat(prodMrp);
    if (!isNaN(price) && !isNaN(mrp) && mrp > price) {
      return Math.round(((mrp - price) / mrp) * 100);
    }
    return 0;
  };

  if (!draftReady) return <main className="p-8 text-center"><p>{setupError || 'Restoring your shop setup…'}</p>{setupError && <button onClick={() => window.location.reload()} className="mt-4 rounded-xl bg-primary p-3 text-white">Retry</button>}</main>;

  return (
    <div className="merchant-auth-page min-h-screen bg-slate-50 dark:bg-dark-bg py-10 px-4 text-left transition-colors">
      <div className="merchant-auth-card max-w-2xl mx-auto bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        
        {/* Gradients */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-border pb-4 mb-6 z-10 relative">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">
                {t('store_onboarding')}
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold">
                {t('store_onboarding_desc')}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-505 transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
            title={t('logout')}
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>

        {/* Stepper Header */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <button
            onClick={() => setStep(1)}
            className={`py-3.5 rounded-2xl font-black text-xs text-center border transition-all cursor-pointer flex flex-col gap-0.5
              ${step === 1 
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-50 dark:bg-zinc-900 border-transparent text-slate-400 hover:bg-slate-100'}`}
          >
            <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-60">{t('step_one')}</span>
            <span>🏪 {t('store_details')}</span>
          </button>
          <button
            onClick={() => {
              if (!shopName.trim() || !shopAddress.trim()) {
                alert(t('error_shop_first'));
                return;
              }
              setStep(2);
            }}
            className={`py-3.5 rounded-2xl font-black text-xs text-center border transition-all cursor-pointer flex flex-col gap-0.5
              ${step === 2 
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-50 dark:bg-zinc-900 border-transparent text-slate-400 hover:bg-slate-100'}`}
          >
            <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-60">{t('step_two')}</span>
            <span>📦 {t('add_inventory')}</span>
          </button>
        </div>

        {/* STEP 1: Store details form */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
              {t('provide_store_details')}
            </h3>

            {/* Logo image upload */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                {t('store_logo_banner')}
              </label>
              {!shopImagePreview ? (
                <label className="border-2 border-dashed border-slate-150 dark:border-dark-border hover:border-emerald-500 rounded-2xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition bg-slate-50/50 dark:bg-zinc-900/5">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setShopImageFile(file);
                        setShopImagePreview(URL.createObjectURL(file));
                      }
                    }}
                    className="hidden"
                  />
                  <Camera className="h-6 w-6 text-slate-400" />
                  <span className="text-xs font-bold text-slate-650 dark:text-zinc-300">
                    {t('tap_upload_store_logo')}
                  </span>
                  <span className="text-[9px] text-slate-400">{t('supported_images')}</span>
                </label>
              ) : (
                <div className="relative rounded-2xl overflow-hidden border border-slate-100 dark:border-dark-border aspect-video flex items-center justify-center bg-slate-50 dark:bg-zinc-900 max-h-52">
                  <img
                    src={shopImagePreview}
                    alt="Shop Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                  <button
                    onClick={() => {
                      setShopImageFile(null);
                      setShopImagePreview('');
                    }}
                    className="absolute top-3 right-3 p-2 rounded-xl bg-red-500 hover:bg-red-650 text-white shadow-md transition cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Store Name Input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                {t('shop_name')}
              </label>
              <input
                type="text"
                placeholder={t('shop_name_placeholder')}
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
              />
            </div>

            {/* Custom Visual Category Selector Grid */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                {t('store_category')}
                <span className="block normal-case tracking-normal mt-1">Select all that apply · एक से अधिक चुन सकते हैं</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categoryChoices.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    aria-pressed={shopCategories.includes(cat.id)} onClick={() => setShopCategories(prev => prev.includes(cat.id) ? (prev.length > 1 ? prev.filter(id => id !== cat.id) : prev) : [...prev, cat.id])}
                    className={`p-3 rounded-2xl border text-xs font-black text-left flex items-center gap-2 transition-all cursor-pointer
                      ${shopCategories.includes(cat.id) 
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/10' 
                        : 'bg-slate-50 dark:bg-zinc-900 border-slate-100 dark:border-dark-border hover:bg-slate-100/60 dark:hover:bg-zinc-800'}`}
                  >
                    <span className="text-base">{cat.emoji}</span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Operating Hours & Delivery Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                  {t('opening_time')}
                </label>
                <input
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                  {t('closing_time')}
                </label>
                <input
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                  {t('delivery_radius')}
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="25"
                  value={deliveryRadius}
                  onChange={(e) => setDeliveryRadius(parseFloat(e.target.value) || 5.0)}
                  className="w-full px-3 py-2.5 text-xs bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                />
              </div>
            </div>

            {/* GPS Location Auto-Detection block */}
            <div className="bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-dark-border/60 p-4 rounded-2xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-zinc-200">{t('shop_coordinates')}</h4>
                  <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">{t('coordinates_desc')}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDetectGPS(false)}
                  disabled={detectingGps}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-[10px] font-black uppercase rounded-xl tracking-wider shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Compass className={`h-3.5 w-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                  {detectingGps ? t('detecting_location') : t('detect_location')}
                </button>
              </div>

              {latitude && longitude ? (
                <div className="grid grid-cols-2 gap-2 bg-white dark:bg-zinc-950 border border-emerald-500/20 p-3 rounded-xl">
                  <div>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">{t('latitude')}</span>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || null)}
                      className="w-full text-xs font-mono font-black text-emerald-500 outline-none mt-0.5 bg-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">{t('longitude')}</span>
                    <input
                      type="number"
                      step="any"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || null)}
                      className="w-full text-xs font-mono font-black text-emerald-500 outline-none mt-0.5 bg-transparent"
                    />
                  </div>
                </div>
              ) : (
                <div className="text-[10px] text-amber-500 font-black p-2.5 bg-amber-500/5 rounded-xl border border-amber-500/10 flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span>{t('gps_not_set')}</span>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                {t('full_address')}
              </label>
              <textarea
                placeholder={t('address_placeholder')}
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold resize-none"
              />
            </div>

            {/* Store card preview */}
            <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-dark-border p-4.5 rounded-2xl space-y-3">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">{t('customer_store_preview')}</span>
              
              <div className="bg-white dark:bg-dark-card border border-slate-150 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-md max-w-xs mx-auto">
                <div className="h-28 bg-slate-100 dark:bg-zinc-900 relative">
                  {shopImagePreview ? (
                    <img src={shopImagePreview} alt="Store logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-emerald-100 to-emerald-200 dark:from-emerald-950 dark:to-zinc-900 text-emerald-600">
                      <Store className="h-7 w-7 opacity-30" />
                    </div>
                  )}
                  <span className="absolute top-2.5 right-2.5 bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                    {t('open')}
                  </span>
                </div>
                <div className="p-3 text-left space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-zinc-150 truncate">
                    {shopName.trim() || t('my_kirana_store')}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                    📍 {shopAddress.trim() || t('store_location_address')}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-450 font-black pt-2 border-t border-slate-50 dark:border-zinc-900 uppercase">
                    <span className="text-amber-500 font-bold">★ 5.0</span>
                    <span>•</span>
                    <span>15 min</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-black">
                      {categoryChoices.filter(c => shopCategories.includes(c.id)).map(c => c.name).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!shopName.trim() || !shopAddress.trim()) {
                  alert(t('error_store_fields'));
                  return;
                }
                setStep(2);
              }}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-500/10 cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span>{t('continue_inventory')}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Product Addition Form */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                {t('add_initial_products')}
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-tight">
                {t('add_initial_products_desc')}
              </p>
            </div>

            <form onSubmit={handleAddProductToList} className="p-4.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-dark-border/50 space-y-4">
              <ProductSuggestions onSelect={p => { setProdName(p.name); setProdDescription(p.description); setProdCategory(p.shopCategory); setProdImageFile(null); setProdImagePreview(p.image); }} />
              <label className="block text-xs font-semibold">{t('description')}
                <textarea value={prodDescription} onChange={e => setProdDescription(e.target.value)} className="block w-full rounded-xl border border-slate-200 bg-white text-slate-900 p-2 mt-1" />
              </label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    {t('name')}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={t('initial_product_placeholder')}
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  />
                </div>

                {/* Product Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    {t('category')}
                  </label>
                  <select
                    value={prodCategory}
                    onChange={(e) => setProdCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  >
                    {categoryChoices.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dynamic Price Calculations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Price */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    {t('price')}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={t('price_example')}
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  />
                </div>

                {/* MRP */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    {t('mrp')}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={t('mrp_example')}
                    value={prodMrp}
                    onChange={(e) => setProdMrp(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  />
                </div>

                {/* Stock Count */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    {t('initial_stock')}
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder={t('stock_example')}
                    value={prodStock}
                    onChange={(e) => setProdStock(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  />
                </div>
              </div>

              {/* Profit discount tag review */}
              {calculatedDiscountPreview() > 0 && (
                <div className="text-[10px] text-emerald-500 font-black p-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 shrink-0" />
                  <span>{t('calculated_discount', { value: calculatedDiscountPreview() })}</span>
                </div>
              )}

              {/* Product Photo Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-extrabold uppercase text-slate-400">
                  {t('product_cover_optional')}
                </label>
                {!prodImagePreview ? (
                  <label className="border border-dashed border-slate-200 dark:border-zinc-850 hover:border-emerald-500 rounded-xl p-4 flex flex-col items-center justify-center gap-1 cursor-pointer transition bg-white dark:bg-zinc-850">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setProdImageFile(file);
                          setProdImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                    <Plus className="h-4 w-4 text-slate-400" />
                    <span className="text-[10px] font-bold text-slate-500">{t('tap_upload_cover')}</span>
                  </label>
                ) : (
                  <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800 w-full h-24 flex items-center justify-center bg-white dark:bg-zinc-850">
                    <img
                      src={prodImagePreview}
                      alt="Product Preview"
                      className="max-h-full max-w-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setProdImageFile(null);
                        setProdImagePreview('');
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-red-500 text-white cursor-pointer"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-900 text-white dark:bg-zinc-850 dark:hover:bg-zinc-800 rounded-xl font-extrabold text-[10px] uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1"
              >
                <Plus className="h-4 w-4" />
                {t('add_item_inventory')}
              </button>
            </form>

            {/* List of currently added products */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                {t('added_catalog', { count: productsList.length })}
              </span>
              
              {productsList.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-100 dark:border-dark-border rounded-2xl text-center text-slate-400 text-xs font-semibold">
                  {t('no_initial_items')}
                </div>
              ) : (
                <div className="border border-slate-100 dark:border-dark-border rounded-2xl overflow-hidden divide-y divide-slate-50 dark:divide-zinc-900 bg-white dark:bg-zinc-900 max-h-56 overflow-y-auto">
                  {productsList.map((item, idx) => (
                    <div key={idx} className="p-3.5 flex items-center justify-between gap-3 text-xs font-bold">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center flex-shrink-0">
                          {item.imagePreview ? (
                            <img src={item.imagePreview} alt={item.name} className="w-full h-full object-cover" />
                          ) : (
                            <FileText className="h-4.5 w-4.5 text-slate-400" />
                          )}
                        </div>
                        <div>
                          <h5 className="text-slate-850 dark:text-white truncate max-w-[150px]">{item.name}</h5>
                          <span className="text-[9px] text-slate-400 font-semibold block">{item.category.toUpperCase()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-slate-850 dark:text-zinc-200">₹{item.price}</span>
                          <span className="text-[9px] text-emerald-500 font-extrabold block">{t('stock')}: {item.stock}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductFromList(idx)}
                          className="p-1.5 text-red-550 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Setup submission */}
            {setupError && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{setupError}</p>}
            {loading && <p role="status" className="text-sm text-slate-600">{setupProgress}</p>}
            <button
              onClick={handleCompleteSetup}
              disabled={loading || !draftReady || productsList.length === 0}
              className="w-full py-4 bg-gradient-to-tr from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle className="h-4.5 w-4.5" />
              )}
              <span>{t('complete_setup')}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

