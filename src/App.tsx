import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Header } from './components/layout/Header.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { UserLayout } from './components/layout/UserLayout.tsx';
import { AdminLayout } from './components/layout/AdminLayout.tsx';
import { FloatingWhatsAppButton } from './components/common/FloatingWhatsAppButton.tsx';

// Public Pages
import { HomePage } from './pages/public/HomePage.tsx';
import { ServicesPage } from './pages/public/ServicesPage.tsx';
import { FaqPage } from './pages/public/FaqPage.tsx';
import { ContactPage } from './pages/public/ContactPage.tsx';
import { TermsPage } from './pages/public/TermsPage.tsx';
import { PrivacyPage } from './pages/public/PrivacyPage.tsx';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage.tsx';
import { RegisterPage } from './pages/auth/RegisterPage.tsx';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage.tsx';

// User Dashboard Pages
import { DashboardOverview } from './pages/dashboard/DashboardOverview.tsx';
import { NewOrderPage } from './pages/dashboard/NewOrderPage.tsx';
import { MassOrderPage } from './pages/dashboard/MassOrderPage.tsx';
import { MyOrdersPage } from './pages/dashboard/MyOrdersPage.tsx';
import { UserServicesPage } from './pages/dashboard/UserServicesPage.tsx';
import { AddFundsPage } from './pages/dashboard/AddFundsPage.tsx';
import { TransactionsPage } from './pages/dashboard/TransactionsPage.tsx';
import { ReferralsPage } from './pages/dashboard/ReferralsPage.tsx';
import { SupportTicketsPage } from './pages/dashboard/SupportTicketsPage.tsx';
import { ProfileSettingsPage } from './pages/dashboard/ProfileSettingsPage.tsx';

// Admin Panel Pages
import { AdminDashboard } from './pages/admin/AdminDashboard.tsx';
import { AdminUsersPage } from './pages/admin/AdminUsersPage.tsx';
import { AdminOrdersPage } from './pages/admin/AdminOrdersPage.tsx';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage.tsx';
import { AdminServicesPage } from './pages/admin/AdminServicesPage.tsx';
import { AdminPaymentsPage } from './pages/admin/AdminPaymentsPage.tsx';
import { AdminTicketsPage } from './pages/admin/AdminTicketsPage.tsx';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage.tsx';
import { AdminThemeManager } from './components/admin/AdminThemeManager.tsx';

