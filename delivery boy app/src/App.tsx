import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { ActiveDelivery } from './pages/ActiveDelivery';
import { Orders } from './pages/Orders';
import { Earnings } from './pages/Earnings';
import { Profile } from './pages/Profile';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Compass } from 'lucide-react';

import ErrorBoundary from './components/ErrorBoundary';

const MainAppContent: React.FC = () => {
  const { user, loading } = useApp();
  const [activeTab, setActiveTab] = useState<'home' | 'orders' | 'earnings' | 'profile'>('home');
  const [viewActiveMap, setViewActiveMap] = useState(false);
  const [currentView, setCurrentView] = useState<'app' | 'terms' | 'privacy'>('app');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-zinc-950 flex flex-col justify-center items-center space-y-4">
        <div className="relative h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center text-primary border border-primary/20 animate-spin">
          <Compass className="h-6 w-6" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-450 dark:text-zinc-500 animate-pulse">
          Starting Partner Console...
        </p>
      </div>
    );
  }

  if (currentView === 'terms') {
    return <Terms onBack={() => setCurrentView('app')} />;
  }

  if (currentView === 'privacy') {
    return <Privacy onBack={() => setCurrentView('app')} />;
  }

  // Protected route check
  if (!user) {
    return <Login onOpenTerms={() => setCurrentView('terms')} onOpenPrivacy={() => setCurrentView('privacy')} />;
  }

  // Display Active GPS Map HUD if toggled
  if (viewActiveMap) {
    return (
      <ErrorBoundary fallbackTitle="Active Delivery Navigation Error">
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          <ActiveDelivery setViewActiveMap={setViewActiveMap} />
        </Layout>
      </ErrorBoundary>
    );
  }

  // Tab switcher
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return <Home setActiveTab={setActiveTab} setViewActiveMap={setViewActiveMap} />;
      case 'orders':
        return <Orders />;
      case 'earnings':
        return <Earnings />;
      case 'profile':
        return <Profile onOpenTerms={() => setCurrentView('terms')} onOpenPrivacy={() => setCurrentView('privacy')} />;
      default:
        return <Home setActiveTab={setActiveTab} setViewActiveMap={setViewActiveMap} />;
    }
  };

  return (
    <ErrorBoundary fallbackTitle="Partner Console Recovery">
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderTabContent()}
      </Layout>
    </ErrorBoundary>
  );
};

function App() {
  return (
    <AppProvider>
      <MainAppContent />
    </AppProvider>
  );
}

export default App;
