import React, { useState } from 'react';
import { api } from '../../lib/api.ts';
import { Zap, Mail, Lock, KeyRound, ArrowRight, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react';

interface ForgotPasswordPageProps {
  onNavigate: (view: string) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [demoPinNotice, setDemoPinNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleRequestPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setError(null);
    setLoading(true);

    try {
      const res = await api.forgotPassword(email);
      setSuccessMsg(res.message);
      if (res.demoPinNotice) {
        setDemoPinNotice(res.demoPinNotice);
      }
      setStep(2);
    } catch (err: any) {
      setError(err.message || 'Request failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin || !newPassword) return;

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await api.resetPassword({ email, pin, newPassword });
      setSuccessMsg(res.message);
      setTimeout(() => {
        onNavigate('login');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Password reset failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-3 sm:px-4 py-8 sm:py-12 w-full max-w-full overflow-hidden">
      <div className="w-full max-w-md space-y-5 sm:space-y-6">
        
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
          <h1 className="text-lg sm:text-xl font-bold text-white">Reset Account Password</h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            {step === 1 ? 'Enter your registered email address' : 'Enter verification code and choose new password'}
          </p>
        </div>

        <div className="p-4 sm:p-8 rounded-2xl bg-[#090f20] border border-slate-800 shadow-xl space-y-4 sm:space-y-5">
          
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {demoPinNotice && (
            <div className="p-3 rounded-lg bg-sky-950/80 border border-sky-800 text-sky-300 text-xs font-mono">
              💡 {demoPinNotice}
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleRequestPin} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder=""
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-sky-600/30"
              >
                <span>{loading ? 'Sending Request...' : 'Send Verification Code'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  6-Digit Verification PIN
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter PIN from email"
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg pl-9 pr-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">
                  Set New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
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
                className="w-full py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-md shadow-sky-600/30"
              >
                <span>{loading ? 'Updating Password...' : 'Save New Password & Log In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}

          <div className="text-center text-xs text-slate-400 pt-2 border-t border-slate-800">
            Remember your credentials?{' '}
            <button
              onClick={() => onNavigate('login')}
              className="text-sky-400 hover:text-sky-300 font-semibold"
            >
              Back to Sign In
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