function AppContent() {
  const { user, isAdmin, isLoading } = useAuth();
  
  // Read initial view from window.location.hash if present
  const getInitialView = () => {
    const hash = window.location.hash.replace('#', '').trim();
    return hash || 'home';
  };

  const [currentView, setCurrentView] = useState<string>(getInitialView);

  const navigate = (view: string) => {
    setCurrentView(view);
    window.location.hash = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && hash !== currentView) {
        setCurrentView(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [currentView]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080d1a] flex items-center justify-center text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Starting PakServices SMM Engine...</span>
        </div>
      </div>
    );
  }

  // Check if view is in Admin namespace
  const isAdminView = currentView.startsWith('admin-');
  
  // Check if view is in User Dashboard namespace
  const isUserDashboardView = [
    'dashboard',
    'new-order',
    'mass-order',
    'my-orders',
    'user-services',
    'add-funds',
    'transactions',
    'referrals',
    'tickets',
    'settings'
  ].includes(currentView);

  // If user tries to access admin without admin role
  if (isAdminView) {
    if (!user) {
      return (
        <div className="min-h-screen bg-[#080d1a] flex flex-col justify-between overflow-x-hidden max-w-full w-full">
          <Header currentView="login" onNavigate={navigate} />
          <main className="flex-1 w-full max-w-full overflow-x-hidden">
            <LoginPage onNavigate={navigate} />
          </main>
          <Footer onNavigate={navigate} />
        </div>
      );
    }
    if (!isAdmin) {
      return (
        <UserLayout currentView="dashboard" onNavigate={navigate}>
          <div className="p-8 text-center bg-rose-950/30 border border-rose-900 rounded-xl text-rose-300 space-y-2">
            <h2 className="text-base font-bold text-white">Access Denied</h2>
            <p className="text-xs">Administrator privileges are required to view the admin control room.</p>
            <button
              onClick={() => navigate('dashboard')}
              className="mt-2 px-4 py-2 bg-slate-800 text-white rounded-lg text-xs"
            >
              Return to User Dashboard
            </button>
          </div>
        </UserLayout>
      );
    }

    return (
      <AdminLayout currentView={currentView} onNavigate={navigate}>
        {currentView === 'admin-overview' && <AdminDashboard onNavigate={navigate} />}
        {currentView === 'admin-users' && <AdminUsersPage onNavigate={navigate} />}
        {currentView === 'admin-orders' && <AdminOrdersPage onNavigate={navigate} />}
        {currentView === 'admin-categories' && <AdminCategoriesPage onNavigate={navigate} />}
        {currentView === 'admin-services' && <AdminServicesPage onNavigate={navigate} />}
        {currentView === 'admin-payments' && <AdminPaymentsPage onNavigate={navigate} />}
        {currentView === 'admin-tickets' && <AdminTicketsPage onNavigate={navigate} />}
        {currentView === 'admin-appearance' && <AdminThemeManager />}
        {currentView === 'admin-settings' && <AdminSettingsPage onNavigate={navigate} />}
        {currentView === 'admin-audit' && <AdminSettingsPage onNavigate={navigate} />}
      </AdminLayout>
    );
  }

  // If user tries to access user dashboard without being logged in
  if (isUserDashboardView) {
    if (!user) {
      return (
        <div className="min-h-screen bg-[#080d1a] flex flex-col justify-between overflow-x-hidden max-w-full w-full">
          <Header currentView="login" onNavigate={navigate} />
          <main className="flex-1 w-full max-w-full overflow-x-hidden">
            <LoginPage onNavigate={navigate} />
          </main>
          <Footer onNavigate={navigate} />
        </div>
      );
    }

    return (
      <UserLayout currentView={currentView} onNavigate={navigate}>
        {currentView === 'dashboard' && <DashboardOverview onNavigate={navigate} />}
        {currentView === 'new-order' && <NewOrderPage onNavigate={navigate} />}
        {currentView === 'mass-order' && <MassOrderPage onNavigate={navigate} />}
        {currentView === 'my-orders' && <MyOrdersPage onNavigate={navigate} />}
        {currentView === 'user-services' && <UserServicesPage onNavigate={navigate} />}
        {currentView === 'add-funds' && <AddFundsPage onNavigate={navigate} />}
        {currentView === 'transactions' && <TransactionsPage onNavigate={navigate} />}
        {currentView === 'referrals' && <ReferralsPage onNavigate={navigate} />}
        {currentView === 'tickets' && <SupportTicketsPage onNavigate={navigate} />}
        {currentView === 'settings' && <ProfileSettingsPage onNavigate={navigate} />}
      </UserLayout>
    );
  }

  // Public View rendering with Header & Footer
  return (
    <div className="min-h-screen bg-[#080d1a] flex flex-col justify-between overflow-x-hidden max-w-full w-full">
      <Header currentView={currentView} onNavigate={navigate} />
      
      <main className="flex-1 w-full max-w-full overflow-x-hidden">
        {currentView === 'home' && <HomePage onNavigate={navigate} />}
        {currentView === 'services' && <ServicesPage onNavigate={navigate} />}
        {currentView === 'faq' && <FaqPage onNavigate={navigate} />}
        {currentView === 'contact' && <ContactPage onNavigate={navigate} />}
        {currentView === 'terms' && <TermsPage onNavigate={navigate} />}
        {currentView === 'privacy' && <PrivacyPage onNavigate={navigate} />}
        {currentView === 'login' && <LoginPage onNavigate={navigate} />}
        {currentView === 'register' && <RegisterPage onNavigate={navigate} />}
        {currentView === 'forgot-password' && <ForgotPasswordPage onNavigate={navigate} />}
      </main>

      <Footer onNavigate={navigate} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
        <FloatingWhatsAppButton />
      </ThemeProvider>
    </AuthProvider>
  );
}
