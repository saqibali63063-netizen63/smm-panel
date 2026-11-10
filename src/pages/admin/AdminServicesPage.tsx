import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Category, Service } from '../../types/index.ts';
import {
  ListOrdered,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Layers,
  Check,
  AlertCircle
} from 'lucide-react';

export const AdminServicesPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Service Modal (Create or Edit)
  const [serviceModal, setServiceModal] = useState<boolean>(false);
  const [editingServiceId, setEditingServiceId] = useState<number | null>(null);
  const [servCatId, setServCatId] = useState<number>(1);
  const [servName, setServName] = useState('');
  const [servRate, setServRate] = useState<number>(250);
  const [servMin, setServMin] = useState<number>(50);
  const [servMax, setServMax] = useState<number>(50000);
  const [servDesc, setServDesc] = useState('');
  const [servRefill, setServRefill] = useState<boolean>(true);
  const [servCancel, setServCancel] = useState<boolean>(false);

  // Category Modal
  const [categoryModal, setCategoryModal] = useState(false);
  const [catName, setCatName] = useState('');
  const [catSortOrder, setCatSortOrder] = useState<number>(10);

  const fetchCatalog = () => {
    setLoading(true);
    api.getServices().then(res => {
      setCategories(res.categories);
      setServices(res.services);
      if (res.categories.length > 0 && !servCatId) {
        setServCatId(res.categories[0].id);
      }
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCatalog();
  }, []);

  const handleOpenAddService = () => {
    setEditingServiceId(null);
    setServName('');
    setServRate(250);
    setServMin(50);
    setServMax(50000);
    setServDesc('');
    setServRefill(true);
    setServCancel(false);
    if (categories.length > 0) setServCatId(categories[0].id);
    setServiceModal(true);
  };

  const handleOpenEditService = (s: Service) => {
    setEditingServiceId(s.id);
    setServCatId(s.category_id);
    setServName(s.name);
    setServRate(s.rate_per_1000);
    setServMin(s.min_quantity);
    setServMax(s.max_quantity);
    setServDesc(s.description || '');
    setServRefill(Boolean(s.refill_supported));
    setServCancel(Boolean(s.cancel_supported));
    setServiceModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servName.trim() || servRate <= 0) return;

    try {
      if (editingServiceId) {
        await api.admin.updateService(editingServiceId, {
          category_id: servCatId,
          name: servName.trim(),
          rate_per_1000: servRate,
          min_quantity: servMin,
          max_quantity: servMax,
          description: servDesc.trim(),
          refill_supported: servRefill ? 1 : 0,
          cancel_supported: servCancel ? 1 : 0
        });
        setFeedback('Service updated successfully.');
      } else {
        await api.admin.createService({
          category_id: servCatId,
          name: servName.trim(),
          rate_per_1000: servRate,
          min_quantity: servMin,
          max_quantity: servMax,
          description: servDesc.trim(),
          refill_supported: servRefill ? 1 : 0,
          cancel_supported: servCancel ? 1 : 0
        });
        setFeedback('New service created.');
      }

      setServiceModal(false);
      fetchCatalog();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save service');
    }
  };

  const handleDeleteService = async (id: number) => {
    if (!confirm(`Are you sure you want to permanently delete service #${id}?`)) return;
    try {
      await api.admin.deleteService(id);
      setFeedback(`Service #${id} deleted.`);
      fetchCatalog();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to delete service');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    try {
      await api.admin.createCategory({
        name: catName.trim(),
        icon: 'Globe',
        sort_order: catSortOrder
      });
      setCategoryModal(false);
      setCatName('');
      setFeedback('Category created.');
      fetchCatalog();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const filteredServices = selectedCatId === 'all'
    ? services
    : services.filter(s => s.category_id === selectedCatId);

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono">
            Catalog Management
          </div>
          <h1 className="text-2xl font-bold text-white">Services & Categories</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCategoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
          <button
            onClick={handleOpenAddService}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-md shadow-sky-600/30"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Service</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Category selector pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCatId('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedCatId === 'all'
              ? 'bg-amber-500 text-slate-950 font-bold'
              : 'bg-[#090f20] border border-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          All ({services.length})
        </button>
        {categories.map(c => {
          const count = services.filter(s => s.category_id === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedCatId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCatId === c.id
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-[#090f20] border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {c.name} ({count})
            </button>
          );
        })}
      </div>

      {/* Services Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Rate / 1k (PKR)</th>
                <th className="py-3 px-4">Min / Max</th>
                <th className="py-3 px-4">Refill</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading services...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No services in this category.
                  </td>
                </tr>
              ) : (
                filteredServices.map(s => (
                  <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{s.id}</td>
                    <td className="py-3 px-4 font-semibold text-slate-300">{s.category_name}</td>
                    <td className="py-3 px-4 font-medium text-white max-w-md truncate">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                      Rs {s.rate_per_1000.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 tabular-nums">
                      {s.min_quantity.toLocaleString()} / {s.max_quantity.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      {s.refill_supported ? (
                        <span className="text-[11px] font-semibold text-emerald-400">30D Refill</span>
                      ) : (
                        <span className="text-[11px] text-slate-500">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEditService(s)}
                          className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-slate-800"
                          title="Edit Service"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteService(s.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800"
                          title="Delete Service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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

      {/* Service Add/Edit Modal */}
      {serviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setServiceModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white">
              {editingServiceId ? `Edit Service #${editingServiceId}` : 'Create New Wholesale Service'}
            </h3>

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category *</label>
                <select
                  value={servCatId}
                  onChange={(e) => setServCatId(Number(e.target.value))}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={servName}
                  onChange={(e) => setServName(e.target.value)}
                  placeholder="e.g. Instagram Followers [HQ Non-Drop]"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rate / 1k (PKR) *</label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    value={servRate}
                    onChange={(e) => setServRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Min Qty *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={servMin}
                    onChange={(e) => setServMin(parseInt(e.target.value, 10) || 1)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Qty *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={servMax}
                    onChange={(e) => setServMax(parseInt(e.target.value, 10) || 1000)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={servRefill}
                    onChange={(e) => setServRefill(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500"
                  />
                  <span>30-Day Refill Guaranteed</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={servCancel}
                    onChange={(e) => setServCancel(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500"
                  />
                  <span>Support User Cancellation</span>
                </label>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Service Guidelines & Instructions</label>
                <textarea
                  rows={3}
                  value={servDesc}
                  onChange={(e) => setServDesc(e.target.value)}
                  placeholder="Instructions displayed to users on the new order form..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setServiceModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md shadow-sky-600/30"
                >
                  Save Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {categoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setCategoryModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white">Create New Category</h3>

            <form onSubmit={handleAddCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  placeholder="e.g. LinkedIn or Threads"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Display Sort Order</label>
                <input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCategoryModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
