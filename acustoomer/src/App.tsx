import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { Home } from './pages/Home';
import { Search } from './pages/Search';
import { Category } from './pages/Category';
import { ShopPage } from './pages/ShopPage';
import { ProductDetails } from './pages/ProductDetails';
import { Cart } from './pages/Cart';
import { Checkout } from './pages/Checkout';
import { Orders } from './pages/Orders';
import { LiveTracking } from './pages/LiveTracking';
import { Wishlist } from './pages/Wishlist';
import { Profile } from './pages/Profile';
import { PreOrders } from './pages/PreOrders';
import { OrderSuccess } from './pages/OrderSuccess';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';

// Protected Route Guard Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, onboardingCompleted } = useAuth();

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
  
  // Routes where header should NOT show (every page renders its own custom header)
  const showHeader = false;

  // Pages with no sidebar/navigation tabs
  const noNavRoutes = ['/splash', '/onboarding', '/login'];
  const showNav = !noNavRoutes.includes(location.pathname);
  const isCheckoutFlow = ['/cart', '/checkout'].includes(location.pathname);

  return (
    <div className="flex flex-col min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors">
      {isOffline && (
        <div className="bg-red-600 text-white text-[10px] font-black py-2.5 px-4 text-center sticky top-0 z-50 flex items-center justify-center gap-2 animate-pulse uppercase tracking-widest shadow-md">
          <div className="w-2 h-2 rounded-full bg-white animate-ping shrink-0" />
          <span>No Internet Connection. Operating in offline cache mode.</span>
        </div>
      )}

      <div className="flex-1 flex w-full max-w-[100vw] overflow-x-hidden">
        {showNav && <Sidebar />}
        
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-x-hidden">
          {showHeader && <Header />}
          
          <main className={`flex-1 w-full min-w-0 overflow-x-hidden pb-24 md:pb-6 ${noNavRoutes.includes(location.pathname) ? '' : isCheckoutFlow ? '' : 'max-w-md sm:max-w-xl md:max-w-4xl px-3 sm:px-4 mx-auto'}`}>
            {children}
          </main>

          {showNav && <BottomNavigation />}
          {showNav && <SupportBot />}
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
      <AppLayout>
        <Routes>
          {/* Splash screen is the main entry point */}
          <Route path="/splash" element={<Splash />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/login" element={<Login />} />

          {/* Autologin handles navigation from splash */}
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

          <Route path="/terms" element={<Terms />} />
          <Route path="/privacy" element={<Privacy />} />

          {/* Catch-all fallback redirect */}
          <Route path="*" element={<Navigate to="/splash" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};

const App: React.FC = () => {
  return (
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
  );
};

export default App;
