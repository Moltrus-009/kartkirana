import { Component, lazy, Suspense, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { useAppStore } from './core/store/useAppStore';
import type { Merchant } from './domain/entities/Merchant';
import type { Shop } from './domain/entities/Shop';
import type { Product } from './domain/entities/Product';
import type { Order } from './domain/entities/Order';

const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Orders = lazy(() => import('./pages/Orders'));
const Offers = lazy(() => import('./pages/Offers'));
const Products = lazy(() => import('./pages/Products'));
const Profile = lazy(() => import('./pages/Profile'));
const Terms = lazy(() => import('./pages/Terms'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Inventory = lazy(() => import('./pages/Inventory'));
const Reviews = lazy(() => import('./pages/Reviews'));

class GlobalErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {
    // Keep the customer-facing fallback free of implementation details.
  }

  render() {
    if (this.state.hasError) {
      const hindi = localStorage.getItem('shop_app_preferred_language') === 'hi';
      return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <section className="max-w-sm rounded-3xl bg-white border border-slate-100 p-8 shadow-sm">
            <h1 className="text-lg font-black text-slate-900">{hindi ? 'आपका कार्यक्षेत्र नहीं खुल सका' : 'We couldn’t open your workspace'}</h1>
            <p className="mt-2 text-sm text-slate-500">{hindi ? 'आपका डेटा सुरक्षित है। ऐप रीफ़्रेश करके दोबारा प्रयास करें।' : 'Your data is safe. Refresh the app and try again.'}</p>
            <button className="mt-6 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-wide text-white" onClick={() => window.location.reload()}>
              {hindi ? 'ऐप रीफ़्रेश करें' : 'Refresh app'}
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  const { t } = useLanguage();
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h1 className="mt-5 text-sm font-black uppercase tracking-wide text-slate-800">{t('preparing_workspace')}</h1>
        <p className="mt-2 text-xs font-medium text-slate-500">{t('syncing_shop_data')}</p>
      </section>
    </main>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAppStore();
  const { t } = useLanguage();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.shopId) return <Navigate to="/onboarding" replace />;
  return (
    <DashboardLayout>
      {user.accountStatus === 'pending' && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-amber-700">
          <span className="mt-1.5 h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
          <div className="text-xs font-bold">
            <h2 className="font-black uppercase">{t('store_review_pending')}</h2>
            <p className="mt-1 text-[11px]">{t('review_pending_message')}</p>
          </div>
        </div>
      )}
      {children}
    </DashboardLayout>
  );
}

function OnboardingRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAppStore();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return user.shopId ? <Navigate to="/" replace /> : <>{children}</>;
}

function AuthRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAppStore();
  if (loading) return <LoadingScreen />;
  return user ? <Navigate to="/" replace /> : <>{children}</>;
}

function AppContent() {
  const initStore = useAppStore((state) => state.initStore);
  const merchantPreview = import.meta.env.DEV && new URLSearchParams(window.location.search).has('merchant-preview');
  useEffect(() => {
    if (merchantPreview) {
      const now = new Date();
      const iso = now.toISOString();
      const previewUser: Merchant = {
        uid: 'merchant-preview', fullName: 'Mehul Kumar', phone: '+91 98765 43210',
        role: 'owner', shopId: 'shop-preview', accountStatus: 'active', createdAt: iso, lastLogin: iso,
      };
      const previewShop: Shop = {
        id: 'shop-preview', name: 'Mehul Super Store', ownerId: previewUser.uid,
        image: '/logo.jpeg', logo: '/logo.jpeg', rating: 4.8, reviewsCount: 128,
        deliveryTime: 18, distance: 1.2, deliveryFee: 0, productsCount: 3,
        status: 'open', featured: true, address: 'Civil Lines, Gorakhpur',
        ownerName: previewUser.fullName, ownerPhone: previewUser.phone,
        openingTime: '08:00', closingTime: '22:00', categories: ['Groceries', 'Essentials'],
      };
      const previewProducts: Product[] = [
        {
          id: 'preview-rice', shopId: previewShop.id, shopName: previewShop.name,
          name: 'Premium Basmati Rice', image: '/favicon.svg', images: [], price: 349, mrp: 399,
          discount: 13, rating: 4.8, reviewsCount: 42, category: 'Groceries', stock: 24,
          description: 'Long-grain everyday basmati rice.', specs: {}, tags: ['rice'], featured: true,
          minStockAlert: 5, status: 'active',
        },
        {
          id: 'preview-oil', shopId: previewShop.id, shopName: previewShop.name,
          name: 'Fortune Sunflower Oil', image: '/favicon.svg', images: [], price: 142, mrp: 155,
          discount: 8, rating: 4.7, reviewsCount: 35, category: 'Cooking', stock: 4,
          description: 'Refined sunflower cooking oil.', specs: {}, tags: ['oil'], featured: false,
          minStockAlert: 5, status: 'active',
        },
        {
          id: 'preview-milk', shopId: previewShop.id, shopName: previewShop.name,
          name: 'Fresh Toned Milk', image: '/favicon.svg', images: [], price: 32, mrp: 32,
          discount: 0, rating: 4.9, reviewsCount: 64, category: 'Dairy', stock: 0,
          description: 'Fresh toned milk, 500 ml.', specs: {}, tags: ['milk'], featured: false,
          minStockAlert: 6, status: 'active',
        },
      ];
      const makeOrder = (id: string, status: Order['status'], customer: string, total: number, minutesAgo: number): Order => ({
        id, userId: `user-${id}`, shopId: previewShop.id, shopName: previewShop.name,
        shopAddress: previewShop.address,
        items: [{
          product: { id: previewProducts[0].id, name: previewProducts[0].name, price: previewProducts[0].price, image: previewProducts[0].image, shopId: previewShop.id, shopName: previewShop.name },
          quantity: 1, shopId: previewShop.id,
        }],
        subtotal: total, deliveryFee: 0, platformFee: 5, tax: 0, platformDiscount: 5,
        couponDiscount: 0, total, paymentMethod: 'COD', paymentStatus: 'pending', status,
        createdAt: new Date(now.getTime() - minutesAgo * 60_000).toISOString(), updatedAt: iso,
        deliveryAddress: { name: customer, phone: '9999999999', street: 'Civil Lines', city: 'Gorakhpur', address: 'Civil Lines, Gorakhpur', coords: { lat: 26.7606, lng: 83.3732 } },
        contact: { name: customer, phone: '9999999999' }, rider: null,
        timeline: [{ status, timestamp: iso, title: 'Order placed', desc: 'Customer placed the order.' }],
      });
      useAppStore.setState({
        user: previewUser,
        shop: previewShop,
        products: previewProducts,
        orders: [
          makeOrder('KK12852', 'PLACED', 'Rahul Verma', 620, 4),
          makeOrder('KK12851', 'SHOP_ACCEPTED', 'Anita Singh', 485, 27),
          makeOrder('KK12850', 'DELIVERED', 'Amit Kumar', 810, 62),
        ],
        notifications: [],
        loading: false,
      });
      return;
    }
    const unsubscribe = initStore();
    return () => unsubscribe?.();
  }, [initStore, merchantPreview]);
  return (
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/offers" element={<ProtectedRoute><Offers /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/reviews" element={<ProtectedRoute><Reviews /></ProtectedRoute>} />
      <Route path="/terms" element={<Terms />} />
      <Route path="/privacy" element={<Privacy />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return <GlobalErrorBoundary><LanguageProvider><HashRouter><AppContent /></HashRouter></LanguageProvider></GlobalErrorBoundary>;
}
