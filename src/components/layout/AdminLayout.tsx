import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { useTheme } from '../../context/ThemeContext.tsx';
import { ThemeSwitcherModal } from '../theme/ThemeSwitcherModal.tsx';
import {
  ShieldCheck,
  LayoutDashboard,
  Users,
  ShoppingBag,
  ListOrdered,
  FolderTree,
  CreditCard,
  LifeBuoy,
  Server,
  Settings,
  FileSpreadsheet,
  ArrowLeft,
  Menu,
  X,
  LogOut,
  Palette
} from 'lucide-react';

interface AdminLayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ currentView, onNavigate, children }) => {
  const { user, logout } = useAuth();
  const { theme, configs } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [themeModalOpen, setThemeModalOpen] = useState(false);

  const adminNav = [
    { id: 'admin-overview', label: 'Admin Overview', icon: LayoutDashboard },
    { id: 'admin-users', label: 'User Management', icon: Users },
    { id: 'admin-orders', label: 'Order Processing', icon: ShoppingBag },
    { id: 'admin-categories', label: 'Category Management', icon: FolderTree },
    { id: 'admin-services', label: 'Service Management', icon: ListOrdered },
    { id: 'admin-payments', label: 'Payment Verifications', icon: CreditCard, highlight: true },
    { id: 'admin-tickets', label: 'Support Tickets Desk', icon: LifeBuoy },
    { id: 'admin-providers', label: 'SMM Provider APIs', icon: Server },
    { id: 'admin-settings', label: 'System Settings', icon: Settings },
    { id: 'admin-audit', label: 'Audit Logs & CSV Export', icon: FileSpreadsheet },
  ];

  const handleNav = (viewId: string) => {
    onNavigate(viewId);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#060a14] text-slate-100 flex flex-col md:flex-row overflow-x-hidden max-w-full w-full">
      
      {/* Mobile Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0a0f1d] border-b border-amber-900/40 sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-amber-400" />
          <span className="font-bold text-white text-sm">PakServices Admin</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setThemeModalOpen(true)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer"
            title="Switch Theme"
          >
            <Palette className="w-4 h-4 text-sky-400" />
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Admin Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-[#080d1b] border-r border-slate-800 flex flex-col justify-between
        transform transition-transform duration-200 ease-in-out md:translate-x-0 md:static md:h-screen md:sticky md:top-0
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand header */}
        <div className="p-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-600 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
              <ShieldCheck className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white tracking-tight flex items-center gap-1.5">
                Admin Control Room
              </div>
              <div className="text-[10px] text-amber-400/90 font-mono tracking-widest font-semibold uppercase">
                PakServices SuperUser
              </div>
            </div>
          </div>
        </div>

        {/* Back to Client Mode button */}
        <div className="px-3 pt-3">
          <button
            onClick={() => handleNav('dashboard')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700/60 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Switch to User View</span>
          </button>
        </div>

        {/* Navigation links */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNav(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-medium transition-all text-left ${
                  isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold shadow-sm'
                    : item.highlight
                    ? 'text-sky-300 bg-sky-950/30 hover:bg-sky-900/40 hover:text-white'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Admin footer */}
        <div className="p-3 border-t border-slate-800/80 bg-[#060a14]">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="truncate">
              <div className="text-xs font-semibold text-white truncate">{user?.username} (Admin)</div>
              <div className="text-[10px] text-slate-400 truncate font-mono">Role: SUPER_ADMIN</div>
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

      {/* Main Admin View */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden overflow-y-auto">
        <header className="hidden md:flex items-center justify-between px-6 py-3.5 bg-[#080d1b] border-b border-slate-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs text-amber-400 font-mono font-bold tracking-wider uppercase">Administrative Portal</span>
            <span className="text-xs text-slate-600">/</span>
            <span className="text-xs font-semibold text-white capitalize">
              {currentView.replace('admin-', '').replace('-', ' ')}
            </span>
          </div>

          <div className="flex items-center gap-3">
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
              onClick={() => onNavigate('home')}
              className="text-xs font-medium text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Public Website
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-xs font-medium text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
            >
              User Dashboard
            </button>
          </div>
        </header>

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
