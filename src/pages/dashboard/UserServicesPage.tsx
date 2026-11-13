import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Category, Service } from '../../types/index.ts';
import { CategoryIconBadge } from '../../components/common/CategoryIconBadge.tsx';
import { isSimDetailsCategoryName } from '../../lib/simDetails.ts';
import { Star, Search, Info, X } from 'lucide-react';

interface UserServicesPageProps {
  onNavigate: (view: string) => void;
}

export const UserServicesPage: React.FC<UserServicesPageProps> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [favorites, setFavorites] = useState<number[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | 'all' | 'favorites'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeModalService, setActiveModalService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getServices(),
      api.getFavorites()
    ]).then(([servRes, favRes]) => {
      setCategories(servRes.categories);
      setServices(servRes.services);
      setFavorites(favRes.favorites);
    }).finally(() => setLoading(false));
  }, []);

  const handleToggleFavorite = async (serviceId: number) => {
    try {
      const res = await api.toggleFavorite(serviceId);
      if (res.favorited) {
        setFavorites([...favorites, serviceId]);
      } else {
        setFavorites(favorites.filter(id => id !== serviceId));
      }
    } catch {
      // quiet
    }
  };

  const filteredServices = services.filter(s => {
    if (selectedCatId === 'favorites') {
      if (!favorites.includes(s.id)) return false;
    } else if (selectedCatId !== 'all') {
      if (s.category_id !== selectedCatId) return false;
    }

    if (searchTerm) {
      const match = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(s.id).includes(searchTerm);
      if (!match) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
            Reseller Catalog
          </div>
          <h1 className="text-2xl font-bold text-white">Wholesale Services & Pricing</h1>
        </div>

        <button
          onClick={() => onNavigate('new-order')}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs self-start sm:self-auto"
        >
          + Place Order
        </button>
      </div>

      {/* Filters and search */}
      <div className="space-y-4">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID or name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#090f20] border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCatId === 'all'
                ? 'bg-sky-600 text-white'
                : 'bg-[#090f20] border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Services ({services.length})
          </button>

          <button
            onClick={() => setSelectedCatId('favorites')}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCatId === 'favorites'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-[#090f20] border border-slate-800 text-amber-400 hover:text-amber-300'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Favorites ({favorites.length})</span>
          </button>

          {categories.map(c => {
            const count = services.filter(s => s.category_id === c.id).length;
            const isSelected = selectedCatId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCatId(c.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-sky-600 text-white'
                    : 'bg-[#090f20] border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <CategoryIconBadge
                  categoryName={c.name}
                  imageUrl={c.image_url}
                  icon={c.icon}
                  size="xs"
                />
                <span>{c.name}</span>
                <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Services Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-3 w-10 text-center">Fav</th>
                <th className="py-3 px-3 w-16">ID</th>
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Rate / 1k</th>
                <th className="py-3 px-4">Min / Max</th>
                <th className="py-3 px-4">Refill</th>
                <th className="py-3 px-4 text-center">Details</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading services catalog...
                  </td>
                </tr>
              ) : filteredServices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No services found.
                  </td>
                </tr>
              ) : (
                filteredServices.map(s => {
                  const isFav = favorites.includes(s.id);
                  const isSimDetails = isSimDetailsCategoryName(s.category_name);
                  return (
                    <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleFavorite(s.id)}
                          className={`p-1 rounded hover:bg-slate-800 ${isFav ? 'text-amber-400' : 'text-slate-600 hover:text-slate-400'}`}
                        >
                          <Star className={`w-3.5 h-3.5 ${isFav ? 'fill-current' : ''}`} />
                        </button>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-400">#{s.id}</td>
                      <td className="py-3 px-4 font-medium text-white max-w-lg">
                        <div className="flex flex-col gap-0.5">
                          <span>{s.name}</span>
                          <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <CategoryIconBadge
                              categoryName={s.category_name}
                              imageUrl={categories.find(c => c.id === s.category_id)?.image_url}
                              size="xs"
                            />
                            <span>{s.category_name}</span>
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums whitespace-nowrap">
                        <div>Rs {s.rate_per_1000.toFixed(2)}</div>
                        {isSimDetails && (
                          <span className="block text-[10px] font-sans font-semibold text-sky-400">
                            per Number
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                        {isSimDetails ? '1 Order' : `${s.min_quantity.toLocaleString()} / ${s.max_quantity.toLocaleString()}`}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {s.refill_supported ? (
                          <span className="text-[11px] font-medium text-emerald-400">30D Refill</span>
                        ) : (
                          <span className="text-[11px] text-slate-500">No Refill</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setActiveModalService(s)}
                          className="p-1 rounded text-slate-400 hover:text-sky-400"
                        >
                          <Info className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => onNavigate('new-order')}
                          className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px]"
                        >
                          Order
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

      {/* Detail Modal */}
      {activeModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setActiveModalService(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-sky-400">Service #{activeModalService.id}</span>
              <h3 className="text-base font-bold text-white mt-1">
                {activeModalService.name}
              </h3>
            </div>

            <div className="p-3.5 rounded-lg bg-[#080d1a] border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {isSimDetailsCategoryName(activeModalService.category_name) ? 'Price per Number:' : 'Rate:'}
                </span>
                <span className="font-mono font-bold text-emerald-400">
                  Rs {activeModalService.rate_per_1000.toFixed(2)}{' '}
                  {isSimDetailsCategoryName(activeModalService.category_name) ? 'per Number' : 'per 1,000'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">
                  {isSimDetailsCategoryName(activeModalService.category_name) ? 'Quantity:' : 'Min / Max:'}
                </span>
                <span className="font-mono text-white">
                  {isSimDetailsCategoryName(activeModalService.category_name)
                    ? '1 Order (Per Number)'
                    : `${activeModalService.min_quantity.toLocaleString()} - ${activeModalService.max_quantity.toLocaleString()}`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Refill Guarantee:</span>
                <span className="text-emerald-400">{activeModalService.refill_supported ? '30 Days Auto-Refill' : 'No Refill'}</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">Description</h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#080d1a] p-3 rounded-lg border border-slate-800">
                {activeModalService.description || 'Public link required. Fast delivery.'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModalService(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveModalService(null);
                  onNavigate('new-order');
                }}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white"
              >
                Order This
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
