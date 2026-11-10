import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Category, Service } from '../../types/index.ts';
import { CategoryIconBadge } from '../../components/common/CategoryIconBadge.tsx';
import { Search, Info, X, Zap, ChevronRight, Check } from 'lucide-react';

interface ServicesPageProps {
  onNavigate: (view: string) => void;
}

export const ServicesPage: React.FC<ServicesPageProps> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [currency, setCurrency] = useState<'PKR' | 'USD'>('PKR');
  const [activeModalService, setActiveModalService] = useState<Service | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Conversion rate 1 USD = 280 PKR
  const USD_RATE = 280.0;

  useEffect(() => {
    api.getServices()
      .then(res => {
        setCategories(res.categories);
        setServices(res.services);
      })
      .finally(() => setLoading(false));
  }, []);

  const filteredServices = services.filter(s => {
    const matchesCat = selectedCatId === 'all' || s.category_id === selectedCatId;
    const matchesSearch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase()) || String(s.id).includes(searchTerm);
    return matchesCat && matchesSearch;
  });

  const formatPrice = (ratePkr: number) => {
    if (currency === 'USD') {
      return `$${(ratePkr / USD_RATE).toFixed(3)}`;
    }
    return `Rs ${ratePkr.toFixed(2)}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
            Complete Price List
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Wholesale Services Catalog
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Live rates per 1,000 units. Instant auto-delivery with guaranteed drop refills on high-quality servers.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-2 p-1 bg-slate-900 border border-slate-800 rounded-lg self-start md:self-auto">
          <span className="text-[11px] font-medium text-slate-400 px-2">Currency:</span>
          <button
            onClick={() => setCurrency('PKR')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              currency === 'PKR' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            PKR (Rs)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
              currency === 'USD' ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* Search and Category Filter Pills */}
      <div className="space-y-4">
        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search service name or ID (e.g. Followers, TikTok views)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#0a0f1d] border border-slate-800 rounded-lg pl-10 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Category Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => setSelectedCatId('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCatId === 'all'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            All Services ({services.length})
          </button>
          {categories.map(c => {
            const count = services.filter(s => s.category_id === c.id).length;
            const isSelected = selectedCatId === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedCatId(c.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isSelected
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800'
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
      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090f20] shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3.5 px-4 w-16">ID</th>
              <th className="py-3.5 px-4">Service</th>
              <th className="py-3.5 px-4">Rate / 1000</th>
              <th className="py-3.5 px-4">Min / Max</th>
              <th className="py-3.5 px-4">Refill</th>
              <th className="py-3.5 px-4 text-center">Details</th>
              <th className="py-3.5 px-4 text-right">Order</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  Loading wholesale services catalog...
                </td>
              </tr>
            ) : filteredServices.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No services found matching your criteria.
                </td>
              </tr>
            ) : (
              filteredServices.map(s => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-400">#{s.id}</td>
                  <td className="py-3 px-4 font-medium text-white max-w-lg">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold">{s.name}</span>
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
                    {formatPrice(s.rate_per_1000)}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 tabular-nums whitespace-nowrap">
                    {s.min_quantity.toLocaleString()} / {s.max_quantity.toLocaleString()}
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
                      className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-sky-400 transition-colors"
                      title="View Service Description"
                    >
                      <Info className="w-4 h-4 mx-auto" />
                    </button>
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => onNavigate('new-order')}
                      className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px] transition-colors"
                    >
                      Order Now
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Service Detail Modal */}
      {activeModalService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setActiveModalService(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <span className="text-xs font-mono font-bold text-sky-400">Service #{activeModalService.id}</span>
              <h3 className="text-base font-bold text-white mt-1">
                {activeModalService.name}
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#080d1a] border border-slate-800 text-xs">
              <div>
                <span className="text-slate-500 block">Rate per 1000:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatPrice(activeModalService.rate_per_1000)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Min / Max Quantity:</span>
                <span className="font-mono text-white text-sm">
                  {activeModalService.min_quantity.toLocaleString()} - {activeModalService.max_quantity.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Refill Feature:</span>
                <span className="text-white">
                  {activeModalService.refill_supported ? '30 Days Auto-Refill' : 'No Refill'}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Avg. Speed:</span>
                <span className="text-white">10K - 50K / Day</span>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                Service Instructions & Guidelines
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed bg-[#080d1a] p-3 rounded-lg border border-slate-800 whitespace-pre-line">
                {activeModalService.description || 'Provide link in standard public format. Ensure account or post is set to public. Do not submit duplicate links while an active order is running.'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setActiveModalService(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setActiveModalService(null);
                  onNavigate('new-order');
                }}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md shadow-sky-600/30"
              >
                Proceed to Order
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
