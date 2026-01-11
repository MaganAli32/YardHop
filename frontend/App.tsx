import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import HeaderWrapper from './components/HeaderWrapper';
import Footer from './components/Footer';
import LandingPage from './pages/LandingPage';
import SearchPage from './pages/SearchPage';
import GarageSalesPage from './pages/GarageSalesPage';
import ProductDetailPage from './pages/ProductDetailPage';
import YardSaleDetailPage from './pages/YardSaleDetailPage';
import FavoritesPage from './pages/FavoritesPage';
import OrdersPage from './pages/OrdersPage';
import CreateListingPage from './pages/CreateListingPage';
import CreateGarageSalePage from './pages/CreateGarageSalePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import HowItWorksPage from './pages/HowItWorksPage';
import CommunityPage from './pages/CommunityPage';
import ProfilePage from './pages/ProfilePage';
import InboxPage from './pages/InboxPage';
import GarageSaleScannerPage from './pages/GarageSaleScannerPage';
import StitchLivePage from './pages/StitchLivePage';
import SellHubPage from './pages/SellHubPage';
import { PersistenceProvider } from './store/PersistenceContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import AuthCallbackHandler from './components/AuthCallbackHandler';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const location = useLocation();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/signup';
  const isInbox = location.pathname === '/inbox';
  const isLive = location.pathname === '/live-advisor';
  const isLandingPage = location.pathname === '/';

  return (
    <div className={`flex min-h-screen flex-col ${isLandingPage ? '' : 'bg-slate-50 dark:bg-background-dark'} text-slate-900 dark:text-slate-100 font-display antialiased`}>
      {!isAuthPage && !isLive && <HeaderWrapper />}
      <main className={`flex-grow flex flex-col ${isAuthPage || isLive ? 'h-screen' : ''}`}>
        {children}
      </main>
      {/* Footer is rendered inside LandingPage, so don't show it here for landing page */}
      {!isAuthPage && !isInbox && !isLive && !isLandingPage && <Footer />}
    </div>
  );
}

const App: React.FC = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .scroll-reveal {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity 900ms cubic-bezier(0.16, 1, 0.3, 1), transform 900ms cubic-bezier(0.16, 1, 0.3, 1);
        will-change: transform, opacity;
      }
      .scroll-reveal.is-visible {
        opacity: 1;
        transform: translateY(0);
      }
      @keyframes shimmer-text {
        0% { background-position: -200% 0; }
        100% { background-position: 200% 0; }
      }
      .shimmer-text {
        background: linear-gradient(90deg, #121c32 0%, #FF6B35 50%, #121c32 100%);
        background-size: 200% auto;
        color: transparent;
        -webkit-background-clip: text;
        background-clip: text;
        animation: shimmer-text 5s linear infinite;
      }
      @font-face {
        font-family: 'Breul Grotesk';
        src: local('Impact'), local('Arial Black');
      }
      .font-display { font-family: 'Breul Grotesk', 'Impact', sans-serif !important; }
      .font-body { font-family: 'Inter', sans-serif !important; }
      * { font-family: 'Inter', sans-serif; scroll-behavior: smooth; }
    `;
    document.head.appendChild(style);
    
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <PersistenceProvider>
        <Router>
          <ScrollToTop />
          <AuthCallbackHandler />
          <Layout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              {/* Redirect /feed to the new unified /search hub */}
              <Route path="/feed" element={<Navigate to="/search" replace />} />
              
              {/* Protected Routes - Require Authentication */}
              <Route path="/search" element={
                <ProtectedRoute>
                  <SearchPage />
                </ProtectedRoute>
              } />
              <Route path="/favorites" element={
                <ProtectedRoute>
                  <FavoritesPage />
                </ProtectedRoute>
              } />
              <Route path="/cart" element={<Navigate to="/inbox" replace />} />
              <Route path="/checkout" element={<Navigate to="/inbox" replace />} />
              <Route path="/orders" element={
                <ProtectedRoute>
                  <OrdersPage />
                </ProtectedRoute>
              } />
              <Route path="/create" element={
                <ProtectedRoute>
                  <CreateListingPage />
                </ProtectedRoute>
              } />
              <Route path="/create-sale" element={
                <ProtectedRoute>
                  <CreateGarageSalePage />
                </ProtectedRoute>
              } />
              <Route path="/profile" element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              } />
              <Route path="/inbox" element={
                <ProtectedRoute>
                  <InboxPage />
                </ProtectedRoute>
              } />
              <Route path="/scanner" element={
                <ProtectedRoute>
                  <GarageSaleScannerPage />
                </ProtectedRoute>
              } />
              
              {/* Public Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/how-it-works" element={<HowItWorksPage />} />
              <Route path="/community" element={<CommunityPage />} />
              <Route path="/live-advisor" element={<StitchLivePage />} />
              <Route path="/sell-hub" element={
                <ProtectedRoute>
                  <SellHubPage />
                </ProtectedRoute>
              } />
              <Route path="/product/:id" element={
                <ProtectedRoute>
                  <ProductDetailPage />
                </ProtectedRoute>
              } />
              <Route path="/sales" element={<GarageSalesPage />} />
              <Route path="/sales/:id" element={<YardSaleDetailPage />} />
            </Routes>
          </Layout>
        </Router>
      </PersistenceProvider>
    </ErrorBoundary>
  );
};

export default App;
