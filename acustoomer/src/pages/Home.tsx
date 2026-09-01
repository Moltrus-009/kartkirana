import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, ChevronDown, Moon, Sun, Search, Bell, Plus, ArrowRight,
  SlidersHorizontal, Star, ShoppingCart, Clock, BadgePercent, Gift
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
import { SafeImage } from '../components/ui/SafeImage';
import { useLanguage } from '../context/LanguageContext';
import { PreorderModal } from '../components/PreorderModal';
import { CalendarClock } from 'lucide-react';
import { Shop, PromoBanner, UserAddress } from '../types';
import { usePromotions } from '../hooks/usePromotions';
import { useNotifications } from '../hooks/useNotifications';
import { describePromotion } from '../utils/promotions';


// Reusable Shop Card
const ShopCardItem: React.FC<{ shop: Shop; promotionLabel?: string }> = ({ shop, promotionLabel }) => {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => navigate(`/shop/${shop.id}`)}
      className={`p-4 bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-[20px] flex gap-4 transition-all duration-200 shadow-[0_8px_24px_-20px_rgba(5,10,36,0.45)] hover:border-blue-200 hover:shadow-[0_12px_30px_-20px_rgba(11,116,232,0.35)] cursor-pointer text-left ${!shop.isOpen ? 'opacity-70' : ''}`}
    >
      {/* Image on left */}
      <div className="relative h-20 w-20 flex-shrink-0 rounded-2xl overflow-hidden bg-[#F8FAFC] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-inner flex items-center justify-center p-1.5">
        <SafeImage src={shop.logo} alt={shop.name} className="h-full w-full object-cover rounded-xl" fallback="🏪" />
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
        {(promotionLabel || (shop.offers && shop.offers.length > 0)) && (
          <div className="mt-2.5">
            <span className="text-[9px] font-black text-[#071128] bg-[#FFC928] px-2.5 py-1 rounded-lg border border-[#FFC928] uppercase tracking-wider">
              {promotionLabel || shop.offers[0]}
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
  'electronics': '🎧',
  'medical': '🩺',
  'stationery': '✏️',
  'fashion': '👕',
  'books': '📚',
  'home-essentials': '🧺',
  'beauty': '✨',
  'sports': '🏏',
  'hardware': '🧰',
  'religious': '🪔',
  'bakery': '🥐',
  'personal-care': '🧼',
  'pet-supplies': '🐶'
};

const SectionTitle: React.FC<{
  eyebrow?: string;
  title: string;
  action?: string;
  onAction?: () => void;
}> = ({ eyebrow, title, action, onAction }) => (
  <div className="flex items-end justify-between gap-3 px-0.5">
    <div>
      {eyebrow && <span className="mb-1 block text-[9px] font-black uppercase tracking-[0.18em] text-[#0B74E8] dark:text-[#36B6F4]">{eyebrow}</span>}
      <h2 className="text-[17px] font-black leading-tight tracking-[-0.02em] text-slate-950 dark:text-white">{title}</h2>
    </div>
    {action && onAction && (
      <button onClick={onAction} className="flex min-h-8 items-center gap-1 rounded-full px-2 text-[10px] font-black text-[#0B74E8] transition hover:bg-blue-50 dark:text-[#36B6F4] dark:hover:bg-blue-950/30">
        {action}<ArrowRight className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

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
  const { cartItems, preorderSchedule, setPreorderSchedule } = useCart();
  const { user } = useAuth();
  const { promotions } = usePromotions(undefined, user?.uid);
  const { unreadCount } = useNotifications(user?.uid);
  const { theme, toggleTheme } = useTheme();

  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isPreorderModalOpen, setIsPreorderModalOpen] = useState(false);

  // Wireframe UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'shops' | 'items' | 'preorder'>('shops');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [offerFilter, setOfferFilter] = useState<'top' | 'specials' | null>(null);

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
    setOfferFilter(null);
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

    if (offerFilter) {
      result = result.filter(product => promotions.some(promotion =>
        promotion.isActive &&
        promotion.eligible &&
        promotion.offerType !== 'subscription' &&
        promotion.shopId === product.shopId &&
        (promotion.scope === 'order' || promotion.productIds.includes(product.id)) &&
        (offerFilter === 'top' || promotion.discountType === 'bogo' || promotion.offerType === 'addon')
      ));
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
  const normalizeCategory = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  const productMatchesCategory = (productCategory: string, categoryId: string, categoryName: string) => {
    const productKey = normalizeCategory(productCategory);
    const idKey = normalizeCategory(categoryId);
    const nameKey = normalizeCategory(categoryName);
    return productKey === idKey || productKey === nameKey || productKey.includes(idKey) || nameKey.includes(productKey);
  };
  const categoryShelves = APP_CATEGORIES.map(category => ({
    ...category,
    products: products.filter(product => productMatchesCategory(product.category, category.id, category.name)),
  })).filter(category => category.products.length > 0);
  const visibleCategories = (categoryShelves.length > 0 ? categoryShelves : APP_CATEGORIES.map(category => ({ ...category, products: [] }))).slice(0, 9);
  const productShelves = categoryShelves.slice(0, 4);
  const visibleStores = shops.slice(0, 8);
  const salePromotion = promotions.find(promotion => promotion.isActive && promotion.discountType === 'percentage');
  const bogoPromotion = promotions.find(promotion => promotion.isActive && promotion.discountType === 'bogo');
  // The editorial discovery feed is the default Home/Shops view only. Keeping
  // it mounted for Items and Pre-orders made those tabs appear unresponsive,
  // because their results were rendered far below the unchanged home feed.
  const showDiscovery = activeTab === 'shops' && !searchQuery.trim() && !selectedCategory && !shopFeaturedOnly && !shopOpenOnly && !shopSort;

  const selectHomeTab = (tab: 'shops' | 'items' | 'preorder') => {
    setActiveTab(tab);
    setSelectedCategory(null);
    setOfferFilter(null);
    setIsFilterOpen(false);

    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const target = tab === 'shops' ? document.documentElement : document.getElementById('home-results');
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 40);
    });
  };

  const chooseCategory = (categoryId: string) => {
    setActiveTab('items');
    setSelectedCategory(categoryId);
    setOfferFilter(null);
    window.setTimeout(() => document.getElementById('home-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  const showOfferProducts = (filter: 'top' | 'specials') => {
    setActiveTab('items');
    setSelectedCategory(null);
    setSearchQuery('');
    setOfferFilter(filter);
    setIsFilterOpen(false);
    window.setTimeout(() => document.getElementById('home-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
  };

  return (
    <div className="w-full max-w-full overflow-x-hidden pb-24 text-left">
      
      {/* 1. Premium Sticky Header Section */}
      <div className="home-sticky-header sticky top-0 z-40 px-3 pb-3 sm:px-4">
        <div className="flex flex-col gap-3">
          
          {/* Top Line: Delivery details, bells and theme togglers */}
          <div className="flex items-center justify-between gap-3">
            
            {/* Delivery address info */}
            <div className="flex flex-col text-left min-w-0 flex-1">
              <span className="text-[10px] font-black text-gray-400 dark:text-[#94A3B8] uppercase tracking-wider leading-none">
                {language === 'hi' ? 'वितरण स्थान' : 'Deliver to'}
              </span>
              <button
                aria-label="Choose delivery address"
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
                aria-label="Open notifications"
                onClick={toggleTheme}
                className="p-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-sm text-gray-500 dark:text-[#94A3B8] hover:text-[#1565C0] cursor-pointer transition-colors"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-[#FFB300]" /> : <Moon className="h-4 w-4 text-gray-500" />}
              </button>

              {/* Notification icon */}
              <button
                aria-label={`Open notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                onClick={() => navigate('/notifications')}
                className="relative p-2.5 rounded-xl bg-white dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] shadow-sm text-gray-500 dark:text-[#94A3B8] hover:text-[#1565C0] cursor-pointer transition-colors"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-red-500" />}
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
          <div className="mt-0.5 flex items-center justify-between px-0.5">
            <h2 className="text-[13px] font-black leading-tight text-[#1B1B1B] dark:text-white">
              {language === 'hi' ? 'नमस्ते' : 'Hello'}, <span className="text-[#1565C0] dark:text-[#1E88E5]">{user?.name ? user.name.split(' ')[0] : 'Guest'}</span>! 👋
            </h2>
            <button
              onClick={() => setIsPreorderModalOpen(true)}
              className="flex min-h-9 items-center gap-1.5 rounded-xl border border-[#FFC928] bg-[#FFC928] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#071128] shadow-sm transition hover:bg-[#FFD95E]"
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>{preorderSchedule?.slot ? `📅 ${preorderSchedule.slot.split('-')[0].trim()}` : (language === 'hi' ? 'प्री-ऑर्डर बुक करें' : '📅 Pre-Order Slot')}</span>
            </button>
          </div>

          {/* Second Line: Search Bar and Sliders Filter */}
          <div className="mt-0.5 flex items-center gap-2">
            <div className="relative flex-1 flex items-center">
              <Search className="absolute left-3.5 h-4 w-4 text-gray-400 dark:text-[#94A3B8]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={language === 'hi' ? 'दुकानें या उत्पाद खोजें...' : 'Search for stores or products...'}
                className="h-12 w-full rounded-[15px] border border-white/80 bg-white pl-10 pr-4 text-sm font-semibold text-gray-800 shadow-[0_8px_24px_-18px_rgba(5,10,36,0.5)] outline-none transition-all placeholder:text-gray-400 focus:border-[#1E88E5] focus:ring-2 focus:ring-[#1E88E5]/15 dark:border-[#334155] dark:bg-[#1E293B] dark:text-white dark:placeholder-[#64748B]"
              />
            </div>
            
            {/* Filter Toggle Button */}
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] border transition-all duration-300 cursor-pointer shadow-sm
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
                                : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-600 dark:text-gray-300'
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
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-600 dark:text-gray-300'
                            }`}
                        >
                          Featured Stores
                        </button>
                        <button
                          onClick={() => setShopOpenOnly(!shopOpenOnly)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                            ${shopOpenOnly 
                              ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-600 dark:text-gray-300'
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
                                : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-600 dark:text-gray-300'
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
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-600 dark:text-gray-300'
                            }`}
                        >
                          Veg Only
                        </button>
                        <button
                          onClick={() => setItemInStockOnly(!itemInStockOnly)}
                          className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer
                            ${itemInStockOnly 
                              ? 'bg-gradient-to-br from-[#1E88E5] to-[#1565C0] text-white border-transparent' 
                              : 'bg-white dark:bg-[#1E293B] border-[#E2E8F0] dark:border-[#334155] text-gray-600 dark:text-gray-300'
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

          {/* 3. Segmented Tab Selector ("Shops" | "Items" | "Pre-Orders") */}
          <div className="flex rounded-[14px] border border-[#E2E8F0] bg-white/70 p-1 shadow-sm dark:border-[#334155] dark:bg-[#1E293B]/70">
            <button
              type="button"
              aria-pressed={activeTab === 'shops'}
              onClick={() => selectHomeTab('shops')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-[11px] transition-all cursor-pointer ${
                activeTab === 'shops' 
                  ? 'bg-white dark:bg-[#1E293B] text-[#1565C0] dark:text-[#1E88E5] shadow-sm' 
                  : 'text-gray-400 dark:text-[#64748B] hover:text-[#1565C0]'
              }`}
            >
              {language === 'hi' ? 'दुकानें' : 'Shops'}
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'items'}
              onClick={() => selectHomeTab('items')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-[11px] transition-all cursor-pointer ${
                activeTab === 'items' 
                  ? 'bg-white dark:bg-[#1E293B] text-[#1565C0] dark:text-[#1E88E5] shadow-sm' 
                  : 'text-gray-400 dark:text-[#64748B] hover:text-[#1565C0]'
              }`}
            >
              {language === 'hi' ? 'उत्पाद' : 'Items'}
            </button>
            <button
              type="button"
              aria-pressed={activeTab === 'preorder'}
              onClick={() => selectHomeTab('preorder')}
              className={`flex-1 py-2 text-xs font-black uppercase tracking-wider rounded-[11px] transition-all cursor-pointer flex items-center justify-center gap-1 ${
                activeTab === 'preorder' 
                  ? 'bg-gradient-to-r from-[#FFC928] to-[#F59E0B] text-slate-950 shadow-sm font-black' 
                  : 'text-amber-600 dark:text-amber-400 hover:text-amber-700'
              }`}
            >
              <CalendarClock className="h-3.5 w-3.5" />
              <span>{language === 'hi' ? 'प्री-ऑर्डर' : 'Pre-Orders'}</span>
            </button>
          </div>

        </div>
      </div>

      {showDiscovery && (
        <div className="space-y-8 pt-4">
          {/* Full-bleed campaign artwork inspired by the supplied grocery references. */}
          <section className="px-1">
            {!bannersLoading && banners.length > 0 ? (
              <div className="relative h-[190px] overflow-hidden rounded-[26px] bg-[#0758C7] shadow-[0_18px_44px_-28px_rgba(5,10,36,0.75)]">
                <AnimatePresence mode="wait">
                  {banners.map((banner, index) => {
                    if (index !== activeBannerIdx) return null;
                    return (
                      <motion.button
                        key={banner.id}
                        initial={{ opacity: 0, scale: 1.015 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.99 }}
                        transition={{ duration: 0.35, ease: 'easeOut' }}
                        onClick={() => handleBannerClick(banner)}
                        className="absolute inset-0 w-full overflow-hidden text-left text-white"
                      >
                        {banner.image?.trim() && <SafeImage src={banner.image} alt="" className="absolute inset-0 h-full w-full object-cover" />}
                        <span className="absolute inset-0 bg-gradient-to-r from-[#050A24]/95 via-[#0758C7]/72 to-transparent" />
                        <span className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/40 to-transparent" />
                        <span className="relative z-10 flex h-full max-w-[72%] flex-col justify-center p-5">
                          <span className="mb-2 w-fit rounded-full border border-white/20 bg-white/14 px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.16em] backdrop-blur-md">Kart Kirana special</span>
                          <strong className="line-clamp-2 text-[24px] font-black leading-[0.98] tracking-[-0.04em]">{banner.title}</strong>
                          <span className="mt-2 line-clamp-2 text-[10px] font-bold leading-relaxed text-blue-50">{banner.subtitle || 'Fresh picks, everyday prices, delivered from a nearby store.'}</span>
                          <span className="mt-3 flex w-fit items-center gap-1.5 rounded-full bg-[#FFC928] px-3 py-1.5 text-[9px] font-black uppercase tracking-wider text-[#071128]">Shop now <ArrowRight className="h-3 w-3" /></span>
                        </span>
                      </motion.button>
                    );
                  })}
                </AnimatePresence>
                <div className="absolute bottom-3 right-4 z-20 flex gap-1.5">
                  {banners.map((_, index) => <button aria-label={`Show offer ${index + 1}`} key={index} onClick={() => setActiveBannerIdx(index)} className={`h-1.5 rounded-full transition-all ${index === activeBannerIdx ? 'w-5 bg-[#FFC928]' : 'w-1.5 bg-white/55'}`} />)}
                </div>
              </div>
            ) : (
              <button onClick={() => setActiveTab('items')} className="relative flex h-[170px] w-full overflow-hidden rounded-[26px] bg-gradient-to-br from-[#050A24] via-[#0758C7] to-[#36B6F4] p-5 text-left text-white shadow-[0_18px_44px_-28px_rgba(5,10,36,0.75)]">
                <span className="absolute -right-8 -top-10 text-[130px] opacity-20">🛒</span>
                <span className="relative z-10 flex max-w-[72%] flex-col justify-center"><small className="font-black uppercase tracking-[0.2em] text-[#FFC928]">Everyday essentials</small><strong className="mt-2 text-2xl font-black leading-none">Everything nearby, delivered quickly.</strong><span className="mt-3 w-fit rounded-full bg-white px-3 py-1.5 text-[9px] font-black uppercase text-[#0758C7]">Start shopping</span></span>
              </button>
            )}
          </section>

          <section className="space-y-3 px-1">
            <SectionTitle eyebrow="Fresh savings" title="Deals made simple" />
            <div className="grid grid-cols-3 gap-2.5">
              <button onClick={() => showOfferProducts('top')} className="group min-h-28 overflow-hidden rounded-[18px] bg-gradient-to-br from-[#0B74E8] to-[#0758C7] p-3 text-left text-white shadow-sm">
                <BadgePercent className="h-5 w-5 text-[#FFC928]" /><strong className="mt-4 block text-sm font-black leading-tight">{salePromotion ? `${salePromotion.value}% off` : 'Top offers'}</strong><span className="mt-1 block text-[8px] font-bold text-blue-100">Everyday savings</span>
              </button>
              <button onClick={() => showOfferProducts('specials')} className="group min-h-28 overflow-hidden rounded-[18px] border border-amber-200 bg-gradient-to-br from-[#FFF4C7] to-[#FFC928] p-3 text-left text-[#071128] shadow-sm dark:border-amber-700 dark:from-amber-700 dark:to-amber-500">
                <Gift className="h-5 w-5" /><strong className="mt-4 block text-sm font-black leading-tight">{bogoPromotion ? `Buy ${bogoPromotion.buyQuantity || 1}, get ${bogoPromotion.getQuantity || 1}` : 'Shop specials'}</strong><span className="mt-1 block text-[8px] font-bold opacity-65">From local stores</span>
              </button>
              <button onClick={() => setIsPreorderModalOpen(true)} className="group min-h-28 overflow-hidden rounded-[18px] border border-cyan-100 bg-gradient-to-br from-[#E0F6FF] to-[#B7E8FF] p-3 text-left text-[#073B5A] shadow-sm dark:border-blue-800 dark:from-blue-950 dark:to-cyan-900 dark:text-white">
                <CalendarClock className="h-5 w-5 text-[#0B74E8] dark:text-[#36B6F4]" /><strong className="mt-4 block text-sm font-black leading-tight">Book a slot</strong><span className="mt-1 block text-[8px] font-bold opacity-65">Plan your delivery</span>
              </button>
            </div>
          </section>

          <section className="space-y-4 px-1">
            <SectionTitle eyebrow="Browse faster" title="Shop by category" action="See all" onAction={() => navigate('/search')} />
            <div className="grid grid-cols-3 gap-x-3 gap-y-5">
              {visibleCategories.map(category => {
                const cover = category.products[0]?.image;
                return (
                  <button key={category.id} onClick={() => chooseCategory(category.id)} className="group min-w-0 text-center">
                    <span className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-[18px] border border-slate-100 bg-[#F5F7FA] p-2 shadow-[0_8px_24px_-22px_rgba(5,10,36,0.55)] transition group-active:scale-95 dark:border-[#334155] dark:bg-[#1E293B]">
                      {cover?.trim() ? <SafeImage src={cover} alt="" className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-105 dark:mix-blend-normal" fallback={CATEGORY_EMOJIS[category.id] || '🛍️'} /> : <span className="text-4xl">{CATEGORY_EMOJIS[category.id] || '🛍️'}</span>}
                    </span>
                    <span className="mt-2 line-clamp-2 block min-h-8 text-[10px] font-extrabold leading-tight text-slate-700 dark:text-slate-200">{category.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {visibleStores.length > 0 && (
            <section className="space-y-4 px-1">
              <SectionTitle eyebrow="Trusted nearby" title="Shop by stores" action="View stores" onAction={() => { setActiveTab('shops'); document.getElementById('home-results')?.scrollIntoView({ behavior: 'smooth' }); }} />
              <div className="grid grid-cols-4 gap-x-3 gap-y-4">
                {visibleStores.map(store => (
                  <button key={store.id} onClick={() => navigate(`/shop/${store.id}`)} className="group min-w-0 text-center">
                    <span className="mx-auto flex aspect-square w-full items-center justify-center overflow-hidden rounded-[20px] border border-slate-200 bg-white p-2.5 transition group-active:scale-95 dark:border-[#334155] dark:bg-[#1E293B]"><SafeImage src={store.logo || store.coverImage} alt={store.name} className="h-full w-full object-contain" fallback="🏪" /></span>
                    <span className="mt-2 block truncate text-[9px] font-black text-slate-700 dark:text-slate-200">{store.name}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {productShelves.map(shelf => (
            <section key={shelf.id} className="space-y-3">
              <div className="px-1"><SectionTitle eyebrow="Picked for you" title={shelf.name} action="See all" onAction={() => chooseCategory(shelf.id)} /></div>
              <div className="no-scrollbar flex snap-x gap-3 overflow-x-auto px-1 pb-2">
                {shelf.products.slice(0, 8).map(product => (
                  <div key={product.id} className="w-[42vw] min-w-[142px] max-w-[170px] snap-start">
                    <ProductCard compact product={product} promotion={promotions.find(promotion => promotion.eligible && promotion.shopId === product.shopId && promotion.offerType !== 'subscription' && (promotion.scope === 'order' || promotion.productIds.includes(product.id)))} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Main Content Listings */}
      <section id="home-results" className="scroll-mt-52 px-1 pb-5 pt-8">
        <div className="mb-4">
          <SectionTitle
            eyebrow={searchQuery ? 'Search results' : activeTab === 'shops' ? 'Around you' : activeTab === 'preorder' ? 'Plan ahead' : 'More to explore'}
            title={activeTab === 'shops' ? 'Nearby stores' : activeTab === 'preorder' ? 'Pre-order favourites' : offerFilter === 'top' ? 'Top offers' : offerFilter === 'specials' ? 'Shop specials' : selectedCategory ? APP_CATEGORIES.find(category => category.id === selectedCategory)?.name || 'Products' : 'All products'}
          />
        </div>
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
            {offerFilter && (
              <div className="flex items-center justify-between px-1 text-xs font-bold text-slate-500 dark:text-[#94A3B8]">
                <span>Showing only <b className="font-extrabold text-[#1565C0] dark:text-[#1E88E5]">{offerFilter === 'top' ? 'active offers' : 'shop specials'}</b></span>
                <button onClick={() => setOfferFilter(null)} className="cursor-pointer font-extrabold text-red-500 hover:underline">Clear</button>
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
                    <ShopCardItem
                      key={shop.id}
                      shop={shop}
                      promotionLabel={(() => {
                        const promotion = promotions.find(item => item.shopId === shop.id && (item.eligible || item.offerType === 'subscription'));
                        return promotion ? describePromotion(promotion) : undefined;
                      })()}
                    />
                  ))}
                </div>
              )
            ) : activeTab === 'preorder' ? (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-[#FFC928]/20 via-[#F59E0B]/20 to-[#0B74E8]/20 border border-[#FFC928]/40 p-4 rounded-2xl text-left space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                      <CalendarClock className="h-4 w-4" /> 📅 Pre-Order & Scheduled Delivery Store
                    </span>
                    <button
                      onClick={() => setIsPreorderModalOpen(true)}
                      className="px-3 py-1 rounded-full bg-[#0B74E8] text-white text-[10px] font-black uppercase tracking-wider hover:opacity-90 cursor-pointer shadow-xs"
                    >
                      {preorderSchedule?.slot ? `Slot: ${preorderSchedule.slot.split('-')[0].trim()}` : 'Set Slot'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-600 dark:text-gray-300 font-semibold leading-relaxed">
                    Add items to your cart and choose either <b className="text-[#0B74E8]">⚡ Instant Delivery</b> or <b className="text-amber-600">📅 Pre-Order Schedule</b> (Date & 2-Hour Slot) at checkout!
                  </p>
                </div>

                {filteredProducts.filter(p => p.isPreorder).length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredProducts.map(product => (
                      <ProductCard key={product.id} product={product} promotion={promotions.find(promotion => promotion.eligible && promotion.shopId === product.shopId && promotion.offerType !== 'subscription' && (promotion.scope === 'order' || promotion.productIds.includes(product.id)))} />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredProducts.filter(p => p.isPreorder).map(product => (
                      <ProductCard key={product.id} product={product} promotion={promotions.find(promotion => promotion.eligible && promotion.shopId === product.shopId && promotion.offerType !== 'subscription' && (promotion.scope === 'order' || promotion.productIds.includes(product.id)))} />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              filteredProducts.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                  <Search className="h-10 w-10 mx-auto text-gray-300 dark:text-[#64748B] mb-2" />
                  <p className="text-xs font-bold">{offerFilter ? 'There are no active offers at this moment. Please check again soon.' : 'No items match your filters.'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {filteredProducts.map(product => (
                    <ProductCard key={product.id} product={product} promotion={promotions.find(promotion => promotion.eligible && promotion.shopId === product.shopId && promotion.offerType !== 'subscription' && (promotion.scope === 'order' || promotion.productIds.includes(product.id)))} />
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </section>

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

      {/* 2-Hour Slot Pre-Order Modal */}
      <PreorderModal
        isOpen={isPreorderModalOpen}
        onClose={() => setIsPreorderModalOpen(false)}
        onConfirm={(schedule) => {
          setPreorderSchedule(schedule);
        }}
        initialDate={preorderSchedule?.date}
        initialSlot={preorderSchedule?.slot}
        initialTime={preorderSchedule?.time}
      />
    </div>
  );
};
