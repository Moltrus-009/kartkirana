import React, { useState, useEffect } from 'react';
import { useAppStore } from '../core/store/useAppStore';
import { useNavigate } from 'react-router-dom';
import { Store, Plus, Trash2, Camera, CheckCircle, LogOut, FileText, MapPin, Compass, Tag, ArrowRight } from 'lucide-react';
import { shopRepository } from '../infrastructure/repositories/shopRepository';
import { userRepository } from '../infrastructure/repositories/userRepository';
import { productRepository } from '../infrastructure/repositories/productRepository';
import { uploadFile } from '../infrastructure/storage/localStorage';

interface TempProduct {
  name: string;
  price: number;
  mrp: number;
  stock: number;
  category: string;
  imageFile: File | null;
  imagePreview: string;
}

export default function Onboarding() {
  const { user, setUser, setShop, logoutOwner } = useAppStore();
  const navigate = useNavigate();

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  // Step 1: Shop Details States
  const [shopName, setShopName] = useState('');
  const [shopCategory, setShopCategory] = useState('groceries');
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
  const [prodPrice, setProdPrice] = useState('');
  const [prodMrp, setProdMrp] = useState('');
  const [prodStock, setProdStock] = useState('');
  const [prodCategory, setProdCategory] = useState('groceries');
  const [prodImageFile, setProdImageFile] = useState<File | null>(null);
  const [prodImagePreview, setProdImagePreview] = useState('');

  const [productsList, setProductsList] = useState<TempProduct[]>([]);

  // Category choices with emojis and titles
  const categoryChoices = [
    { id: 'groceries', name: 'Groceries', emoji: '🍎' },
    { id: 'fruits-veg', name: 'Fruits & Vegetables', emoji: '🥦' },
    { id: 'snacks-bev', name: 'Snacks & Beverages', emoji: '🍿' },
    { id: 'medical', name: 'Medical/Pharmacy', emoji: '💊' },
    { id: 'electronics', name: 'Electronics', emoji: '🔌' },
    { id: 'stationery', name: 'Stationery', emoji: '✏️' },
    { id: 'fashion', name: 'Fashion', emoji: '👕' },
    { id: 'books', name: 'Books & Novelties', emoji: '📚' },
    { id: 'home-essentials', name: 'Home Essentials', emoji: '🧼' },
    { id: 'pet-supplies', name: 'Pet Supplies', emoji: '🐾' },
    { id: 'beauty', name: 'Beauty & Personal Care', emoji: '💄' }
  ];

  // Try to detect coordinates automatically on mount
  useEffect(() => {
    if (step === 1 && !latitude && !longitude) {
      handleDetectGPS(true); // silent initial load attempt
    }
  }, [step]);

  const handleDetectGPS = (silent = false) => {
    if (!silent) setDetectingGps(true);
    
    if (!navigator.geolocation) {
      if (!silent) alert('Geolocation is not supported by your browser.');
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
            alert('Unable to determine your location. A valid GPS location is required to onboard your shop.');
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
      alert(`Discounted price (₹${priceNum}) cannot exceed Maximum Retail Price (MRP ₹${mrpNum}).`);
      return;
    }

    const newProd: TempProduct = {
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
    if (!user) return;
    if (!shopName.trim() || !shopAddress.trim()) {
      alert('Please fill out all shop details in Step 1.');
      setStep(1);
      return;
    }
    if (productsList.length === 0) {
      alert('Please add at least one product with its stock to open your store.');
      return;
    }

    if (!latitude || !longitude) {
      alert('Unable to determine your location. Please capture your shop location using GPS before registering.');
      return;
    }

    setLoading(true);

    try {
      const generatedShopId = `shop_${crypto.randomUUID()}`;
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
        categories: [shopCategory],
        ownerName: user.fullName || (user as any).name || 'Merchant Owner',
        ownerPhone: user.phone || (user as any).phoneNumber || '9999999999'
      };

      await shopRepository.createShop(generatedShopId, newShopDoc as any);

      if (shopImageFile) {
        try {
          shopImageUrl = await uploadFile(`shops/${generatedShopId}/logo.png`, shopImageFile, { compress: true, quality: 0.8 });
          Object.assign(newShopDoc, {
            image: shopImageUrl,
            logo: shopImageUrl,
            logoUrl: shopImageUrl,
            coverImage: shopImageUrl,
            bannerUrl: shopImageUrl,
          });
          await shopRepository.updateShop(generatedShopId, newShopDoc);
        } catch {
          // The store remains usable without an optional logo; the merchant can retry from Profile.
        }
      }

      // Create the initial products only after the shop exists.
      for (const tempProd of productsList) {
        const productId = `prod_${crypto.randomUUID()}`;
        let prodImageUrl = '';
        
        if (tempProd.imageFile) {
          try {
            const path = `products/${generatedShopId}/${productId}/cover.jpg`;
            prodImageUrl = await uploadFile(path, tempProd.imageFile, { compress: true, quality: 0.75 });
          } catch {
            throw new Error(`Unable to upload the image for ${tempProd.name}. Please try again.`);
          }
        }

        const calculatedDiscount = Math.max(0, Math.round(((tempProd.mrp - tempProd.price) / tempProd.mrp) * 100));

        await productRepository.addProduct({
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
          description: `Fresh quality ${tempProd.name} now in stock at ${shopName}.`,
          specs: { Source: 'Store Owner Upload' },
          tags: [tempProd.category, 'fresh'],
          featured: true,
          rating: 0,
          reviewsCount: 0,
          status: 'active'
        } as any);
      }

      await userRepository.updateProfile(user.uid, { shopId: generatedShopId });
      setShop(newShopDoc);
      setUser(updatedProfile);

      navigate('/', { replace: true });
    } catch (err: any) {
      alert(`Registration setup failed: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Cancel setup and logout?')) {
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-dark-bg py-10 px-4 text-left transition-colors">
      <div className="max-w-2xl mx-auto bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        
        {/* Gradients */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-primary/10 rounded-full blur-3xl"></div>

        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-border pb-4 mb-6 z-10 relative">
          <div className="flex items-center gap-2">
            <Store className="h-6 w-6 text-emerald-500" />
            <div>
              <h2 className="text-base font-black text-slate-800 dark:text-white uppercase tracking-wider">
                Store Onboarding
              </h2>
              <span className="text-[10px] text-slate-400 font-semibold">
                Setup your store portal profile
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2.5 rounded-xl hover:bg-red-500/10 text-red-505 transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
            title="Log Out"
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
            <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-60">Step 1</span>
            <span>🏪 Store Details</span>
          </button>
          <button
            onClick={() => {
              if (!shopName.trim() || !shopAddress.trim()) {
                alert('Please fill out shop details first.');
                return;
              }
              setStep(2);
            }}
            className={`py-3.5 rounded-2xl font-black text-xs text-center border transition-all cursor-pointer flex flex-col gap-0.5
              ${step === 2 
                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                : 'bg-slate-50 dark:bg-zinc-900 border-transparent text-slate-400 hover:bg-slate-100'}`}
          >
            <span className="text-[9px] uppercase tracking-wider font-extrabold opacity-60">Step 2</span>
            <span>📦 Add Inventory</span>
          </button>
        </div>

        {/* STEP 1: Store details form */}
        {step === 1 && (
          <div className="space-y-6 animate-fade-in">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
              Provide Store Profile Details
            </h3>

            {/* Logo image upload */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                Store Logo Thumbnail Banner
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
                    Tap to upload store banner logo
                  </span>
                  <span className="text-[9px] text-slate-400">JPEG/PNG formats supported</span>
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
                Store Display Name
              </label>
              <input
                type="text"
                placeholder="e.g., Fresh Choice Kirana"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
              />
            </div>

            {/* Custom Visual Category Selector Grid */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                Store Category Type
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categoryChoices.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setShopCategory(cat.id)}
                    className={`p-3 rounded-2xl border text-xs font-black text-left flex items-center gap-2 transition-all cursor-pointer
                      ${shopCategory === cat.id 
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
                  Opening Time
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
                  Closing Time
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
                  Delivery Radius (km)
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
                  <h4 className="text-xs font-black text-slate-800 dark:text-zinc-200">Shop Physical Coordinates</h4>
                  <p className="text-[9px] text-slate-400 font-bold leading-none mt-0.5">Required for automatic distance calculations</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDetectGPS(false)}
                  disabled={detectingGps}
                  className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white text-[10px] font-black uppercase rounded-xl tracking-wider shadow-xs transition disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                >
                  <Compass className={`h-3.5 w-3.5 ${detectingGps ? 'animate-spin' : ''}`} />
                  {detectingGps ? 'Locating...' : 'Detect Coordinates'}
                </button>
              </div>

              {latitude && longitude ? (
                <div className="grid grid-cols-2 gap-2 bg-white dark:bg-zinc-950 border border-emerald-500/20 p-3 rounded-xl">
                  <div>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">Latitude</span>
                    <input
                      type="number"
                      step="any"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || null)}
                      className="w-full text-xs font-mono font-black text-emerald-500 outline-none mt-0.5 bg-transparent"
                    />
                  </div>
                  <div>
                    <span className="text-[8px] text-slate-400 font-extrabold uppercase">Longitude</span>
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
                  <span>GPS coordinates not set. Plattform default (Noida) will be written. Click detect above to fetch live position.</span>
                </div>
              )}
            </div>

            {/* Address */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-zinc-500 tracking-wider">
                Full Physical Address
              </label>
              <textarea
                placeholder="e.g., Shop No. 15, Ground Floor, Sector 62 Main Market, Noida"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 text-sm bg-slate-50 dark:bg-zinc-900 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold resize-none"
              />
            </div>

            {/* Store card preview */}
            <div className="bg-slate-50 dark:bg-zinc-900/30 border border-slate-100 dark:border-dark-border p-4.5 rounded-2xl space-y-3">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block">Live Store Card Customer View</span>
              
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
                    Open
                  </span>
                </div>
                <div className="p-3 text-left space-y-1">
                  <h4 className="font-extrabold text-sm text-slate-800 dark:text-zinc-150 truncate">
                    {shopName.trim() || 'My Kirana Store'}
                  </h4>
                  <p className="text-[10px] text-slate-400 truncate flex items-center gap-0.5">
                    📍 {shopAddress.trim() || 'Store Location Address'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] text-slate-450 font-black pt-2 border-t border-slate-50 dark:border-zinc-900 uppercase">
                    <span className="text-amber-500 font-bold">★ 5.0</span>
                    <span>•</span>
                    <span>15 min</span>
                    <span>•</span>
                    <span className="text-emerald-500 font-black">
                      {categoryChoices.find(c => c.id === shopCategory)?.name || 'Groceries'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                if (!shopName.trim() || !shopAddress.trim()) {
                  alert('Please fill out all store details fields.');
                  return;
                }
                setStep(2);
              }}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition shadow-lg shadow-emerald-500/10 cursor-pointer text-center flex items-center justify-center gap-1.5"
            >
              <span>Continue to Inventory Catalog Setup</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* STEP 2: Product Addition Form */}
        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-1">
              <h3 className="text-sm font-extrabold text-slate-800 dark:text-zinc-200">
                Add Initial Products to Catalog
              </h3>
              <p className="text-[10px] text-slate-400 font-semibold leading-tight">
                Add at least one product with its stock count. This enables checkouts from your local store.
              </p>
            </div>

            <form onSubmit={handleAddProductToList} className="p-4.5 rounded-2xl bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-dark-border/50 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Product Name */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    Product Item Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g., Farm Fresh Apples (1kg)"
                    value={prodName}
                    onChange={(e) => setProdName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  />
                </div>

                {/* Product Category */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    Product Category
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
                    Selling Price (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g., 90"
                    value={prodPrice}
                    onChange={(e) => setProdPrice(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  />
                </div>

                {/* MRP */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    Max Retail Price (MRP) (₹)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g., 100"
                    value={prodMrp}
                    onChange={(e) => setProdMrp(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-zinc-800 border border-slate-100 dark:border-dark-border focus:border-primary rounded-xl outline-none transition font-semibold"
                  />
                </div>

                {/* Stock Count */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400">
                    Initial Stock Count
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    placeholder="e.g., 50"
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
                  <span>Calculated discount markdown: {calculatedDiscountPreview()}% off MRP for customer checkout.</span>
                </div>
              )}

              {/* Product Photo Upload */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-extrabold uppercase text-slate-400">
                  Product Image Cover (Optional)
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
                    <span className="text-[10px] font-bold text-slate-500">Tap to upload cover</span>
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
                Add Item to Inventory
              </button>
            </form>

            {/* List of currently added products */}
            <div className="space-y-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                Added Catalog List ({productsList.length})
              </span>
              
              {productsList.length === 0 ? (
                <div className="p-8 border border-dashed border-slate-100 dark:border-dark-border rounded-2xl text-center text-slate-400 text-xs font-semibold">
                  No items added yet. Complete the form above to add products.
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
                          <span className="text-[9px] text-emerald-500 font-extrabold block">Stock: {item.stock}</span>
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
            <button
              onClick={handleCompleteSetup}
              disabled={loading || productsList.length === 0}
              className="w-full py-4 bg-gradient-to-tr from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle className="h-4.5 w-4.5" />
              )}
              <span>Complete Setup & Open Shop</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
