import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import {
  Wallet,
  Building2,
  Coins,
  QrCode,
  Upload,
  Trash2,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  X,
  RefreshCw,
  Save,
  ArrowRight,
  ShieldCheck,
  Info
} from 'lucide-react';

export const AdminPaymentMethods: React.FC = () => {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [previewQrModal, setPreviewQrModal] = useState<{ title: string; image: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const res = await api.admin.getSettings();
      setSettings(res.settings);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to load payment settings.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const copyToClipboard = (text: string, keyName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    settingKey: string,
    methodName: string
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Please select a valid image file (PNG, JPG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setFeedback({ type: 'error', message: 'Image size exceeds 5MB limit.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setSettings(prev => ({ ...prev, [settingKey]: dataUrl }));
      setFeedback({
        type: 'success',
        message: `${methodName} QR image selected! Click "Save Settings" below to persist.`
      });
      setTimeout(() => setFeedback(null), 4000);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = (settingKey: string, methodName: string) => {
    setSettings(prev => ({ ...prev, [settingKey]: '' }));
    setFeedback({
      type: 'success',
      message: `${methodName} QR image removed. Click "Save Settings" to apply.`
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleSaveSection = async (sectionKeys: string[], sectionName: string) => {
    setSavingKey(sectionName);
    setFeedback(null);

    // Build payload for specific section
    const payload: Record<string, string> = {};
    for (const k of sectionKeys) {
      payload[k] = settings[k] || '';
    }

    // Validation
    if (sectionName === 'Easypaisa' && settings.easypaisa_enabled === '1' && !settings.easypaisa_number?.trim()) {
      setFeedback({ type: 'error', message: 'Easypaisa is enabled: Account number cannot be empty.' });
      setSavingKey(null);
      return;
    }
    if (sectionName === 'JazzCash' && settings.jazzcash_enabled === '1' && !settings.jazzcash_number?.trim()) {
      setFeedback({ type: 'error', message: 'JazzCash is enabled: Account number cannot be empty.' });
      setSavingKey(null);
      return;
    }
    if (sectionName === 'Bank Transfer' && settings.bank_enabled === '1' && (!settings.bank_account_number?.trim() || !settings.bank_name?.trim())) {
      setFeedback({ type: 'error', message: 'Bank Transfer is enabled: Bank Name and Account Number are required.' });
      setSavingKey(null);
      return;
    }
    if (sectionName === 'USDT BEP20' && settings.usdt_bep20_enabled === '1' && !settings.usdt_bep20_address?.trim()) {
      setFeedback({ type: 'error', message: 'BEP20 is enabled: Wallet address cannot be empty.' });
      setSavingKey(null);
      return;
    }
    if (sectionName === 'USDT TRC20' && settings.usdt_trc20_enabled === '1' && !settings.usdt_trc20_address?.trim()) {
      setFeedback({ type: 'error', message: 'TRC20 is enabled: Wallet address cannot be empty.' });
      setSavingKey(null);
      return;
    }

    try {
      await api.admin.updateSettings(payload);
      setFeedback({ type: 'success', message: `${sectionName} settings updated and persisted successfully!` });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || `Failed to save ${sectionName} settings.` });
    } finally {
      setSavingKey(null);
    }
  };

  const handleSaveAll = async () => {
    setSavingKey('all');
    setFeedback(null);

    const paymentKeys = [
      'easypaisa_enabled', 'easypaisa_number', 'easypaisa_title', 'easypaisa_qr', 'easypaisa_instructions',
      'jazzcash_enabled', 'jazzcash_number', 'jazzcash_title', 'jazzcash_qr', 'jazzcash_instructions',
      'bank_enabled', 'bank_name', 'bank_account_number', 'bank_account_title', 'bank_iban', 'bank_branch', 'bank_qr', 'bank_instructions',
      'usdt_enabled', 'usdt_bep20_enabled', 'usdt_bep20_address', 'usdt_bep20_qr', 'usdt_bep20_instructions',
      'usdt_trc20_enabled', 'usdt_trc20_address', 'usdt_trc20_qr', 'usdt_trc20_instructions',
      'usd_pkr_rate', 'min_deposit_pkr'
    ];

    const payload: Record<string, string> = {};
    for (const k of paymentKeys) {
      if (settings[k] !== undefined) {
        payload[k] = settings[k];
      }
    }

    try {
      await api.admin.updateSettings(payload);
      setFeedback({ type: 'success', message: 'All payment methods and gateway configurations saved successfully!' });
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save settings.' });
    } finally {
      setSavingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 flex items-center justify-center gap-2">
        <RefreshCw className="w-5 h-5 animate-spin text-amber-400" />
        <span>Loading payment methods gateway configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* Top Banner & Save All Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-[#090f20] border border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-4 h-4" />
            <span>Gateway Administration Desk</span>
          </div>
          <h2 className="text-xl font-bold text-white">Payment Methods Management</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure receiver accounts, upload QR codes, enable/disable channels, and manage independent BEP20 & TRC20 USDT networks.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={savingKey === 'all'}
          className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer self-start sm:self-auto shrink-0"
        >
          {savingKey === 'all' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Save All Gateway Settings</span>
        </button>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs shadow-lg animate-in fade-in ${
          feedback.type === 'success'
            ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
            : 'bg-rose-950/70 border-rose-800 text-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-semibold">{feedback.message}</span>
        </div>
      )}

      {/* Global Exchange & Deposit Limits Strip */}
      <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            USD to PKR Conversion Rate (1 USDT = PKR)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              step="0.1"
              value={settings.usd_pkr_rate || '280'}
              onChange={(e) => setSettings({ ...settings, usd_pkr_rate: e.target.value })}
              className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <span className="text-slate-400 font-mono shrink-0">PKR</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Used to calculate equivalent USDT on Add Funds page.
          </span>
        </div>

        <div>
          <label className="block text-slate-300 font-semibold mb-1">
            Minimum Deposit Limit (PKR)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={settings.min_deposit_pkr || '100'}
              onChange={(e) => setSettings({ ...settings, min_deposit_pkr: e.target.value })}
              className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm focus:border-amber-400 focus:outline-none"
            />
            <span className="text-slate-400 font-mono shrink-0">PKR</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Submissions below this threshold are rejected automatically.
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. EASYPAISA SETTINGS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-emerald-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">1. Easypaisa Payment Method</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  settings.easypaisa_enabled === '1'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {settings.easypaisa_enabled === '1' ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Pakistan Mobile Wallet Gateway</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <span>Enable Easypaisa</span>
              <input
                type="checkbox"
                checked={settings.easypaisa_enabled === '1'}
                onChange={(e) => setSettings({ ...settings, easypaisa_enabled: e.target.checked ? '1' : '0' })}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-400 accent-emerald-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Account Holder Name / Title *
              </label>
              <input
                type="text"
                placeholder="e.g. PakServices / Muhammad Ali"
                value={settings.easypaisa_title || ''}
                onChange={(e) => setSettings({ ...settings, easypaisa_title: e.target.value })}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Easypaisa Account Number *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 0312-3456789"
                  value={settings.easypaisa_number || ''}
                  onChange={(e) => setSettings({ ...settings, easypaisa_number: e.target.value })}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-emerald-500"
                />
                {settings.easypaisa_number && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.easypaisa_number, 'ep_num')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                    title="Copy number"
                  >
                    {copiedKey === 'ep_num' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* QR Image Upload with Live Preview */}
          <div className="p-4 rounded-xl bg-[#070b16] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-400" />
                <span>Easypaisa QR Code Image</span>
              </span>
              {settings.easypaisa_qr && (
                <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> QR Uploaded
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {settings.easypaisa_qr ? (
                <div className="relative group w-24 h-24 rounded-xl border border-emerald-500/40 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={settings.easypaisa_qr}
                    alt="Easypaisa QR"
                    className="w-full h-full object-contain p-1"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setPreviewQrModal({ title: 'Easypaisa QR Code', image: settings.easypaisa_qr })}
                      className="p-1 rounded bg-slate-800 text-white hover:text-emerald-400"
                      title="Enlarge"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('easypaisa_qr', 'Easypaisa')}
                      className="p-1 rounded bg-rose-950 text-rose-300 hover:text-white"
                      title="Remove QR"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 shrink-0">
                  <QrCode className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[10px]">No QR set</span>
                </div>
              )}

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 cursor-pointer font-semibold text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{settings.easypaisa_qr ? 'Replace QR Image' : 'Upload Easypaisa QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'easypaisa_qr', 'Easypaisa')}
                      className="hidden"
                    />
                  </label>

                  {settings.easypaisa_qr && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('easypaisa_qr', 'Easypaisa')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Remove QR
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Upload Easypaisa Till QR or Personal Account QR (PNG/JPG, max 5MB). Displayed automatically on the client Add Funds page.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Payment Instructions for Clients
            </label>
            <textarea
              rows={2}
              value={settings.easypaisa_instructions || ''}
              onChange={(e) => setSettings({ ...settings, easypaisa_instructions: e.target.value })}
              placeholder="e.g. Send payment via Easypaisa App or *786#. Enter 11-digit TID."
              className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={savingKey === 'Easypaisa'}
              onClick={() => handleSaveSection(
                ['easypaisa_enabled', 'easypaisa_number', 'easypaisa_title', 'easypaisa_qr', 'easypaisa_instructions'],
                'Easypaisa'
              )}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              {savingKey === 'Easypaisa' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Easypaisa Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. JAZZCASH SETTINGS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-rose-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">2. JazzCash Payment Method</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  settings.jazzcash_enabled === '1'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {settings.jazzcash_enabled === '1' ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Pakistan Mobile Wallet Gateway</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <span>Enable JazzCash</span>
              <input
                type="checkbox"
                checked={settings.jazzcash_enabled === '1'}
                onChange={(e) => setSettings({ ...settings, jazzcash_enabled: e.target.checked ? '1' : '0' })}
                className="w-4 h-4 rounded text-rose-500 focus:ring-rose-400 accent-rose-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Account Holder Name / Title *
              </label>
              <input
                type="text"
                placeholder="e.g. PakServices / Muhammad Ali"
                value={settings.jazzcash_title || ''}
                onChange={(e) => setSettings({ ...settings, jazzcash_title: e.target.value })}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                JazzCash Account Number *
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 0300-9876543"
                  value={settings.jazzcash_number || ''}
                  onChange={(e) => setSettings({ ...settings, jazzcash_number: e.target.value })}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                />
                {settings.jazzcash_number && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.jazzcash_number, 'jc_num')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                    title="Copy number"
                  >
                    {copiedKey === 'jc_num' ? <Check className="w-4 h-4 text-rose-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* JazzCash QR Upload with Live Preview */}
          <div className="p-4 rounded-xl bg-[#070b16] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-rose-400" />
                <span>JazzCash QR Code Image</span>
              </span>
              {settings.jazzcash_qr && (
                <span className="text-[11px] text-rose-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> QR Uploaded
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {settings.jazzcash_qr ? (
                <div className="relative group w-24 h-24 rounded-xl border border-rose-500/40 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={settings.jazzcash_qr}
                    alt="JazzCash QR"
                    className="w-full h-full object-contain p-1"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setPreviewQrModal({ title: 'JazzCash QR Code', image: settings.jazzcash_qr })}
                      className="p-1 rounded bg-slate-800 text-white hover:text-rose-400"
                      title="Enlarge"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('jazzcash_qr', 'JazzCash')}
                      className="p-1 rounded bg-rose-950 text-rose-300 hover:text-white"
                      title="Remove QR"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 shrink-0">
                  <QrCode className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[10px]">No QR set</span>
                </div>
              )}

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 flex items-center gap-1.5 cursor-pointer font-semibold text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{settings.jazzcash_qr ? 'Replace QR Image' : 'Upload JazzCash QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'jazzcash_qr', 'JazzCash')}
                      className="hidden"
                    />
                  </label>

                  {settings.jazzcash_qr && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('jazzcash_qr', 'JazzCash')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Remove QR
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Upload JazzCash Till or Merchant QR code (PNG/JPG, max 5MB).
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Payment Instructions for Clients
            </label>
            <textarea
              rows={2}
              value={settings.jazzcash_instructions || ''}
              onChange={(e) => setSettings({ ...settings, jazzcash_instructions: e.target.value })}
              placeholder="e.g. Transfer payment via JazzCash App. Enter 12-digit TID."
              className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={savingKey === 'JazzCash'}
              onClick={() => handleSaveSection(
                ['jazzcash_enabled', 'jazzcash_number', 'jazzcash_title', 'jazzcash_qr', 'jazzcash_instructions'],
                'JazzCash'
              )}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-600/20 cursor-pointer"
            >
              {savingKey === 'JazzCash' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save JazzCash Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. BANK TRANSFER SETTINGS */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-blue-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">3. Bank Transfer Settings (1Link / Raast)</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  settings.bank_enabled === '1'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {settings.bank_enabled === '1' ? 'Active' : 'Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Direct Commercial Bank Deposit & IBFT</p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <span>Enable Bank Transfer</span>
              <input
                type="checkbox"
                checked={settings.bank_enabled === '1'}
                onChange={(e) => setSettings({ ...settings, bank_enabled: e.target.checked ? '1' : '0' })}
                className="w-4 h-4 rounded text-sky-500 focus:ring-sky-400 accent-sky-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Bank Name *</label>
              <input
                type="text"
                placeholder="e.g. Meezan Bank Limited / HBL"
                value={settings.bank_name || ''}
                onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Account Title *</label>
              <input
                type="text"
                placeholder="e.g. PakServices Digital Technologies SMC-Pvt Ltd"
                value={settings.bank_account_title || ''}
                onChange={(e) => setSettings({ ...settings, bank_account_title: e.target.value })}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Account Number *</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. 0102-010203040506"
                  value={settings.bank_account_number || ''}
                  onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-500"
                />
                {settings.bank_account_number && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.bank_account_number, 'bank_acc')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                    title="Copy Account Number"
                  >
                    {copiedKey === 'bank_acc' ? <Check className="w-4 h-4 text-sky-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">IBAN (International Bank Account Number)</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="e.g. PK45MEZN0001020102030405"
                  value={settings.bank_iban || ''}
                  onChange={(e) => setSettings({ ...settings, bank_iban: e.target.value.toUpperCase() })}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono uppercase focus:outline-none focus:border-sky-500"
                />
                {settings.bank_iban && (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(settings.bank_iban, 'bank_iban')}
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                    title="Copy IBAN"
                  >
                    {copiedKey === 'bank_iban' ? <Check className="w-4 h-4 text-sky-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                )}
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-300 font-semibold mb-1">Branch Name (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Main Commercial Branch Karachi (Branch Code 0102)"
                value={settings.bank_branch || ''}
                onChange={(e) => setSettings({ ...settings, bank_branch: e.target.value })}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Bank QR Upload with Live Preview */}
          <div className="p-4 rounded-xl bg-[#070b16] border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-sky-400" />
                <span>Bank / Raast QR Code Image</span>
              </span>
              {settings.bank_qr && (
                <span className="text-[11px] text-sky-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> QR Uploaded
                </span>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              {settings.bank_qr ? (
                <div className="relative group w-24 h-24 rounded-xl border border-sky-500/40 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                  <img
                    src={settings.bank_qr}
                    alt="Bank QR"
                    className="w-full h-full object-contain p-1"
                  />
                  <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
                    <button
                      type="button"
                      onClick={() => setPreviewQrModal({ title: 'Bank / Raast QR Code', image: settings.bank_qr })}
                      className="p-1 rounded bg-slate-800 text-white hover:text-sky-400"
                      title="Enlarge"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('bank_qr', 'Bank')}
                      className="p-1 rounded bg-rose-950 text-rose-300 hover:text-white"
                      title="Remove QR"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-xl border border-dashed border-slate-700 bg-slate-900/40 flex flex-col items-center justify-center text-slate-500 shrink-0">
                  <QrCode className="w-8 h-8 opacity-40 mb-1" />
                  <span className="text-[10px]">No QR set</span>
                </div>
              )}

              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="px-3 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 flex items-center gap-1.5 cursor-pointer font-semibold text-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{settings.bank_qr ? 'Replace QR Image' : 'Upload Bank / Raast QR'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, 'bank_qr', 'Bank')}
                      className="hidden"
                    />
                  </label>

                  {settings.bank_qr && (
                    <button
                      type="button"
                      onClick={() => handleRemoveImage('bank_qr', 'Bank')}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-300 hover:text-rose-200 border border-slate-700 text-xs font-semibold cursor-pointer"
                    >
                      Remove QR
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-slate-400">
                  Upload official Raast QR or bank app payment QR code (PNG/JPG, max 5MB).
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Payment Instructions for Clients
            </label>
            <textarea
              rows={2}
              value={settings.bank_instructions || ''}
              onChange={(e) => setSettings({ ...settings, bank_instructions: e.target.value })}
              placeholder="e.g. Transfer using Online Banking via IBFT or Raast. Submit 6-12 digit Transaction Reference Number."
              className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              disabled={savingKey === 'Bank Transfer'}
              onClick={() => handleSaveSection(
                ['bank_enabled', 'bank_name', 'bank_account_number', 'bank_account_title', 'bank_iban', 'bank_branch', 'bank_qr', 'bank_instructions'],
                'Bank Transfer'
              )}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-600/20 cursor-pointer"
            >
              {savingKey === 'Bank Transfer' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Bank Transfer Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. USDT PAYMENT SETTINGS (INDEPENDENT BEP20 & TRC20 NETWORKS) */}
      {/* ========================================================================= */}
      <div className="rounded-2xl border border-purple-800/60 bg-[#090f20] overflow-hidden shadow-2xl">
        {/* Main USDT Header */}
        <div className="p-5 border-b border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-purple-950/60 via-indigo-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">4. USDT Crypto Payment Gateway</h3>
                <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  settings.usdt_enabled === '1'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {settings.usdt_enabled === '1' ? 'USDT Enabled' : 'USDT Disabled'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Independent dual-network architecture: BEP20 (BNB Smart Chain) & TRC20 (TRON)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
              <span>Enable USDT Method</span>
              <input
                type="checkbox"
                checked={settings.usdt_enabled === '1'}
                onChange={(e) => setSettings({ ...settings, usdt_enabled: e.target.checked ? '1' : '0' })}
                className="w-4 h-4 rounded text-purple-500 focus:ring-purple-400 accent-purple-500 cursor-pointer"
              />
            </label>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          
          <div className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-purple-200 text-xs flex items-center gap-2.5">
            <Info className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              BEP20 and TRC20 operate completely independently. You can configure only BEP20, only TRC20, or both. You can also save a wallet address without a QR, or attach a QR independently.
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* ---------------------------------------------------- */}
            {/* NETWORK A: BEP20 (BNB Smart Chain) */}
            {/* ---------------------------------------------------- */}
            <div className="rounded-xl border border-amber-500/40 bg-[#070b16] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 font-black text-xs flex items-center justify-center">
                    B
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">A. BEP20 Network</h4>
                    <span className="text-[10px] text-slate-400">BNB Smart Chain (BSC)</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <span className="text-[11px]">Enable BEP20</span>
                  <input
                    type="checkbox"
                    checked={settings.usdt_bep20_enabled === '1'}
                    onChange={(e) => setSettings({ ...settings, usdt_bep20_enabled: e.target.checked ? '1' : '0' })}
                    className="w-4 h-4 rounded text-amber-500 focus:ring-amber-400 accent-amber-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    BEP20 Wallet Address (0x...)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. 0x88923a41b2c4e511796b4f74d06a92849b21f92e"
                      value={settings.usdt_bep20_address || ''}
                      onChange={(e) => setSettings({ ...settings, usdt_bep20_address: e.target.value.trim() })}
                      className="w-full bg-[#050811] border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-mono text-xs focus:outline-none focus:border-amber-400"
                    />
                    {settings.usdt_bep20_address && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(settings.usdt_bep20_address, 'bep20_addr')}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                        title="Copy BEP20 Address"
                      >
                        {copiedKey === 'bep20_addr' ? <Check className="w-4 h-4 text-amber-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* BEP20 QR Upload */}
                <div className="p-3.5 rounded-lg bg-[#050811] border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>BEP20 QR Image</span>
                    </span>
                    {settings.usdt_bep20_qr && (
                      <span className="text-[10px] text-amber-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> QR Attached
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {settings.usdt_bep20_qr ? (
                      <div className="relative group w-20 h-20 rounded-lg border border-amber-500/40 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={settings.usdt_bep20_qr}
                          alt="BEP20 QR"
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setPreviewQrModal({ title: 'BEP20 QR Code', image: settings.usdt_bep20_qr })}
                            className="p-1 rounded bg-slate-800 text-white hover:text-amber-400"
                            title="Enlarge"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('usdt_bep20_qr', 'BEP20')}
                            className="p-1 rounded bg-rose-950 text-rose-300 hover:text-white"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border border-dashed border-slate-700 bg-slate-900/30 flex flex-col items-center justify-center text-slate-500 shrink-0">
                        <QrCode className="w-6 h-6 opacity-30 mb-0.5" />
                        <span className="text-[9px]">Optional QR</span>
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1">
                      <label className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1.5 cursor-pointer font-semibold text-[11px]">
                        <Upload className="w-3 h-3" />
                        <span>{settings.usdt_bep20_qr ? 'Replace QR' : 'Upload BEP20 QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'usdt_bep20_qr', 'BEP20')}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-500 block">
                        Wallet address can be saved with or without QR.
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    BEP20 Payment Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={settings.usdt_bep20_instructions || ''}
                    onChange={(e) => setSettings({ ...settings, usdt_bep20_instructions: e.target.value })}
                    placeholder="e.g. Send USDT only via BNB Smart Chain (BEP20). Wrong network results in permanent loss."
                    className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-amber-400 text-xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={savingKey === 'USDT BEP20'}
                    onClick={() => handleSaveSection(
                      ['usdt_bep20_enabled', 'usdt_bep20_address', 'usdt_bep20_qr', 'usdt_bep20_instructions'],
                      'USDT BEP20'
                    )}
                    className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {savingKey === 'USDT BEP20' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Save BEP20 Settings</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ---------------------------------------------------- */}
            {/* NETWORK B: TRC20 (TRON Network) */}
            {/* ---------------------------------------------------- */}
            <div className="rounded-xl border border-cyan-500/40 bg-[#070b16] p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 font-black text-xs flex items-center justify-center">
                    T
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">B. TRC20 Network</h4>
                    <span className="text-[10px] text-slate-400">TRON Network (TRC20)</span>
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-300">
                  <span className="text-[11px]">Enable TRC20</span>
                  <input
                    type="checkbox"
                    checked={settings.usdt_trc20_enabled === '1'}
                    onChange={(e) => setSettings({ ...settings, usdt_trc20_enabled: e.target.checked ? '1' : '0' })}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400 accent-cyan-500 cursor-pointer"
                  />
                </label>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    TRC20 Wallet Address (T...)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. TXnp9zR8XqW3kmLgP7bK2m9vT5rQ1j8sF"
                      value={settings.usdt_trc20_address || ''}
                      onChange={(e) => setSettings({ ...settings, usdt_trc20_address: e.target.value.trim() })}
                      className="w-full bg-[#050811] border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono text-xs focus:outline-none focus:border-cyan-400"
                    />
                    {settings.usdt_trc20_address && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(settings.usdt_trc20_address, 'trc20_addr')}
                        className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white shrink-0 cursor-pointer"
                        title="Copy TRC20 Address"
                      >
                        {copiedKey === 'trc20_addr' ? <Check className="w-4 h-4 text-cyan-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* TRC20 QR Upload */}
                <div className="p-3.5 rounded-lg bg-[#050811] border border-slate-800/80 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-300 flex items-center gap-1.5 text-[11px]">
                      <QrCode className="w-3.5 h-3.5 text-cyan-400" />
                      <span>TRC20 QR Image</span>
                    </span>
                    {settings.usdt_trc20_qr && (
                      <span className="text-[10px] text-cyan-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> QR Attached
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    {settings.usdt_trc20_qr ? (
                      <div className="relative group w-20 h-20 rounded-lg border border-cyan-500/40 bg-black/40 overflow-hidden flex items-center justify-center shrink-0">
                        <img
                          src={settings.usdt_trc20_qr}
                          alt="TRC20 QR"
                          className="w-full h-full object-contain p-1"
                        />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setPreviewQrModal({ title: 'TRC20 QR Code', image: settings.usdt_trc20_qr })}
                            className="p-1 rounded bg-slate-800 text-white hover:text-cyan-400"
                            title="Enlarge"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveImage('usdt_trc20_qr', 'TRC20')}
                            className="p-1 rounded bg-rose-950 text-rose-300 hover:text-white"
                            title="Remove"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-lg border border-dashed border-slate-700 bg-slate-900/30 flex flex-col items-center justify-center text-slate-500 shrink-0">
                        <QrCode className="w-6 h-6 opacity-30 mb-0.5" />
                        <span className="text-[9px]">Optional QR</span>
                      </div>
                    )}

                    <div className="space-y-1.5 flex-1">
                      <label className="px-2.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 inline-flex items-center gap-1.5 cursor-pointer font-semibold text-[11px]">
                        <Upload className="w-3 h-3" />
                        <span>{settings.usdt_trc20_qr ? 'Replace QR' : 'Upload TRC20 QR'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'usdt_trc20_qr', 'TRC20')}
                          className="hidden"
                        />
                      </label>
                      <span className="text-[10px] text-slate-500 block">
                        Wallet address can be saved with or without QR.
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    TRC20 Payment Instructions
                  </label>
                  <textarea
                    rows={2}
                    value={settings.usdt_trc20_instructions || ''}
                    onChange={(e) => setSettings({ ...settings, usdt_trc20_instructions: e.target.value })}
                    placeholder="e.g. Transfer USDT only via TRON (TRC20). Confirm transaction before submitting."
                    className="w-full bg-[#050811] border border-slate-700 rounded-lg p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    disabled={savingKey === 'USDT TRC20'}
                    onClick={() => handleSaveSection(
                      ['usdt_trc20_enabled', 'usdt_trc20_address', 'usdt_trc20_qr', 'usdt_trc20_instructions'],
                      'USDT TRC20'
                    )}
                    className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    {savingKey === 'USDT TRC20' ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                    <span>Save TRC20 Settings</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* Master USDT Save Bar */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">
              Changes to USDT overall status or individual networks can be saved together or independently.
            </span>
            <button
              type="button"
              disabled={savingKey === 'USDT All'}
              onClick={() => handleSaveSection(
                [
                  'usdt_enabled',
                  'usdt_bep20_enabled', 'usdt_bep20_address', 'usdt_bep20_qr', 'usdt_bep20_instructions',
                  'usdt_trc20_enabled', 'usdt_trc20_address', 'usdt_trc20_qr', 'usdt_trc20_instructions'
                ],
                'USDT All'
              )}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 cursor-pointer"
            >
              {savingKey === 'USDT All' ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Both USDT Networks</span>
            </button>
          </div>

        </div>
      </div>

      {/* QR Code Enlarged Preview Modal */}
      {previewQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-[#0c1326] border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setPreviewQrModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="text-center">
              <h4 className="text-base font-bold text-white">{previewQrModal.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">High-Resolution QR Preview</p>
            </div>

            <div className="p-4 bg-white rounded-xl flex items-center justify-center shadow-inner">
              <img
                src={previewQrModal.image}
                alt="Enlarged QR"
                className="max-h-72 max-w-full object-contain"
              />
            </div>

            <button
              type="button"
              onClick={() => setPreviewQrModal(null)}
              className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
