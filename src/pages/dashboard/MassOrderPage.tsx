import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import { Layers, CheckCircle2, AlertCircle, Info, ArrowRight } from 'lucide-react';

interface MassOrderPageProps {
  onNavigate: (view: string) => void;
}

export const MassOrderPage: React.FC<MassOrderPageProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [massData, setMassData] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleFormat = `1 | 1000 | https://instagram.com/sample_account
6 | 5000 | https://tiktok.com/@growth_creator/video/123456
11 | 500 | https://youtube.com/@channel_handle`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!massData.trim()) {
      setError('Please enter mass order instructions.');
      return;
    }

    setError(null);
    setResults(null);
    setLoading(true);

    try {
      const res = await api.massOrder(massData.trim());
      setResults(res.results);
      await refreshUser();
    } catch (err: any) {
      setError(err.message || 'Mass order failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div>
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
          Bulk Processing Suite
        </div>
        <h1 className="text-2xl font-bold text-white">Mass Order Engine</h1>
        <p className="text-xs text-slate-400 mt-1">
          Submit hundreds of orders at once using our simple pipe-separated format.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Form: 8 cols */}
        <div className="lg:col-span-8 rounded-xl border border-slate-800 bg-[#090f20] p-6 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-semibold">
                  Enter One Order Per Line:
                </label>
                <button
                  type="button"
                  onClick={() => setMassData(sampleFormat)}
                  className="text-sky-400 hover:text-sky-300 text-[11px]"
                >
                  Fill Sample
                </button>
              </div>

              <textarea
                required
                rows={10}
                value={massData}
                onChange={(e) => setMassData(e.target.value)}
                placeholder={`1 | 1000 | https://instagram.com/sample_account\n6 | 5000 | https://tiktok.com/@user/video/123456`}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-3 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-sky-500 text-xs leading-relaxed"
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-[#070b16] border border-slate-800">
              <span className="text-slate-400">Your Current Balance:</span>
              <span className="font-mono font-bold text-white">Rs {user?.balance.toFixed(2)}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            >
              <span>{loading ? 'Processing Mass Orders...' : 'Submit Mass Orders'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Results Summary Table */}
          {results && (
            <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white">Execution Report</h3>
              <div className="overflow-x-auto rounded-lg border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0c1428] text-slate-400 font-semibold">
                    <tr>
                      <th className="py-2.5 px-3">Line</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Order ID / Details</th>
                      <th className="py-2.5 px-3">Charge</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200 font-mono">
                    {results.map((r, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="py-2 px-3 text-slate-400">Line {r.line}</td>
                        <td className="py-2 px-3">
                          {r.success ? (
                            <span className="text-emerald-400 font-sans font-semibold">Success</span>
                          ) : (
                            <span className="text-rose-400 font-sans font-semibold">Failed</span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          {r.success ? `Order #${r.order_id}` : r.error}
                        </td>
                        <td className="py-2 px-3 text-emerald-400">
                          {r.charge ? `Rs ${r.charge.toFixed(2)}` : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Right Instructions: 4 cols */}
        <div className="lg:col-span-4 space-y-4 text-xs">
          <div className="p-5 rounded-xl border border-slate-800 bg-[#090f20] space-y-3">
            <div className="flex items-center gap-2 text-white font-bold">
              <Info className="w-4 h-4 text-sky-400" />
              <span>Format Guide</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              Every row must strictly follow this syntax:
            </p>
            <div className="p-2.5 rounded bg-[#070b16] font-mono text-[11px] text-sky-300 border border-slate-800">
              service_id | quantity | link
            </div>
            <ul className="space-y-1.5 text-slate-400 text-[11px] list-disc list-inside">
              <li>Each order on a separate new line</li>
              <li>Separate parameters with the pipe symbol ( | )</li>
              <li>Ensure your balance is sufficient for all orders</li>
            </ul>
            <div className="pt-2 border-t border-slate-800">
              <button
                onClick={() => onNavigate('user-services')}
                className="text-sky-400 hover:underline font-semibold"
              >
                View Services List for IDs
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
