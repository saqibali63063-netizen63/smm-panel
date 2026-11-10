import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Provider } from '../../types/index.ts';
import {
  Server,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Zap,
  Globe,
  Lock
} from 'lucide-react';

export const AdminProvidersPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [name, setName] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [testingId, setTestingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchProviders = () => {
    setLoading(true);
    api.admin.getProviders()
      .then(res => setProviders(res.providers))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchProviders();
  }, []);

  const handleAddProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !apiUrl.trim() || !apiKey.trim()) return;

    try {
      await api.admin.createProvider({
        name: name.trim(),
        api_url: apiUrl.trim(),
        api_key: apiKey.trim()
      });
      setAddModal(false);
      setName('');
      setApiUrl('');
      setApiKey('');
      setFeedback('New provider integration added securely.');
      fetchProviders();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to add provider');
    }
  };

  const handleTestBalance = async (id: number) => {
    setTestingId(id);
    try {
      const res = await api.admin.testProviderBalance(id);
      setFeedback(res.message);
      fetchProviders();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Failed to test balance');
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono">
            Upstream Providers
          </div>
          <h1 className="text-2xl font-bold text-white">SMM Provider API Gateway</h1>
          <p className="text-xs text-slate-400 mt-1">
            Connect upstream wholesale SMM APIs. Orders are automatically relayed and synchronized via server-side v2 protocol.
          </p>
        </div>

        <button
          onClick={() => setAddModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors self-start sm:self-auto shadow-md shadow-sky-600/30"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Provider</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Security Architecture Notice */}
      <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
        <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
        <div>
          <strong className="text-white block font-semibold mb-0.5">Strict Server-Side Key Isolation</strong>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Provider secret keys are stored exclusively in the encrypted server SQLite database and never sent to client browsers. In test mode, provider balance calls and order dispatches use safe mock endpoints until real upstream credentials are supplied.
          </p>
        </div>
      </div>

      {/* Provider List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map(p => (
          <div key={p.id} className="p-5 rounded-xl border border-slate-800 bg-[#090f20] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-400">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white text-sm">{p.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">ID: #{p.id}</div>
                </div>
              </div>

              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                {p.status}
              </span>
            </div>

            <div className="p-3 rounded-lg bg-[#070b16] border border-slate-800 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>API URL:</span>
                <span className="text-sky-400 truncate max-w-[200px]">{p.api_url}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-[11px]">
                <span>API Key:</span>
                <span className="text-slate-300">{p.api_key_masked || '••••••••••••'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-1 text-[11px]">
                <span className="text-slate-400">Provider Balance:</span>
                <span className="font-bold text-emerald-400">${p.balance} {p.currency}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => handleTestBalance(p.id)}
                disabled={testingId === p.id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${testingId === p.id ? 'animate-spin' : ''}`} />
                <span>{testingId === p.id ? 'Connecting...' : 'Check Balance'}</span>
              </button>

              <span className="text-[11px] text-slate-500 font-mono">
                Auto-sync active
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Provider Modal */}
      {addModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white">Connect SMM Provider API</h3>

            <form onSubmit={handleAddProvider} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Provider Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. JustAnotherPanel or SMMKings"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Provider API v2 URL *</label>
                <input
                  type="url"
                  required
                  value={apiUrl}
                  onChange={(e) => setApiUrl(e.target.value)}
                  placeholder="https://provider.domain/api/v2"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Provider API Secret Key *</label>
                <input
                  type="password"
                  required
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="••••••••••••••••••••••••"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAddModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md shadow-sky-600/30"
                >
                  Save Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
