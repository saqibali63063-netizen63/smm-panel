import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Zap, Lock, Mail, ArrowRight, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface LoginPageProps {
  onNavigate: (view: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { login } = useAuth();
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrUsername || !password) {
      setError('Please provide your username/email and password.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const user = await login(emailOrUsername, password);
      if (user.role === 'admin') {
        onNavigate('admin-overview');
      } else {
        onNavigate('dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid username or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-md space-y-5 sm:space-y-6">
        
        {/* Logo & Headline */}
        <div className="text-center space-y-1.5 sm:space-y-2">
          <div 
            onClick={() => onNavigate('home')}
            className="inline-flex items-center gap-2 cursor-pointer mb-1"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-lg shadow-sky-600/30">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <span className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Pak<span className="text-sky-400">Services</span>
            </span>
          </div>
          <h1 className="text-lg sm:text-xl font-bold text-white">Welcome Back</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            Sign in to access your wholesale orders, balance &amp; services
          </p>
        </div>

        {/* Login Form Container */}
        <div className="p-4 sm:p-8 rounded-2xl bg-[#090f20] border border-slate-800 shadow-xl space-y-4 sm:space-y-5">
          
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1.5">
                Username or Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder=""
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-slate-300 font-medium">Password</label>
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-sky-400 hover:text-sky-300 text-[11px]"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=""
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg pl-9 pr-10 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-sky-600/30 cursor-pointer"
            >
              <span>{loading ? 'Signing in...' : 'Sign In to Panel'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="text-center text-xs text-slate-400 pt-2">
            Don't have an account yet?{' '}
            <button
              onClick={() => onNavigate('register')}
              className="text-sky-400 hover:text-sky-300 font-semibold"
            >
              Create Free Account
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
