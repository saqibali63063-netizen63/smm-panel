import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Announcement, AuditLog, OrderSequenceInfo } from '../../types/index.ts';
import {
  Download,
  CheckCircle2,
  Trash2,
  Hash,
  AlertCircle,
  Palette,
  RefreshCw
} from 'lucide-react';
import { AdminPaymentMethods } from '../../components/admin/AdminPaymentMethods.tsx';
import { AdminDatabaseSafety } from '../../components/admin/AdminDatabaseSafety.tsx';
import { AdminThemeManager } from '../../components/admin/AdminThemeManager.tsx';

export const AdminSettingsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [activeTab, setActiveTab] = useState<
    'payment_methods' | 'order_sequence' | 'appearance' | 'database' | 'general' | 'announcements' | 'audit' | 'export'
  >('payment_methods');

  const [settings, setSettings] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [orderSequence, setOrderSequence] = useState<OrderSequenceInfo | null>(null);
  const [nextOrderIdInput, setNextOrderIdInput] = useState<string>('');
  const [seqSaving, setSeqSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New announcement
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState('info');

  const showMsg = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 5000);
  };

  const fetchData = () => {
    api.admin.getSettings().then(res => setSettings(res.settings)).catch(() => {});
    api.getAnnouncements().then(res => setAnnouncements(res.announcements)).catch(() => {});
    api.admin.getAuditLogs().then(res => setAuditLogs(res.logs)).catch(() => {});
    api.admin.getOrderSequence().then(res => {
      setOrderSequence(res);
      setNextOrderIdInput(String(res.next_order_id));
    }).catch(() => {});
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveOrderSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(nextOrderIdInput.trim());
    if (!Number.isInteger(parsed) || parsed < 1) {
      showMsg('error', 'Next Order ID must be a positive whole number (e.g. 325623).');
      return;
    }

    setSeqSaving(true);
    try {
      const res = await api.admin.updateOrderSequence(parsed);
      setOrderSequence({
        next_order_id: res.next_order_id,
        max_order_id: res.max_order_id,
        total_orders: res.total_orders
      });
      setNextOrderIdInput(String(res.next_order_id));
      showMsg('success', res.message);
      fetchData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update Next Order ID.');
    } finally {
      setSeqSaving(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.admin.updateSettings(settings);
      showMsg('success', res.message);
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      await api.admin.createAnnouncement({
        title: annTitle.trim(),
        content: annContent.trim(),
        type: annType
      });
      setAnnTitle('');
      setAnnContent('');
      showMsg('success', 'Broadcast announcement published.');
      fetchData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to publish');
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await api.admin.deleteAnnouncement(id);
      fetchData();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to delete');
    }
  };

  const downloadCsv = (type: 'orders' | 'transactions') => {
    const token = localStorage.getItem('pakservices_token');
    fetch(`/api/admin/export/${type}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pakservices_${type}.csv`;
        a.click();
      });
  };

  return (
    <div className="space-y-6">

      <div>
        <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono">
          System Configuration
        </div>
        <h1 className="text-2xl font-bold text-white">System Settings &amp; Governance</h1>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'payment_methods', label: 'Payment Methods & QR Codes' },
          { id: 'order_sequence', label: '🔢 Next Order ID' },
          { id: 'appearance', label: '🎨 Website Theme' },
          { id: 'database', label: '🛡️ Database Safety & Backups' },
          { id: 'general', label: 'Platform & Contact Settings' },
          { id: 'announcements', label: 'Broadcast Announcements' },
          { id: 'export', label: 'Export Data (CSV)' },
          { id: 'audit', label: 'Audit Trail' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Payment Methods & QR Tab */}
      {activeTab === 'payment_methods' && (
        <AdminPaymentMethods />
      )}

      {/* Next Order ID Configuration Tab */}
      {activeTab === 'order_sequence' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 p-6 rounded-2xl border border-slate-800 bg-[#090f20] space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
                  <Hash className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Order Number Control</h3>
                  <p className="text-xs text-slate-400">
                    Manually define the starting sequential Order ID for upcoming orders
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchData}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                title="Refresh current sequence"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800">
                <div className="text-[11px] text-slate-400">Current Next Order ID</div>
                <div className="text-xl font-extrabold font-mono text-amber-400 mt-1">
                  #{orderSequence ? orderSequence.next_order_id : '—'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800">
                <div className="text-[11px] text-slate-400">Latest Existing Order ID</div>
                <div className="text-xl font-extrabold font-mono text-sky-400 mt-1">
                  #{orderSequence ? orderSequence.max_order_id : '—'}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800">
                <div className="text-[11px] text-slate-400">Historical Orders</div>
                <div className="text-xl font-extrabold font-mono text-emerald-400 mt-1">
                  {orderSequence ? orderSequence.total_orders.toLocaleString() : '—'}
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveOrderSequence} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Next Order ID *
                </label>
                <input
                  type="number"
                  min={Math.max(1, (orderSequence?.max_order_id || 0) + 1)}
                  step={1}
                  required
                  value={nextOrderIdInput}
                  onChange={(e) => setNextOrderIdInput(e.target.value)}
                  placeholder="e.g. 325623"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-4 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                />
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Must be a whole number greater than your latest existing Order ID (#{orderSequence?.max_order_id || 0}) to prevent duplicate order IDs.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="submit"
                  disabled={seqSaving}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {seqSaving ? 'Saving Sequence...' : 'Save Next Order ID'}
                </button>
              </div>
            </form>
          </div>

          <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-800 bg-[#090f20] space-y-4 text-xs">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              How Order Numbering Works
            </h3>
            <ul className="space-y-2.5 text-slate-300 leading-relaxed">
              <li className="p-3 rounded-lg bg-[#070b16] border border-slate-800">
                <strong className="text-white block mb-0.5">Sequential Continuation</strong>
                If you set Next Order ID to <code className="text-amber-300">325623</code>, the next order receives <code className="text-amber-300">#325623</code>, then <code className="text-amber-300">#325624</code>, <code className="text-amber-300">#325625</code>, and so on.
              </li>
              <li className="p-3 rounded-lg bg-[#070b16] border border-slate-800">
                <strong className="text-white block mb-0.5">Applies Everywhere</strong>
                Applies consistently to both customer-placed orders (single &amp; mass orders) and admin-created orders.
              </li>
              <li className="p-3 rounded-lg bg-[#070b16] border border-slate-800">
                <strong className="text-white block mb-0.5">Atomic &amp; History-Safe</strong>
                Existing historical order IDs are never altered, failed orders never consume an order number, and concurrent submissions cannot collide.
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Global Theme Management Tab */}
      {activeTab === 'appearance' && (
        <AdminThemeManager />
      )}

      {/* Database Safety & Backups Tab */}
      {activeTab === 'database' && (
        <AdminDatabaseSafety />
      )}

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Easypaisa &amp; JazzCash Receiver Info
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Easypaisa Account Number</label>
                  <input
                    type="text"
                    value={settings.easypaisa_number || ''}
                    onChange={(e) => setSettings({ ...settings, easypaisa_number: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Easypaisa Account Title</label>
                  <input
                    type="text"
                    value={settings.easypaisa_title || ''}
                    onChange={(e) => setSettings({ ...settings, easypaisa_title: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">JazzCash Account Number</label>
                  <input
                    type="text"
                    value={settings.jazzcash_number || ''}
                    onChange={(e) => setSettings({ ...settings, jazzcash_number: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">JazzCash Account Title</label>
                  <input
                    type="text"
                    value={settings.jazzcash_title || ''}
                    onChange={(e) => setSettings({ ...settings, jazzcash_title: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
            </div>

            {/* Bank Transfer & USDT */}
            <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                1Link Bank &amp; USDT Settings
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={settings.bank_name || ''}
                    onChange={(e) => setSettings({ ...settings, bank_name: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Bank Account Number</label>
                  <input
                    type="text"
                    value={settings.bank_account_number || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_number: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Bank Account Title</label>
                  <input
                    type="text"
                    value={settings.bank_account_title || ''}
                    onChange={(e) => setSettings({ ...settings, bank_account_title: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">USDT TRC20 Address</label>
                  <input
                    type="text"
                    value={settings.usdt_trc20_address || settings.usdt_address || ''}
                    onChange={(e) => setSettings({ ...settings, usdt_trc20_address: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* General & Rates */}
            <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Financial Rates &amp; Policies
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">USD to PKR Conversion Rate</label>
                  <input
                    type="number"
                    step="0.1"
                    value={settings.usd_pkr_rate || '280'}
                    onChange={(e) => setSettings({ ...settings, usd_pkr_rate: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Referral Commission Percentage (%)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={settings.referral_percent || '5.0'}
                    onChange={(e) => setSettings({ ...settings, referral_percent: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Minimum Manual Deposit (PKR)</label>
                  <input
                    type="number"
                    value={settings.min_deposit_pkr || '100'}
                    onChange={(e) => setSettings({ ...settings, min_deposit_pkr: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Support info & Quick Links */}
            <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Support Helpline &amp; Appearance
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">WhatsApp Support Number</label>
                  <input
                    type="text"
                    value={settings.support_whatsapp || ''}
                    onChange={(e) => setSettings({ ...settings, support_whatsapp: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Telegram Support Username</label>
                  <input
                    type="text"
                    value={settings.support_telegram || ''}
                    onChange={(e) => setSettings({ ...settings, support_telegram: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div className="pt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('order_sequence')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Hash className="w-3.5 h-3.5" />
                    <span>Next Order ID: #{orderSequence?.next_order_id || '—'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('appearance')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Configure Global Theme</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
          </div>
        </form>
      )}

      {/* Announcements Tab */}
      {activeTab === 'announcements' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
            <h3 className="text-sm font-bold text-white">Publish Broadcast Announcement</h3>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Title *</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={(e) => setAnnTitle(e.target.value)}
                  placeholder="e.g. YouTube Monetization Update"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Content *</label>
                <textarea
                  required
                  rows={3}
                  value={annContent}
                  onChange={(e) => setAnnContent(e.target.value)}
                  placeholder="Message displayed to all resellers on their dashboard..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex items-center justify-between">
                <select
                  value={annType}
                  onChange={(e) => setAnnType(e.target.value)}
                  className="bg-[#070b16] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Amber)</option>
                </select>

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold cursor-pointer"
                >
                  Publish Announcement
                </button>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white">Active Announcements</h3>
            {announcements.map(a => (
              <div key={a.id} className="p-4 rounded-xl border border-slate-800 bg-[#090f20] flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-bold text-white">{a.title}</h4>
                  <p className="text-slate-400 mt-1">{a.content}</p>
                </div>
                <button
                  onClick={() => handleDeleteAnnouncement(a.id)}
                  className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 ml-4 shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Data Tab */}
      {activeTab === 'export' && (
        <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-6">
          <div>
            <h3 className="text-sm font-bold text-white">CSV Data Export</h3>
            <p className="text-xs text-slate-400 mt-1">Download complete records for accounting, bookkeeping, and backup.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[#070b16] border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">All Client Orders</div>
                <div className="text-[11px] text-slate-400">Order ID, User, Service, Link, Charge, Status</div>
              </div>
              <button
                onClick={() => downloadCsv('orders')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>

            <div className="p-4 rounded-lg bg-[#070b16] border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Financial Transactions</div>
                <div className="text-[11px] text-slate-400">User deposits, charges, refunds, running balances</div>
              </div>
              <button
                onClick={() => downloadCsv('transactions')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Trail Tab */}
      {activeTab === 'audit' && (
        <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden">
          <div className="p-4 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white">Administrative Audit Trail</h3>
            <p className="text-xs text-slate-400">Chronological security log of balance modifications and critical admin actions</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Admin</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Target</th>
                  <th className="py-2.5 px-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300 font-mono text-[11px]">
                {auditLogs.map(l => (
                  <tr key={l.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-amber-400 font-semibold">{l.admin_username}</td>
                    <td className="py-2.5 px-3">{l.action}</td>
                    <td className="py-2.5 px-3">{l.target_type} #{l.target_id}</td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">{l.details}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
