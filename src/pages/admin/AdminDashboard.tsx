import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Order, PaymentRequest } from '../../types/index.ts';
import {
  Users,
  ShoppingBag,
  DollarSign,
  Clock,
  CreditCard,
  LifeBuoy,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface AdminDashboardProps {
  onNavigate: (view: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  const [overview, setOverview] = useState<{
    total_users: number;
    total_orders: number;
    pending_orders: number;
    pending_payments: number;
    open_tickets: number;
    total_revenue: number;
    total_spent: number;
    recent_orders: Order[];
    recent_payments: PaymentRequest[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.admin.getOverview()
      .then(setOverview)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono">
            Platform Command & Control
          </div>
          <h1 className="text-2xl font-bold text-white">Administrator Overview</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time financial turnover, queue telemetry, and system dispatches
          </p>
        </div>

        <div className="flex items-center gap-2">
          {overview?.pending_payments && overview.pending_payments > 0 ? (
            <button
              onClick={() => onNavigate('admin-payments')}
              className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 animate-pulse"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>{overview.pending_payments} Pending Deposits</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        
        <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800">
          <div className="text-slate-400 text-xs mb-1">Total Users</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {overview?.total_users || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Registered accounts</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800">
          <div className="text-slate-400 text-xs mb-1">Total Orders</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-white">
            {overview?.total_orders || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">System submissions</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800">
          <div className="text-slate-400 text-xs mb-1">Total Revenue</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            Rs {(overview?.total_revenue || 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Approved deposits</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800">
          <div className="text-slate-400 text-xs mb-1">Pending Orders</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
            {overview?.pending_orders || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Awaiting server push</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800">
          <div className="text-slate-400 text-xs mb-1">Pending Deposits</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-sky-400">
            {overview?.pending_payments || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Requires approval</span>
        </div>

        <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800">
          <div className="text-slate-400 text-xs mb-1">Open Tickets</div>
          <div className="text-xl sm:text-2xl font-bold font-mono text-purple-400">
            {overview?.open_tickets || 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">Customer care inbox</span>
        </div>

      </div>

      {/* Two Column Split: Recent Payments & Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Payment Requests */}
        <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Pending & Recent Deposits</h3>
              <p className="text-xs text-slate-400">Easypaisa & JazzCash queue</p>
            </div>
            <button
              onClick={() => onNavigate('admin-payments')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              Manage Payments
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1428] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Method</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">TRX ID</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {overview?.recent_payments.slice(0, 5).map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-semibold text-white">{p.username}</td>
                    <td className="py-2.5 px-3 text-slate-300">{p.method}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      Rs {p.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-400">{p.trx_id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        p.status === 'approved' ? 'bg-emerald-950 text-emerald-300' : p.status === 'pending' ? 'bg-amber-950 text-amber-300' : 'bg-rose-950 text-rose-300'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">Latest Client Orders</h3>
              <p className="text-xs text-slate-400">Real-time system feed</p>
            </div>
            <button
              onClick={() => onNavigate('admin-orders')}
              className="text-xs text-sky-400 hover:text-sky-300 font-semibold"
            >
              Manage Orders
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0c1428] text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3">ID</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">Service</th>
                  <th className="py-2.5 px-3">Charge</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {overview?.recent_orders.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono text-slate-400">#{o.id}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{o.username}</td>
                    <td className="py-2.5 px-3 max-w-[150px] truncate text-slate-300">{o.service_name}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">
                      Rs {o.charge.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        o.status === 'Completed' ? 'bg-emerald-950 text-emerald-300' : 'bg-sky-950 text-sky-300'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

    </div>
  );
};
