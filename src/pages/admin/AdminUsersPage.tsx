import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { User } from '../../types/index.ts';
import {
  Users,
  Search,
  DollarSign,
  Shield,
  Ban,
  CheckCircle2,
  X,
  AlertCircle,
  Plus,
  Minus
} from 'lucide-react';

export const AdminUsersPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Balance edit modal
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [balanceAction, setBalanceAction] = useState<'add' | 'deduct'>('add');
  const [amount, setAmount] = useState<number>(500);
  const [reason, setReason] = useState('');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchUsers = () => {
    setLoading(true);
    api.admin.getUsers(searchTerm)
      .then(res => setUsers(res.users))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || amount <= 0 || !reason.trim()) return;

    setBalanceLoading(true);
    try {
      const res = await api.admin.updateUserBalance(selectedUser.id, {
        action: balanceAction,
        amount,
        reason: reason.trim()
      });

      setFeedback(res.message);
      setSelectedUser(null);
      setReason('');
      fetchUsers();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Balance update failed');
    } finally {
      setBalanceLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    if (!confirm(`Are you sure you want to change ${user.username}'s status to ${nextStatus}?`)) return;

    try {
      await api.admin.updateUserStatus(user.id, { status: nextStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleToggleRole = async (user: User) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`Are you sure you want to change ${user.username}'s role to ${nextRole.toUpperCase()}?`)) return;

    try {
      await api.admin.updateUserStatus(user.id, { role: nextRole });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Role update failed');
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono">
            User Operations
          </div>
          <h1 className="text-2xl font-bold text-white">Client & Reseller Management</h1>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search username, email, ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#090f20] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Search
          </button>
        </form>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Balance</th>
                <th className="py-3 px-4">Total Spent</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joined</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading users list...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No users found matching query.
                  </td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{u.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{u.username}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        u.role === 'admin' ? 'bg-amber-950 text-amber-300 border border-amber-800' : 'bg-slate-800 text-slate-300'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                      Rs {u.balance.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300 tabular-nums">
                      Rs {u.spent.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        u.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setSelectedUser(u);
                            setBalanceAction('add');
                          }}
                          className="px-2.5 py-1 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white border border-sky-500/30 text-[11px] font-medium"
                          title="Edit Balance"
                        >
                          ± Balance
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2 py-1 rounded text-[11px] font-medium border ${
                            u.status === 'active'
                              ? 'bg-rose-950/40 text-rose-400 border-rose-800 hover:bg-rose-900'
                              : 'bg-emerald-950/40 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                          }`}
                        >
                          {u.status === 'active' ? 'Suspend' : 'Activate'}
                        </button>

                        <button
                          onClick={() => handleToggleRole(u)}
                          className="px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px]"
                          title="Toggle Admin/User Role"
                        >
                          Role
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Balance Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-amber-400">Admin Credit / Debit Tool</span>
              <h3 className="text-base font-bold text-white mt-1">
                Edit Balance for {selectedUser.username}
              </h3>
              <p className="text-xs text-slate-400">
                Current Balance: <strong className="text-emerald-400 font-mono">Rs {selectedUser.balance.toFixed(2)}</strong>
              </p>
            </div>

            <form onSubmit={handleBalanceSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setBalanceAction('add')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    balanceAction === 'add'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Funds (Credit)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBalanceAction('deduct')}
                  className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border transition-all ${
                    balanceAction === 'deduct'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-sm'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct Funds</span>
                </button>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Amount in Pakistani Rupees (PKR) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Reason for Adjustment * (Stored in Audit Ledger)
                </label>
                <input
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Manual Cash Received / Incentive Promo"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={balanceLoading}
                  className={`px-5 py-2 rounded-lg text-white font-semibold shadow-md ${
                    balanceAction === 'add' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-rose-600 hover:bg-rose-500'
                  }`}
                >
                  {balanceLoading ? 'Saving...' : `Confirm ${balanceAction === 'add' ? 'Credit' : 'Deduction'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
