import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Heart, ShoppingBag, CalendarClock, User, MapPin } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { useAuth } from '../../context/AuthContext';
import { useAddress } from '../../context/AddressContext';
import { useLanguage } from '../../context/LanguageContext';

export const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { selectedAddress } = useAddress();
  const { t } = useLanguage();

  const tabs = [
    { name: 'Menu', label: t('home'), icon: Home, path: '/' },
    { name: 'Favorites', label: t('wishlist'), icon: Heart, path: '/wishlist' },
    { name: 'Orders', label: t('orders'), icon: ShoppingBag, path: '/orders' },
    { name: 'Pre-Orders', label: t('preorders'), icon: CalendarClock, path: '/preorders' },
    { name: 'Profile', label: t('profile'), icon: User, path: '/profile' }
  ];

  return (
    <aside className="sticky top-0 h-screen hidden md:flex flex-col justify-between bg-white dark:bg-[#0B0B0B] border-r border-slate-200 dark:border-[#2D2D2D] select-none shrink-0 transition-all duration-300 w-20 lg:w-64">
      
      {/* Top Section */}
      <div className="flex flex-col pt-6">
        {/* Brand Logo - Expanded on LG and icon only on MD */}
        <div className="px-4 mb-8 flex justify-center lg:justify-start">
          <Logo size="sm" showText={false} className="lg:hidden" />
          <Logo size="md" variant="horizontal" showText={true} className="hidden lg:flex" />
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-1.5 px-3">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.path || 
              (tab.path !== '/' && location.pathname.startsWith(tab.path));

            return (
              <button
                key={tab.name}
                onClick={() => navigate(tab.path)}
                className={`relative flex items-center gap-3.5 py-3 px-3.5 rounded-2xl transition-all duration-200 cursor-pointer text-left w-full
                  ${isActive 
                    ? 'bg-blue-500/10 dark:bg-blue-500/5 text-[#72C61D] font-black' 
                    : 'text-gray-500 dark:text-[#7A7A7A] hover:bg-slate-100 dark:hover:bg-[#161616] hover:text-gray-800 dark:hover:text-[#B8B8B8]'
                  }`}
              >
                {isActive && (
                  <span className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full bg-[#72C61D] shadow-[0_0_8px_#72C61D]" />
                )}
                <Icon className={`h-5.5 w-5.5 shrink-0 transition-transform ${isActive ? 'scale-105 stroke-[2.5px]' : 'stroke-[2px]'}`} />
                <span className="hidden lg:inline text-sm font-semibold tracking-wide">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile Details Widget */}
      {user && (
        <div className="p-4 border-t border-slate-200 dark:border-[#2D2D2D] bg-slate-50/50 dark:bg-[#161616]/20 flex flex-col gap-3">
          {/* Tablet mode (Icon only profile trigger) */}
          <button 
            onClick={() => navigate('/profile')}
            className="lg:hidden flex justify-center py-1.5 hover:opacity-85 cursor-pointer"
          >
            <img 
              src={user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'} 
              alt="Profile" 
              className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-[#2D2D2D]"
            />
          </button>

          {/* Desktop Mode (Full detailed profile card) */}
          <div className="hidden lg:flex items-center gap-3">
            <img 
              src={user.profileImage || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=80&q=80'} 
              alt="Profile" 
              className="h-10 w-10 rounded-full object-cover border border-slate-200 dark:border-[#2D2D2D] shrink-0"
            />
            <div className="min-w-0 text-left">
              <span className="text-sm font-black text-slate-800 dark:text-white block truncate leading-tight">
                {user.name}
              </span>
              <span className="text-[10px] font-bold text-gray-400 dark:text-[#B8B8B8] block truncate mt-0.5">
                {user.phone}
              </span>
            </div>
          </div>

          {/* Selected Address box (Desktop only) */}
          {selectedAddress && (
            <div className="hidden lg:flex items-center gap-2 p-2.5 rounded-xl bg-slate-100 dark:bg-[#161616] border border-slate-200/50 dark:border-[#2D2D2D]/50 text-left">
              <MapPin className="h-4 w-4 text-[#72C61D] shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] font-black text-slate-700 dark:text-white block leading-none truncate">
                  Deliver to: {selectedAddress.name}
                </span>
                <span className="text-[8px] font-bold text-gray-400 dark:text-[#7A7A7A] block truncate mt-1 leading-none">
                  {selectedAddress.details}, {selectedAddress.area}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

    </aside>
  );
};
