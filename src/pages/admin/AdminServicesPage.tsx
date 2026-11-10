import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Category, Service, Provider } from '../../types/index.ts';
import { CategoryIconBadge } from '../../components/common/CategoryIconBadge.tsx';
import {
  ListOrdered,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  FolderTree,
  Filter,
  Layers,
  CheckSquare,
  Square,
  Power,
  PowerOff,
  FolderInput,
  ShieldAlert,
  X,
  RefreshCw,
  Server,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

interface AdminServicesPageProps {
  onNavigate: (view: string) => void;
}

export const AdminServicesPage: React.FC<AdminServicesPageProps> = ({ onNavigate }) => {
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<number | 'all'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Bulk Selection
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Bulk Change Category Modal
  const [bulkCatModalOpen, setBulkCatModalOpen] = useState(false);
  const [bulkTargetCatId, setBulkTargetCatId] = useState<number>(1);

  // Delete All Services Modal
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [deleteAllConfirmText, setDeleteAllConfirmText] = useState('');

  // Bulk Delete Confirmation Modal
  const [bulkDeleteModalOpen, setBulkDeleteModalOpen] = useState(false);

  // Notifications
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Service Edit / Create Modal
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formName, setFormName] = useState('');
  const [formCatId, setFormCatId] = useState<number>(1);
  const [formType, setFormType] = useState('Default');
  const [formRate, setFormRate] = useState<number | string>(250);
  const [formMin, setFormMin] = useState<number | string>(50);
  const [formMax, setFormMax] = useState<number | string>(50000);
  const [formDesc, setFormDesc] = useState('');
  const [formRefill, setFormRefill] = useState(true);
  const [formCancel, setFormCancel] = useState(false);
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formProvId, setFormProvId] = useState<string>('none');
  const [formProvServiceId, setFormProvServiceId] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSaving, setModalSaving] = useState(false);

  // Single Delete Confirmation Modal
  const [singleDeleteId, setSingleDeleteId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [servRes, provRes] = await Promise.all([
        api.admin.getAdminServices(),
        api.admin.getProviders()
      ]);
      setServices(servRes.services);
      setCategories(servRes.categories);
      setProviders(provRes.providers);

      if (servRes.categories.length > 0 && !formCatId) {
        setFormCatId(servRes.categories[0].id);
        setBulkTargetCatId(servRes.categories[0].id);
      }
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to load services data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open Add Service
  const handleOpenAddService = () => {
    setEditingService(null);
    setFormName('');
    if (categories.length > 0) setFormCatId(categories[0].id);
    setFormType('Default');
    setFormRate(250);
    setFormMin(50);
    setFormMax(50000);
    setFormDesc('');
    setFormRefill(true);
    setFormCancel(false);
    setFormStatus('active');
    setFormProvId('none');
    setFormProvServiceId('');
    setModalError(null);
    setServiceModalOpen(true);
  };

  // Open Edit Service (FIXED: loads all existing data accurately)
  const handleOpenEditService = (s: Service) => {
    setEditingService(s);
    setFormName(s.name);
    setFormCatId(s.category_id);
    setFormType(s.type || 'Default');
    setFormRate(s.rate_per_1000);
    setFormMin(s.min_quantity);
    setFormMax(s.max_quantity);
    setFormDesc(s.description || '');
    setFormRefill(Boolean(s.refill_supported));
    setFormCancel(Boolean(s.cancel_supported));
    setFormStatus(s.status === 'inactive' ? 'inactive' : 'active');
    setFormProvId(s.provider_id ? String(s.provider_id) : 'none');
    setFormProvServiceId(s.provider_service_id || '');
    setModalError(null);
    setServiceModalOpen(true);
  };

  // Save Service (Create or Update)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    // Frontend validation with descriptive feedback (never silently fails!)
    if (!formName.trim()) {
      setModalError('Service name is required.');
      return;
    }

    const rateNum = parseFloat(String(formRate));
    if (isNaN(rateNum) || rateNum <= 0) {
      setModalError('Rate per 1000 must be a valid positive number (e.g. 299).');
      return;
    }

    const minNum = parseInt(String(formMin), 10);
    if (isNaN(minNum) || minNum < 1) {
      setModalError('Minimum quantity must be at least 1.');
      return;
    }

    const maxNum = parseInt(String(formMax), 10);
    if (isNaN(maxNum) || maxNum < minNum) {
      setModalError('Maximum quantity must be greater than or equal to minimum quantity.');
      return;
    }

    setModalSaving(true);
    try {
      const payload = {
        category_id: formCatId,
        name: formName.trim(),
        type: formType,
        rate_per_1000: rateNum,
        min_quantity: minNum,
        max_quantity: maxNum,
        description: formDesc.trim(),
        refill_supported: formRefill ? 1 : 0,
        cancel_supported: formCancel ? 1 : 0,
        status: formStatus,
        provider_id: formProvId === 'none' ? null : Number(formProvId),
        provider_service_id: formProvServiceId.trim() || null
      };

      if (editingService) {
        await api.admin.updateService(editingService.id, payload);
        showNotification(`Service #${editingService.id} updated successfully.`);
      } else {
        await api.admin.createService(payload);
        showNotification('New service added to catalog.');
      }

      setServiceModalOpen(false);
      loadData();
    } catch (err: any) {
      // Keeps modal open on failure so the admin can fix the issue!
      setModalError(err.message || 'Failed to save service. Check server response.');
    } finally {
      setModalSaving(false);
    }
  };

  // Toggle single service status
  const handleToggleStatus = async (s: Service) => {
    const nextStatus = s.status === 'active' ? 'inactive' : 'active';
    try {
      await api.admin.updateService(s.id, { status: nextStatus });
      setServices(prev =>
        prev.map(item => (item.id === s.id ? { ...item, status: nextStatus } : item))
      );
      showNotification(`Service #${s.id} marked as ${nextStatus}.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to toggle status.', 'error');
    }
  };

  // Delete single service
  const confirmSingleDelete = async () => {
    if (!singleDeleteId) return;
    try {
      await api.admin.deleteService(singleDeleteId);
      showNotification(`Service #${singleDeleteId} deleted.`);
      setSingleDeleteId(null);
      setSelectedIds(prev => prev.filter(id => id !== singleDeleteId));
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete service.', 'error');
    }
  };

  // Filtered Services List
  const filteredServices = services.filter(s => {
    if (selectedCatFilter !== 'all' && s.category_id !== selectedCatFilter) {
      return false;
    }
    if (selectedStatusFilter !== 'all' && s.status !== selectedStatusFilter) {
      return false;
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = s.name.toLowerCase().includes(term);
      const matchId = String(s.id).includes(term);
      const matchCat = (s.category_name || '').toLowerCase().includes(term);
      const matchProv = (s.provider_name || '').toLowerCase().includes(term);
      if (!matchName && !matchId && !matchCat && !matchProv) return false;
    }
    return true;
  });

  // Pagination calculation
  const totalPages = Math.ceil(filteredServices.length / pageSize) || 1;
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedServices = filteredServices.slice(startIndex, startIndex + pageSize);

  // Bulk Selection Helpers
  const isAllCurrentPageSelected =
    paginatedServices.length > 0 &&
    paginatedServices.every(s => selectedIds.includes(s.id));

  const isAllServicesSelected =
    filteredServices.length > 0 &&
    filteredServices.every(s => selectedIds.includes(s.id));

  const toggleSelectAllPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = paginatedServices.map(s => s.id);
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      const pageIds = paginatedServices.map(s => s.id);
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectAllFiltered = () => {
    if (isAllServicesSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredServices.map(s => s.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(prev => prev.filter(i => i !== id));
    } else {
      setSelectedIds(prev => [...prev, id]);
    }
  };

  // Bulk Status Change
  const handleBulkStatus = async (status: 'active' | 'inactive') => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await api.admin.bulkUpdateServiceStatus(selectedIds, status);
      showNotification(res.message);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Bulk status update failed.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Category Reassign
  const handleBulkCategory = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await api.admin.bulkUpdateServiceCategory(selectedIds, bulkTargetCatId);
      showNotification(res.message);
      setBulkCatModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Bulk category reassignment failed.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk Delete
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkActionLoading(true);
    try {
      const res = await api.admin.bulkDeleteServices(selectedIds);
      showNotification(res.message);
      setSelectedIds([]);
      setBulkDeleteModalOpen(false);
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Bulk delete failed.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Delete ALL Services (Protected)
  const handleDeleteAllServices = async () => {
    if (deleteAllConfirmText !== 'DELETE ALL') {
      alert('Please type DELETE ALL to confirm.');
      return;
    }
    setBulkActionLoading(true);
    try {
      const res = await api.admin.deleteAllServices('DELETE ALL');
      showNotification(res.message);
      setSelectedIds([]);
      setDeleteAllModalOpen(false);
      setDeleteAllConfirmText('');
      loadData();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete all services.', 'error');
    } finally {
      setBulkActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider font-mono">
              Catalog Management
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-amber-400 font-semibold">{services.length} Services Total</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <ListOrdered className="w-6 h-6 text-sky-400" />
            Service Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure reseller services, wholesale rates, provider mappings, and perform bulk operations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('admin-categories')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <FolderTree className="w-3.5 h-3.5 text-amber-400" />
            <span>Manage Categories</span>
          </button>

          <button
            onClick={() => setDeleteAllModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Delete all services with safety confirmation"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Delete All Services</span>
          </button>

          <button
            onClick={handleOpenAddService}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-400 hover:to-sky-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-sky-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Service</span>
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white text-xs px-2">
            ✕
          </button>
        </div>
      )}

      {/* Search and Filters Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#090f20] space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ID, service name, category, or provider..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#070b16] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
          </div>

          {/* Category & Status Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Category:</span>
              <select
                value={selectedCatFilter}
                onChange={(e) => {
                  setSelectedCatFilter(e.target.value === 'all' ? 'all' : Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="all">All Categories ({services.length})</option>
                {categories.map(c => {
                  const count = services.filter(s => s.category_id === c.id).length;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.name} ({count})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span>Status:</span>
              <select
                value={selectedStatusFilter}
                onChange={(e) => {
                  setSelectedStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Bulk Actions Bar (Appears when items are selected) */}
        {selectedIds.length > 0 && (
          <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-sky-950/20 p-2.5 rounded-lg border-sky-800/40">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-sky-500 text-slate-950 font-bold text-xs font-mono">
                {selectedIds.length} Selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
              >
                Deselect All
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => handleBulkStatus('active')}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Power className="w-3.5 h-3.5" />
                <span>Bulk Enable</span>
              </button>

              <button
                onClick={() => handleBulkStatus('inactive')}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Bulk Disable</span>
              </button>

              <button
                onClick={() => setBulkCatModalOpen(true)}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-sky-950/60 hover:bg-sky-900 border border-sky-700 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <FolderInput className="w-3.5 h-3.5" />
                <span>Change Category...</span>
              </button>

              <button
                onClick={() => setBulkDeleteModalOpen(true)}
                disabled={bulkActionLoading}
                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedIds.length})</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Services Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    onChange={toggleSelectAllPage}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 cursor-pointer"
                    title="Select all on current page"
                  />
                </th>
                <th className="py-3 px-3 w-16">ID</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-3">Provider</th>
                <th className="py-3 px-3">Rate / 1k (PKR)</th>
                <th className="py-3 px-3">Min / Max</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                      <span>Loading service catalog...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-400">
                    No services found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedServices.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  const matchedCat = categories.find(c => c.id === s.category_id);

                  return (
                    <tr
                      key={s.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-sky-500/10' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(s.id)}
                          className="rounded bg-slate-900 border-slate-700 text-sky-500 cursor-pointer"
                        />
                      </td>

                      {/* ID */}
                      <td className="py-3 px-3 font-mono text-slate-400 font-semibold">
                        #{s.id}
                      </td>

                      {/* Category Badge */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <CategoryIconBadge category={matchedCat} size="sm" />
                          <span className="font-medium text-slate-300 whitespace-nowrap">
                            {s.category_name || matchedCat?.name || 'General'}
                          </span>
                        </div>
                      </td>

                      {/* Service Name & Description snippet */}
                      <td className="py-3 px-4 max-w-sm">
                        <div className="font-semibold text-white text-xs">{s.name}</div>
                        {s.description && (
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">
                            {s.description}
                          </div>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {s.refill_supported ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                              30D Refill
                            </span>
                          ) : null}
                          {s.cancel_supported ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800">
                              Cancelable
                            </span>
                          ) : null}
                          {s.type && s.type !== 'Default' ? (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-950 text-purple-400 border border-purple-800">
                              {s.type}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Provider */}
                      <td className="py-3 px-3">
                        {s.provider_name ? (
                          <div className="text-[11px] text-slate-300 flex items-center gap-1">
                            <Server className="w-3 h-3 text-purple-400 shrink-0" />
                            <span className="truncate max-w-[120px]">{s.provider_name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic">Manual / Local</span>
                        )}
                      </td>

                      {/* Rate */}
                      <td className="py-3 px-3 font-mono font-bold text-emerald-400">
                        Rs {s.rate_per_1000.toFixed(2)}
                      </td>

                      {/* Min / Max */}
                      <td className="py-3 px-3 font-mono text-slate-300 text-[11px]">
                        {s.min_quantity.toLocaleString()} - {s.max_quantity.toLocaleString()}
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(s)}
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                            s.status === 'active'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {s.status}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEditService(s)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-sky-400 transition-colors cursor-pointer border border-slate-700"
                          title="Edit service"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setSingleDeleteId(s.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer border border-slate-700"
                          title="Delete service"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span>
              Showing {filteredServices.length === 0 ? 0 : startIndex + 1} to{' '}
              {Math.min(startIndex + pageSize, filteredServices.length)} of {filteredServices.length} services
            </span>

            <div className="flex items-center gap-1.5">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-[#070b16] border border-slate-700 rounded px-2 py-1 text-white text-xs"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validPage <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-slate-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-white">
              Page {validPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validPage >= totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer border border-slate-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Edit / Add Service Modal (COMPREHENSIVELY FIXED & TESTED) */}
      {serviceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0b1220] border border-slate-700/80 rounded-2xl p-6 max-w-xl w-full space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setServiceModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <ListOrdered className="w-5 h-5 text-sky-400" />
              <h3 className="text-base font-bold text-white">
                {editingService ? `Edit Service #${editingService.id}` : 'Create New Service'}
              </h3>
            </div>

            {/* Inline Error Notice (Modal stays open on error) */}
            {modalError && (
              <div className="p-3.5 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-medium">{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveService} className="space-y-4 text-xs">
              {/* Category Selection */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category *</label>
                <select
                  value={formCatId}
                  onChange={(e) => setFormCatId(Number(e.target.value))}
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.status === 'inactive' ? '(Inactive)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Service Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Service Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Instagram Followers [Real HQ - 30 Days Refill]"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 font-medium"
                />
              </div>

              {/* Rate, Min, Max in 3-col grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Rate / 1k (PKR) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    min="0.01"
                    value={formRate}
                    onChange={(e) => setFormRate(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-mono font-bold focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Min Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formMin}
                    onChange={(e) => setFormMin(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Max Quantity *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formMax}
                    onChange={(e) => setFormMax(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              {/* Status & Service Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="active">Active (Visible to users)</option>
                    <option value="inactive">Inactive (Hidden)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Service Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="Default">Default</option>
                    <option value="Custom Comments">Custom Comments</option>
                    <option value="Package">Package</option>
                    <option value="Subscriptions">Subscriptions</option>
                  </select>
                </div>
              </div>

              {/* Provider Mapping (Optional) */}
              <div className="p-3.5 rounded-xl bg-black/40 border border-slate-700/60 space-y-3">
                <div className="text-slate-300 font-medium flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-purple-400" />
                  <span>SMM API Provider Automation (Optional)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Provider Gateway</label>
                    <select
                      value={formProvId}
                      onChange={(e) => setFormProvId(e.target.value)}
                      className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-sky-400"
                    >
                      <option value="none">Manual Delivery (No Provider)</option>
                      {providers.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 text-[11px]">Provider Service ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 1042"
                      value={formProvServiceId}
                      onChange={(e) => setFormProvServiceId(e.target.value)}
                      className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </div>

              {/* Feature Checkboxes */}
              <div className="flex flex-wrap items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formRefill}
                    onChange={(e) => setFormRefill(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 cursor-pointer"
                  />
                  <span>30-Day Guaranteed Refill</span>
                </label>

                <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formCancel}
                    onChange={(e) => setFormCancel(e.target.checked)}
                    className="rounded bg-slate-900 border-slate-700 text-sky-500 cursor-pointer"
                  />
                  <span>Allow User Order Cancellation</span>
                </label>
              </div>

              {/* Instructions / Description */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Service Instructions & Guidelines
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Instructions displayed to users on the new order form (e.g. account must be public, link format)..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setServiceModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSaving}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow-lg shadow-sky-600/20 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {modalSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingService ? 'Save Service Changes' : 'Create Service'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Change Category Modal */}
      {bulkCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0b1220] border border-slate-700 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FolderInput className="w-4 h-4 text-sky-400" />
              Reassign {selectedIds.length} Services
            </h3>

            <p className="text-xs text-slate-300">
              Select the new target category for all {selectedIds.length} selected services:
            </p>

            <div>
              <label className="block text-slate-400 text-xs mb-1">Target Category</label>
              <select
                value={bulkTargetCatId}
                onChange={(e) => setBulkTargetCatId(Number(e.target.value))}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white text-xs"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkCatModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkCategory}
                disabled={bulkActionLoading}
                className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs"
              >
                Move Services
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0b1220] border border-rose-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-white text-base">Confirm Bulk Deletion</h3>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete{' '}
              <strong className="text-rose-400 font-bold">{selectedIds.length}</strong> selected services?
            </p>

            <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400">
              🛡️ <strong>Safety Guarantee:</strong> Historical order records, customer balances, and transaction logs will be 100% preserved.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBulkDeleteModalOpen(false)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                disabled={bulkActionLoading}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete ALL Services Modal (Strict Protection) */}
      {deleteAllModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#0b1220] border-2 border-rose-600 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-rose-500 font-bold">
              <ShieldAlert className="w-6 h-6 shrink-0" />
              <h3 className="text-white text-base">Delete All Services ({services.length})</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                This action will delete all <strong className="text-rose-400 font-mono">{services.length}</strong> service records from the active catalog.
              </p>
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-[11px] space-y-1">
                <div className="font-bold">✓ Data Protection Notice:</div>
                <p>
                  Existing customer accounts, account balances, historical orders, payment transactions, and categories will <strong>NEVER</strong> be deleted.
                </p>
              </div>
              <p className="text-slate-400">
                To confirm this operation, type <strong className="text-white font-mono">DELETE ALL</strong> below:
              </p>
            </div>

            <div>
              <input
                type="text"
                placeholder="Type DELETE ALL to confirm"
                value={deleteAllConfirmText}
                onChange={(e) => setDeleteAllConfirmText(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/60 border border-rose-600 text-white font-mono text-xs focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteAllModalOpen(false);
                  setDeleteAllConfirmText('');
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAllServices}
                disabled={deleteAllConfirmText !== 'DELETE ALL' || bulkActionLoading}
                className="px-4 py-2 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-rose-600/30"
              >
                {bulkActionLoading ? 'Deleting...' : 'Delete All Services'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Delete Modal */}
      {singleDeleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0b1220] border border-rose-800 rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2 text-rose-400">
              <Trash2 className="w-4 h-4" />
              Delete Service #{singleDeleteId}
            </h3>
            <p className="text-xs text-slate-300">
              Are you sure you want to permanently delete service #{singleDeleteId}? Historical orders will remain preserved.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSingleDeleteId(null)}
                className="px-3.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmSingleDelete}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
