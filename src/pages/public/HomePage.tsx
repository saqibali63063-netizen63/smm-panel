import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { Category, Service, PlatformStats } from '../../types/index.ts';
import {
  Zap,
  ShieldCheck,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowRight,
  Headphones,
  Award,
  Flame,
  ChevronRight,
  Coins
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (view: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);

  // Calculator states
  const [selectedCatId, setSelectedCatId] = useState<number>(1);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(1);
  const [calcQuantity, setCalcQuantity] = useState<number>(1000);

  useEffect(() => {
    api.getServices()
      .then(res => {
        setCategories(res.categories);
        setServices(res.services);
        if (res.categories.length > 0) setSelectedCatId(res.categories[0].id);
        if (res.services.length > 0) setSelectedServiceId(res.services[0].id);
      })
      .catch(() => {});

    api.getStats()
      .then(setStats)
      .catch(() => {});
  }, []);

  // Update selected service when category changes
  const categoryServices = services.filter(s => s.category_id === selectedCatId);
  const currentCalcService = services.find(s => s.id === selectedServiceId) || categoryServices[0] || services[0];

  const calculatedCost = currentCalcService
    ? ((calcQuantity / 1000) * currentCalcService.rate_per_1000).toFixed(2)
    : '0.00';

  return (
    <div className="space-y-16 sm:space-y-20 pb-20 overflow-x-hidden w-full max-w-full">
      
      {/* Hero Section */}
      <section className="relative pt-8 sm:pt-16 pb-12 overflow-hidden w-full">
        {/* Ambient subtle electric blue glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-sky-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            {/* Left Column: Headline & Value Proposition */}
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>Pakistan's #1 Automated SMM Reseller Panel</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15] text-balance">
                Accelerate Social Growth With Direct Wholesale SMM Rates
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-2xl">
                The fastest automated SMM infrastructure for agencies, digital marketers, and resellers. Instant delivery for TikTok, Instagram, YouTube, and Facebook with native <strong className="text-white font-semibold">Easypaisa & JazzCash</strong> verification.
              </p>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <button
                  onClick={() => onNavigate('register')}
                  className="flex items-center gap-2 px-6 py-3 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all shadow-lg shadow-sky-600/30 hover:shadow-sky-500/50"
                >
                  <span>Create Free Account</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onNavigate('services')}
                  className="px-5 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 hover:text-white font-semibold text-sm border border-slate-700 transition-colors"
                >
                  Browse Wholesale Services
                </button>
              </div>

              {/* Trust markers */}
              <div className="pt-4 flex flex-wrap items-center gap-6 text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Direct Order Dispatch
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 30-Day Refill Guarantee
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> 24/7 Urdu & English Support
                </span>
              </div>
            </div>

            {/* Right Column: Hero High-Fidelity Asset */}
            <div className="lg:col-span-5 relative">
              <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-2xl shadow-sky-950/40 group">
                <img
                  src="/src/assets/images/pakservices_hero_dashboard_1794243851589.jpg"
                  alt="PakServices SMM Engine Dashboard"
                  referrerPolicy="no-referrer"
                  className="w-full h-auto object-cover transform group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#080d1a] via-transparent to-transparent opacity-60" />
                <div className="absolute bottom-4 left-4 right-4 p-3 rounded-lg bg-[#080d1a]/90 backdrop-blur-md border border-slate-800 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-white font-medium">Auto-Dispatcher Online</span>
                  </div>
                  <span className="text-sky-400 font-mono font-bold">Latency: 0.18s</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 4-Column KPI Stats Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 rounded-xl bg-[#090f21] border border-slate-800/90 shadow-lg">
          <div className="p-3 text-center sm:text-left border-r border-slate-800/60 last:border-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-white">
              {stats ? stats.total_orders_served.toLocaleString() : '284,500'}+
            </div>
            <div className="text-xs text-slate-400 mt-1">Orders Successfully Delivered</div>
          </div>

          <div className="p-3 text-center sm:text-left border-r border-slate-800/60 last:border-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-sky-400">
              {stats ? stats.registered_users.toLocaleString() : '14,250'}+
            </div>
            <div className="text-xs text-slate-400 mt-1">Active Resellers & Agencies</div>
          </div>

          <div className="p-3 text-center sm:text-left border-r border-slate-800/60 last:border-0">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-emerald-400">
              {stats ? stats.satisfaction_rate : '99.4%'}
            </div>
            <div className="text-xs text-slate-400 mt-1">Client Satisfaction Rate</div>
          </div>

          <div className="p-3 text-center sm:text-left">
            <div className="text-2xl sm:text-3xl font-extrabold font-mono tabular-nums text-amber-400">
              &lt; 2 Mins
            </div>
            <div className="text-xs text-slate-400 mt-1">Easypaisa/JazzCash Verification</div>
          </div>
        </div>
      </section>

      {/* Interactive Live Order Cost Calculator */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-[#0c1326] to-[#090e1d] border border-sky-900/40 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
                Instant Price Simulator
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white">
                Live Order Cost Calculator
              </h2>
            </div>
            <div className="text-xs text-slate-400">
              Direct real-time wholesale pricing in Pakistani Rupees (PKR)
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {/* Category Select */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                1. Select Social Platform
              </label>
              <select
                value={selectedCatId}
                onChange={(e) => {
                  const newCatId = Number(e.target.value);
                  setSelectedCatId(newCatId);
                  const firstInCat = services.find(s => s.category_id === newCatId);
                  if (firstInCat) setSelectedServiceId(firstInCat.id);
                }}
                className="w-full bg-[#080d1a] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Service Select */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-2">
                2. Select Service Package
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                className="w-full bg-[#080d1a] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {categoryServices.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Rs {s.rate_per_1000}/k)
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div>
              <div className="flex justify-between items-center text-xs text-slate-300 mb-2">
                <label className="font-medium">3. Quantity</label>
                {currentCalcService && (
                  <span className="text-[11px] text-slate-400 font-mono">
                    Min: {currentCalcService.min_quantity} · Max: {currentCalcService.max_quantity.toLocaleString()}
                  </span>
                )}
              </div>
              <input
                type="number"
                min={currentCalcService?.min_quantity || 10}
                max={currentCalcService?.max_quantity || 100000}
                value={calcQuantity}
                onChange={(e) => setCalcQuantity(Math.max(1, parseInt(e.target.value, 10) || 0))}
                className="w-full bg-[#080d1a] border border-slate-700 rounded-lg px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Calculator Result Box */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-sky-950/60 border border-sky-800/40 text-sky-400">
                <Coins className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs text-slate-400">Calculated Wholesale Price</div>
                <div className="text-2xl font-bold font-mono tabular-nums text-white flex items-baseline gap-1">
                  <span className="text-sm font-sans text-sky-400 font-semibold">Rs</span>
                  {calculatedCost}
                  <span className="text-xs text-slate-400 font-normal ml-2 font-mono">
                    (Rs {currentCalcService?.rate_per_1000} per 1000)
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => onNavigate('new-order')}
              className="flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors shadow-md shadow-sky-600/30"
            >
              <span>Order This Service Now</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Feature Showcase with Generated Visual */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
              <img
                src="/src/assets/images/social_growth_concept_1794243853044.jpg"
                alt="Social Media Growth Concept"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
            <div className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              Engineered for High-Volume Resellers
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Why Top Pakistani Digital Agencies Rely On PakServices
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Unlike unstable third-party scripts, PakServices operates dedicated fulfillment infrastructure with strict quality checks, verified Easypaisa/JazzCash deposits, and non-drop guarantee locks.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#090e1d] border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-sky-950 flex items-center justify-center text-sky-400 mb-2">
                  <Zap className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Instant Server Dispatch</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Automated queues push your links within 60 seconds of order submission.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#090e1d] border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 flex items-center justify-center text-emerald-400 mb-2">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">30-Day Auto-Refill</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  If any platform updates cause drops, 1-click refill restores counts free of charge.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#090e1d] border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-amber-950 flex items-center justify-center text-amber-400 mb-2">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Real-Time Order Tracking</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Monitor live order statuses, start counts, and mass order batches cleanly in one dashboard.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-[#090e1d] border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-purple-950 flex items-center justify-center text-purple-400 mb-2">
                  <Headphones className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-white mb-1">Urdu & English Desk</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Direct WhatsApp and ticketing support based in Lahore & Karachi.
                </p>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Local Payment Methods Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center p-8 rounded-2xl bg-[#080d1b] border border-slate-800">
          
          <div className="lg:col-span-7 space-y-5">
            <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
              Zero Payment Friction
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Fund Your Balance With Easypaisa, JazzCash & Bank Transfer
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              No foreign currency conversion fees or credit card blocks. Deposit directly using your mobile wallet or online banking app. Our automated receipt queue verifies your 11-digit TRX ID within 2-5 minutes.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0c1426] border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-xs font-semibold text-white">Easypaisa & JazzCash:</span>
                <span className="text-xs text-slate-400">Instant mobile account transfer with zero fee</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0c1426] border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span className="text-xs font-semibold text-white">Meezan Bank & 1Link:</span>
                <span className="text-xs text-slate-400">Direct IBAN transfer supported across all Pakistani banks</span>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0c1426] border border-slate-800">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="text-xs font-semibold text-white">USDT Crypto (TRC20):</span>
                <span className="text-xs text-slate-400">Low-fee cryptocurrency deposits for international resellers</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => onNavigate('add-funds')}
                className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors"
              >
                View Account Numbers & Deposit
              </button>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-slate-900 shadow-xl">
              <img
                src="/src/assets/images/pakservices_payment_trust_1794243853449.jpg"
                alt="Secure Pakistani Payments"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>

        </div>
      </section>

      {/* Trending Wholesale Services Table */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
              Top Trending Services
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              Most Popular Social Growth Packages
            </h2>
          </div>
          <button
            onClick={() => onNavigate('services')}
            className="text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 self-start sm:self-auto"
          >
            <span>View All {services.length} Services</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#090f20]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ID</th>
                <th className="py-3 px-4">Service Name</th>
                <th className="py-3 px-4">Rate per 1000</th>
                <th className="py-3 px-4">Min / Max</th>
                <th className="py-3 px-4">Refill</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {services.slice(0, 8).map(s => (
                <tr key={s.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-400">#{s.id}</td>
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
                      <span className="text-[11px] text-emerald-400 font-medium">30D Refill</span>
                    ) : (
                      <span className="text-[11px] text-slate-500">No Refill</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onNavigate('new-order')}
                      className="px-3 py-1 rounded bg-sky-600/20 text-sky-400 border border-sky-500/30 hover:bg-sky-600 hover:text-white transition-colors font-medium text-[11px]"
                    >
                      Order
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Customer Testimonials & Reviews */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-2">
            Verified Reviews
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">
            Trusted by Resellers Across Pakistan
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#080d1a] border border-slate-800 space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {'★'.repeat(5)}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "We manage TikTok campaigns for 30+ local clothing brands in Lahore. PakServices has never dropped an order, and having JazzCash automated deposit saves us hours every week."
            </p>
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-xs font-bold text-white">Hamza Tariq</div>
              <div className="text-[11px] text-slate-400">Digital Director, CreativePulse Lahore</div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#080d1a] border border-slate-800 space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {'★'.repeat(5)}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "Their YouTube watchtime package is genuinely the only one in Pakistan that worked without dropping during the channel monetization review. 100% recommended."
            </p>
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-xs font-bold text-white">Bilal Farooq</div>
              <div className="text-[11px] text-slate-400">Content Creator & Reseller, Karachi</div>
            </div>
          </div>

          <div className="p-6 rounded-xl bg-[#080d1a] border border-slate-800 space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {'★'.repeat(5)}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              "Using Mass Order and live status tracking saves our agency hours every day. Zero downtime, fast support responses, and super reliable PKR pricing."
            </p>
            <div className="pt-2 border-t border-slate-800/80">
              <div className="text-xs font-bold text-white">Zainab Sheikh</div>
              <div className="text-[11px] text-slate-400">Lead Web Engineer, Rawalpindi</div>
            </div>
          </div>
        </div>
      </section>

      {/* High-Converting CTA Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="p-8 sm:p-12 rounded-2xl bg-gradient-to-r from-sky-900/60 via-blue-900/40 to-slate-900 border border-sky-800/40 text-center space-y-5 shadow-2xl">
          <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to Scale Your Social Reach Today?
          </h2>
          <p className="text-sm sm:text-base text-slate-300 max-w-xl mx-auto">
            Join thousands of smart resellers and digital creators. Instant sign up, zero monthly fees, deposit as little as Rs 100 to begin.
          </p>
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              onClick={() => onNavigate('register')}
              className="px-8 py-3 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm transition-all shadow-lg shadow-sky-500/30"
            >
              Register Reseller Account
            </button>
            <button
              onClick={() => onNavigate('login')}
              className="px-6 py-3 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-white font-semibold text-sm border border-slate-700 transition-colors"
            >
              Sign In
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
