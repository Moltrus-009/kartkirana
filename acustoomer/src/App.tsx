import React, { Suspense, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { HelmetProvider } from 'react-helmet-async';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AddressProvider } from './context/AddressContext';
import { CartProvider } from './context/CartContext';
import { LanguageProvider } from './context/LanguageContext';

// Layout elements
import { Header } from './components/layout/Header';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { Sidebar } from './components/layout/Sidebar';
import { SupportBot } from './components/SupportBot';
import { useCart } from './context/CartContext';
import { Dialog } from './components/ui/Dialog';
import { Button } from './components/ui/Button';

// Page components
import { Splash } from './pages/Splash';
import { Onboarding } from './pages/Onboarding';
import { Login } from './pages/Login';
const Home = React.lazy(() => import('./pages/Home').then(module => ({ default: module.Home })));
const Search = React.lazy(() => import('./pages/Search').then(module => ({ default: module.Search })));
const Category = React.lazy(() => import('./pages/Category').then(module => ({ default: module.Category })));
const ShopPage = React.lazy(() => import('./pages/ShopPage').then(module => ({ default: module.ShopPage })));
const ProductDetails = React.lazy(() => import('./pages/ProductDetails').then(module => ({ default: module.ProductDetails })));
const Cart = React.lazy(() => import('./pages/Cart').then(module => ({ default: module.Cart })));
const Checkout = React.lazy(() => import('./pages/Checkout').then(module => ({ default: module.Checkout })));
const Orders = React.lazy(() => import('./pages/Orders').then(module => ({ default: module.Orders })));
const LiveTracking = React.lazy(() => import('./pages/LiveTracking').then(module => ({ default: module.LiveTracking })));
const Wishlist = React.lazy(() => import('./pages/Wishlist').then(module => ({ default: module.Wishlist })));
const Profile = React.lazy(() => import('./pages/Profile').then(module => ({ default: module.Profile })));
const PreOrders = React.lazy(() => import('./pages/PreOrders').then(module => ({ default: module.PreOrders })));
const OrderSuccess = React.lazy(() => import('./pages/OrderSuccess').then(module => ({ default: module.OrderSuccess })));
const Terms = React.lazy(() => import('./pages/Terms').then(module => ({ default: module.Terms })));
const PrivacyHub = React.lazy(() => import('./pages/privacy/PrivacyHub').then(module => ({ default: module.PrivacyHub })));
const CustomerPrivacy = React.lazy(() => import('./pages/privacy/CustomerPrivacy').then(module => ({ default: module.CustomerPrivacy })));
const ShopkeeperPrivacy = React.lazy(() => import('./pages/privacy/ShopkeeperPrivacy').then(module => ({ default: module.ShopkeeperPrivacy })));
const RiderPrivacy = React.lazy(() => import('./pages/privacy/RiderPrivacy').then(module => ({ default: module.RiderPrivacy })));

const RouteFallback = () => (
  <div className="mx-auto w-full max-w-xl px-4 py-6" aria-label="Loading page">
    <div className="mb-5 h-12 w-full rounded-2xl shimmer" />
    <div className="grid grid-cols-2 gap-4">
      <div className="h-48 rounded-3xl shimmer" />
      <div className="h-48 rounded-3xl shimmer" />
    </div>
  </div>
);

// Helper component to auto-sync legacy hash URLs (e.g., /#/privacy/customer) to clean path URLs (/privacy/customer)
const HashRouteSync: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  React.useLayoutEffect(() => {
    if (window.location.hash.startsWith('#/privacy')) {
      const targetPath = window.location.hash.replace(/^#/, '');
      window.history.replaceState(null, '', targetPath);
      navigate(targetPath, { replace: true });
    }
  }, [location, navigate]);

  return null;
};

