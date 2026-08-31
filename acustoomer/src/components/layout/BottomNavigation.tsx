import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home as HomeIcon, Search as SearchIcon, ShoppingBag, User as UserIcon, ShoppingCart, ArrowRight } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import { useCart } from '../../context/CartContext';
import { motion, AnimatePresence } from 'framer-motion';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language } = useLanguage();
  const { cartItems, priceBreakdown } = useCart();

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  // We bounce the floating cart badge whenever the count changes
  const [bounceTrigger, setBounceTrigger] = useState(false);
  useEffect(() => {
    if (cartCount > 0) {
      setBounceTrigger(true);
      const t = setTimeout(() => setBounceTrigger(false), 350);
      return () => clearTimeout(t);
    }
  }, [cartCount]);

  const tabs = [
    { name: 'Home', label: language === 'hi' ? 'मुख्य पृष्ठ' : 'Home', icon: HomeIcon, path: '/' },
    { name: 'Categories', label: language === 'hi' ? 'श्रेणियाँ' : 'Categories', icon: SearchIcon, path: '/search' },
    { name: 'Orders', label: language === 'hi' ? 'ऑर्डर' : 'Orders', icon: ShoppingBag, path: '/orders' },
    { name: 'Profile', label: language === 'hi' ? 'प्रोफ़ाइल' : 'Profile', icon: UserIcon, path: '/profile' }
  ];

  const hideTabs = ['/splash', '/onboarding', '/login', '/cart', '/checkout', '/order-success'].includes(location.pathname)
    || location.pathname.startsWith('/orders/track/');
  if (hideTabs) return null;

  // Show floating cart badge if we have items, and we are not on cart/checkout/splash/login/onboarding
  const showFloatingCart = cartCount > 0 && !['/cart', '/checkout', '/splash', '/onboarding', '/login'].includes(location.pathname);

  return (
    <>
      {/* Real-time Floating Cart Action Badge */}
      <AnimatePresence>
        {showFloatingCart && (
          <motion.div
            key="floating-cart"
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            className="floating-cart-shell pointer-events-none fixed inset-x-0 z-50 flex justify-center"
          >
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => navigate('/cart')}
              className="btn-glossy pointer-events-auto flex w-full max-w-[440px] min-w-0 items-center justify-between gap-2.5 rounded-2xl border border-[#90CAF9]/20 bg-gradient-to-r from-[#1E88E5] to-[#1565C0] px-4 py-3 text-white shadow-lg shadow-[#1565C0]/30 md:max-w-max md:rounded-full md:px-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/10 p-2">
                  <ShoppingCart className="h-5 w-5 text-white" />
                  <span className={`absolute -right-2 -top-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FFB300] px-1.5 text-[9px] font-black text-black ring-2 ring-[#1565C0] ${bounceTrigger ? 'animate-cart-bounce' : ''}`}>
                    {cartCount}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col text-left">
                  <span className="truncate text-sm font-black leading-none">₹{priceBreakdown.grandTotal}</span>
                  <span className="mt-1 truncate text-[9px] font-bold uppercase leading-none tracking-wider text-[#E2E8F0]">{cartCount} {cartCount === 1 ? 'item' : 'items'} added</span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider transition-all hover:bg-white/20 sm:text-xs">
                <span>View Cart</span>
                <ArrowRight className="h-4 w-4" />
              </div>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <nav aria-label="Primary navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E2E8F0] bg-white/96 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_-18px_rgba(5,10,36,0.5)] backdrop-blur-xl transition-colors dark:border-[#334155] dark:bg-[#111A33]/96 md:hidden">
        <div className="bottom-nav-safe mx-auto flex w-full max-w-xl items-center justify-around py-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = tab.path === '/'
              ? location.pathname === '/'
              : tab.path === '/search'
                ? ['/search', '/category/', '/shop/', '/product/'].some(path => location.pathname === path || location.pathname.startsWith(path))
                : tab.path === '/orders'
                  ? location.pathname.startsWith('/orders') || location.pathname === '/preorders'
                  : location.pathname.startsWith(tab.path) || (tab.path === '/profile' && location.pathname === '/wishlist');
            
            return (
              <button
                key={tab.name}
                type="button"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
                onClick={() => navigate(tab.path)}
                className={`relative flex min-h-15 min-w-16 flex-col items-center justify-center px-3.5 pt-2 pb-2.5 rounded-2xl transition-all cursor-pointer
                  ${isActive 
                    ? 'text-[#1565C0] dark:text-[#1E88E5] font-black' 
                    : 'text-gray-400 dark:text-[#64748B] hover:text-[#1E88E5]'
                  }`}
              >
                <div className="relative p-0.5">
                  <Icon className={`h-5.5 w-5.5 transition-transform duration-200 ${isActive ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                <span className="text-[10px] font-bold mt-1 tracking-wide">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-0.5 h-0.75 w-5 rounded-full bg-[#0B74E8]" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
