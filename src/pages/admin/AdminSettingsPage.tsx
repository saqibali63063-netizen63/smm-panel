import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Announcement, AuditLog } from '../../types/index.ts';
import {
  Settings,
  Bell,
  FileSpreadsheet,
  Download,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Plus,
  CreditCard,
  Sliders
} from 'lucide-react';
import { AdminPaymentMethods } from '../../components/admin/AdminPaymentMethods.tsx';

export const AdminSettingsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [activeTab, setActiveTab] = useState<'payment_methods' | 'general' | 'announcements' | 'audit' | 'export'>('payment_methods');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // New announcement
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState('info');

  const fetchData = () => {
    api.admin.getSettings().then(res => setSettings(res.settings));
    api.getAnnouncements().then(res => setAnnouncements(res.announcements));
    api.admin.getAuditLogs().then(res => setAuditLogs(res.logs));
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.admin.updateSettings(settings);
      setFeedback(res.message);
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
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
      setFeedback('Broadcast announcement published.');
      fetchData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to publish');
    }
  };

  const handleDeleteAnnouncement = async (id: number) => {
    try {
      await api.admin.deleteAnnouncement(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
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
        <h1 className="text-2xl font-bold text-white">System Settings & Governance</h1>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'payment_methods', label: 'Payment Methods & QR Codes' },
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

      {/* General Settings Tab */}
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Easypaisa & JazzCash Receiver Info
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
                1Link Bank & USDT Settings
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
                    value={settings.usdt_address || ''}
                    onChange={(e) => setSettings({ ...settings, usdt_address: e.target.value })}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>

            {/* General & Rates */}
            <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Financial Rates & Policies
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

            {/* Support info */}
            <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Support Helpline Details
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
              </div>
            </div>

          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
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
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold"
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
                  className="p-1.5 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 ml-4 shrink-0"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs"
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
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
