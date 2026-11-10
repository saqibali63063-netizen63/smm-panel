import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Transaction } from '../../types/index.ts';
import { Receipt, ArrowDownRight, ArrowUpRight, Search } from 'lucide-react';

export const TransactionsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getTransactions()
      .then(res => setTransactions(res.transactions))
      .finally(() => setLoading(false));
  }, []);

  const filtered = transactions.filter(t =>
    !searchTerm ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.reference_id && t.reference_id.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
            Financial Ledger
          </div>
          <h1 className="text-2xl font-bold text-white">Transaction History</h1>
          <p className="text-xs text-slate-400 mt-1">
            Audit log of all deposits, order charges, refunds, and referral commissions.
          </p>
        </div>

        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#090f20] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    Loading financial ledger...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                filtered.map(t => {
                  const isCredit = t.amount > 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-medium text-slate-400">#{t.id}</td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                          isCredit
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        }`}>
                          {isCredit ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                          <span>{t.type}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-white max-w-md">
                        {t.description}
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold tabular-nums whitespace-nowrap ${
                        isCredit ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {isCredit ? '+' : ''}Rs {t.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300 text-right tabular-nums whitespace-nowrap">
                        Rs {t.balance_after.toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
