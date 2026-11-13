import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Order, OrderSequenceInfo, User, Category, Service } from '../../types/index.ts';
import {
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Copy,
  Check,
  Plus,
  Hash
} from 'lucide-react';
import {
  isSimDetailsCategory,
  isSimDetailsCategoryName,
  validateSimDetailsInput,
  validateDeliveryContact
} from '../../lib/simDetails.ts';

export const AdminOrdersPage: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [sequenceInfo, setSequenceInfo] = useState<OrderSequenceInfo | null>(null);

  // Status edit modal
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('Completed');
  const [startCount, setStartCount] = useState<number>(0);
  const [remains, setRemains] = useState<number>(0);
  const [updating, setUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Admin Create Order modal
  const [createOpen, setCreateOpen] = useState(false);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>([]);
  const [createUserId, setCreateUserId] = useState<number>(0);
  const [createCatId, setCreateCatId] = useState<number>(0);
  const [createServiceId, setCreateServiceId] = useState<number>(0);
  const [createLink, setCreateLink] = useState('');
  const [createDelivery, setCreateDelivery] = useState('');
  const [createQuantity, setCreateQuantity] = useState<number>(100);
  const [createDeductBalance, setCreateDeductBalance] = useState<boolean>(false);
  const [createStatus, setCreateStatus] = useState<string>('Pending');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  const fetchOrders = () => {
    setLoading(true);
    Promise.all([
      api.admin.getOrders({ status: statusFilter, search: searchTerm }),
      api.admin.getOrderSequence().catch(() => null)
    ])
      .then(([ordersRes, seqRes]) => {
        setOrders(ordersRes.orders);
        if (seqRes) setSequenceInfo(seqRes);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const handleOpenCreateModal = async () => {
    setCreateError(null);
    setCreateOpen(true);
    try {
      const [uRes, sRes] = await Promise.all([
        api.admin.getUsers(),
        api.admin.getAdminServices()
      ]);
      setUsersList(uRes.users);
      setCategoriesList(sRes.categories);
      const activeServices = sRes.services.filter(s => s.status === 'active');
      setServicesList(activeServices);
      if (uRes.users.length > 0 && !createUserId) {
        setCreateUserId(uRes.users[0].id);
      }
      if (sRes.categories.length > 0) {
        const firstCat = sRes.categories[0];
        setCreateCatId(firstCat.id);
        const firstSvc = activeServices.find(s => s.category_id === firstCat.id) || activeServices[0];
        if (firstSvc) {
          setCreateServiceId(firstSvc.id);
          setCreateQuantity(isSimDetailsCategory(firstCat) ? 1 : firstSvc.min_quantity);
        }
      }
    } catch (err: any) {
      setCreateError(err.message || 'Failed to load users or services.');
    }
  };

  const selectedCreateCat = categoriesList.find(c => c.id === createCatId);
  const filteredCreateServices = servicesList.filter(s => s.category_id === createCatId);
  const selectedCreateService = servicesList.find(s => s.id === createServiceId) || filteredCreateServices[0];
  const createIsSimDetails = isSimDetailsCategory(selectedCreateCat) || isSimDetailsCategoryName(selectedCreateService?.category_name);

  const estimatedAdminCharge = selectedCreateService
    ? createIsSimDetails
      ? selectedCreateService.rate_per_1000
      : (createQuantity / 1000) * selectedCreateService.rate_per_1000
    : 0;

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createUserId || !selectedCreateService) {
      setCreateError('Please select both a client account and a service.');
      return;
    }

    if (createIsSimDetails) {
      const simVal = validateSimDetailsInput(createLink);
      if (!simVal.valid) {
        setCreateError(simVal.error || 'Enter a valid Pakistani Mobile Number or CNIC.');
        return;
      }
      const delVal = validateDeliveryContact(createDelivery);
      if (!delVal.valid) {
        setCreateError(delVal.error || 'Enter a valid Email or WhatsApp Number.');
        return;
      }
    } else if (!createLink.trim()) {
      setCreateError('Target link is required.');
      return;
    }

    setCreating(true);
    try {
      const res = await api.admin.createOrder({
        user_id: createUserId,
        service_id: selectedCreateService.id,
        link: createLink.trim(),
        quantity: createIsSimDetails ? 1 : createQuantity,
        delivery_contact: createIsSimDetails ? createDelivery.trim() : undefined,
        deduct_balance: createDeductBalance,
        status: createStatus
      });
      setFeedback(res.message);
      setCreateOpen(false);
      setCreateLink('');
      setCreateDelivery('');
      fetchOrders();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create admin order.');
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleOpenEdit = (order: Order) => {
    setEditingOrder(order);
    setEditError(null);
    setNewStatus(order.status);
    setStartCount(order.start_count || 0);
    setRemains(order.remains || 0);
  };

  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    setUpdating(true);
    setEditError(null);
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
      setEditError(err.message || 'Update failed');
    } finally {
      setUpdating(false);
    }
  };

  const statuses = ['all', 'Pending', 'In progress', 'Completed', 'Partial', 'Canceled'];

  return (
    <div className="space-y-6">

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              Order Fulfillment Queue
            </span>
            {sequenceInfo && (
              <button
                type="button"
                onClick={() => onNavigate('admin-settings')}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[11px] font-mono font-bold text-amber-300 hover:bg-amber-500/25 cursor-pointer"
                title="Configure Next Order ID in Settings"
              >
                <Hash className="w-3 h-3" />
                <span>Next Order ID: #{sequenceInfo.next_order_id}</span>
              </button>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">Manage System Orders</h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          <form onSubmit={handleSearch} className="flex gap-2 flex-1 sm:min-w-[260px]">
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
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              Search
            </button>
          </form>

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-amber-500/20 whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
        </div>
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
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors cursor-pointer ${
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
                <th className="py-3 px-4">Link / Target</th>
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
                        className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-sky-400 text-[11px] font-medium flex items-center gap-1 ml-auto cursor-pointer"
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

      {/* Admin Create Order Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setCreateOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-amber-400">
                Direct Order Creation {sequenceInfo ? `· Assigned ID #${sequenceInfo.next_order_id}` : ''}
              </span>
              <h3 className="text-base font-bold text-white mt-1">Create New Client Order</h3>
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateOrderSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Client *</label>
                <select
                  value={createUserId}
                  onChange={(e) => setCreateUserId(Number(e.target.value))}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {usersList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} ({u.email}) — Bal: Rs {u.balance.toFixed(2)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category *</label>
                  <select
                    value={createCatId}
                    onChange={(e) => {
                      const nextCatId = Number(e.target.value);
                      setCreateCatId(nextCatId);
                      const firstSvc = servicesList.find(s => s.category_id === nextCatId);
                      if (firstSvc) {
                        setCreateServiceId(firstSvc.id);
                        const catObj = categoriesList.find(c => c.id === nextCatId);
                        setCreateQuantity(isSimDetailsCategory(catObj) ? 1 : firstSvc.min_quantity);
                      }
                    }}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {categoriesList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Service *</label>
                  <select
                    value={selectedCreateService?.id || ''}
                    onChange={(e) => {
                      const svcId = Number(e.target.value);
                      setCreateServiceId(svcId);
                      const svc = servicesList.find(s => s.id === svcId);
                      if (svc) {
                        setCreateQuantity(createIsSimDetails ? 1 : svc.min_quantity);
                      }
                    }}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    {filteredCreateServices.map(s => (
                      <option key={s.id} value={s.id}>
                        #{s.id} — {s.name} (Rs {s.rate_per_1000})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  {createIsSimDetails ? 'Mobile Number / CNIC *' : 'Target Link / URL *'}
                </label>
                <input
                  type="text"
                  required
                  value={createLink}
                  onChange={(e) => setCreateLink(e.target.value)}
                  placeholder={createIsSimDetails ? 'Enter Mobile Number or CNIC' : 'https://...'}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              {createIsSimDetails && (
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Delivery Email / WhatsApp Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={createDelivery}
                    onChange={(e) => setCreateDelivery(e.target.value)}
                    placeholder="Enter Email or WhatsApp Number"
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Quantity</label>
                  <input
                    type="number"
                    min={createIsSimDetails ? 1 : (selectedCreateService?.min_quantity || 1)}
                    max={createIsSimDetails ? 1 : (selectedCreateService?.max_quantity || 1000000)}
                    readOnly={createIsSimDetails}
                    value={createIsSimDetails ? 1 : createQuantity}
                    onChange={(e) => setCreateQuantity(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Initial Status</label>
                  <select
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In progress">In progress</option>
                    <option value="Processing">Processing</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#070b16] border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createDeductBalance}
                    onChange={(e) => setCreateDeductBalance(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-amber-500"
                  />
                  <span>Deduct charge from client balance</span>
                </label>
                <span className="font-mono font-bold text-emerald-400">
                  Rs {estimatedAdminCharge.toFixed(2)}
                </span>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  {creating ? 'Creating...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Order Status Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
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

            {editError && (
              <div className="p-3 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

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
                    ⚠️ Setting status to Canceled will immediately refund Rs {editingOrder.charge.toFixed(2)} back to user&apos;s balance!
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
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer"
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