// Keep Android hardware Back navigation inside the app until the user reaches Home.
const NativeNavigationController: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading, onboardingCompleted } = useAuth();
  const pathnameRef = React.useRef(location.pathname);
  const initialPathRef = React.useRef(location.pathname);
  const startupRouteHandledRef = React.useRef(false);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || loading || startupRouteHandledRef.current) return;
    startupRouteHandledRef.current = true;

    // Keep Checkout mounted after Android process death so it can reconcile a
    // persisted Razorpay order before another payment is allowed.
    const interruptedCheckoutRoutes = ['/cart', '/order-success'];
    const recoverableSuccessRoute = initialPathRef.current === '/order-success' &&
      Boolean(new URLSearchParams(window.location.search).get('orderId'));
    if (user && onboardingCompleted && interruptedCheckoutRoutes.includes(initialPathRef.current) && !recoverableSuccessRoute) {
      navigate('/', { replace: true });
    }
  }, [loading, navigate, onboardingCompleted, user]);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let disposed = false;
    let removeListener: (() => Promise<void>) | undefined;

    void CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      const pathname = pathnameRef.current;

      if (pathname === '/checkout') {
        navigate('/cart', { replace: true });
        return;
      }
      if (pathname === '/cart' || pathname === '/order-success') {
        navigate('/', { replace: true });
        return;
      }
      if (pathname.startsWith('/orders/track/')) {
        navigate('/orders', { replace: true });
        return;
      }
      if (pathname === '/') {
        void CapacitorApp.exitApp();
        return;
      }
      if (canGoBack) {
        window.history.back();
        return;
      }

      navigate('/', { replace: true });
    }).then((handle) => {
      if (disposed) {
        void handle.remove();
      } else {
        removeListener = () => handle.remove();
      }
    });

    return () => {
      disposed = true;
      if (removeListener) void removeListener();
    };
  }, [navigate]);

  return null;
};

