import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { api } from '../../lib/api.ts';
import type { Category, Service } from '../../types/index.ts';
import { CategoryIconBadge } from '../../components/common/CategoryIconBadge.tsx';
import {
  PlusCircle,
  Zap,
  CheckCircle2,
  AlertCircle,
  Info,
  ExternalLink,
  Wallet,
  Clock,
  ShieldCheck,
  Flame,
  ArrowRight
} from 'lucide-react';

interface NewOrderPageProps {
  onNavigate: (view: string) => void;
}

export const NewOrderPage: React.FC<NewOrderPageProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  
  const [selectedCatId, setSelectedCatId] = useState<number>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(1);
  const [link, setLink] = useState('');
  const [quantity, setQuantity] = useState<number>(1000);
  
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string; orderId?: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmModal, setConfirmModal] = useState(false);

  useEffect(() => {
    refreshUser();
    api.getServices().then(res => {
      setCategories(res.categories);
      setServices(res.services);
      if (res.categories.length > 0) setSelectedCatId(res.categories[0].id);
      if (res.services.length > 0) setSelectedServiceId(res.services[0].id);
    });
  }, []);

  const categoryServices = services.filter(s => s.category_id === selectedCatId);
  const currentService = services.find(s => s.id === selectedServiceId) || categoryServices[0] || services[0];
  const currentCategory = categories.find(c => c.id === selectedCatId);

  const getLinkPlaceholder = () => {
    const catName = (currentCategory?.name || '').toLowerCase();
    const serviceName = (currentService?.name || '').toLowerCase();

    if (catName.includes('tiktok')) {
      if (serviceName.includes('follower')) {
        return 'https://tiktok.com/@username';
      }
      return 'https://tiktok.com/@username/video/123456789...';
    }

    if (catName.includes('instagram')) {
      if (serviceName.includes('follower')) {
        return 'https://instagram.com/username';
      }
      if (serviceName.includes('reel') || serviceName.includes('view')) {
        return 'https://instagram.com/reel/C123xyz... or post link';
      }
      return 'https://instagram.com/p/C123xyz... or profile URL';
    }

    if (catName.includes('youtube')) {
      if (serviceName.includes('sub') || serviceName.includes('channel')) {
        return 'https://youtube.com/@channelname or channel link';
      }
      return 'https://youtube.com/watch?v=... or shorts link';
    }

    if (catName.includes('facebook')) {
      if (serviceName.includes('page') || serviceName.includes('follower')) {
        return 'https://facebook.com/pagename';
      }
      return 'https://facebook.com/... (post, reel, or video link)';
    }

    if (catName.includes('telegram')) {
      return 'https://t.me/channel_username or post link';
    }

    if (catName.includes('twitter') || catName.includes('x')) {
      return 'https://x.com/username or tweet/post link';
    }

    if (catName.includes('spotify')) {
      return 'https://open.spotify.com/track/... or playlist link';
    }

    if (catName.includes('traffic') || catName.includes('website')) {
      return 'https://yourwebsite.com/page';
    }

    return `https://${(currentCategory?.name || 'target').toLowerCase().replace(/[^a-z0-9]/g, '')}.com/link`;
  };

  const charge = currentService ? parseFloat(((quantity / 1000) * currentService.rate_per_1000).toFixed(2)) : 0;
  const userBalance = user?.balance || 0;
  const hasInsufficientFunds = userBalance < charge;

  const handleCategoryChange = (catId: number) => {
    setSelectedCatId(catId);
    const firstInCat = services.find(s => s.category_id === catId);
    if (firstInCat) {
      setSelectedServiceId(firstInCat.id);
      setQuantity(firstInCat.min_quantity);
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!link.trim()) {
      setStatus({ type: 'error', text: 'Please enter a valid target link.' });
      return;
    }

    if (quantity < (currentService?.min_quantity || 10)) {
      setStatus({ type: 'error', text: `Minimum quantity is ${currentService?.min_quantity}` });
      return;
    }

    if (quantity > (currentService?.max_quantity || 100000)) {
      setStatus({ type: 'error', text: `Maximum quantity is ${currentService?.max_quantity}` });
      return;
    }

    if (hasInsufficientFunds) {
      setStatus({
        type: 'error',
        text: `Insufficient funds. Required: Rs ${charge.toFixed(2)}, Available: Rs ${userBalance.toFixed(2)}. Please Add Funds.`
      });
      return;
    }

    setStatus(null);
    setConfirmModal(true);
  };

  const executeOrder = async () => {
    if (!currentService) return;
    setConfirmModal(false);
    setSubmitting(true);
    setStatus(null);

    try {
      const res = await api.createOrder({
        service_id: currentService.id,
        link: link.trim(),
        quantity
      });

      setStatus({
        type: 'success',
        text: `Order #${res.order_id} placed successfully! Rs ${res.charge.toFixed(2)} charged. Our dispatch servers are active.`,
        orderId: res.order_id
      });
      setLink('');
      await refreshUser();
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to place order.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
          Wholesale Order Dispatcher
        </div>
        <h1 className="text-2xl font-bold text-white">Place New SMM Order</h1>
        <p className="text-xs text-slate-400 mt-1">
          Select target platform and package. Automated servers initiate delivery immediately.
        </p>
      </div>

      {status && (
        <div className={`p-4 rounded-xl flex items-start justify-between gap-3 text-xs ${
          status.type === 'success'
            ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-200'
            : 'bg-rose-950/60 border border-rose-800/80 text-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {status.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <div>
              <div className="font-semibold">{status.text}</div>
              {status.orderId && (
                <div className="mt-1 text-[11px] text-emerald-400 font-mono">
                  You can track status anytime under "My Orders".
                </div>
              )}
            </div>
          </div>
          {status.orderId && (
            <button
              onClick={() => onNavigate('my-orders')}
              className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold whitespace-nowrap"
            >
              View Order
            </button>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Form: 7 cols */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#090f20] p-6 space-y-5">
          
          <form onSubmit={handlePreSubmit} className="space-y-4 text-xs">
            
            {/* Category selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-slate-300 font-semibold">
                  1. Select Social Platform Category
                </label>
                {currentCategory && (
                  <span className="flex items-center gap-1.5 text-xs text-sky-400 font-medium">
                    <CategoryIconBadge
                      categoryName={currentCategory.name}
                      imageUrl={currentCategory.image_url}
                      icon={currentCategory.icon}
                      size="xs"
                    />
                    <span>{currentCategory.name}</span>
                  </span>
                )}
              </div>

              {/* Horizontal Scrollable Category Badges */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-2.5 scrollbar-none">
                {categories.map(c => {
                  const isSelected = c.id === selectedCatId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleCategoryChange(c.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border shrink-0 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-500 text-white shadow-md shadow-sky-500/20'
                          : 'bg-[#070b16] border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      <CategoryIconBadge
                        categoryName={c.name}
                        imageUrl={c.image_url}
                        icon={c.icon}
                        size="xs"
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Category Dropdown (fully synced) */}
              <select
                value={selectedCatId}
                onChange={(e) => handleCategoryChange(Number(e.target.value))}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2.5 text-white font-medium focus:outline-none focus:border-sky-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Service selection */}
            <div>
              <label className="block text-slate-300 font-semibold mb-1.5">
                2. Select Specific Service
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => {
                  const sId = Number(e.target.value);
                  setSelectedServiceId(sId);
                  const found = services.find(s => s.id === sId);
                  if (found) setQuantity(found.min_quantity);
                }}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2.5 text-white font-medium focus:outline-none focus:border-sky-500"
              >
                {categoryServices.map(s => (
                  <option key={s.id} value={s.id}>
                    #{s.id} - {s.name} (Rs {s.rate_per_1000.toFixed(2)}/1k)
                  </option>
                ))}
              </select>
            </div>

            {/* Target Link Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-semibold">
                  3. Target {currentCategory?.name || 'Platform'} Link *
                </label>
                <span className="text-[11px] text-slate-400">
                  {currentCategory ? `${currentCategory.name} URL` : 'Profile / Post / Video URL'}
                </span>
              </div>
              <input
                type="url"
                required
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder={getLinkPlaceholder()}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2.5 text-white font-mono placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Quantity Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-slate-300 font-semibold">4. Quantity *</label>
                {currentService && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Min: {currentService.min_quantity.toLocaleString()} · Max: {currentService.max_quantity.toLocaleString()}
                  </span>
                )}
              </div>
              <input
                type="number"
                required
                min={currentService?.min_quantity || 10}
                max={currentService?.max_quantity || 100000}
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)}
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Dynamic Charge & Balance Verification Card */}
            <div className="p-4 rounded-xl bg-[#070b16] border border-slate-800 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Total Calculated Cost:</span>
                <span className="text-lg font-bold font-mono text-emerald-400 tabular-nums">
                  Rs {charge.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Your Current Balance:</span>
                <span className={`font-mono font-semibold tabular-nums ${hasInsufficientFunds ? 'text-rose-400' : 'text-white'}`}>
                  Rs {userBalance.toFixed(2)}
                </span>
              </div>

              {hasInsufficientFunds && (
                <div className="pt-2 flex items-center justify-between text-xs text-rose-300 bg-rose-950/40 p-2.5 rounded-lg border border-rose-900/60">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>Need Rs {(charge - userBalance).toFixed(2)} more to place order</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate('add-funds')}
                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px] whitespace-nowrap"
                  >
                    Add Funds
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting || hasInsufficientFunds}
              className="w-full py-3 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-sky-600/30"
            >
              <span>{submitting ? 'Dispatching to Server...' : `Submit Order (Rs ${charge.toFixed(2)})`}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Right Info: 5 cols */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Service Details Card */}
          {currentService && (
            <div className="p-5 rounded-xl border border-slate-800 bg-[#090f20] space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-sky-400">Service #{currentService.id}</span>
                <span className="text-xs font-semibold text-emerald-400">
                  Rs {currentService.rate_per_1000.toFixed(2)} / 1k
                </span>
              </div>

              <h3 className="text-sm font-bold text-white leading-snug">
                {currentService.name}
              </h3>

              <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3">
                <div className="flex justify-between text-slate-400">
                  <span>Start Time:</span>
                  <span className="text-white font-medium">Instant (0-15 mins)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Speed:</span>
                  <span className="text-white font-medium">10K - 50K / Day</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Refill Warranty:</span>
                  <span className="text-emerald-400 font-medium">
                    {currentService.refill_supported ? '30 Days Guaranteed Refill' : 'No Refill'}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Cancel Support:</span>
                  <span className="text-slate-300">Supported while Pending</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#070b16] border border-slate-800 text-[11px] text-slate-300 space-y-1">
                <div className="font-semibold text-white flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>Important Instructions:</span>
                </div>
                <p className="leading-relaxed opacity-90">
                  {currentService.description || 'Make sure profile or video is public. Do not change username or link while order is active.'}
                </p>
              </div>
            </div>
          )}

          {/* Quick Help Box */}
          <div className="p-4 rounded-xl border border-slate-800 bg-[#0c1426] flex items-center justify-between text-xs">
            <div>
              <div className="font-bold text-white">Need Bulk Custom Orders?</div>
              <div className="text-slate-400 text-[11px]">Use our multi-line Mass Order engine</div>
            </div>
            <button
              onClick={() => onNavigate('mass-order')}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 font-semibold"
            >
              Mass Order
            </button>
          </div>

        </div>

      </div>

      {/* Confirmation Modal */}
      {confirmModal && currentService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">Confirm Your Order</h3>
            <p className="text-xs text-slate-300">
              Please review your order details before final balance deduction:
            </p>

            <div className="p-3.5 rounded-lg bg-[#070b16] border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Service:</span>
                <span className="font-medium text-white max-w-[220px] truncate">{currentService.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Link:</span>
                <span className="font-mono text-sky-400 max-w-[220px] truncate">{link}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Quantity:</span>
                <span className="font-mono text-white">{quantity.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 font-bold">
                <span className="text-slate-300">Total Deducted:</span>
                <span className="font-mono text-emerald-400">Rs {charge.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeOrder}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white shadow-md shadow-sky-600/30"
              >
                Confirm & Dispatch
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
