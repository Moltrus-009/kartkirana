import React, { useState, useEffect, Component, type ErrorInfo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AdminProvider, useAdmin } from './context/AdminContext';
import Login from './pages/Login';
import Shops from './pages/Shops';
import Products from './pages/Products';
import UsersList from './pages/Users';
import Coupons from './pages/Coupons';

// New Pages
import OperationsCenter from './pages/OperationsCenter';
import Operations from './pages/Operations';
import Riders from './pages/Riders';
import LiveMap from './pages/LiveMap';
import InventoryHealth from './pages/InventoryHealth';
import Categories from './pages/Categories';
import Payments from './pages/Payments';
import Analytics from './pages/Analytics';
import Notifications from './pages/Notifications';
import Complaints from './pages/Complaints';
import Banners from './pages/Banners';
import Zones from './pages/Zones';
import InternalChat from './pages/InternalChat';
import Logs from './pages/Logs';
import Settings from './pages/Settings';
import ManageAdmins from './pages/ManageAdmins';
import FraudDetection from './pages/FraudDetection';
import SystemHealth from './pages/SystemHealth';
import Terms from './pages/Terms';
import Privacy from './pages/Privacy';

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
  Shield
} from 'lucide-react';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { adminUser, loading } = useAdmin();

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
  const { adminUser, logout } = useAdmin();
  const location = useLocation();

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('kk_admin_theme');
    return (saved as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    localStorage.setItem('kk_admin_theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (!adminUser) return <>{children}</>;

  const menuItems = [
    { name: 'Command Center', path: '/', icon: ShieldAlert },
    { name: 'Dispatch Kanban', path: '/operations', icon: LayoutDashboard },
    { name: 'Merchant Shops', path: '/shops', icon: Store },
    { name: 'User Directory', path: '/users', icon: Users },
    { name: 'Courier Fleet', path: '/riders', icon: Truck },
    { name: 'Live Tracking Map', path: '/map', icon: Navigation },
    { name: 'Inventory Health', path: '/inventory-health', icon: Package },
    { name: 'Categories', path: '/categories', icon: Grid },
    { name: 'Financials Ledger', path: '/payments', icon: Wallet },
    { name: 'Performance Analytics', path: '/analytics', icon: Activity },
    { name: 'Broadcast Sender', path: '/notifications', icon: Rss },
    { name: 'Support Tickets', path: '/complaints', icon: MessageSquare },
    { name: 'Slider Banners', path: '/banners', icon: Image },
    { name: 'Promo Coupons', path: '/coupons', icon: Ticket },
    { name: 'Geofenced Zones', path: '/zones', icon: MapPin },
    { name: 'Internal Chats', path: '/chats', icon: HelpCircle },
    { name: 'Audit Logs', path: '/logs', icon: FileText },
    { name: 'System Settings', path: '/settings', icon: SettingsIcon },
  ];

  if (adminUser?.role === 'super_admin') {
    menuItems.splice(menuItems.length - 1, 0, { name: 'Manage Admins', path: '/admins', icon: Shield });
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      {/* Sidebar Desktop */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-850 hidden md:flex flex-col justify-between shrink-0 overflow-y-auto h-screen sticky top-0">
        <div className="p-6 space-y-6 text-left">
          {/* Logo */}
          <div className="flex items-center gap-3">
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
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-500/10 text-emerald-500' 
                      : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-850/50 dark:text-zinc-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
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
        {/* Mobile Header bar */}
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-850 p-4 flex md:hidden items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">
              Kart Kirana Admin
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-500"
            >
              {theme === 'light' ? <Moon className="h-4.5 w-4.5" /> : <Sun className="h-4.5 w-4.5" />}
            </button>
            <button
              onClick={logout}
              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-850 text-slate-500 hover:text-red-500 cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Mobile Bottom Navigation bar (Only visible on small devices) */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 flex md:hidden justify-around p-2.5 overflow-x-auto">
          {menuItems.slice(0, 5).map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 rounded-xl transition-colors ${
                  isActive ? 'text-emerald-500' : 'text-slate-400'
                }`}
              >
                <Icon className="h-5 w-5" />
              </Link>
            );
          })}
        </nav>

        {/* Content Wrapper */}
        <main className="flex-1 p-6 md:p-8 pb-24 md:pb-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AdminProvider>
      <Router>
        <PortalErrorBoundary>
          <Layout>
            <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><OperationsCenter /></ProtectedRoute>} />
            <Route path="/operations" element={<ProtectedRoute><Operations /></ProtectedRoute>} />
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
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </PortalErrorBoundary>
      </Router>
    </AdminProvider>
  );
}
