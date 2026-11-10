import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { Users, Copy, Check, TrendingUp, Coins, Gift, ArrowRight } from 'lucide-react';

export const ReferralsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [data, setData] = useState<{
    referral_code: string;
    commission_rate: number;
    total_referrals: number;
    total_earnings: number;
    referred_users: { id: number; username: string; created_at: string; contribution: number }[];
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReferrals()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const referralLink = data ? `${window.location.origin}/?ref=${data.referral_code}` : '';

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      <div>
        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">
          Affiliate & Partnership Program
        </div>
        <h1 className="text-2xl font-bold text-white">Refer & Earn 5% Lifetime Commission</h1>
        <p className="text-xs text-slate-400 mt-1">
          Share your referral link with friends, agencies, and fellow resellers. Automatically earn 5% on every order they place forever.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Total Referrals</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              {data?.total_referrals || 0}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-sky-950 text-sky-400">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Commission Rate</div>
            <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
              {data?.commission_rate || 5}%
            </div>
          </div>
          <div className="p-3 rounded-lg bg-emerald-950 text-emerald-400">
            <Gift className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Total Earned Commission</div>
            <div className="text-2xl font-bold font-mono text-white mt-1">
              Rs {data?.total_earnings.toFixed(2) || '0.00'}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-amber-950 text-amber-400">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Unique Link Box */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
        <h3 className="text-sm font-bold text-white">Your Unique Referral Link</h3>
        <div className="flex items-center gap-2">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-[#070b16] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-sky-400 font-mono truncate"
          />
          <button
            onClick={copyLink}
            className="px-5 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors shrink-0"
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Link' : 'Copy Link'}</span>
          </button>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Referrals are tracked automatically through cookies and database relations. When a new user registers through this link or enters your referral code <strong className="text-white font-mono">{data?.referral_code}</strong>, their account is permanently linked to yours.
        </p>
      </div>

      {/* Referred Users Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl space-y-3">
        <div className="p-4 sm:p-5 border-b border-slate-800">
          <h3 className="text-sm font-bold text-white">Referred Resellers</h3>
          <p className="text-xs text-slate-400">List of accounts registered through your link</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Registered Date</th>
                <th className="py-3 px-4 text-right">Commission Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    Loading referrals...
                  </td>
                </tr>
              ) : !data || data.referred_users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-slate-400">
                    No referrals yet. Share your link above to start earning passive income!
                  </td>
                </tr>
              ) : (
                data.referred_users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-white">{u.username}</td>
                    <td className="py-3 px-4 text-slate-400">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-right">
                      Rs {u.contribution.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
