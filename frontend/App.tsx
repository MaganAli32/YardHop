import React, { useEffect } from 'react';
import './styles/global.css';
import { HashRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import AppraisalResultsPage from './pages/AppraisalResultsPage';
import MarketplacePage from './pages/MarketplacePage';
import CreateListingPage from './pages/CreateListingPage';
import ListingDetailPage from './pages/ListingDetailPage';
import DashboardPage from './pages/DashboardPage';
import ProfilePage from './pages/ProfilePage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ExtensionAuthPage from './pages/ExtensionAuthPage';
import BusinessPage from './pages/BusinessPage';
import AboutPage from './pages/AboutPage';
import DevelopersPage from './pages/DevelopersPage';
import ExtensionPage from './pages/ExtensionPage';
import BetaPage from './pages/BetaPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import { PersistenceProvider } from './store/PersistenceContext';
import ErrorBoundary from './components/ErrorBoundary';
import AuthCallbackHandler from './components/AuthCallbackHandler';
import OAuthCallbackFallback from './components/OAuthCallbackFallback';
import CookieConsent from './components/CookieConsent';
import { usePersistence } from './store/PersistenceContext';

const CatchAllRoute = () => {
  const location = useLocation();
  const pathname = (location.pathname || '').toString();
  const isOAuthCallback =
    pathname.includes('access_token') ||
    pathname.includes('refresh_token') ||
    pathname.startsWith('access_token') ||
    pathname.startsWith('/access_token');
  if (isOAuthCallback) return <OAuthCallbackFallback />;
  return <Navigate to="/" replace />;
};

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({ children }) => {
  const { authToken, user, loading } = usePersistence();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center bg-parchment">
        <p className="text-[#5c665f] font-['Manrope']">Loading...</p>
      </div>
    );
  }

  if (!authToken && !user) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />;
  }

  return children;
};

const Layout: React.FC<{children: React.ReactNode}> = ({ children }) => {
  return (
    <div className="flex min-h-screen flex-col bg-parchment text-forest antialiased font-sans">
      <main className="flex-grow flex flex-col">
        {children}
      </main>
      <CookieConsent />
    </div>
  );
}

const App: React.FC = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      * { scroll-behavior: smooth; }
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
        background: linear-gradient(90deg, #2c4a3e 0%, #c4622d 50%, #2c4a3e 100%);
        background-size: 200% auto;
        color: transparent;
        -webkit-background-clip: text;
        background-clip: text;
        animation: shimmer-text 5s linear infinite;
      }
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
              <Route path="/appraise/results" element={<AppraisalResultsPage />} />
              <Route path="/marketplace" element={<MarketplacePage />} />
              <Route path="/marketplace/new" element={<CreateListingPage />} />
              <Route path="/marketplace/:id" element={<ListingDetailPage />} />
              <Route path="/account" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/extension-auth" element={<ExtensionAuthPage />} />
              <Route path="/business" element={<BusinessPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/developers" element={<DevelopersPage />} />
              <Route path="/extension" element={<ExtensionPage />} />
              <Route path="/beta" element={<BetaPage />} />
              <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
              <Route path="/terms-of-service" element={<TermsOfServicePage />} />
              {/* Old marketplace UI — redirect to new product (appraisal) homepage */}
              <Route path="/feed" element={<Navigate to="/" replace />} />
              <Route path="/browse" element={<Navigate to="/" replace />} />
              <Route path="/search" element={<Navigate to="/" replace />} />
              <Route path="/favorites" element={<Navigate to="/" replace />} />
              <Route path="/cart" element={<Navigate to="/" replace />} />
              <Route path="/checkout" element={<Navigate to="/" replace />} />
              <Route path="/orders" element={<Navigate to="/" replace />} />
              <Route path="/create" element={<Navigate to="/" replace />} />
              <Route path="/profile" element={<Navigate to="/account" replace />} />
              <Route path="/inbox" element={<Navigate to="/" replace />} />
              <Route path="/scanner" element={<Navigate to="/" replace />} />
              <Route path="/sell-hub" element={<Navigate to="/" replace />} />
              <Route path="/product/:id" element={<Navigate to="/" replace />} />
              <Route path="/how-it-works" element={<Navigate to="/" replace />} />
              <Route path="/community" element={<Navigate to="/" replace />} />
              <Route path="/live-advisor" element={<Navigate to="/" replace />} />
              {/* Catch OAuth callback when HashRouter path becomes "access_token=..." */}
              <Route path="*" element={<CatchAllRoute />} />
            </Routes>
          </Layout>
        </Router>
      </PersistenceProvider>
    </ErrorBoundary>
  );
};

export default App;
