import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { Order } from '../../types/index.ts';
import {
  Search,
  RotateCcw,
  Ban,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { isSimDetailsCategoryName } from '../../lib/simDetails.ts';

interface MyOrdersPageProps {
  onNavigate: (view: string) => void;
}

export const MyOrdersPage: React.FC<MyOrdersPageProps> = ({ onNavigate }) => {
  const { refreshUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<'target' | 'delivery' | null>(null);

  const fetchOrders = () => {
    setLoading(true);
    api.getOrders({ status: statusFilter, search: searchTerm })
      .then(res => setOrders(res.orders))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleRefill = async (orderId: number) => {
    try {
      const res = await api.refillOrder(orderId);
      setActionFeedback(res.message);
      fetchOrders();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Refill failed');
    }
  };

  const handleCancel = async (orderId: number) => {
    if (!confirm(`Are you sure you want to cancel Order #${orderId}? Your account balance will be refunded immediately.`)) return;

    try {
      const res = await api.cancelOrder(orderId);
      setActionFeedback(res.message);
      await refreshUser();
      fetchOrders();
      setTimeout(() => setActionFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Cancel failed');
    }
  };

  const statuses = ['all', 'Pending', 'In progress', 'Completed', 'Partial', 'Canceled'];

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
            Order History & Dispatch
          </div>
          <h1 className="text-2xl font-bold text-white">My Orders</h1>
        </div>
        <button
          onClick={() => onNavigate('new-order')}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors self-start sm:self-auto"
        >
          + Place New Order
        </button>
      </div>

      {actionFeedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Search & Status Filter Tabs */}
      <div className="space-y-4">
        
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by order ID, link or service..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#090f20] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            Filter
          </button>
        </form>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          {statuses.map(st => {
            const isSelected = statusFilter.toLowerCase() === st.toLowerCase();
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-[#090f20] border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            );
          })}
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Link</th>
                <th className="py-3 px-4">Quantity</th>
                <th className="py-3 px-4">Charge</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{o.id}</td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 font-medium text-white max-w-xs truncate">
                      {o.service_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 max-w-[200px]">
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
                    <td className="py-3 px-4 whitespace-nowrap">
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
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.status === 'Completed' && Boolean(o.refill_supported) && (
                          <button
                            onClick={() => handleRefill(o.id)}
                            title="Request Drop Refill"
                            className="px-2 py-1 rounded bg-sky-950 text-sky-400 hover:bg-sky-900 border border-sky-800 text-[11px] font-medium flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Refill</span>
                          </button>
                        )}

                        {o.status === 'Pending' && (
                          <button
                            onClick={() => handleCancel(o.id)}
                            title="Cancel Order & Refund Balance"
                            className="px-2 py-1 rounded bg-rose-950 text-rose-400 hover:bg-rose-900 border border-rose-800 text-[11px] font-medium flex items-center gap-1"
                          >
                            <Ban className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedOrder(o)}
                          className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
                          title="View Details"
                        >
                          <Info className="w-3.5 h-3.5" />
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

      {/* Order Details Drawer / Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setSelectedOrder(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-sky-400">Order #{selectedOrder.id}</span>
              <h3 className="text-base font-bold text-white mt-1">
                {selectedOrder.service_name}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-lg bg-[#080d1a] border border-slate-800 text-xs">
              <div className={selectedOrder.delivery_contact || isSimDetailsCategoryName(selectedOrder.category_name) ? 'col-span-2' : ''}>
                <span className="text-slate-500 block">
                  {isSimDetailsCategoryName(selectedOrder.category_name)
                    ? 'Service Target (Mobile Number / CNIC):'
                    : 'Link:'}
                </span>
                {isSimDetailsCategoryName(selectedOrder.category_name) || !/^https?:\/\//i.test(selectedOrder.link) ? (
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span className="text-sky-300 font-mono font-semibold select-all break-all">
                      {selectedOrder.link}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(selectedOrder.link);
                        setCopiedField('target');
                        setTimeout(() => setCopiedField(null), 1500);
                      }}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                      title="Copy Service Target"
                    >
                      {copiedField === 'target' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                ) : (
                  <a href={selectedOrder.link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline font-mono truncate block">
                    {selectedOrder.link}
                  </a>
                )}
              </div>

              {(isSimDetailsCategoryName(selectedOrder.category_name) || selectedOrder.delivery_contact) && (
                <div className="col-span-2 pt-2 border-t border-slate-800/70">
                  <span className="text-slate-500 block">
                    Delivery Contact (Email / WhatsApp Number):
                  </span>
                  {selectedOrder.delivery_contact ? (
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-emerald-300 font-mono font-semibold select-all break-all">
                        {selectedOrder.delivery_contact}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(selectedOrder.delivery_contact!);
                          setCopiedField('delivery');
                          setTimeout(() => setCopiedField(null), 1500);
                        }}
                        className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0"
                        title="Copy Delivery Contact"
                      >
                        {copiedField === 'delivery' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-500 italic">Not provided</span>
                  )}
                </div>
              )}
              <div>
                <span className="text-slate-500 block">Quantity:</span>
                <span className="font-mono text-white">{selectedOrder.quantity.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Charge:</span>
                <span className="font-mono font-bold text-emerald-400">Rs {selectedOrder.charge.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Status:</span>
                <span className="font-semibold text-white">{selectedOrder.status}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Start Count:</span>
                <span className="font-mono text-slate-300">{selectedOrder.start_count}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Remains:</span>
                <span className="font-mono text-slate-300">{selectedOrder.remains}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Refill Status:</span>
                <span className="text-slate-300">{selectedOrder.refill_status || 'None'}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Created At:</span>
                <span className="text-slate-300">{new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
