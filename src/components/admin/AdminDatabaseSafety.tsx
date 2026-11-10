import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { DatabaseStats, DatabaseBackupItem } from '../../types/index.ts';
import {
  Database,
  ShieldCheck,
  Download,
  Upload,
  RefreshCw,
  HardDrive,
  Users,
  ShoppingBag,
  CreditCard,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  FolderGit2,
  Info,
  Clock,
  Archive,
  ArrowRight
} from 'lucide-react';

export const AdminDatabaseSafety: React.FC = () => {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [backups, setBackups] = useState<DatabaseBackupItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupFilename, setSelectedBackupFilename] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, backupsRes] = await Promise.all([
        api.admin.getDatabaseStatus(),
        api.admin.getDatabaseBackups()
      ]);
      setStats(statsRes.stats);
      setBackups(backupsRes.backups);
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to load database status.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateBackup = async () => {
    setActionLoading(true);
    try {
      const res = await api.admin.createDatabaseBackup();
      setMessage({ text: res.message || 'Manual backup created successfully!', type: 'success' });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to create backup.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadLiveDb = () => {
    const token = localStorage.getItem('pakservices_token');
    const a = document.createElement('a');
    a.href = `/api/admin/database/download?token=${token}`;
    // Using fetch to attach Authorization header
    fetch('/api/admin/database/download', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        a.href = url;
        a.download = `pakservices_database_live_${new Date().toISOString().split('T')[0]}.db`;
        a.click();
        setMessage({ text: 'Database file (.db) downloaded successfully!', type: 'success' });
      })
      .catch(err => {
        setMessage({ text: 'Download failed: ' + err.message, type: 'error' });
      });
  };

  const handleDownloadBackupFile = (filename: string) => {
    const token = localStorage.getItem('pakservices_token');
    fetch(`/api/admin/database/download-backup/${encodeURIComponent(filename)}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
      })
      .catch(err => {
        setMessage({ text: 'Backup download failed: ' + err.message, type: 'error' });
      });
  };

  const handleDownloadJson = () => {
    const token = localStorage.getItem('pakservices_token');
    fetch('/api/admin/database/export-json', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => res.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pakservices_full_export_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        setMessage({ text: 'Full JSON backup downloaded successfully!', type: 'success' });
      })
      .catch(err => {
        setMessage({ text: 'JSON export failed: ' + err.message, type: 'error' });
      });
  };

  const executeRestore = async () => {
    if (confirmText.trim().toLowerCase() !== 'restore') {
      alert('Please type RESTORE to confirm.');
      return;
    }

    setActionLoading(true);
    try {
      if (selectedBackupFilename) {
        const res = await api.admin.restoreDatabase({ filename: selectedBackupFilename });
        setMessage({ text: res.message, type: 'success' });
      } else if (uploadFile) {
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(uploadFile);
        });
        const file_base64 = await base64Promise;
        const res = await api.admin.restoreDatabase({ file_base64 });
        setMessage({ text: res.message, type: 'success' });
      }
      setRestoreModalOpen(false);
      setConfirmText('');
      setSelectedBackupFilename(null);
      setUploadFile(null);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Restore failed.', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between border ${
            message.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-white text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Status Banner */}
      <div className="p-6 rounded-2xl border border-emerald-900/60 bg-gradient-to-br from-[#0b1f1a] to-[#081318] text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Permanent Data Preservation Engine Active
            </div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-emerald-400" />
              Live Database Protection & Safety Suite
            </h2>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Your registered users, balances, order history, and payment transactions are protected.
              Automated timestamped backups are generated on every server launch, and `.gitignore` prevents GitHub deployments from overwriting your live database.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleCreateBackup}
              disabled={actionLoading}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50"
            >
              <HardDrive className="w-4 h-4" />
              {actionLoading ? 'Creating Snapshot...' : 'Take Instant Snapshot'}
            </button>
            <button
              onClick={loadData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 cursor-pointer transition-colors"
              title="Refresh database status"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Database Key Metrics */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-emerald-900/50">
            <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-sky-400" />
                Live Users
              </div>
              <div className="text-lg font-bold text-white mt-1 font-mono">{stats.users_count}</div>
              <div className="text-[10px] text-emerald-400 font-medium">Protected in DB</div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                Total Orders
              </div>
              <div className="text-lg font-bold text-white mt-1 font-mono">{stats.orders_count}</div>
              <div className="text-[10px] text-slate-400">Order records</div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
                Transactions
              </div>
              <div className="text-lg font-bold text-white mt-1 font-mono">{stats.transactions_count}</div>
              <div className="text-[10px] text-slate-400">Ledger entries</div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                DB File Size
              </div>
              <div className="text-lg font-bold text-white mt-1 font-mono">{stats.size_formatted}</div>
              <div className="text-[10px] text-purple-400 font-mono">SQLite 3 Engine</div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <Archive className="w-3.5 h-3.5 text-blue-400" />
                Backups
              </div>
              <div className="text-lg font-bold text-white mt-1 font-mono">{stats.total_backups}</div>
              <div className="text-[10px] text-blue-400">Local Snapshots</div>
            </div>

            <div className="p-3 rounded-xl bg-black/30 border border-emerald-900/40">
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Storage Mode
              </div>
              <div className="text-xs font-bold text-emerald-300 mt-1 truncate">
                {stats.is_custom_path ? 'Persistent Custom' : 'Standard App'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono truncate" title={stats.path}>
                Active
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Database Location & Hostinger Configuration Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Database Location Card */}
        <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              Active Database File Path
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 font-mono">
              SQLite Sync
            </span>
          </div>

          <div className="p-3.5 rounded-lg bg-black/50 border border-slate-700/60 font-mono text-xs text-sky-300 break-all select-all">
            {stats?.path || 'Loading database path...'}
          </div>

          <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
            <p>
              • <strong className="text-white">Git Pull Isolation:</strong> The database file is placed in your system’s storage. Whenever you update code from GitHub, existing data remains completely intact.
            </p>
            <p>
              • <strong className="text-white">Startup Snapshots:</strong> Each time your Node.js application boots up on Hostinger, a timestamped snapshot is saved into the <code className="text-amber-400">backups/</code> folder automatically.
            </p>
            <p>
              • <strong className="text-white">Zero Reseeding:</strong> The system strictly detects existing user records and will never inject demo accounts into a live production panel.
            </p>
          </div>

          {/* Quick Downloads */}
          <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2.5">
            <button
              onClick={handleDownloadLiveDb}
              className="px-3.5 py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Download Live Database (.db)
            </button>
            <button
              onClick={handleDownloadJson}
              className="px-3.5 py-2 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <FileJson className="w-3.5 h-3.5" />
              Download JSON Export (.json)
            </button>
          </div>
        </div>

        {/* Hostinger Persistent Directory Guide */}
        <div className="p-6 rounded-xl border border-amber-900/40 bg-[#0e141d] space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <FolderGit2 className="w-4 h-4 text-amber-400" />
              Hostinger Production Setup (Must Read)
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 font-bold">
              Best Practice
            </span>
          </div>

          <div className="space-y-2.5 text-xs text-slate-300 leading-relaxed">
            <p className="font-semibold text-white">
              Hostinger par data ko 100% safe rakhnay k liye (Permanent Persistent Path):
            </p>
            <div className="p-3 rounded-lg bg-black/40 border border-amber-900/50 space-y-1.5 font-mono text-[11px] text-amber-200">
              <div className="text-slate-400">1. Hostinger hPanel &gt; Node.js Dashboard &gt; Environment Variables ma jaein.</div>
              <div>Add Variable:</div>
              <div className="text-white font-bold select-all">DATABASE_PATH=/home/YOUR_HOSTINGER_USER/pakservices_data/pakservices.db</div>
              <div className="text-emerald-400 text-[10px] font-sans">
                ✓ Ye directory git checkout folder se bahir hoti ha, is liye GitHub se jitni marzi updates dein, data kbi delete nahi hoga!
              </div>
            </div>
            <p className="text-[11px] text-slate-400">
              Agar ap ne <code className="text-white">DATABASE_PATH</code> set nahi bhi kia, to bhi ab <code className="text-white">.gitignore</code> file ma <code className="text-amber-300">*.db</code> add ho chuka ha, jis se local demo database kbi bhi Hostinger k live data ko overwrite nahi kray gi.
            </p>
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              onClick={() => setRestoreModalOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore Database from Backup...
            </button>
          </div>
        </div>
      </div>

      {/* Automated Backups Table */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-emerald-400" />
              Preserved Backup Snapshots
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Automated startup backups and manual safety snapshots stored securely on server.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCreateBackup}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <HardDrive className="w-3.5 h-3.5" />
              Create Snapshot Now
            </button>
          </div>
        </div>

        {backups.length === 0 ? (
          <div className="p-8 text-center border border-slate-800/80 rounded-xl bg-black/20 text-slate-400 text-xs space-y-2">
            <Info className="w-8 h-8 mx-auto text-slate-600 mb-2" />
            <p className="font-semibold text-slate-300">No backup snapshots stored yet.</p>
            <p className="text-[11px] text-slate-500">
              Click &quot;Take Instant Snapshot&quot; above to create your first backup immediately.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="py-2.5 px-3">Snapshot Filename</th>
                  <th className="py-2.5 px-3">File Size</th>
                  <th className="py-2.5 px-3">Preserved At</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {backups.map((b, idx) => (
                  <tr key={b.filename} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="font-mono text-slate-200 font-medium select-all">
                          {b.filename}
                        </span>
                        {idx === 0 && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            Latest
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-400">{b.sizeFormatted}</td>
                    <td className="py-3 px-3 text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(b.createdAt).toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })}
                    </td>
                    <td className="py-3 px-3 text-right space-x-2">
                      <button
                        onClick={() => handleDownloadBackupFile(b.filename)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 border border-slate-700"
                        title="Download .db snapshot file"
                      >
                        <Download className="w-3 h-3 text-sky-400" />
                        Download
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBackupFilename(b.filename);
                          setUploadFile(null);
                          setRestoreModalOpen(true);
                        }}
                        className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1 border border-amber-500/40"
                        title="Restore this snapshot"
                      >
                        <Upload className="w-3 h-3 text-amber-400" />
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Restore Confirmation Modal */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0b1220] border border-amber-500/50 rounded-2xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-base font-bold text-white">Confirm Database Restore</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                You are about to restore your database from:{' '}
                <strong className="text-amber-300 font-mono">
                  {selectedBackupFilename || uploadFile?.name || 'Uploaded File'}
                </strong>
              </p>
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-[11px]">
                🛡️ <strong>Pre-restore Safety:</strong> The system will automatically generate a backup snapshot of your current database first before applying the restore.
              </div>
              <p className="text-slate-400">
                To confirm this operation, type <strong className="text-white font-mono">RESTORE</strong> below:
              </p>
            </div>

            {/* Custom file upload if no snapshot selected */}
            {!selectedBackupFilename && (
              <div className="space-y-1.5">
                <label className="block text-xs text-slate-400">Select SQLite Database File (.db):</label>
                <input
                  type="file"
                  accept=".db,.sqlite,.sqlite3"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>
            )}

            <div>
              <input
                type="text"
                placeholder="Type RESTORE to confirm"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/50 border border-amber-600/60 text-white font-mono text-xs focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRestoreModalOpen(false);
                  setConfirmText('');
                  setSelectedBackupFilename(null);
                  setUploadFile(null);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeRestore}
                disabled={actionLoading || confirmText.trim().toLowerCase() !== 'restore'}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
              >
                {actionLoading ? 'Restoring...' : 'Confirm & Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
