import React, { useState, useEffect, Component, lazy, Suspense, type ErrorInfo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AdminProvider, useAdmin } from './context/AdminContext';
import Login from './pages/Login';
import AdminCommandPalette from './components/AdminCommandPalette';
import { adminService } from './services/adminService';
import { canAccessAdminPath, canManageSupport } from './lib/adminPermissions';

const OperationsCenter = lazy(() => import('./pages/OperationsCenter'));
const Operations = lazy(() => import('./pages/Operations'));
const Orders = lazy(() => import('./pages/Orders'));
const Shops = lazy(() => import('./pages/Shops'));
const Products = lazy(() => import('./pages/Products'));
const UsersList = lazy(() => import('./pages/Users'));
const Riders = lazy(() => import('./pages/Riders'));
const LiveMap = lazy(() => import('./pages/LiveMap'));
const InventoryHealth = lazy(() => import('./pages/InventoryHealth'));
const Categories = lazy(() => import('./pages/Categories'));
const Payments = lazy(() => import('./pages/Payments'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Complaints = lazy(() => import('./pages/Complaints'));
const Banners = lazy(() => import('./pages/Banners'));
const Coupons = lazy(() => import('./pages/Coupons'));
const Zones = lazy(() => import('./pages/Zones'));
const InternalChat = lazy(() => import('./pages/InternalChat'));
const Logs = lazy(() => import('./pages/Logs'));
const Settings = lazy(() => import('./pages/Settings'));
const ManageAdmins = lazy(() => import('./pages/ManageAdmins'));
const FraudDetection = lazy(() => import('./pages/FraudDetection'));
const SystemHealth = lazy(() => import('./pages/SystemHealth'));
const DisasterRecovery = lazy(() => import('./pages/DisasterRecovery'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));

import { 
  LayoutDashboard, 
  Store, 
  Package, 
  Users, 
  LogOut, 
  ShieldAlert, 
  Ticket, 
  Moon, 
  Sun,
  Truck,
  Navigation,
  Grid,
  Wallet,
  Activity,
  Rss,
  MessageSquare,
  Image,
  MapPin,
  HelpCircle,
  FileText,
  Settings as SettingsIcon,
  Shield,
  Menu,
  Search,
  Bell,
  RefreshCw,
  X,
  ArchiveRestore,
  ClipboardList,
  Wifi,
  CircleAlert
} from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, loading } = useAdmin();
  const location = useLocation();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-55 dark:bg-slate-950 flex flex-col items-center justify-center text-slate-500">
        <svg className="animate-spin h-10 w-10 text-emerald-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Session...</span>
      </div>
    );
  }

  if (!adminUser) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminPath(adminUser.role, location.pathname)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

class PortalErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ADMIN PORTAL] Route rendering failed:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6 text-center">
          <div className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl space-y-4">
            <ShieldAlert className="h-10 w-10 text-red-500 mx-auto" />
            <h1 className="text-xl font-black text-slate-900 dark:text-white">This page could not be displayed</h1>
            <p className="text-sm text-slate-500">Your session is still safe. Return to the command center and try again.</p>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="px-5 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-sm"
            >
              Return to command center
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    adminUser, logout, users, shops, products, orders, riders,
    refreshAllData, dataLoading, dataError, lastSyncedAt
  } = useAdmin();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [openSupportCount, setOpenSupportCount] = useState(0);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('kk_admin_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('kk_admin_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!adminUser || !canManageSupport(adminUser.role)) return;
    let active = true;
    const loadSupportCount = async () => {
      try {
        const tickets = await adminService.getComplaints();
        if (active) setOpenSupportCount(tickets.filter((ticket: any) => !['RESOLVED', 'CLOSED'].includes(ticket.status)).length);
      } catch {
        if (active) setOpenSupportCount(0);
      }
    };
    void loadSupportCount();
    const interval = window.setInterval(() => void loadSupportCount(), 30000);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [adminUser]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (!adminUser) return <>{children}</>;

  const menuSections = [
    {
      group: 'Core Control',
      items: [
        { name: 'Command Center', path: '/', icon: ShieldAlert }
      ]
    },
    {
      group: 'Step 1: Onboarding & Approvals',
      items: [
        { name: 'Merchant Shops', path: '/shops', icon: Store },
        { name: 'Courier Fleet', path: '/riders', icon: Truck },
        { name: 'User Directory', path: '/users', icon: Users }
      ]
    },
    {
      group: 'Step 2: Catalog & Stock',
      items: [
        { name: 'Inventory Health', path: '/inventory-health', icon: Package },
        { name: 'Categories', path: '/categories', icon: Grid },
        { name: 'Products & Items', path: '/products', icon: Package },
        { name: 'Slider Banners', path: '/banners', icon: Image },
        { name: 'Promo Coupons', path: '/coupons', icon: Ticket }
      ]
    },
    {
      group: 'Step 3: Dispatch & Tracking',
      items: [
        { name: 'Dispatch Kanban', path: '/operations', icon: LayoutDashboard },
        { name: 'All Orders', path: '/orders', icon: ClipboardList },
        { name: 'Live Tracking Map', path: '/map', icon: Navigation },
        { name: 'Geofenced Zones', path: '/zones', icon: MapPin }
      ]
    },
    {
      group: 'Step 4: Care & Escalations',
      items: [
        { name: 'Support Tickets', path: '/complaints', icon: MessageSquare },
        { name: 'Internal Chats', path: '/chats', icon: HelpCircle },
        { name: 'Broadcast Sender', path: '/notifications', icon: Rss }
      ]
    },
    {
      group: 'Step 5: Financial Settlements',
      items: [
        { name: 'Financials Ledger', path: '/payments', icon: Wallet },
        { name: 'Performance Analytics', path: '/analytics', icon: Activity }
      ]
    },
    {
      group: 'Step 6: Governance & Security',
      items: [
        { name: 'Audit Logs', path: '/logs', icon: FileText },
        { name: 'Fraud Monitoring', path: '/fraud', icon: ShieldAlert },
        { name: 'System Health', path: '/system-health', icon: Activity },
        ...(adminUser?.role === 'super_admin' ? [{ name: 'Manage Admins', path: '/admins', icon: Shield }] : []),
        ...(adminUser?.role === 'super_admin' ? [{ name: 'Disaster Recovery', path: '/recovery', icon: ArchiveRestore }] : []),
        { name: 'System Settings', path: '/settings', icon: SettingsIcon }
      ]
    }
  ];

  const accessibleSections = menuSections
    .map(section => ({ ...section, items: section.items.filter(item => canAccessAdminPath(adminUser.role, item.path)) }))
    .filter(section => section.items.length > 0);
  const searchableNavigation = accessibleSections.flatMap(section => section.items.map(item => ({ name: item.name, path: item.path, group: section.group })));
  const operationalAlerts =
    orders.filter(order => !['delivered', 'DELIVERED', 'COMPLETED', 'cancelled', 'returned'].includes(order.status) && Date.now() - new Date(order.createdAt).getTime() > 20 * 60 * 1000).length +
    products.filter(product => product.stock <= 5).length + openSupportCount;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[80] md:hidden">
          <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-[86vw] max-w-sm flex-col bg-white shadow-2xl dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-500"><ShieldAlert className="h-5 w-5" /></div>
                <div><strong className="block text-sm font-black uppercase text-slate-900 dark:text-white">Kart Kirana</strong><span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Admin control</span></div>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="rounded-xl bg-slate-100 p-2 text-slate-500 dark:bg-slate-800"><X className="h-4 w-4" /></button>
            </div>
            <nav className="flex-1 space-y-5 overflow-y-auto p-4">
              {accessibleSections.map(section => (
                <div key={section.group}>
                  <span className="mb-1.5 block px-2 text-[8px] font-black uppercase tracking-widest text-slate-400">{section.group}</span>
                  {section.items.map(item => {
                    const Icon = item.icon;
                    const active = location.pathname === item.path;
                    return <Link key={item.path} to={item.path} className={`mb-1 flex items-center gap-3 rounded-xl px-3 py-3 text-[10px] font-black uppercase tracking-wider ${active ? 'bg-emerald-500/10 text-emerald-600' : 'text-slate-600 dark:text-slate-300'}`}><Icon className="h-4 w-4" /><span>{item.name}</span>{item.path === '/complaints' && openSupportCount > 0 && <span className="ml-auto rounded-full bg-rose-500 px-2 py-0.5 text-white">{openSupportCount}</span>}</Link>;
                  })}
                </div>
              ))}
            </nav>
          </aside>
        </div>
      )}
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 hidden md:flex flex-col justify-between shrink-0 overflow-y-auto h-screen sticky top-0">
        <div className="p-5 space-y-5 text-left">
          {/* Logo */}
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-500">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider leading-none">
                Kart Kirana
              </h2>
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1 block">
                Platform Admin
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-4">
            {accessibleSections.map((sec) => (
              <div key={sec.group} className="space-y-1">
                <span className="text-[8px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest block px-2 mb-1">
                  {sec.group}
                </span>
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                        isActive 
                          ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-black' 
                          : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/50 dark:text-zinc-400'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{item.name}</span>
                      {item.path === '/complaints' && openSupportCount > 0 && (
                        <span className="ml-auto rounded-full bg-rose-500 px-1.5 py-0.5 text-[8px] text-white">{openSupportCount}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* Footer log out */}
        <div className="p-6 border-t border-slate-50 dark:border-slate-800/40 text-left bg-white dark:bg-slate-900 sticky bottom-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold text-slate-700 dark:text-zinc-350 block truncate">
                {adminUser.phone || 'Admin'}
              </span>
              <span className="text-[9px] font-bold text-slate-400 block mt-0.5">
                Session Active
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:text-emerald-500 cursor-pointer transition text-slate-500"
                title="Toggle Theme Mode"
              >
                {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </button>
              <button
                onClick={logout}
                className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 hover:text-red-500 cursor-pointer transition"
                title="Logout session"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Global operations toolbar */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <button type="button" onClick={() => setMobileMenuOpen(true)} className="rounded-xl bg-slate-100 p-2.5 text-slate-600 dark:bg-slate-800 dark:text-slate-300 md:hidden" aria-label="Open all admin pages"><Menu className="h-4 w-4" /></button>
            <button type="button" onClick={() => setCommandOpen(true)} className="flex min-w-0 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-slate-400 transition hover:border-emerald-500/40 dark:border-slate-800 dark:bg-slate-950 sm:w-72">
              <Search className="h-4 w-4 shrink-0" />
              <span className="hidden flex-1 truncate text-[10px] font-bold sm:block">Search the entire platform</span>
              <span className="hidden rounded-md border border-slate-200 px-1.5 py-0.5 text-[8px] font-black dark:border-slate-700 sm:block">Ctrl K</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className={`hidden items-center gap-2 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-wider lg:flex ${dataError ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-600'}`} title={dataError || 'Realtime data connected'}>
              {dataError ? <CircleAlert className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
              {dataError ? 'Sync issue' : lastSyncedAt ? `Synced ${lastSyncedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Connecting'}
            </div>
            <button type="button" onClick={() => void refreshAllData().catch(() => undefined)} disabled={dataLoading} className="rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:text-emerald-500 disabled:opacity-50 dark:bg-slate-800" title="Refresh all admin data"><RefreshCw className={`h-4 w-4 ${dataLoading ? 'animate-spin' : ''}`} /></button>
            <Link to={canAccessAdminPath(adminUser.role, '/complaints') ? '/complaints' : '/'} className="relative rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:text-emerald-500 dark:bg-slate-800" title="Operational alerts"><Bell className="h-4 w-4" />{operationalAlerts > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-rose-500 px-1 text-center text-[8px] font-black leading-4 text-white">{Math.min(operationalAlerts, 99)}</span>}</Link>
            <button onClick={toggleTheme} className="rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:text-emerald-500 dark:bg-slate-800" title="Toggle theme">{theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}</button>
            <button onClick={logout} className="hidden rounded-xl bg-slate-100 p-2.5 text-slate-500 hover:text-red-500 dark:bg-slate-800 sm:block" title="Log out"><LogOut className="h-4 w-4" /></button>
          </div>
        </header>

        {/* Mobile Bottom Navigation bar (Only visible on small devices) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 flex md:hidden justify-around p-2.5 overflow-x-auto">
          {[
            { name: 'Home', path: '/', icon: ShieldAlert },
            { name: 'Shops', path: '/shops', icon: Store },
            { name: 'Dispatch', path: '/operations', icon: LayoutDashboard },
            { name: 'Fleet', path: '/riders', icon: Truck },
            { name: 'Settings', path: '/settings', icon: SettingsIcon }
          ].filter(item => canAccessAdminPath(adminUser.role, item.path)).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                  isActive ? 'text-emerald-500 font-bold' : 'text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[9px] font-bold mt-0.5">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Content Wrapper */}
        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
      <AdminCommandPalette
        open={commandOpen}
        onClose={() => setCommandOpen(false)}
        navigation={searchableNavigation}
        orders={orders}
        shops={shops}
        products={products}
        users={users}
        riders={riders}
      />
    </div>
  );
};

export default function App() {
  return (
    <AdminProvider>
      <Router>
        <PortalErrorBoundary>
          <Layout>
            <Suspense fallback={<div className="flex min-h-[55vh] items-center justify-center"><div className="text-center"><RefreshCw className="mx-auto h-7 w-7 animate-spin text-emerald-500" /><span className="mt-3 block text-[10px] font-black uppercase tracking-widest text-slate-400">Loading admin module</span></div></div>}>
              <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><OperationsCenter /></ProtectedRoute>} />
            <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
            <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
            <Route path="/shops" element={<ProtectedRoute><Shops /></ProtectedRoute>} />
            <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
            <Route path="/users" element={<ProtectedRoute><UsersList /></ProtectedRoute>} />
            <Route path="/riders" element={<ProtectedRoute><Riders /></ProtectedRoute>} />
            <Route path="/map" element={<ProtectedRoute><LiveMap /></ProtectedRoute>} />
            <Route path="/inventory-health" element={<ProtectedRoute><InventoryHealth /></ProtectedRoute>} />
            <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
            <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
            <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
            <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
            <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
            <Route path="/banners" element={<ProtectedRoute><Banners /></ProtectedRoute>} />
            <Route path="/coupons" element={<ProtectedRoute><Coupons /></ProtectedRoute>} />
            <Route path="/zones" element={<ProtectedRoute><Zones /></ProtectedRoute>} />
            <Route path="/chats" element={<ProtectedRoute><InternalChat /></ProtectedRoute>} />
            <Route path="/logs" element={<ProtectedRoute><Logs /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            <Route path="/admins" element={<ProtectedRoute><ManageAdmins /></ProtectedRoute>} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/fraud" element={<ProtectedRoute><FraudDetection /></ProtectedRoute>} />
            <Route path="/system-health" element={<ProtectedRoute><SystemHealth /></ProtectedRoute>} />
            <Route path="/recovery" element={<ProtectedRoute><DisasterRecovery /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </Layout>
        </PortalErrorBoundary>
      </Router>
    </AdminProvider>
  );
}
