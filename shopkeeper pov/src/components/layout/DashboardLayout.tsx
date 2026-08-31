import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLanguage } from '../../context/LanguageContext';
import { useAppStore } from '../../core/store/useAppStore';
import { useDiagnostics } from '../../core/diagnostics/diagnostics';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  ClipboardList, 
  Gift,
  Store, 
  Users, 
  Bell, 
  LogOut, 
  Menu, 
  X,
  PackageSearch,
  BarChart3,
  Star
} from 'lucide-react';

interface SidebarLinkProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
}

function SidebarLink({ icon, label, active, onClick, badge }: SidebarLinkProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group cursor-pointer ${
        active 
          ? 'bg-primary text-white shadow-md shadow-primary/20 translate-x-1' 
          : 'text-slate-500 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800/60 hover:text-slate-800 dark:hover:text-zinc-100'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className={`transition-transform duration-200 group-hover:scale-110 ${active ? 'text-white' : 'text-slate-400 dark:text-zinc-500 group-hover:text-primary'}`}>
          {icon}
        </span>
        <span>{label}</span>
      </div>
      {badge !== undefined && badge > 0 && (
        <span className={`px-2 py-0.5 text-xs font-extrabold rounded-full ${active ? 'bg-white text-primary' : 'bg-red-500 text-white animate-pulse'}`}>
          {badge}
        </span>
      )}
    </button>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { 
    user, 
    shop, 
    orders, 
    notifications, 
    markAllNotificationsRead, 
    clearNotificationItem,
    logoutOwner,
    updateShop
  } = useAppStore();

  const navigate = useNavigate();
  const trackComponent = useDiagnostics(state => state.trackComponent);
  useEffect(() => {
    trackComponent('DashboardLayout', 'mount');
  }, [trackComponent]);
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifPanelOpen, setNotifPanelOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const activePath = location.pathname;

  // New/Confirmed orders count
  const newOrdersCount = orders.filter((o: any) => o.status === 'PLACED').length;
  // Unread notification count
  const unreadNotifCount = notifications.filter((n: any) => !n.read).length;

  const handleNav = (path: string) => {
    navigate(path);
    setSidebarOpen(false);
  };

  const toggleStoreStatus = async () => {
    if (!shop) return;
    const nextStatus = shop.status === 'open' ? 'closed' : 'open';
    await updateShop({ status: nextStatus });
  };

  const { language, setLanguage, t } = useLanguage();

  const navLinks = [
    { to: '/', icon: <LayoutDashboard className="h-5 w-5" />, label: t('home') },
    { to: '/orders', icon: <ClipboardList className="h-5 w-5" />, label: t('orders'), badge: newOrdersCount },
    { to: '/products', icon: <ShoppingBag className="h-5 w-5" />, label: t('products') },
    { to: '/inventory', icon: <PackageSearch className="h-5 w-5" />, label: 'Inventory' },
    { to: '/offers', icon: <Gift className="h-5 w-5" />, label: 'Shop specials' },
    { to: '/customers', icon: <Users className="h-5 w-5" />, label: t('customers') },
    { to: '/reviews', icon: <Star className="h-5 w-5" />, label: 'Reviews' },
    { to: '/analytics', icon: <BarChart3 className="h-5 w-5" />, label: 'Business reports' },
    { to: '/profile', icon: <Store className="h-5 w-5" />, label: t('profile') }
  ];

  useEffect(() => {
    trackComponent('DashboardLayout', 'render');
  });
  return (
    <div className="merchant-shell flex flex-col md:flex-row bg-slate-50 dark:bg-dark-bg text-slate-800 dark:text-zinc-100 transition-colors duration-200">
      
      {/* MOBILE HEADER */}
      <header className="merchant-mobile-header md:hidden flex items-center justify-between px-4 py-3 bg-white dark:bg-dark-card border-b border-slate-100 dark:border-dark-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            <Menu className="h-6 w-6 text-slate-600 dark:text-zinc-300" />
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.jpeg" alt="Kart Kirana" className="h-9 w-9 rounded-xl object-contain shadow-sm" />
            <div className="leading-tight">
              <span className="block font-black text-sm tracking-tight text-[#123f9d]">Kart <span className="text-[#f5b900]">Kirana</span></span>
              <span className="block text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">Shop partner</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Toggle on Mobile */}
          {shop && (
            <button 
              onClick={toggleStoreStatus}
              className={`text-xs font-black px-2.5 py-1 rounded-full uppercase tracking-wider transition cursor-pointer flex items-center gap-1 ${
                shop.status === 'open' 
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' 
                  : 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${shop.status === 'open' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
              {shop.status === 'open' ? t('open') : t('closed')}
            </button>
          )}


          <button 
            onClick={() => setNotifPanelOpen(!notifPanelOpen)} 
            className="relative p-1.5 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
          >
            <Bell className="h-5 w-5 text-slate-600 dark:text-zinc-300" />
            {unreadNotifCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 border border-white rounded-full"></span>
            )}
          </button>
        </div>
      </header>

      {/* SIDEBAR - DESKTOP & MOBILE DRAWER */}
      <aside className={`merchant-sidebar fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-dark-card border-r border-slate-100 dark:border-dark-border flex flex-col justify-between transform transition-transform duration-300 md:relative md:transform-none ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="min-h-0 overflow-y-auto no-scrollbar pb-3">
          {/* Logo Section */}
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-50 dark:border-dark-border/40">
            <div className="flex items-center gap-2.5">
              <img src="/logo.jpeg" alt="Kart Kirana Shopkeeper Partner" className="w-10 h-10 rounded-xl object-contain shadow-md" />
              <div>
                <h1 className="font-black text-base tracking-tight leading-none text-slate-800 dark:text-zinc-100">Kart Kirana</h1>
                <span className="text-[10px] text-primary font-extrabold uppercase tracking-widest">Shopkeeper Partner</span>
              </div>
            </div>
            
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-lg cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Shop Header Details */}
          {shop && (
            <div className="mx-4 my-4 p-3 bg-slate-50 dark:bg-zinc-900/40 rounded-2xl border border-slate-100/50 dark:border-dark-border/50 flex items-center gap-3">
              <img 
                src={shop.logoUrl || shop.logo || shop.image || '/favicon.svg'} 
                alt="shop logo" 
                className="w-10 h-10 rounded-xl object-cover border border-white shadow-xs"
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black truncate text-slate-800 dark:text-zinc-200">{shop.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold truncate">{shop.address}</p>
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="px-4 py-2 space-y-1">
            {navLinks.map((link) => (
              <SidebarLink
                key={link.to}
                icon={link.icon}
                label={link.label}
                active={activePath === link.to}
                onClick={() => handleNav(link.to)}
                badge={link.badge}
              />
            ))}
          </nav>
        </div>
        {/* Footer profile/logout */}
        <div className="shrink-0 p-4 border-t border-slate-50 dark:border-dark-border/40 space-y-3">
          <div className="flex items-center justify-between px-2 pb-1.5 border-b border-slate-50 dark:border-dark-border/40">
            <span className="text-[10px] text-slate-400 font-black uppercase">{t('change_language')}</span>
            <div className="flex bg-slate-100 dark:bg-zinc-800 rounded-lg p-0.5">
              <button 
                onClick={() => setLanguage('en')}
                className={`text-[9px] font-black px-2 py-0.5 rounded-md transition cursor-pointer ${language === 'en' ? 'bg-white dark:bg-zinc-700 shadow-xs text-emerald-600 font-extrabold' : 'text-slate-500'}`}
              >
                EN
              </button>
              <button 
                onClick={() => setLanguage('hi')}
                className={`text-[9px] font-black px-2 py-0.5 rounded-md transition cursor-pointer ${language === 'hi' ? 'bg-white dark:bg-zinc-700 shadow-xs text-emerald-600 font-extrabold' : 'text-slate-500'}`}
              >
                हिन्दी
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-slate-400 font-extrabold uppercase tracking-widest">{t('active_partner')}</span>

          </div>
          
          <div className="flex items-center gap-3 p-2 bg-slate-50 dark:bg-zinc-900/40 rounded-xl">
            <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-zinc-700 font-black text-sm flex items-center justify-center">
              {(user?.fullName || (user as any).name || 'Merchant Owner').charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black truncate">{user?.fullName || (user as any).name || 'Merchant Owner'}</h4>
              <p className="text-[10px] text-slate-400 font-bold truncate">{user?.phone || (user as any).phoneNumber || ''}</p>
            </div>
            <button 
              onClick={logoutOwner}
              className="p-1.5 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/30 rounded-lg transition cursor-pointer"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* OVERLAY FOR MOBILE SIDEBAR */}
      {sidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-xs z-40 md:hidden"
        ></div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
        
        {/* DESKTOP HEADER */}
        <header className="merchant-desktop-header hidden md:flex items-center justify-between h-16 px-8 bg-white dark:bg-dark-card border-b border-slate-100 dark:border-dark-border sticky top-0 z-30">
          <div className="flex items-center gap-6">
            <h2 className="text-sm font-black text-slate-800 dark:text-zinc-200">
              {shop ? `${shop.name} Partner Portal` : 'Shopkeeper Dashboard'}
            </h2>
            
            {shop && (
              <div className="flex items-center gap-3 pl-4 border-l border-slate-100 dark:border-dark-border">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('store_status')}:</span>
                <button
                  onClick={toggleStoreStatus}
                  className="flex items-center gap-2 cursor-pointer focus:outline-none"
                >
                  {shop.status === 'open' ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 font-black text-xs uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      {t('open')}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-400 font-black text-xs uppercase tracking-wide">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                      {t('closed')}
                    </div>
                  )}
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {/* Notifications Bell */}
            <div className="relative">
              <button 
                onClick={() => setNotifPanelOpen(!notifPanelOpen)}
                className="p-2 hover:bg-slate-100 dark:hover:bg-zinc-800 rounded-xl transition relative cursor-pointer"
              >
                <Bell className="h-5 w-5 text-slate-600 dark:text-zinc-300" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-black border border-white rounded-full flex items-center justify-center">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Drawer */}
              {notifPanelOpen && (
                <>
                  <div onClick={() => setNotifPanelOpen(false)} className="fixed inset-0 z-30" />
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-2xl shadow-xl z-40 p-4 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100 dark:border-dark-border">
                      <h4 className="font-black text-sm">Store Notifications</h4>
                      {unreadNotifCount > 0 && (
                        <button 
                          onClick={markAllNotificationsRead}
                          className="text-[10px] text-primary font-extrabold uppercase hover:underline cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto space-y-2.5">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-slate-400 text-xs font-semibold">
                          No recent alerts or notifications.
                        </div>
                      ) : (
                        notifications.map((notif: any) => (
                          <div 
                            key={notif.id}
                            className={`p-2.5 rounded-xl border relative transition-all ${
                              notif.read 
                                ? 'bg-slate-50/50 dark:bg-zinc-900/20 border-slate-100 dark:border-dark-border/40' 
                                : 'bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30'
                            }`}
                          >
                            <button
                              onClick={() => clearNotificationItem(notif.id)}
                              className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 text-xs font-bold cursor-pointer"
                            >
                              ×
                            </button>
                            <h5 className="font-extrabold text-xs text-slate-800 dark:text-zinc-200 pr-4">{notif.title}</h5>
                            <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{notif.message}</p>
                            <span className="text-[9px] text-slate-400 font-bold block mt-1">
                              {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2.5 p-1 px-3 bg-slate-50 dark:bg-zinc-900/60 border border-slate-100 dark:border-dark-border hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                <div className="w-7.5 h-7.5 rounded-full bg-primary text-white font-black text-sm flex items-center justify-center">
                  {(user?.fullName || (user as any).name || 'Merchant Owner').charAt(0)}
                </div>
                <div className="text-left">
                  <span className="text-xs font-black block leading-none">{user?.fullName || (user as any).name || 'Merchant Owner'}</span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">{user?.role || 'owner'}</span>
                </div>
              </button>

              {profileDropdownOpen && (
                <>
                  <div onClick={() => setProfileDropdownOpen(false)} className="fixed inset-0 z-30" />
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card border border-slate-100 dark:border-dark-border rounded-xl shadow-xl z-40 p-1">
                    <button 
                      onClick={() => { setProfileDropdownOpen(false); navigate('/profile'); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Store Settings
                    </button>
                    <button 
                      onClick={() => { setProfileDropdownOpen(false); navigate('/analytics'); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 text-xs font-bold rounded-lg cursor-pointer"
                    >
                      Business Reports
                    </button>
                    <hr className="border-slate-100 dark:border-dark-border my-1" />
                    <button 
                      onClick={() => { setProfileDropdownOpen(false); logoutOwner(); }}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-black rounded-lg cursor-pointer flex items-center gap-2"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* PAGE BODY VIEW */}
        <main className="merchant-page flex-1 p-4 md:p-8 pb-24 md:pb-8 page-transition">
          {children}
        </main>
      </div>

      {/* MOBILE BOTTOM NAVIGATION */}
      <nav className="merchant-bottom-nav md:hidden fixed bottom-0 inset-x-0 bg-white dark:bg-dark-card border-t border-slate-100 dark:border-dark-border py-2 px-2 flex justify-around items-center z-40 shadow-lg pb-safe">
        <button
          onClick={() => handleNav('/')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activePath === '/' ? 'text-primary' : 'text-slate-400 dark:text-zinc-550'
          }`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Home</span>
        </button>

        <button
          onClick={() => handleNav('/orders')}
          className={`flex flex-col items-center gap-0.5 relative cursor-pointer ${
            activePath === '/orders' ? 'text-primary' : 'text-slate-400 dark:text-zinc-550'
          }`}
        >
          <ClipboardList className="h-5 w-5" />
          {newOrdersCount > 0 && (
            <span className="absolute -top-1 -right-1.5 w-4.5 h-4.5 bg-red-505 text-white text-[8px] font-black border border-white rounded-full flex items-center justify-center animate-pulse">
              {newOrdersCount}
            </span>
          )}
          <span className="text-[9px] font-black uppercase tracking-wider">Orders</span>
        </button>

        <button
          onClick={() => handleNav('/products')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activePath === '/products' ? 'text-primary' : 'text-slate-400 dark:text-zinc-550'
          }`}
        >
          <ShoppingBag className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Products</span>
        </button>

        <button
          onClick={() => handleNav('/customers')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activePath === '/customers' ? 'text-primary' : 'text-slate-400 dark:text-zinc-550'
          }`}
        >
          <Users className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Customers</span>
        </button>

        <button
          onClick={() => handleNav('/profile')}
          className={`flex flex-col items-center gap-0.5 cursor-pointer ${
            activePath === '/profile' ? 'text-primary' : 'text-slate-400 dark:text-zinc-550'
          }`}
        >
          <Store className="h-5 w-5" />
          <span className="text-[9px] font-black uppercase tracking-wider">Profile</span>
        </button>
      </nav>
    </div>
  );
};
