import { Component, lazy, Suspense, type ErrorInfo, type ReactNode, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { LanguageProvider, useLanguage } from './context/LanguageContext';
import { useAppStore } from './core/store/useAppStore';

const DashboardLayout = lazy(() => import('./components/layout/DashboardLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Customers = lazy(() => import('./pages/Customers'));
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Orders = lazy(() => import('./pages/Orders'));
const Products = lazy(() => import('./pages/Products'));
const Profile = lazy(() => import('./pages/Profile'));

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
      return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
          <section className="max-w-sm rounded-3xl bg-white border border-slate-100 p-8 shadow-sm">
            <h1 className="text-lg font-black text-slate-900">We couldn’t open your workspace</h1>
            <p className="mt-2 text-sm text-slate-500">Your data is safe. Refresh the app and try again.</p>
            <button className="mt-6 rounded-xl bg-primary px-5 py-3 text-xs font-black uppercase tracking-wide text-white" onClick={() => window.location.reload()}>
              Refresh app
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}

function LoadingScreen() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
      <section className="w-full max-w-sm rounded-3xl border border-slate-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <h1 className="mt-5 text-sm font-black uppercase tracking-wide text-slate-800">Preparing your workspace</h1>
        <p className="mt-2 text-xs font-medium text-slate-500">Securely syncing your shop data.</p>
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
  useEffect(() => {
    const unsubscribe = initStore();
    return () => unsubscribe?.();
  }, [initStore]);
  return (
    <Suspense fallback={<LoadingScreen />}>
    <Routes>
      <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
      <Route path="/onboarding" element={<OnboardingRoute><Onboarding /></OnboardingRoute>} />
      <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}

export default function App() {
  return <GlobalErrorBoundary><LanguageProvider><HashRouter><AppContent /></HashRouter></LanguageProvider></GlobalErrorBoundary>;
}
