import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Zap,
  ShieldCheck,
  User as UserIcon,
  LayoutDashboard,
  Menu,
  X,
  ArrowRight,
  LogOut
} from 'lucide-react';

interface HeaderProps {
  currentView: string;
  onNavigate: (view: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const { user, isAdmin, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (view: string) => {
    onNavigate(view);
    setMobileMenuOpen(false);
  };

  const navLinks = [
    { id: 'home', label: 'Home' },
    { id: 'services', label: 'Services Catalog' },
    { id: 'faq', label: 'FAQ' },
    { id: 'contact', label: 'Contact Support' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-800/80 bg-[#080d1a]/95 backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-4 md:gap-8 px-3 sm:px-6 py-2.5 sm:py-3.5">

        {/* Brand Logo */}
        <div
          onClick={() => handleNav('home')}
          className="flex items-center gap-2 sm:gap-2.5 cursor-pointer select-none shrink-0"
        >
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg bg-gradient-to-tr from-sky-600 to-blue-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20 shrink-0">
            <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex items-baseline">
            <span className="text-lg sm:text-xl font-extrabold tracking-tight text-white whitespace-nowrap">
              Pak<span className="text-sky-400">Services</span>
            </span>
            <span className="ml-1 text-[9px] sm:text-[10px] font-semibold text-slate-400 uppercase tracking-widest hidden sm:inline">
              SMM
            </span>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 lg:gap-7 text-sm font-medium text-slate-300">
          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`transition-colors whitespace-nowrap shrink-0 hover:text-white cursor-pointer ${
                currentView === link.id ? 'text-sky-400 font-semibold' : ''
              }`}
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {user ? (
            <div className="flex items-center gap-1.5 sm:gap-2">
              {isAdmin && (
                <button
                  onClick={() => handleNav('admin-overview')}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Admin</span>
                </button>
              )}
              <button
                onClick={() => handleNav('dashboard')}
                className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-all shadow-md shadow-sky-600/20 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
                <span className="hidden sm:inline text-sky-200 text-[11px] font-mono tabular-nums bg-sky-700/60 px-1.5 py-0.5 rounded">
                  Rs {user.balance.toFixed(2)}
                </span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1 sm:gap-2">
              {currentView !== 'login' && (
                <button
                  onClick={() => handleNav('login')}
                  className="px-2.5 sm:px-3.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors whitespace-nowrap cursor-pointer"
                >
                  Sign In
                </button>
              )}
              {currentView !== 'register' && (
                <button
                  onClick={() => handleNav('register')}
                  className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-lg transition-all shadow-md shadow-sky-600/20 whitespace-nowrap cursor-pointer"
                >
                  <UserIcon className="w-3.5 h-3.5 hidden xs:inline" />
                  <span>Get Started</span>
                </button>
              )}
            </div>
          )}

          {/* Mobile Menu Hamburger Toggle */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700/60 cursor-pointer"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-800 bg-[#070c18] px-4 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <nav className="flex flex-col space-y-1">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => handleNav(link.id)}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs font-semibold text-left transition-colors cursor-pointer ${
                  currentView === link.id
                    ? 'bg-sky-600/20 text-sky-400 border border-sky-500/30'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <span>{link.label}</span>
                <ArrowRight className="w-3.5 h-3.5 opacity-60" />
              </button>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-800/80 flex flex-col gap-2">
            {user ? (
              <>
                <div className="flex items-center justify-between px-2 text-xs">
                  <span className="text-slate-400">Account: <strong className="text-white">{user.username}</strong></span>
                  <span className="font-mono text-emerald-400 font-bold">Rs {user.balance.toFixed(2)}</span>
                </div>
                {isAdmin && (
                  <button
                    onClick={() => handleNav('admin-overview')}
                    className="w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Admin Control Room</span>
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 rounded-lg bg-rose-950/40 border border-rose-800/40 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => handleNav('login')}
                  className="py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold text-center border border-slate-700 cursor-pointer"
                >
                  Sign In
                </button>
                <button
                  onClick={() => handleNav('register')}
                  className="py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold text-center shadow-md shadow-sky-600/30 cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
