import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Order } from '../../types/index.ts';
import {
  ShoppingBag,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
  Edit2,
  Copy,
  Check
} from 'lucide-react';
import { isSimDetailsCategoryName } from '../../lib/simDetails.ts';

export const AdminOrdersPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Status edit modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('Completed');
  const [startCount, setStartCount] = useState<number>(0);
  const [remains, setRemains] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const fetchOrders = () => {
    setLoading(true);
    api.admin.getOrders({ status: statusFilter, search: searchTerm })
      .then(res => setOrders(res.orders))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setNewStatus(order.status);
    setStartCount(order.start_count || 0);
    setRemains(order.remains || 0);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setUpdating(true);
    try {
      const res = await api.admin.updateOrderStatus(editingOrder.id, {
        status: newStatus,
        start_count: startCount,
        remains
      });

      setFeedback(res.message);
      setEditingOrder(null);
      fetchOrders();
      setTimeout(() => setFeedback(null), 4000);
    } catch (err: any) {
      alert(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const statuses = ['all', 'Pending', 'In progress', 'Completed', 'Partial', 'Canceled'];

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono">
            Order Fulfillment Queue
          </div>
          <h1 className="text-2xl font-bold text-white">Manage System Orders</h1>
        </div>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-sm w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, ID, link or service..."
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

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {statuses.map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
              statusFilter.toLowerCase() === st.toLowerCase()
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-[#090f20] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Orders Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Link</th>
                <th className="py-3 px-4">Qty</th>
                <th className="py-3 px-4">Charge</th>
                <th className="py-3 px-4">Start / Remains</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading orders queue...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No orders found.
                  </td>
                </tr>
              ) : (
                orders.map(o => (
                  <tr key={o.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{o.id}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-white">{o.username}</span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate">
                      {o.service_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 max-w-[220px]">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {isSimDetailsCategoryName(o.category_name) || !/^https?:\/\//i.test(o.link) ? (
                            <span className="text-amber-300 font-mono truncate select-all" title={`Target: ${o.link}`}>
                              {o.link}
                            </span>
                          ) : (
                            <a href={o.link} target="_blank" rel="noreferrer" className="text-sky-400 hover:underline truncate">
                              {o.link}
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleCopy(`${o.id}-target`, o.link)}
                            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                            title="Copy Service Target"
                          >
                            {copiedKey === `${o.id}-target` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>

                        {o.delivery_contact && (
                          <div className="flex items-center gap-1.5 text-[10px]">
                            <span className="text-slate-500 font-sans shrink-0">Delivery:</span>
                            <span className="text-emerald-300 font-mono truncate select-all" title={o.delivery_contact}>
                              {o.delivery_contact}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(`${o.id}-delivery`, o.delivery_contact!)}
                              className="p-0.5 rounded hover:bg-slate-800 text-slate-400 hover:text-white shrink-0"
                              title="Copy Delivery Contact"
                            >
                              {copiedKey === `${o.id}-delivery` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono tabular-nums">{o.quantity.toLocaleString()}</td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                      Rs {o.charge.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                      {o.start_count} / {o.remains}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                        o.status === 'Completed'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : o.status === 'In progress'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                          : o.status === 'Pending'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenEdit(o)}
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-medium flex items-center gap-1 ml-auto"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Order Status Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-amber-400">Order Dispatch Override</span>
              <h3 className="text-base font-bold text-white mt-1">
                Update Order #{editingOrder.id}
              </h3>
              <p className="text-xs text-slate-400">
                Client: {editingOrder.username} · Charge: Rs {editingOrder.charge.toFixed(2)}
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 rounded-lg bg-[#070b16] border border-slate-800 text-xs space-y-1">
                <div className="text-[11px] font-semibold text-slate-400">
                  {isSimDetailsCategoryName(editingOrder.category_name)
                    ? 'Service Target (Mobile Number / CNIC):'
                    : 'Submitted Target Link:'}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-sky-300 break-all select-all">{editingOrder.link}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`modal-${editingOrder.id}-target`, editingOrder.link)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 shrink-0"
                  >
                    {copiedKey === `modal-${editingOrder.id}-target` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === `modal-${editingOrder.id}-target` ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {(isSimDetailsCategoryName(editingOrder.category_name) || editingOrder.delivery_contact) && (
                <div className="p-3 rounded-lg bg-[#070b16] border border-emerald-900/50 text-xs space-y-1">
                  <div className="text-[11px] font-semibold text-emerald-400">
                    Delivery Contact (Customer Email / WhatsApp Number):
                  </div>
                  {editingOrder.delivery_contact ? (
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-emerald-200 break-all select-all">{editingOrder.delivery_contact}</span>
                      <button
                        type="button"
                        onClick={() => handleCopy(`modal-${editingOrder.id}-delivery`, editingOrder.delivery_contact!)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] flex items-center gap-1 shrink-0"
                      >
                        {copiedKey === `modal-${editingOrder.id}-delivery` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === `modal-${editingOrder.id}-delivery` ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">Not provided</span>
                  )}
                </div>
              )}
            </div>

            <form onSubmit={handleSaveStatus} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Set Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
                >
                  <option value="Pending">Pending</option>
                  <option value="In progress">In progress</option>
                  <option value="Completed">Completed</option>
                  <option value="Processing">Processing</option>
                  <option value="Partial">Partial</option>
                  <option value="Canceled">Canceled (Auto-Refund to User)</option>
                </select>
                {newStatus === 'Canceled' && (
                  <p className="text-[11px] text-rose-400 mt-1">
                    ⚠️ Setting status to Canceled will immediately refund Rs {editingOrder.charge.toFixed(2)} back to user's balance!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Start Count</label>
                  <input
                    type="number"
                    value={startCount}
                    onChange={(e) => setStartCount(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Remains</label>
                  <input
                    type="number"
                    value={remains}
                    onChange={(e) => setRemains(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {updating ? 'Saving...' : 'Apply Status Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
