import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Category } from '../../types/index.ts';
import { CategoryIconBadge } from '../../components/common/CategoryIconBadge.tsx';
import {
  FolderTree,
  Plus,
  Search,
  GripVertical,
  Edit2,
  Trash2,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Layers,
  Sparkles,
  Eye,
  X,
  ListOrdered,
  Save,
  Check,
  RefreshCw,
  Info
} from 'lucide-react';

interface AdminCategoriesPageProps {
  onNavigate: (view: string) => void;
}

export const AdminCategoriesPage: React.FC<AdminCategoriesPageProps> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  // Category Modal (Add or Edit)
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIcon, setFormIcon] = useState('Globe');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formImageUrl, setFormImageUrl] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Delete Category Confirmation Modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);
  const [forceDelete, setForceDelete] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.admin.getCategories();
      setCategories(res.categories);
    } catch (err: any) {
      setFeedback({ text: err.message || 'Failed to load categories.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const showNotification = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingCategory(null);
    setFormName('');
    setFormDescription('');
    setFormIcon('Globe');
    setFormStatus('active');
    setFormImageUrl(null);
    setUploadPreview(null);
    setModalError(null);
    setModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (cat: Category) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormDescription(cat.description || '');
    setFormIcon(cat.icon || 'Globe');
    setFormStatus(cat.status === 'inactive' ? 'inactive' : 'active');
    setFormImageUrl(cat.image_url || null);
    setUploadPreview(cat.image_url || null);
    setModalError(null);
    setModalOpen(true);
  };

  // Handle Image File selection & upload
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];

    // File validation: max 5MB, images only
    if (!file.type.startsWith('image/')) {
      setModalError('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      setUploadPreview(base64Data);
      setIsUploading(true);
      try {
        const uploadRes = await api.admin.uploadCategoryIcon(base64Data, file.name);
        setFormImageUrl(uploadRes.url);
        setModalError(null);
      } catch (err: any) {
        setModalError('Failed to upload image: ' + err.message);
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setFormImageUrl(null);
    setUploadPreview(null);
  };

  // Save Category (Add or Update)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setModalError('Category name is required.');
      return;
    }

    try {
      if (editingCategory) {
        await api.admin.updateCategory(editingCategory.id, {
          name: formName.trim(),
          description: formDescription.trim(),
          icon: formIcon,
          image_url: formImageUrl,
          status: formStatus
        });
        showNotification(`Category "${formName.trim()}" updated successfully.`);
      } else {
        await api.admin.createCategory({
          name: formName.trim(),
          description: formDescription.trim(),
          icon: formIcon,
          image_url: formImageUrl,
          status: formStatus
        });
        showNotification(`New category "${formName.trim()}" created successfully.`);
      }

      setModalOpen(false);
      fetchCategories();
    } catch (err: any) {
      setModalError(err.message || 'Failed to save category.');
    }
  };

  // Toggle status
  const handleToggleStatus = async (cat: Category) => {
    const nextStatus = cat.status === 'active' ? 'inactive' : 'active';
    try {
      await api.admin.updateCategory(cat.id, { status: nextStatus });
      setCategories(prev =>
        prev.map(c => (c.id === cat.id ? { ...c, status: nextStatus } : c))
      );
      showNotification(`Category "${cat.name}" is now ${nextStatus}.`);
    } catch (err: any) {
      showNotification(err.message || 'Failed to update category status.', 'error');
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...categories];
    const [movedItem] = reordered.splice(draggedIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    // Update state immediately for instant feedback
    setCategories(reordered);
    setDraggedIndex(null);
    setDragOverIndex(null);

    // Save to database
    saveReorderedList(reordered);
  };

  // Mobile accessible Up / Down sorting
  const handleMoveItem = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const reordered = [...categories];
    const [movedItem] = reordered.splice(index, 1);
    reordered.splice(targetIndex, 0, movedItem);

    setCategories(reordered);
    saveReorderedList(reordered);
  };

  const saveReorderedList = async (list: Category[]) => {
    setIsSavingOrder(true);
    try {
      const orderPayload = list.map((cat, idx) => ({
        id: cat.id,
        sort_order: idx + 1
      }));
      await api.admin.reorderCategories(orderPayload);
      showNotification('Category ordering saved permanently in database.');
    } catch (err: any) {
      showNotification(err.message || 'Failed to save category ordering.', 'error');
      fetchCategories();
    } finally {
      setIsSavingOrder(false);
    }
  };

  // Delete Category
  const confirmDeleteCategory = async () => {
    if (!deletingCat) return;
    try {
      await api.admin.deleteCategory(deletingCat.id, forceDelete);
      showNotification(`Category "${deletingCat.name}" deleted.`);
      setDeleteModalOpen(false);
      setDeletingCat(null);
      setForceDelete(false);
      fetchCategories();
    } catch (err: any) {
      showNotification(err.message || 'Failed to delete category.', 'error');
    }
  };

  const filteredCategories = categories.filter(c => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(term) ||
      (c.description || '').toLowerCase().includes(term) ||
      String(c.id).includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
              Admin Governance
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-xs text-sky-400 font-semibold">Live Ordering</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <FolderTree className="w-6 h-6 text-amber-400" />
            Category Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Upload custom category logos, configure descriptions, enable/disable platforms, and drag to reorder.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => onNavigate('admin-services')}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-2 cursor-pointer"
          >
            <ListOrdered className="w-3.5 h-3.5 text-sky-400" />
            <span>Manage Services</span>
          </button>
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Category</span>
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

      {/* Search and Helper Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-800 bg-[#090f20]">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search categories by name, ID, or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070b16] border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <GripVertical className="w-4 h-4 text-amber-400" />
          <span>Drag the handles to rearrange order, or use Up/Down buttons</span>
          {isSavingOrder && (
            <span className="inline-flex items-center gap-1 text-amber-300 font-mono text-[11px] animate-pulse">
              <RefreshCw className="w-3 h-3 animate-spin" />
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Categories Reorderable Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-12 text-center">Order</th>
                <th className="py-3 px-3">Icon / Logo</th>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-3 text-center">Services</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Loading categories...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No categories found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCategories.map((cat, index) => {
                  const isDragged = draggedIndex === index;
                  const isDragOver = dragOverIndex === index;

                  return (
                    <tr
                      key={cat.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDrop={(e) => handleDrop(e, index)}
                      className={`transition-all duration-150 ${
                        isDragged ? 'opacity-40 bg-amber-500/10' : ''
                      } ${
                        isDragOver ? 'border-t-2 border-amber-400 bg-amber-500/5' : ''
                      } hover:bg-slate-800/40`}
                    >
                      {/* Drag Handle & Mobile Up/Down */}
                      <td className="py-3 px-2 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            className="p-1 text-slate-500 hover:text-amber-400 cursor-grab active:cursor-grabbing"
                            title="Drag to reorder"
                          >
                            <GripVertical className="w-4 h-4" />
                          </button>
                          <div className="flex flex-col">
                            <button
                              type="button"
                              disabled={index === 0}
                              onClick={() => handleMoveItem(index, 'up')}
                              className="p-0.5 text-slate-500 hover:text-amber-400 disabled:opacity-20 cursor-pointer"
                              title="Move up"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              disabled={index === filteredCategories.length - 1}
                              onClick={() => handleMoveItem(index, 'down')}
                              className="p-0.5 text-slate-500 hover:text-amber-400 disabled:opacity-20 cursor-pointer"
                              title="Move down"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Icon / Image Preview */}
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <CategoryIconBadge category={cat} size="lg" />
                          {cat.image_url && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-sky-950 text-sky-400 border border-sky-800">
                              Custom Logo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Category Name & ID */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-white text-sm">{cat.name}</span>
                          <span className="text-[10px] font-mono text-slate-500">#{cat.id}</span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3 px-4 max-w-xs truncate text-slate-400 text-[11px]">
                        {cat.description || (
                          <span className="text-slate-600 italic">No description</span>
                        )}
                      </td>

                      {/* Service Count */}
                      <td className="py-3 px-3 text-center font-mono">
                        <span className="px-2 py-0.5 rounded-full bg-slate-800 text-sky-300 font-semibold border border-slate-700">
                          {cat.service_count || 0}
                        </span>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(cat)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer border ${
                            cat.status === 'active'
                              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                              : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {cat.status}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(cat)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-amber-400 transition-colors cursor-pointer border border-slate-700"
                          title="Edit category"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setDeletingCat(cat);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer border border-slate-700"
                          title="Delete category"
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
      </div>

      {/* Add / Edit Category Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0b1220] border border-slate-700/80 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <FolderTree className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create New Category'}
              </h3>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-950/70 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveCategory} className="space-y-4 text-xs">
              {/* Category Name */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. TikTok, Instagram, Threads, YouTube..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Category Description */}
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description & Guidelines (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Brief description displayed on the services page..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Category Image / Logo Upload Section */}
              <div className="p-4 rounded-xl bg-black/40 border border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-slate-300 font-medium flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-sky-400" />
                    Category Image / Logo
                  </label>
                  {uploadPreview && (
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-rose-400 hover:text-rose-300 text-[11px] font-medium"
                    >
                      Remove Logo
                    </button>
                  )}
                </div>

                {/* Upload or Preview */}
                <div className="flex items-center gap-4">
                  <div className="shrink-0">
                    <CategoryIconBadge
                      category={{
                        name: formName || 'Preview',
                        icon: formIcon,
                        image_url: uploadPreview || formImageUrl
                      }}
                      size="xl"
                    />
                  </div>

                  <div className="flex-1 space-y-1.5">
                    <input
                      type="file"
                      id="category-logo-upload"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                    <label
                      htmlFor="category-logo-upload"
                      className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-xs font-semibold cursor-pointer transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5 text-amber-400" />
                      <span>{uploadPreview ? 'Replace Image' : 'Upload Icon / Image'}</span>
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Recommended: 128x128px PNG, SVG, or WebP. Saved in persistent storage.
                    </p>
                  </div>
                </div>

                {isUploading && (
                  <div className="text-[11px] text-amber-300 flex items-center gap-1.5 animate-pulse">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Uploading and saving logo to server...</span>
                  </div>
                )}
              </div>

              {/* Status and Built-in Icon fallback */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as any)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="active">Active (Visible to Users)</option>
                    <option value="inactive">Inactive (Disabled)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Fallback Icon Glyph</label>
                  <select
                    value={formIcon}
                    onChange={(e) => setFormIcon(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Globe">Globe (Website / Generic)</option>
                    <option value="Video">Video (TikTok / Reels)</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Youtube">YouTube</option>
                    <option value="Facebook">Facebook</option>
                    <option value="Send">Telegram (Send)</option>
                    <option value="Twitter">Twitter / X</option>
                    <option value="Music">Spotify (Music)</option>
                    <option value="Layers">Layers</option>
                    <option value="Sparkles">Sparkles</option>
                  </select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition-all shadow-lg shadow-amber-500/20 cursor-pointer disabled:opacity-50"
                >
                  {editingCategory ? 'Save Changes' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalOpen && deletingCat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#0b1220] border border-rose-800/80 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">Delete Category Confirmation</h3>
            </div>

            <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
              <p>
                Are you sure you want to permanently delete category:{' '}
                <strong className="text-white font-semibold">{deletingCat.name}</strong>?
              </p>

              {(deletingCat.service_count || 0) > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[11px] space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                    Notice: Category contains {deletingCat.service_count} active services!
                  </div>
                  <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceDelete}
                      onChange={(e) => setForceDelete(e.target.checked)}
                      className="rounded bg-slate-900 border-slate-700 text-amber-500"
                    />
                    <span>Reassign existing services to another category and delete</span>
                  </label>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletingCat(null);
                  setForceDelete(false);
                }}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold transition-colors cursor-pointer text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shadow-lg shadow-rose-600/20 cursor-pointer text-xs"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
