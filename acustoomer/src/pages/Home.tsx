import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ChevronDown, Moon, Sun, Search, Bell, Plus, Compass, 
  SlidersHorizontal, Star, ShoppingCart, Clock
} from 'lucide-react';
import { APP_CATEGORIES } from '../config/categories';
import { useAddress } from '../context/AddressContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useShops, useProducts, useBanners } from '../hooks/useData';
import { Dialog } from '../components/ui/Dialog';
import { Button } from '../components/ui/Button';
import { AddressSelectorModal } from '../components/AddressSelectorModal';
import { ProductCard } from '../components/product/ProductCard';
import { Skeleton } from '../components/ui/Skeleton';
import { useLanguage } from '../context/LanguageContext';
import { Shop, PromoBanner, UserAddress } from '../types';


// Reusable Shop Card
const ShopCardItem: React.FC<{ shop: Shop }> = ({ shop }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/shop/${shop.id}`)}
      className={`p-4 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-[20px] flex gap-4 transition-all duration-300 shadow-[0_4px_16px_rgba(46,125,50,0.03)] hover:shadow-[0_8px_24px_rgba(46,125,50,0.08)] cursor-pointer text-left ${!shop.isOpen ? 'opacity-70' : ''}`}
    >
      {/* Image on left */}
      <div className="relative h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-inner flex items-center justify-center p-1.5">
        <img src={shop.logo} alt={shop.name} className="h-full w-full object-cover rounded-xl" />
        {!shop.isOpen && (
          <div className="absolute inset-0 bg-slate-950/70 flex items-center justify-center">
            <span className="text-[8px] font-black uppercase text-white bg-red-600 px-1.5 py-0.5 rounded">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Details on right */}
      <div className="flex-1 flex flex-col justify-between min-w-0">
        <div>
          <div className="flex items-start justify-between gap-1">
            <h4 className="font-extrabold text-sm text-gray-800 dark:text-white truncate min-w-0 leading-snug">
              {shop.name}
            </h4>
            <div className="flex items-center gap-0.5 text-amber-500 text-xs font-black flex-shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-full">
              <Star className="h-3 w-3 fill-current" />
              <span>{shop.rating}</span>
            </div>
          </div>
          <span className="text-[9px] font-black text-[#1565C0] dark:text-[#1E88E5] uppercase tracking-wider block mt-1">
            {shop.categories.slice(0, 2).join(' • ')}
          </span>
          <span className="text-[10px] font-bold text-gray-400 dark:text-[#94A3B8] mt-1 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5 text-[#1E88E5]" />
            {shop.distance} • {shop.deliveryTime}
          </span>
        </div>

        {/* Promo tag */}
        {shop.offers && shop.offers.length > 0 && (
          <div className="mt-2.5">
            <span className="text-[9px] font-black text-orange-605 bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-2.5 py-1 rounded-xl border border-orange-500/15 uppercase tracking-wider">
              {shop.offers[0]}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

const CATEGORY_EMOJIS: Record<string, string> = {
  'groceries': '🥦',
  'fruits-veg': '🍎',
  'snacks-bev': '🍿',
  'bakery': '🥐',
  'personal-care': '🧼',
  'pet-supplies': '🐶'
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  // Core Data State using Zustand cached hooks
  const { shops, loading: shopsLoading } = useShops();
  const { products, loading: productsLoading } = useProducts();
  const { banners, loading: bannersLoading } = useBanners();
  const loading = shopsLoading || productsLoading || bannersLoading;
  const [activeBannerIdx, setActiveBannerIdx] = useState(0);

  // Address Selector Modal State
  const { addresses, selectedAddress, selectAddress, addAddress } = useAddress();
  const { cartItems, priceBreakdown } = useCart();
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isLocationOpen, setIsLocationOpen] = useState(false);

  // Wireframe UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'items'>('shops');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filters State
  const [shopSort, setShopSort] = useState<'distance' | 'rating' | 'eta' | null>(null);
  const [shopFeaturedOnly, setShopFeaturedOnly] = useState(false);
  const [shopOpenOnly, setShopOpenOnly] = useState(false);

  const [itemSort, setItemSort] = useState<'priceAsc' | 'priceDesc' | 'rating' | null>(null);
  const [itemVegOnly, setItemVegOnly] = useState(false);
  const [itemInStockOnly, setItemInStockOnly] = useState(false);

  // Banner Loop
  useEffect(() => {
    if (banners.length === 0) return;
    const interval = setInterval(() => {
      setActiveBannerIdx(prev => (prev + 1) % banners.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [banners]);

  const [isAddressEditorOpen, setIsAddressEditorOpen] = useState(false);

  // Handler for adding a new address
  const handleAddNewAddressFromHome = async (payload: Omit<UserAddress, 'id'>) => {
    try {
      const newAddr = await addAddress(payload);
      if (newAddr) {
        selectAddress(newAddr.id);
      }
      setIsLocationOpen(false);
    } catch (e) {
      alert('Failed to save address details.');
    }
  };

  const handleSelectAddress = (id: string) => {
    selectAddress(id);
    setIsLocationOpen(false);
  };

  const resetFilters = () => {
    setShopSort(null);
    setShopFeaturedOnly(false);
    setShopOpenOnly(false);
    setItemSort(null);
    setItemVegOnly(false);
    setItemInStockOnly(false);
    setSelectedCategory(null);
  };

  // Filter & Sort Shops List
  const getFilteredShops = () => {
    let result = [...shops];

    // Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(q) || 
        s.categories.some(cat => cat.toLowerCase().includes(q))
      );
    }

    // Category Ribbon Filter
    if (selectedCategory) {
      result = result.filter(s => s.categories.some(c => c.toLowerCase().includes(selectedCategory.toLowerCase()) || selectedCategory.toLowerCase().includes(c.toLowerCase())));
    }

    // Status Filters
    if (shopFeaturedOnly) {
      result = result.filter(s => s.featured);
    }
    if (shopOpenOnly) {
      result = result.filter(s => s.isOpen);
    }

    // Sorting
    if (shopSort === 'distance') {
      result.sort((a, b) => parseFloat(a.distance) - parseFloat(b.distance));
    } else if (shopSort === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    } else if (shopSort === 'eta') {
      result.sort((a, b) => parseInt(a.deliveryTime) - parseInt(b.deliveryTime));
    }

    return result;
  };

  // Filter & Sort Products List
  const getFilteredProducts = () => {
    let result = [...products];

    // Search Query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) || 
        p.category.toLowerCase().includes(q) ||
        p.shopName.toLowerCase().includes(q)
      );
    }

    // Category Ribbon Filter
    if (selectedCategory) {
      result = result.filter(p => p.category === selectedCategory);
    }

    // Dietary & Status Filters
    if (itemVegOnly) {
      result = result.filter(p => p.category === 'fruits-veg' || p.name.toLowerCase().includes('organic') || p.name.toLowerCase().includes('milk') || p.name.toLowerCase().includes('tomato'));
    }
    if (itemInStockOnly) {
      result = result.filter(p => p.stock > 0);
    }

    // Sorting
    if (itemSort === 'priceAsc') {
      result.sort((a, b) => a.price - b.price);
    } else if (itemSort === 'priceDesc') {
      result.sort((a, b) => b.price - a.price);
    } else if (itemSort === 'rating') {
      result.sort((a, b) => b.rating - a.rating);
    }

    return result;
  };

  const handleBannerClick = (banner: PromoBanner) => {
    if (banner.shopId) {
      navigate(`/shop/${banner.shopId}`);
    } else if (banner.categoryId) {
      navigate(`/category/${banner.categoryId}`);
    }
  };

  const filteredShops = getFilteredShops();
  const filteredProducts = getFilteredProducts();
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  return (
    <div className="max-w-xl mx-auto pb-24 text-left">
      
      {/* 1. Premium Sticky Header Section */}
      <div className="sticky top-0 z-40 bg-[#F8FAFC]/95 dark:bg-[#0F172A]/95 backdrop-blur-md border-b border-[#E2E8F0] dark:border-[#334155] pb-3.5 pt-3.5 px-4 shadow-sm transition-colors">
        <div className="flex flex-col gap-3">
          
          {/* Top Line: Delivery details, bells and theme togglers */}
          <div className="flex items-center justify-between gap-3">
            
            {/* Delivery address info */}
            <div className="flex flex-col text-left min-w-0 flex-1">
              <span className="text-[10px] font-black text-gray-400 dark:text-[#94A3B8] uppercase tracking-wider leading-none">
                {language === 'hi' ? 'वितरण स्थान' : 'Deliver to'}
              </span>
              <button
                onClick={() => setIsLocationOpen(true)}
                className="flex items-center gap-1 mt-1 text-left min-w-0 group cursor-pointer focus:outline-none"
              >
                <MapPin className="h-4.5 w-4.5 text-[#1565C0] dark:text-[#1E88E5] shrink-0" />
                <span className="text-xs font-black text-gray-800 dark:text-white truncate max-w-[160px] md:max-w-[220px]">
                  {selectedAddress?.name || 'Set Delivery Location'}
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[#1565C0] dark:text-[#1E88E5] shrink-0 transition-transform duration-200 group-hover:translate-y-0.5" />
              </button>
            </div>

            {/* Top Right Utilities */}
            <div className="flex items-center gap-2">
              {/* Theme switcher */}
              <button
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-sm text-gray-500 dark:text-[#94A3B8] hover:text-[#1565C0] cursor-pointer transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[#FFB300]" /> : <Moon className="h-4 w-4 text-gray-500" />}
              </button>

              {/* Notification icon */}
              <button
                onClick={() => navigate('/profile')}
                className="relative p-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-sm text-gray-500 dark:text-[#94A3B8] hover:text-[#1565C0] cursor-pointer transition-colors"
              >
                <Bell className="h-4 w-4" />
                <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500" />
              </button>

              {/* Top Cart icon */}
              <button
                onClick={() => navigate('/cart')}
                className="relative p-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-sm text-gray-500 dark:text-[#94A3B8] hover:text-[#1565C0] cursor-pointer transition-colors"
              >
                <ShoppingCart className="h-4.5 w-4.5 text-[#1565C0] dark:text-[#1E88E5]" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-[#FFB300] px-1 text-[8px] font-black text-black ring-2 ring-white dark:ring-[#1E293B]">
                    {cartCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* User Welcome Greeting */}
          <div className="flex items-center justify-between mt-1 px-0.5">
            <h2 className="text-sm font-black text-[#1B1B1B] dark:text-white leading-tight">
              {language === 'hi' ? 'नमस्ते' : 'Hello'}, <span className="text-[#1565C0] dark:text-[#1E88E5]">{user?.name ? user.name.split(' ')[0] : 'Guest'}</span>! 👋
            </h2>
            <span className="text-[10px] font-black text-gray-400 dark:text-[#94A3B8] uppercase tracking-wide bg-[#E2E8F0] dark:bg-[#334155] px-2.5 py-1 rounded-full text-blue-800 dark:text-[#1E88E5]">
              {language === 'hi' ? '15 मिनट में डिलीवरी' : 'Delivered in 15 mins'}
            </span>
          </div>

          {/* Second Line: Search Bar and Sliders Filter */}
          <div className="flex items-center gap-2 mt-1">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-gray-400 dark:text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={activeTab === 'shops' ? (language === 'hi' ? 'दुकानें खोजें...' : 'Search shops...') : (language === 'hi' ? 'उत्पाद खोजें...' : 'Search items...')}
                className="w-full pl-10 pr-4 py-2.5 rounded-[16px] bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-sm font-semibold text-gray-800 dark:text-white placeholder-gray-400 dark:placeholder-[#64748B] outline-none focus:border-[#1E88E5] focus:ring-1 focus:ring-[#1E88E5] focus:shadow-md transition-all shadow-inner"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`p-2.5 rounded-[16px] border transition-all duration-300 cursor-pointer shadow-sm
                ${isFilterOpen 
                  ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] border-transparent text-white shadow-md shadow-[#1565C0]/25' 
                  : 'bg-white border-[#E2E8F0] dark:bg-[#1E293B] dark:border-[#334155] text-gray-500 dark:text-[#94A3B8] hover:bg-gray-50'
                }`}
            >
              <SlidersHorizontal className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Inline Expandable Filters Options */}
          <AnimatePresence>
            {isFilterOpen && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden bg-[#F8FAFC]/80 dark:bg-[#1E293B]/80 rounded-2xl border border-[#E2E8F0] dark:border-[#334155] p-3 flex flex-col gap-3"
              >
                {activeTab === 'shops' ? (
                  <div className="flex flex-col gap-2.5 text-left">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Sort Shops</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { id: 'distance', label: 'Nearest Distance' },
                          { id: 'rating', label: 'Top Ratings' },
                          { id: 'eta', label: 'Fastest ETA' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setShopSort(shopSort === opt.id ? null : opt.id as any)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                              ${shopSort === opt.id 
                                ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                                : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-650 dark:text-gray-300'
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Status</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setShopFeaturedOnly(!shopFeaturedOnly)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                            ${shopFeaturedOnly 
                              ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-655 dark:text-gray-300'
                            }`}
                        >
                          Featured Stores
                        </button>
                        <button
                          onClick={() => setShopOpenOnly(!shopOpenOnly)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                            ${shopOpenOnly 
                              ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-655 dark:text-gray-300'
                            }`}
                        >
                          Open Now
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 text-left">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Sort Items</span>
                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { id: 'priceAsc', label: 'Price: Low-High' },
                          { id: 'priceDesc', label: 'Price: High-Low' },
                          { id: 'rating', label: 'Top Ratings' }
                        ].map(opt => (
                          <button
                            key={opt.id}
                            onClick={() => setItemSort(itemSort === opt.id ? null : opt.id as any)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                              ${itemSort === opt.id 
                                ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                                : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-650 dark:text-gray-300'
                              }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-wider text-gray-400 block mb-1">Filters</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setItemVegOnly(!itemVegOnly)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                            ${itemVegOnly 
                              ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-655 dark:text-gray-300'
                            }`}
                        >
                          Veg Only
                        </button>
                        <button
                          onClick={() => setItemInStockOnly(!itemInStockOnly)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                            ${itemInStockOnly 
                              ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-655 dark:text-gray-300'
                            }`}
                        >
                          In Stock Only
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex justify-end pt-1.5 border-t border-[#E2E8F0] dark:border-[#334155]">
                  <button 
                    onClick={resetFilters}
                    className="text-[9px] font-black text-red-500 uppercase tracking-wider hover:underline cursor-pointer"
                  >
                    Clear Filter Rules
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 3. Segmented Tab Selector ("Shops" | "Items") */}
          <div className="flex p-1 rounded-[14px] bg-[#E2E8F0]/50 dark:bg-[#1E293B]/50 border border-[#E2E8F0] dark:border-[#334155]">
            <button
              onClick={() => {
                setActiveTab('shops');
                setSelectedCategory(null);
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-[11px] transition-all cursor-pointer
                ${activeTab === 'shops' 
                  ? 'bg-white dark:bg-[#1E293B] text-[#1565C0] dark:text-[#1E88E5] shadow-sm' 
                  : 'text-gray-400 dark:text-[#64748B] hover:text-[#1565C0]'
                }`}
            >
              {language === 'hi' ? 'दुकानें' : 'Shops'}
            </button>
            <button
              onClick={() => {
                setActiveTab('items');
                setSelectedCategory(null);
              }}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-[11px] transition-all cursor-pointer
                ${activeTab === 'items' 
                  ? 'bg-white dark:bg-[#1E293B] text-[#1565C0] dark:text-[#1E88E5] shadow-sm' 
                  : 'text-gray-400 dark:text-[#64748B] hover:text-[#1565C0]'
                }`}
            >
              {language === 'hi' ? 'उत्पाद' : 'Items'}
            </button>
          </div>

        </div>
      </div>

      {/* Promos & Carousel Ribbon */}
      <div className="px-4 pt-4">
        {/* Promotional banner carousel with auto-scroll */}
        {!bannersLoading && banners.length > 0 && (
          <div className="relative overflow-hidden w-full h-36 rounded-[20px] bg-[#E2E8F0] dark:bg-[#334155] shadow-[0_4px_16px_rgba(46,125,50,0.02)] mb-4">
            <AnimatePresence mode="wait">
              {banners.map((banner, index) => {
                if (index !== activeBannerIdx) return null;
                return (
                  <motion.div
                    key={banner.id}
                    initial={{ opacity: 0, x: 6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -6 }}
                    transition={{ duration: 0.35, ease: 'easeInOut' }}
                    onClick={() => handleBannerClick(banner)}
                    className="absolute inset-0 cursor-pointer flex items-center justify-between p-5 bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white"
                  >
                    <div className="flex-1 flex flex-col justify-center text-left">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#DBEAFE]">{banner.subtitle || 'Special Offer'}</span>
                      <h3 className="text-base font-black leading-tight mt-1 truncate max-w-[200px]">{banner.title}</h3>
                      <span className="inline-block mt-3 text-[10px] font-extrabold bg-white text-[#1565C0] px-3.5 py-1.2 rounded-full shadow-sm w-fit active:scale-95 transition-all">
                        {language === 'hi' ? 'अभी खरीदें' : 'Shop Now'}
                      </span>
                    </div>
                    {banner.image && (
                      <div className="h-24 w-24 shrink-0 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-white/10 backdrop-blur-sm ml-2">
                        <img src={banner.image} alt={banner.title} className="h-full w-full object-contain rounded-lg" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Page Indicators */}
            <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {banners.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveBannerIdx(i)}
                  className={`h-1.5 rounded-full transition-all duration-350 cursor-pointer ${i === activeBannerIdx ? 'w-4 bg-white' : 'w-1.5 bg-white/40'}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Horizontally scrollable circular category icons */}
      <div className="flex gap-4.5 overflow-x-auto no-scrollbar py-4 px-4 bg-white dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#334155] transition-colors">
        {APP_CATEGORIES.map((cat: any) => {
          const isSelected = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(isSelected ? null : cat.id)}
              className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer focus:outline-none group"
            >
              <div 
                className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl transition-all duration-300 shadow-[0_4px_12px_rgba(46,125,50,0.03)] group-hover:scale-105 group-hover:shadow-[0_6px_16px_rgba(46,125,50,0.08)]
                  ${isSelected
                    ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white ring-4 ring-[#90CAF9]/20 scale-105'
                    : 'bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] text-gray-800'
                  }`}
              >
                <span>{CATEGORY_EMOJIS[cat.id] || '🛍️'}</span>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-wider transition-colors
                ${isSelected
                  ? 'text-[#1565C0] dark:text-[#1E88E5]'
                  : 'text-gray-500 dark:text-[#94A3B8] group-hover:text-gray-800'
                }`}
              >
                {cat.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Content Listings */}
      <div className="px-4 py-4">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="p-4 rounded-[20px] border border-[#E2E8F0] dark:border-[#334155] bg-white dark:bg-[#1E293B] flex gap-4">
                <Skeleton className="h-20 w-20 rounded-2xl flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div className="space-y-2 text-left">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-3 w-1/3 mt-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Filtering Info Banner */}
            {selectedCategory && (
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-[#94A3B8] px-1">
                <span>Filtering by: <b className="text-[#1565C0] dark:text-[#1E88E5] font-extrabold">{APP_CATEGORIES.find((c: any) => c.id === selectedCategory)?.name}</b></span>
                <button onClick={() => setSelectedCategory(null)} className="text-red-500 font-extrabold hover:underline cursor-pointer">Clear</button>
              </div>
            )}

            {/* Tab Selection Lists Rendering */}
            {activeTab === 'shops' ? (
              filteredShops.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Search className="h-10 w-10 mx-auto text-gray-300 dark:text-[#64748B] mb-2" />
                  <p className="text-xs font-bold">No shops match your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filteredShops.map(shop => (
                    <ShopCardItem key={shop.id} shop={shop} />
                  ))}
                </div>
              )
            ) : (
              filteredProducts.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Search className="h-10 w-10 mx-auto text-gray-300 dark:text-[#64748B] mb-2" />
                  <p className="text-xs font-bold">No items match your filters.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Address Picker Dialog Modal */}
      <Dialog isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} title={language === 'hi' ? 'पता चुनें' : 'Select Address'}>
        <div className="flex flex-col gap-4 text-left">
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#334155]"></div>
            <span className="flex-shrink mx-4 text-xs font-black text-gray-400 dark:text-[#94A3B8] text-[10px] uppercase tracking-wider">{language === 'hi' ? 'सहेजे गए पते' : 'Saved Addresses'}</span>
            <div className="flex-grow border-t border-[#E2E8F0] dark:border-[#334155]"></div>
          </div>

          <div className="flex flex-col gap-3">
            {addresses.map(addr => (
              <div
                key={addr.id}
                onClick={() => handleSelectAddress(addr.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3
                  ${addr.id === selectedAddress?.id 
                    ? 'border-[#1565C0] bg-[#E2E8F0]/25 dark:bg-[#334155]/20' 
                    : 'border-[#E2E8F0] dark:border-[#334155] hover:bg-gray-50 dark:hover:bg-[#1E293B]'
                  }`}
              >
                <div className="p-2 rounded-xl bg-gray-55 dark:bg-[#1E293B] text-gray-600 dark:text-[#94A3B8]">
                  <MapPin className="h-4.5 w-4.5 text-[#1565C0]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">{addr.name}</span>
                    {addr.isDefault && (
                      <span className="px-1.5 py-0.5 rounded bg-[#E2E8F0] dark:bg-[#334155] text-[#1565C0] dark:text-[#1E88E5] text-[8px] font-bold uppercase flex-shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-400 dark:text-[#94A3B8] mt-1 block truncate">
                    {addr.details}, {addr.area}, {addr.city} - {addr.pinCode}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <Button 
            variant="primary" 
            fullWidth 
            onClick={() => {
              setIsLocationOpen(false);
              setIsAddressEditorOpen(true);
            }}
            className="rounded-2xl mt-2 py-3"
          >
            <Plus className="h-4.5 w-4.5 mr-2" />
            {language === 'hi' ? 'नया पता मैन्युअल रूप से जोड़ें' : 'Add New Address Manually'}
          </Button>

        </div>
      </Dialog>

      {/* Premium High-Precision Address Selector Modal */}
      <AddressSelectorModal
        isOpen={isAddressEditorOpen}
        onClose={() => setIsAddressEditorOpen(false)}
        onSave={handleAddNewAddressFromHome}
      />
      
    </div>
  );
};
