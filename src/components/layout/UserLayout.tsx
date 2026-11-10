import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeSwitcherModal } from '../theme/ThemeSwitcherModal.tsx';
import {
  LayoutDashboard,
  PlusCircle,
  Layers,
  ShoppingBag,
  List,
  Wallet,
  Receipt,
  Users,
  Code,
  LifeBuoy,
  Settings,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Zap,
  Bell,
  ArrowUpRight,
  Palette,
  Sun,
  Moon,
  Sparkles
} from 'lucide-react';

interface UserLayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export const UserLayout: React.FC<UserLayoutProps> = ({ currentView, onNavigate, children }) => {
  const { user, isAdmin, logout } = useAuth();
  const { theme, configs } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard },
    { id: 'new-order', label: 'New Order', icon: PlusCircle, badge: 'Popular' },
    { id: 'mass-order', label: 'Mass Order', icon: Layers },
    { id: 'my-orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'user-services', label: 'Services Catalog', icon: List },
    { id: 'add-funds', label: 'Add Funds', icon: Wallet, highlight: true },
    { id: 'transactions', label: 'Transaction History', icon: Receipt },
    { id: 'referrals', label: 'Refer & Earn (5%)', icon: Users },
    { id: 'api-keys', label: 'API Management', icon: Code },
    { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy },
    { id: 'settings', label: 'Profile Settings', icon: Settings },
  ];

  const handleNavClick = (viewId: string) => {
    onNavigate(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#070b16] text-slate-100 flex flex-col md:flex-row overflow-x-hidden max-w-full w-full">
      
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0a1020] border-b border-slate-800 sticky top-0 z-40">
        <div 
          onClick={() => handleNavClick('home')}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
            <Zap className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-base">
            Pak<span className="text-sky-400">Services</span>
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer"
            title="Switch Theme"
          >
            <Palette className="w-4 h-4 text-sky-400" />
          </button>
          <div className="px-2 py-1 rounded bg-sky-950/60 border border-sky-800/60 text-xs font-mono font-bold text-sky-300">
            Rs {user?.balance.toFixed(2)}
          </div>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#090e1c] border-r border-slate-800/90 flex flex-col justify-between
        transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand / Top */}
        <div className="p-4 border-b border-slate-800/70">
          <div 
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-sky-600/30">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="text-base font-extrabold text-white tracking-tight flex items-center gap-1">
                Pak<span className="text-sky-400">Services</span>
              </div>
              <div className="text-[10px] text-slate-400 tracking-wider font-mono">
                SMM PANEL ENGINE
              </div>
            </div>
          </div>
        </div>

        {/* User Balance Overview Box */}
        <div className="px-4 py-3 border-b border-slate-800/60 bg-[#0c1326]">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span>Available Balance</span>
            <button 
              onClick={() => handleNavClick('add-funds')}
              className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-0.5 text-[11px]"
            >
              + Add Funds
            </button>
          </div>
          <div className="text-xl font-bold font-mono tabular-nums text-white flex items-baseline gap-1">
            <span className="text-xs text-slate-400 font-sans font-normal">Rs</span>
            {user?.balance.toFixed(2)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1 flex justify-between font-mono">
            <span>Total Spent:</span>
            <span>Rs {user?.spent.toFixed(2)}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-sky-600 text-white font-semibold shadow-sm shadow-sky-600/30'
                    : item.highlight
                    ? 'bg-sky-950/40 text-sky-300 border border-sky-800/40 hover:bg-sky-900/40 hover:text-white'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : item.highlight ? 'text-sky-400' : 'text-slate-400'}`} />
                  <span className="whitespace-nowrap">{item.label}</span>
                </div>
                {item.badge && !isActive && (
                  <span className="text-[10px] font-semibold text-sky-400 bg-sky-950/80 border border-sky-800/60 px-1.5 py-0.5 rounded">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          {/* Theme Quick Switcher in Sidebar */}
          <div className="pt-2 border-t border-slate-800/70">
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <Palette className="w-4 h-4 text-sky-400" />
                <span>Theme: {configs[theme].name}</span>
              </div>
              <span className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Change</span>
            </button>
          </div>

          {isAdmin && (
            <div className="pt-2 mt-2 border-t border-slate-800/70">
              <button
                onClick={() => handleNavClick('admin-overview')}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-950/30 border border-amber-800/40 hover:bg-amber-900/40 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Admin Control Suite</span>
                </div>
                <ArrowUpRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            </div>
          )}
        </div>

        {/* User Account / Footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#080d1a]">
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xs text-sky-400 shrink-0">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div className="truncate">
                <div className="text-xs font-semibold text-white truncate">{user?.username}</div>
                <div className="text-[10px] text-slate-400 truncate">{user?.email}</div>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Sign Out"
              className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden overflow-y-auto">
        
        {/* Top contextual header bar */}
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-[#090e1c] border-b border-slate-800/90 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">PakServices Console</span>
            <span className="text-xs text-slate-600">/</span>
            <span className="text-xs font-semibold text-white capitalize">
              {currentView.replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-[#0c1326] border border-slate-800 px-3 py-1.5 rounded-lg">
              <Wallet className="w-4 h-4 text-sky-400" />
              <div className="flex items-baseline gap-1 text-xs font-mono font-bold text-white">
                <span className="text-[10px] text-slate-400 font-sans font-normal">Balance:</span>
                <span>Rs {user?.balance.toFixed(2)}</span>
              </div>
              <button
                onClick={() => onNavigate('add-funds')}
                className="ml-2 text-[11px] font-semibold text-white bg-sky-600 hover:bg-sky-500 px-2 py-0.5 rounded transition-colors"
              >
                Deposit
              </button>
            </div>

            {/* Theme Switcher Button */}
            <button
              type="button"
              onClick={() => setThemeModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0c1326] border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
              title="Change Theme Appearance"
            >
              <Palette className="w-3.5 h-3.5 text-sky-400" />
              <span>Theme: <strong className="text-white font-semibold">{configs[theme].name.split(' ')[0]}</strong></span>
            </button>

            <button 
              onClick={() => onNavigate('tickets')}
              title="Support & Notifications"
              className="p-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              <Bell className="w-4 h-4" />
            </button>

            <button
              onClick={() => onNavigate('home')}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Back to Home
            </button>
          </div>
        </header>

        {/* Page View Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

      </div>

      {/* Theme Switcher Modal */}
      <ThemeSwitcherModal
        isOpen={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      />

    </div>
  );
};