// Protected Route Guard Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, onboardingCompleted } = useAuth();
  const location = useLocation();

  // Failsafe: Privacy and terms pages are ALWAYS public and must NEVER redirect to login or onboarding
  if (location.pathname.startsWith('/privacy') || location.pathname === '/terms') {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center text-gray-500">
        <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Loading Session...</span>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <Navigate to="/onboarding" replace />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout Manager Wrapper to decide where to show headers / navs
const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const { conflictItem, confirmReplaceCart, cancelReplaceCart } = useCart();
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);
  
  // Routes where header should NOT show (every page renders its own custom header)
  const showHeader = false;

  // Pages with no sidebar/navigation tabs (Auth pages & Public legal/privacy pages)
  const isPrivacyPage = location.pathname.startsWith('/privacy');
  const noNavRoutes = ['/splash', '/onboarding', '/login', '/terms'];
  const showNav = !noNavRoutes.includes(location.pathname) && !isPrivacyPage;
  const isCheckoutFlow = ['/cart', '/checkout'].includes(location.pathname);
  const isFocusedFlow = isCheckoutFlow || location.pathname === '/order-success' || location.pathname.startsWith('/orders/track/');

  return (
    <div className="app-viewport flex min-h-screen w-full max-w-full flex-col overflow-x-hidden bg-[var(--bg-main)] text-slate-800 transition-colors dark:text-slate-100">
      {isOffline && (
        <div className="bg-red-600 text-white text-[10px] font-black py-2.5 px-4 text-center sticky top-0 z-50 flex items-center justify-center gap-2 animate-pulse uppercase tracking-widest shadow-md">
          <div className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
          <span>No Internet Connection. Operating in offline cache mode.</span>
        </div>
      )}

      <div className="flex w-full max-w-full flex-1 overflow-x-hidden">
        {showNav && <Sidebar />}
        
        <div className="flex min-w-0 w-full max-w-full flex-1 flex-col overflow-x-hidden">
          {showHeader && <Header />}
          
          <main className={`min-w-0 w-full max-w-full flex-1 overflow-x-hidden pb-24 md:pb-6 ${noNavRoutes.includes(location.pathname) || isPrivacyPage ? '' : isCheckoutFlow ? '' : 'mx-auto px-3 sm:max-w-xl sm:px-4 md:max-w-4xl'}`}>
            <div key={location.pathname} className="route-enter w-full max-w-full overflow-x-hidden">{children}</div>
          </main>

          {showNav && <BottomNavigation />}
          {showNav && !isFocusedFlow && <SupportBot />}
        </div>
      </div>

      {/* Global Swiggy-style Shop Conflict Modal */}
      {conflictItem && (
        <Dialog isOpen={conflictItem !== null} onClose={cancelReplaceCart} title="Clear cart & replace?">
          <div className="flex flex-col gap-4 text-xs text-left">
            <p className="font-semibold text-gray-500 dark:text-[#94A3B8] leading-relaxed">
              Your cart already contains items from another shop. Would you like to clear your current cart and add items from <b className="text-[#1565C0] dark:text-[#1E88E5] font-black">{conflictItem.product.shopName}</b> instead?
            </p>
            <div className="flex gap-3 mt-2">
              <Button
                variant="outline"
                onClick={cancelReplaceCart}
                className="flex-1 rounded-xl py-3.5 text-xs font-black border-gray-200 text-gray-700 bg-white"
              >
                Keep Existing Cart
              </Button>
              <Button
                variant="primary"
                onClick={confirmReplaceCart}
                className="flex-1 rounded-xl py-3.5 text-xs font-black bg-gradient-to-br from-red-500 to-red-600 border-none text-white hover:from-red-700 hover:to-red-700 shadow-sm"
              >
                Replace Cart
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export const AppContent: React.FC = () => {
  return (
    <Router>
      <HashRouteSync />
      <NativeNavigationController />
      <AppLayout>
        <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Public Auth & Onboarding Routes */}
          <Route path="/splash" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />

          {/* Public Legal & Privacy Routes (Zero Authentication Required) */}
          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<PrivacyHub />} />
          <Route path="/privacy/customer" element={<CustomerPrivacy />} />
          <Route path="/privacy/shopkeeper" element={<ShopkeeperPrivacy />} />
          <Route path="/privacy/rider" element={<RiderPrivacy />} />

          {/* Protected Application Routes (Authentication Required) */}
          <Route path="/" element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          } />
          
          <Route path="/search" element={
            <ProtectedRoute>
              <Search />
            </ProtectedRoute>
          } />
          
          <Route path="/category/:id" element={
            <ProtectedRoute>
              <Category />
            </ProtectedRoute>
          } />
          
          <Route path="/shop/:id" element={
            <ProtectedRoute>
              <ShopPage />
            </ProtectedRoute>
          } />
          
          <Route path="/product/:id" element={
            <ProtectedRoute>
              <ProductDetails />
            </ProtectedRoute>
          } />
          
          <Route path="/cart" element={
            <ProtectedRoute>
              <Cart />
            </ProtectedRoute>
          } />
          
          <Route path="/checkout" element={
            <ProtectedRoute>
              <Checkout />
            </ProtectedRoute>
          } />
          
          <Route path="/orders" element={
            <ProtectedRoute>
              <Orders />
            </ProtectedRoute>
          } />
          
          <Route path="/orders/track/:id" element={
            <ProtectedRoute>
              <LiveTracking />
            </ProtectedRoute>
          } />
          
          <Route path="/wishlist" element={
            <ProtectedRoute>
              <Wishlist />
            </ProtectedRoute>
          } />
          
          <Route path="/profile" element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          } />

          <Route path="/preorders" element={
            <ProtectedRoute>
              <PreOrders />
            </ProtectedRoute>
          } />

          <Route path="/order-success" element={
            <ProtectedRoute>
              <OrderSuccess />
            </ProtectedRoute>
          } />

          {/* Catch-all fallback redirect */}
          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
        </Suspense>
      </AppLayout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <ThemeProvider>
          <AuthProvider>
            <AddressProvider>
              <CartProvider>
                <AppContent />
              </CartProvider>
            </AddressProvider>
          </AuthProvider>
        </ThemeProvider>
      </LanguageProvider>
    </HelmetProvider>
  );
};

export default App;
