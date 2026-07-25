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

  // Don't show bottom navigation on Splash, Onboarding, Login, Cart, or Checkout
  const hideTabs = ['/splash', '/onboarding', '/login', '/cart', '/checkout'].includes(location.pathname);
  if (hideTabs) return null;

  // Show floating cart badge if we have items, and we are not on cart/checkout/splash/login/onboarding
  const showFloatingCart = cartCount > 0 && !['/cart', '/checkout', '/splash', '/onboarding', '/login'].includes(location.pathname);

  return (
    <>
      {/* Real-time Floating Cart Action Badge */}
      <AnimatePresence>
        {showFloatingCart && (
          <motion.button
            key="floating-cart"
            initial={{ scale: 0.4, opacity: 0, y: 80 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.4, opacity: 0, y: 80 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/cart')}
            className="fixed bottom-[84px] md:bottom-8 left-4 right-4 md:left-auto md:right-10 z-50 flex items-center justify-between md:justify-start gap-4 px-5 py-3.5 bg-gradient-to-r from-[#1E88E5] to-[#1565C0] text-white rounded-2xl md:rounded-full shadow-lg shadow-[#1565C0]/30 border border-[#90CAF9]/20 btn-glossy cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="relative flex items-center justify-center bg-white/10 p-2 rounded-xl border border-white/10">
                <ShoppingCart className="h-5 w-5 text-white" />
                <span className={`absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#FFB300] px-1.5 text-[9px] font-black text-black ring-2 ring-[#1565C0] ${bounceTrigger ? 'animate-cart-bounce' : ''}`}>
                  {cartCount}
                </span>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-sm font-black leading-none">₹{priceBreakdown.grandTotal}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#E2E8F0] leading-none mt-1">{cartCount} {cartCount === 1 ? 'item' : 'items'} added</span>
              </div>
            </div>
            <div className="flex items-center gap-1 font-black text-xs uppercase tracking-wider bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 hover:bg-white/20 transition-all">
              <span>View Cart</span>
              <ArrowRight className="h-4 w-4" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-white dark:bg-[#1E293B] border-t border-[#E2E8F0] dark:border-[#334155] pb-safe shadow-[0_-4px_16px_-4px_rgba(46,125,50,0.06)] transition-colors">
        <div className="max-w-xl mx-auto flex items-center justify-around py-1">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path || 
              (tab.path !== '/' && location.pathname.startsWith(tab.path));
            
            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.path)}
                className={`relative flex flex-col items-center justify-center pt-2.5 pb-3 px-3.5 rounded-2xl transition-all cursor-pointer
                  ${isActive 
                    ? 'text-[#1565C0] dark:text-[#1E88E5] font-black' 
                    : 'text-gray-400 dark:text-[#64748B] hover:text-[#1E88E5]'
                  }`}
              >
                <div className="relative p-0.5">
                  <Icon className={`h-5.5 w-5.5 transition-transform duration-200 ${isActive ? 'scale-110 stroke-[2.5px]' : 'stroke-[2px]'}`} />
                </div>
                <span className="text-[10px] font-bold mt-1 tracking-wide">
                  {tab.label}
                </span>
                {isActive && (
                  <span className="absolute bottom-1 w-5 h-0.75 rounded-full bg-[#1565C0] dark:bg-[#1E88E5] shadow-[0_0_8px_rgba(46,125,50,0.6)] animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};
