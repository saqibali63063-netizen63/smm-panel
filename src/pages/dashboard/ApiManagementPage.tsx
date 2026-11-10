import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { Code, Copy, Check, Eye, EyeOff, RefreshCw, Terminal, Play } from 'lucide-react';

export const ApiManagementPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const { user, refreshUser } = useAuth();
  const [showKey, setShowKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  // Live Tester
  const [testAction, setTestAction] = useState<'balance' | 'services'>('balance');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const API_ENDPOINT = `${window.location.origin}/api/v2`;

  const copyKey = () => {
    if (user?.api_key) {
      navigator.clipboard.writeText(user.api_key);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    }
  };

  const copyUrl = () => {
    navigator.clipboard.writeText(API_ENDPOINT);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleRegenerate = async () => {
    if (!confirm('Are you sure you want to regenerate your API key? Any active scripts or reseller sites using the previous key will stop functioning until updated.')) return;

    setRegenerating(true);
    try {
      await api.regenerateApiKey();
      await refreshUser();
      alert('New API key generated successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to regenerate API key.');
    } finally {
      setRegenerating(false);
    }
  };

  const runTestCall = async () => {
    if (!user?.api_key) return;
    setTesting(true);
    setTestOutput(null);

    try {
      const res = await fetch(`${API_ENDPOINT}?key=${user.api_key}&action=${testAction}`);
      const data = await res.json();
      setTestOutput(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setTestOutput(`Error: ${err.message}`);
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div>
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
          Developer Integration
        </div>
        <h1 className="text-2xl font-bold text-white">API Key & Gateway Management</h1>
        <p className="text-xs text-slate-400 mt-1">
          Use your private API credentials to link your reseller panel or script to PakServices.
        </p>
      </div>

      {/* API Key Box */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Code className="w-4 h-4 text-sky-400" />
            <span>Your Personal API Key</span>
          </h3>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 text-xs font-semibold border border-slate-700"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
            <span>Regenerate Key</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 bg-[#070b16] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono flex items-center justify-between">
            <span>
              {showKey ? user?.api_key : (user?.api_key ? user.api_key.substring(0, 8) + '••••••••••••••••••••••••' : 'None')}
            </span>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-slate-400 hover:text-white p-1"
              title={showKey ? 'Hide key' : 'Show key'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={copyKey}
            className="px-4 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
          </button>
        </div>

        {/* API Endpoint Box */}
        <div className="pt-3 border-t border-slate-800 space-y-1">
          <span className="text-slate-400 text-xs font-semibold block">API v2 Endpoint URL:</span>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={API_ENDPOINT}
              className="flex-1 bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-sky-400 font-mono"
            />
            <button
              onClick={copyUrl}
              className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
            >
              {copiedUrl ? 'Copied' : 'Copy URL'}
            </button>
          </div>
        </div>
      </div>

      {/* Live Interactive API Tester */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Live Interactive API Tester</span>
          </h3>
          <span className="text-[11px] text-slate-400">Direct server execution test</span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="text-slate-300 font-medium">Select Action:</label>
          <select
            value={testAction}
            onChange={(e) => setTestAction(e.target.value as any)}
            className="bg-[#070b16] border border-slate-700 rounded-lg px-3 py-1.5 text-white"
          >
            <option value="balance">action=balance (Check My Balance)</option>
            <option value="services">action=services (Fetch Live Catalog)</option>
          </select>

          <button
            onClick={runTestCall}
            disabled={testing}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{testing ? 'Calling API...' : 'Send Test Request'}</span>
          </button>
        </div>

        {testOutput && (
          <div className="mt-3 p-4 rounded-lg bg-[#070b16] border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
            {testOutput}
          </div>
        )}
      </div>

    </div>
  );
};
