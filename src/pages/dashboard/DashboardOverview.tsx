import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import type { Order, Announcement } from '../../types/index.ts';
import {
  Wallet,
  Clock,
  CheckCircle2,
  PlusCircle,
  Copy,
  Check,
  TrendingUp,
  ArrowRight,
  Info,
  Layers
} from 'lucide-react';
import { isSimDetailsCategoryName } from '../../lib/simDetails.ts';

interface DashboardOverviewProps {
  onNavigate: (view: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [copiedRef, setCopiedRef] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refreshUser();
    Promise.all([
      api.getOrders(),
      api.getAnnouncements()
    ]).then(([ordersRes, annRes]) => {
      setOrders(ordersRes.orders);
      setAnnouncements(annRes.announcements);
    }).finally(() => setLoading(false));
  }, []);

  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'Completed').length;
  const inProgressOrders = orders.filter(o => ['In progress', 'Pending', 'Processing'].includes(o.status)).length;

  const referralLink = `${window.location.origin}/?ref=${user?.referral_code}`;

  const copyReferral = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Broadcast Announcements */}
      {announcements.length > 0 && (
        <div className="space-y-2">
          {announcements.map(ann => (
            <div
              key={ann.id}
              className={`p-3.5 rounded-xl border flex items-start gap-3 text-xs ${
                ann.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800/70 text-emerald-200'
                  : ann.type === 'warning'
                  ? 'bg-amber-950/40 border-amber-800/70 text-amber-200'
                  : 'bg-sky-950/40 border-sky-800/70 text-sky-200'
              }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong className="font-semibold block text-white">{ann.title}</strong>
                <span className="opacity-90">{ann.content}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Balance Card */}
        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Account Balance</span>
            <div className="p-2 rounded-lg bg-sky-950 text-sky-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white flex items-baseline gap-1">
              <span className="text-sm font-sans font-normal text-slate-400">Rs</span>
              {user?.balance.toFixed(2)}
            </div>
            <button
              onClick={() => onNavigate('add-funds')}
              className="mt-2 text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
            >
              <span>+ Add Funds</span>
            </button>
          </div>
        </div>

        {/* Total Spent */}
        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Total Spent</span>
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white flex items-baseline gap-1">
              <span className="text-sm font-sans font-normal text-slate-400">Rs</span>
              {user?.spent.toFixed(2)}
            </div>
            <span className="mt-2 block text-[11px] text-slate-400">All-time lifetime orders</span>
          </div>
        </div>

        {/* In Progress */}
        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Active Orders</span>
            <div className="p-2 rounded-lg bg-amber-950 text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-amber-400">
              {inProgressOrders}
            </div>
            <span className="mt-2 block text-[11px] text-slate-400">Pending & In Progress</span>
          </div>
        </div>

        {/* Completed */}
        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Delivered Orders</span>
            <div className="p-2 rounded-lg bg-emerald-950 text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-400">
              {completedOrders}
            </div>
            <span className="mt-2 block text-[11px] text-slate-400">Delivered successfully</span>
          </div>
        </div>

      </div>

      {/* Quick Actions & Referral Link Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Quick New Order */}
        <div 
          onClick={() => onNavigate('new-order')}
          className="p-5 rounded-xl bg-gradient-to-br from-sky-950/60 to-blue-950/40 border border-sky-800/60 cursor-pointer hover:border-sky-600 transition-all group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <PlusCircle className="w-4 h-4 text-sky-400" />
              <span>Place Single Order</span>
            </div>
            <p className="text-xs text-slate-400">
              Choose from 30+ instant delivery services
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-sky-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Quick Mass Order */}
        <div 
          onClick={() => onNavigate('mass-order')}
          className="p-5 rounded-xl bg-[#090f20] border border-slate-800 cursor-pointer hover:border-slate-700 transition-all group flex items-center justify-between"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Layers className="w-4 h-4 text-slate-300" />
              <span>Mass Order Engine</span>
            </div>
            <p className="text-xs text-slate-400">
              Submit multiple orders in 1 click
            </p>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
        </div>

        {/* Referral Link Box */}
        <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold text-white">Earn 5% Lifetime Commission</span>
            <span className="text-[11px] text-emerald-400 font-mono">CODE: {user?.referral_code}</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className="flex-1 bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 font-mono truncate"
            />
            <button
              onClick={copyReferral}
              className="p-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors"
              title="Copy referral link"
            >
              {copiedRef ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

      </div>

      {/* Recent Orders Section */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Recent Orders</h3>
            <p className="text-xs text-slate-400">Your latest social promotion dispatches</p>
          </div>
          <button
            onClick={() => onNavigate('my-orders')}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1"
          >
            <span>View All ({totalOrders})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Link</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Charge</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No orders placed yet. Place your first order to get started!
                  </td>
                </tr>
              ) : (
                orders.slice(0, 5).map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{o.id}</td>
                    <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                      {o.service_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 max-w-xs">
                      {isSimDetailsCategoryName(o.category_name) || !/^https?:\/\//i.test(o.link) ? (
                        <div className="space-y-0.5">
                          <div className="text-sky-300 font-mono truncate select-all" title={o.link}>
                            {o.link}
                          </div>
                          {o.delivery_contact && (
                            <div className="text-[10px] text-emerald-300/90 font-mono truncate" title={`Delivery: ${o.delivery_contact}`}>
                              Delivery: {o.delivery_contact}
                            </div>
                          )}
                        </div>
                      ) : (
                        <a href={o.link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline block truncate">
                          {o.link}
                        </a>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">{o.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                      Rs {o.charge.toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${
                        o.status === 'Completed'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : o.status === 'In progress'
                          ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                          : o.status === 'Pending'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      }`}>
                        {o.status}
                      </span>
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
