import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { Settings, Lock, CheckCircle2, AlertCircle, Globe, Shield, Eye, EyeOff, Palette } from 'lucide-react';
import { ThemeSelectorCards } from '../../components/theme/ThemeSelectorCards.tsx';

export const ProfileSettingsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const { user, refreshUser } = useAuth();
  
  // Profile settings
  const [timezone, setTimezone] = useState(user?.timezone || 'Asia/Karachi');
  const [currency, setCurrency] = useState(user?.currency || 'PKR');
  const [profileMsg, setProfileMsg] = useState<string | null>(null);

  // Change password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updateProfile({ timezone, currency });
      setProfileMsg(res.message);
      await refreshUser();
      setTimeout(() => setProfileMsg(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Update failed');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) return;

    if (newPassword !== confirmNewPassword) {
      setPwMsg({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    setPwLoading(true);
    setPwMsg(null);

    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setPwMsg({ type: 'success', text: res.message });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div>
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
          Account Preferences
        </div>
        <h1 className="text-2xl font-bold text-white">Profile & Security Settings</h1>
      </div>

      {/* Visual Themes & Appearance */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-4">
          <div className="space-y-0.5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-sky-400" />
              <span>Workspace Theme & Visual Style</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select between Midnight Pro, Crystal Light, and Neon Galaxy with live preview & cloud profile sync.
            </p>
          </div>
        </div>
        <ThemeSelectorCards />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Account Info & Preferences */}
        <div className="rounded-xl border border-slate-800 bg-[#090f20] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-400" />
            <span>Profile & Regional Preferences</span>
          </h3>

          {profileMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{profileMsg}</span>
            </div>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 mb-1">Username</label>
              <input
                type="text"
                readOnly
                value={user?.username || ''}
                className="w-full bg-[#070b16] border border-slate-700/60 rounded-lg px-3 py-2 text-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Email Address</label>
              <input
                type="text"
                readOnly
                value={user?.email || ''}
                className="w-full bg-[#070b16] border border-slate-700/60 rounded-lg px-3 py-2 text-slate-300 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Preferred Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="Asia/Karachi">Asia/Karachi (PKT +05:00)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST +04:00)</option>
                <option value="Europe/London">Europe/London (GMT +00:00)</option>
                <option value="America/New_York">America/New_York (EST -05:00)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Display Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="PKR">Pakistani Rupee (PKR - Rs)</option>
                <option value="USD">US Dollar (USD - $)</option>
              </select>
            </div>

            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs"
            >
              Save Preferences
            </button>
          </form>
        </div>

        {/* Change Password */}
        <div className="rounded-xl border border-slate-800 bg-[#090f20] p-6 space-y-4">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span>Update Security Password</span>
          </h3>

          {pwMsg && (
            <div className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
              pwMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-200'
                : 'bg-rose-950/60 border border-rose-800 text-rose-200'
            }`}>
              {pwMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{pwMsg.text}</span>
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Current Password *</label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder=""
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title={showCurrentPassword ? 'Hide password' : 'Show password'}
                  aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">New Password *</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder=""
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title={showNewPassword ? 'Hide password' : 'Show password'}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Confirm New Password *</label>
              <div className="relative">
                <input
                  type={showConfirmNewPassword ? 'text' : 'password'}
                  required
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder=""
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg pl-3 pr-10 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
                  title={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                  aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmNewPassword ? <EyeOff className="w-4 h-4 text-sky-400" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs"
            >
              {pwLoading ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
