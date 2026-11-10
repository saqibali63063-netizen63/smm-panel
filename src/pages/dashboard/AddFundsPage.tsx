import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { PaymentRequest } from '../../types/index.ts';
import {
  Wallet,
  Copy,
  Check,
  Upload,
  AlertCircle,
  CheckCircle2,
  Clock,
  Info,
  ShieldCheck,
  ArrowRight,
  QrCode,
  Eye,
  Trash2,
  Coins,
  Building2,
  AlertTriangle,
  X
} from 'lucide-react';

interface AddFundsPageProps {
  onNavigate: (view: string) => void;
}

export const AddFundsPage: React.FC<AddFundsPageProps> = ({ onNavigate }) => {
  const { user, refreshUser } = useAuth();
  const [methods, setMethods] = useState<Record<string, string>>({});
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<'BEP20' | 'TRC20'>('BEP20');
  
  const [amount, setAmount] = useState<number>(500);
  const [trxId, setTrxId] = useState('');
  const [senderAccount, setSenderAccount] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [enlargedQrModal, setEnlargedQrModal] = useState<{ title: string; image: string } | null>(null);

  const fetchHistory = () => {
    api.getPaymentRequests().then(res => setPaymentRequests(res.requests)).catch(() => {});
  };

  useEffect(() => {
    refreshUser();
    api.getPaymentMethods().then(data => {
      setMethods(data);

      // Determine initial active method based on availability
      const epAvailable = data.easypaisa_enabled !== '0' && !!data.easypaisa_number?.trim();
      const jcAvailable = data.jazzcash_enabled !== '0' && !!data.jazzcash_number?.trim();
      const bankAvailable = data.bank_enabled !== '0' && !!data.bank_account_number?.trim();
      const bep20Avail = data.usdt_enabled !== '0' && data.usdt_bep20_enabled !== '0' && !!data.usdt_bep20_address?.trim();
      const trc20Avail = data.usdt_enabled !== '0' && data.usdt_trc20_enabled !== '0' && !!data.usdt_trc20_address?.trim();
      const usdtAvailable = data.usdt_enabled !== '0' && (bep20Avail || trc20Avail);

      if (epAvailable) {
        setSelectedMethod('Easypaisa');
      } else if (jcAvailable) {
        setSelectedMethod('JazzCash');
      } else if (bankAvailable) {
        setSelectedMethod('Bank Transfer');
      } else if (usdtAvailable) {
        setSelectedMethod('USDT');
        if (bep20Avail) setSelectedNetwork('BEP20');
        else if (trc20Avail) setSelectedNetwork('TRC20');
      }

      if (bep20Avail) {
        setSelectedNetwork('BEP20');
      } else if (trc20Avail) {
        setSelectedNetwork('TRC20');
      }
    });
    fetchHistory();
  }, []);

  // Compute availability flags
  const isEasypaisaAvailable = methods.easypaisa_enabled !== '0' && !!methods.easypaisa_number?.trim();
  const isJazzCashAvailable = methods.jazzcash_enabled !== '0' && !!methods.jazzcash_number?.trim();
  const isBankAvailable = methods.bank_enabled !== '0' && !!methods.bank_account_number?.trim();
  
  const isBep20Configured = methods.usdt_enabled !== '0' && methods.usdt_bep20_enabled !== '0' && !!methods.usdt_bep20_address?.trim();
  const isTrc20Configured = methods.usdt_enabled !== '0' && methods.usdt_trc20_enabled !== '0' && !!methods.usdt_trc20_address?.trim();
  const isUsdtAvailable = methods.usdt_enabled !== '0' && (isBep20Configured || isTrc20Configured);

  // If both or only one network is configured
  const hasBothNetworks = isBep20Configured && isTrc20Configured;
  const activeUsdtNetwork = hasBothNetworks
    ? selectedNetwork
    : isBep20Configured
    ? 'BEP20'
    : 'TRC20';

  const usdRate = parseFloat(methods.usd_pkr_rate || '280.0');
  const minDepositPkr = parseFloat(methods.min_deposit_pkr || '100');
  const approxUsd = (amount / usdRate).toFixed(2);

  const copyToClipboard = (text: string, keyName: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(keyName);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setStatus({ type: 'error', text: 'Please upload a valid receipt image (JPG, PNG, WEBP).' });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setStatus({ type: 'error', text: 'Receipt image size exceeds 5MB limit.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setScreenshotUrl(reader.result as string);
      setStatus(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMethod) {
      setStatus({ type: 'error', text: 'Please select an available payment method.' });
      return;
    }

    if (!trxId.trim()) {
      setStatus({ type: 'error', text: 'Transaction ID / Hash (TRX ID) is required.' });
      return;
    }

    if (amount < minDepositPkr) {
      setStatus({ type: 'error', text: `Minimum deposit amount is Rs ${minDepositPkr}.` });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await api.submitPaymentRequest({
        method: selectedMethod,
        network: selectedMethod === 'USDT' ? activeUsdtNetwork : undefined,
        amount,
        trx_id: trxId.trim(),
        sender_account: senderAccount.trim() || undefined,
        screenshot_url: screenshotUrl || undefined
      });

      setStatus({ type: 'success', text: res.message });
      setTrxId('');
      setSenderAccount('');
      setScreenshotUrl('');
      fetchHistory();
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Payment submission failed.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Build list of active payment methods
  const availableMethodsList = [
    ...(isEasypaisaAvailable ? [{
      id: 'Easypaisa',
      label: 'Easypaisa',
      subtitle: 'Mobile Wallet / *786#',
      icon: Wallet,
      accent: 'emerald'
    }] : []),
    ...(isJazzCashAvailable ? [{
      id: 'JazzCash',
      label: 'JazzCash',
      subtitle: 'Mobile Wallet / *786#',
      icon: Wallet,
      accent: 'rose'
    }] : []),
    ...(isBankAvailable ? [{
      id: 'Bank Transfer',
      label: methods.bank_name || 'Bank Transfer',
      subtitle: '1Link / Raast / IBFT',
      icon: Building2,
      accent: 'sky'
    }] : []),
    ...(isUsdtAvailable ? [{
      id: 'USDT',
      label: 'USDT Crypto',
      subtitle: hasBothNetworks ? 'BEP20 & TRC20' : `${activeUsdtNetwork} Network`,
      icon: Coins,
      accent: 'purple'
    }] : []),
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Header */}
      <div>
        <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1 font-mono">
          Automated Verification Gateway
        </div>
        <h1 className="text-2xl font-bold text-white">Add Funds to Account</h1>
        <p className="text-xs text-slate-400 mt-1">
          Deposit PKR via Pakistani mobile wallets, 1Link Raast bank transfer, or USDT on independent BEP20/TRC20 networks.
        </p>
      </div>

      {/* Notification Banner */}
      {status && (
        <div className={`p-4 rounded-xl flex items-center gap-3 text-xs shadow-lg animate-in fade-in ${
          status.type === 'success'
            ? 'bg-emerald-950/70 border border-emerald-800 text-emerald-200'
            : 'bg-rose-950/70 border border-rose-800 text-rose-200'
        }`}>
          {status.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{status.text}</span>
        </div>
      )}

      {/* Gateway Selector Cards */}
      {availableMethodsList.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#090f20] border border-slate-800 text-center space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Deposit Channels Temporarily Inactive</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Payment gateway channels are currently being upgraded by our administrators. Please check back shortly or contact our 24/7 support desk.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {availableMethodsList.map(m => {
            const isSelected = selectedMethod === m.id;
            const IconComponent = m.icon;

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedMethod(m.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                  isSelected
                    ? 'bg-sky-950/40 border-sky-500 text-white shadow-xl ring-1 ring-sky-500/40'
                    : 'bg-[#090f20] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      <IconComponent className="w-4 h-4" />
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
                    )}
                  </div>
                  <div className="text-sm font-bold text-white">{m.label}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{m.subtitle}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {selectedMethod && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start">
          
          {/* Left Column: Account Details & QR Code (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-800 bg-[#090f20] p-5 sm:p-6 space-y-5 shadow-xl">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wallet className="w-4 h-4 text-emerald-400" />
                <span>
                  {selectedMethod === 'USDT' ? `USDT (${activeUsdtNetwork})` : selectedMethod} Details
                </span>
              </h3>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Official Account
              </span>
            </div>

            {/* ------------------------------------------------------------------ */}
            {/* EASYPAISA DETAILS */}
            {/* ------------------------------------------------------------------ */}
            {selectedMethod === 'Easypaisa' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Easypaisa Mobile Number</span>
                  <div className="flex items-center justify-between font-mono font-bold text-white text-base">
                    <span>{methods.easypaisa_number}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(methods.easypaisa_number || '', 'ep_num')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Mobile Number"
                    >
                      {copiedKey === 'ep_num' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Account Holder Title</span>
                  <span className="font-semibold text-white block text-sm">
                    {methods.easypaisa_title || 'PakServices / Muhammad Ali'}
                  </span>
                </div>

                {/* Easypaisa QR if uploaded */}
                {methods.easypaisa_qr && (
                  <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-2 text-center">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Scan Easypaisa QR Code to Pay:
                    </span>
                    <div 
                      onClick={() => setEnlargedQrModal({ title: 'Easypaisa QR Code', image: methods.easypaisa_qr })}
                      className="inline-block p-2 bg-white rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      title="Click to view full size"
                    >
                      <img
                        src={methods.easypaisa_qr}
                        alt="Easypaisa QR"
                        className="w-36 h-36 object-contain mx-auto"
                      />
                      <span className="text-[10px] text-slate-600 block mt-1 font-medium flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" /> Click to enlarge
                      </span>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Instructions:</span>
                  </div>
                  <p className="leading-relaxed opacity-95">
                    {methods.easypaisa_instructions || 'Send exact funds via Easypaisa App or *786#. After transferring, enter the 11-digit TID and upload your screenshot.'}
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* JAZZCASH DETAILS */}
            {/* ------------------------------------------------------------------ */}
            {selectedMethod === 'JazzCash' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">JazzCash Mobile Number</span>
                  <div className="flex items-center justify-between font-mono font-bold text-white text-base">
                    <span>{methods.jazzcash_number}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(methods.jazzcash_number || '', 'jc_num')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Mobile Number"
                    >
                      {copiedKey === 'jc_num' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Account Holder Title</span>
                  <span className="font-semibold text-white block text-sm">
                    {methods.jazzcash_title || 'PakServices / Muhammad Ali'}
                  </span>
                </div>

                {/* JazzCash QR if uploaded */}
                {methods.jazzcash_qr && (
                  <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-2 text-center">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Scan JazzCash QR Code to Pay:
                    </span>
                    <div 
                      onClick={() => setEnlargedQrModal({ title: 'JazzCash QR Code', image: methods.jazzcash_qr })}
                      className="inline-block p-2 bg-white rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      title="Click to view full size"
                    >
                      <img
                        src={methods.jazzcash_qr}
                        alt="JazzCash QR"
                        className="w-36 h-36 object-contain mx-auto"
                      />
                      <span className="text-[10px] text-slate-600 block mt-1 font-medium flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" /> Click to enlarge
                      </span>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Instructions:</span>
                  </div>
                  <p className="leading-relaxed opacity-95">
                    {methods.jazzcash_instructions || 'Send exact funds via JazzCash App or *786#. After transferring, enter the 12-digit TID and upload your screenshot.'}
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* BANK TRANSFER DETAILS */}
            {/* ------------------------------------------------------------------ */}
            {selectedMethod === 'Bank Transfer' && (
              <div className="space-y-4 text-xs">
                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Bank Name</span>
                  <span className="font-bold text-white block text-sm">{methods.bank_name || 'Meezan Bank Limited'}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Account Title</span>
                  <span className="font-semibold text-white block text-xs">
                    {methods.bank_account_title || 'PakServices Digital Technologies SMC-Pvt Ltd'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                  <span className="text-slate-400 block text-[11px]">Account Number</span>
                  <div className="flex items-center justify-between font-mono font-bold text-white text-sm">
                    <span>{methods.bank_account_number}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(methods.bank_account_number || '', 'bank_acc')}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy Account Number"
                    >
                      {copiedKey === 'bank_acc' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {methods.bank_iban && (
                  <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1">
                    <span className="text-slate-400 block text-[11px]">IBAN (1Link / Raast)</span>
                    <div className="flex items-center justify-between font-mono font-bold text-sky-300 text-xs break-all">
                      <span>{methods.bank_iban}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(methods.bank_iban || '', 'bank_iban')}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
                        title="Copy IBAN"
                      >
                        {copiedKey === 'bank_iban' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                {methods.bank_branch && (
                  <div className="p-3 rounded-lg bg-[#070b16] border border-slate-800/80 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Branch: </span>
                    <span>{methods.bank_branch}</span>
                  </div>
                )}

                {/* Bank QR if uploaded */}
                {methods.bank_qr && (
                  <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-2 text-center">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Scan Bank / Raast QR Code:
                    </span>
                    <div 
                      onClick={() => setEnlargedQrModal({ title: 'Bank / Raast QR Code', image: methods.bank_qr })}
                      className="inline-block p-2 bg-white rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      title="Click to view full size"
                    >
                      <img
                        src={methods.bank_qr}
                        alt="Bank QR"
                        className="w-36 h-36 object-contain mx-auto"
                      />
                      <span className="text-[10px] text-slate-600 block mt-1 font-medium flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" /> Click to enlarge
                      </span>
                    </div>
                  </div>
                )}

                {/* Instructions */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-sky-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Instructions:</span>
                  </div>
                  <p className="leading-relaxed opacity-95">
                    {methods.bank_instructions || 'Transfer funds using your bank app via Raast ID, 1Link, or IBFT. Enter bank reference number and upload receipt.'}
                  </p>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------ */}
            {/* USDT DETAILS (SEPARATE INDEPENDENT NETWORKS) */}
            {/* ------------------------------------------------------------------ */}
            {selectedMethod === 'USDT' && (
              <div className="space-y-4 text-xs">
                
                {/* Independent Network Switcher if both networks configured */}
                {hasBothNetworks && (
                  <div className="space-y-2">
                    <label className="block text-slate-300 font-semibold text-[11px]">
                      Select Transfer Network:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedNetwork('BEP20')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                          activeUsdtNetwork === 'BEP20'
                            ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-md ring-1 ring-amber-400/40'
                            : 'bg-[#070b16] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="text-xs">BNB Smart Chain</div>
                        <div className="text-[10px] font-mono opacity-80">BEP20 (Low Fees)</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedNetwork('TRC20')}
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer font-bold ${
                          activeUsdtNetwork === 'TRC20'
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-md ring-1 ring-cyan-400/40'
                            : 'bg-[#070b16] border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                        }`}
                      >
                        <div className="text-xs">TRON Network</div>
                        <div className="text-[10px] font-mono opacity-80">TRC20 (Fast)</div>
                      </button>
                    </div>
                  </div>
                )}

                {/* If only BEP20 or TRC20 configured */}
                {!hasBothNetworks && (
                  <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-800/60 text-purple-200 text-xs flex items-center gap-2">
                    <Coins className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>
                      Active Network: <strong>{activeUsdtNetwork === 'BEP20' ? 'BNB Smart Chain (BEP20)' : 'TRON (TRC20)'}</strong>
                    </span>
                  </div>
                )}

                {/* Active Network Warning */}
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-[11px] flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>Critical Warning:</strong> Send USDT only via <strong>{activeUsdtNetwork}</strong> network. Sending via any other network will cause irreversible loss of funds.
                  </p>
                </div>

                {/* Wallet Address Box */}
                <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-[11px]">
                      Deposit Wallet Address ({activeUsdtNetwork}):
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                      activeUsdtNetwork === 'BEP20'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                    }`}>
                      {activeUsdtNetwork}
                    </span>
                  </div>

                  <div className="flex items-center justify-between font-mono font-bold text-sky-400 text-xs break-all bg-black/40 p-2.5 rounded-lg border border-slate-800">
                    <span>
                      {activeUsdtNetwork === 'BEP20'
                        ? methods.usdt_bep20_address
                        : methods.usdt_trc20_address}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(
                        activeUsdtNetwork === 'BEP20'
                          ? (methods.usdt_bep20_address || '')
                          : (methods.usdt_trc20_address || ''),
                        'usdt_addr'
                      )}
                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition-colors shrink-0 ml-2 cursor-pointer"
                      title="Copy Address"
                    >
                      {copiedKey === 'usdt_addr' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* QR Code if uploaded for this network */}
                {((activeUsdtNetwork === 'BEP20' && methods.usdt_bep20_qr) ||
                  (activeUsdtNetwork === 'TRC20' && methods.usdt_trc20_qr)) && (
                  <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 space-y-2 text-center">
                    <span className="text-[11px] font-semibold text-slate-300 block">
                      Scan USDT {activeUsdtNetwork} QR Code:
                    </span>
                    <div 
                      onClick={() => setEnlargedQrModal({
                        title: `USDT ${activeUsdtNetwork} QR Code`,
                        image: activeUsdtNetwork === 'BEP20' ? methods.usdt_bep20_qr : methods.usdt_trc20_qr
                      })}
                      className="inline-block p-2 bg-white rounded-xl shadow-md cursor-pointer hover:opacity-90 transition-opacity"
                      title="Click to view full size"
                    >
                      <img
                        src={activeUsdtNetwork === 'BEP20' ? methods.usdt_bep20_qr : methods.usdt_trc20_qr}
                        alt={`USDT ${activeUsdtNetwork} QR`}
                        className="w-36 h-36 object-contain mx-auto"
                      />
                      <span className="text-[10px] text-slate-600 block mt-1 font-medium flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3" /> Click to enlarge
                      </span>
                    </div>
                  </div>
                )}

                {/* Network Specific Instructions */}
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-300 space-y-1">
                  <div className="font-bold text-purple-400 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Instructions ({activeUsdtNetwork}):</span>
                  </div>
                  <p className="leading-relaxed opacity-95">
                    {activeUsdtNetwork === 'BEP20'
                      ? (methods.usdt_bep20_instructions || 'Transfer USDT only via BNB Smart Chain (BEP20). Wrong network will result in permanent loss.')
                      : (methods.usdt_trc20_instructions || 'Transfer USDT only via TRON (TRC20) network. Ensure transaction is confirmed before submitting hash.')}
                  </p>
                </div>

                {/* Conversion Rate Helper */}
                <div className="p-3 rounded-lg bg-[#070b16] border border-slate-800 text-[11px] flex items-center justify-between">
                  <span className="text-slate-400">Exchange Rate:</span>
                  <span className="font-mono text-emerald-400 font-bold">1 USD = {usdRate.toFixed(2)} PKR</span>
                </div>

              </div>
            )}

            {/* Verification Guarantee Footer */}
            <div className="p-3.5 rounded-xl bg-[#0c1428] border border-slate-800 text-[11px] text-slate-300 space-y-1">
              <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Verification Guarantee</span>
              </div>
              <p className="leading-relaxed opacity-90 text-[11px]">
                Submit your Transaction ID immediately after transferring. Our automated queue and billing administrators credit your account balance in real-time.
              </p>
            </div>

          </div>

          {/* Right Column: Verification Form (7 cols) */}
          <div className="lg:col-span-7 rounded-2xl border border-slate-800 bg-[#090f20] p-5 sm:p-6 space-y-5 shadow-xl">
            
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">
                Submit Deposit Request
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Please enter transaction details for: <strong className="text-white">{selectedMethod}{selectedMethod === 'USDT' ? ` (${activeUsdtNetwork})` : ''}</strong>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              
              {/* Amount input & Live Currency Calculator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-slate-300 font-semibold">
                      Deposit Amount (PKR) *
                    </label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Min: Rs {minDepositPkr}
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min={minDepositPkr}
                    value={amount}
                    onChange={(e) => setAmount(Math.max(1, parseInt(e.target.value, 10) || 0))}
                    placeholder={`e.g. ${minDepositPkr}`}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono text-sm focus:outline-none focus:border-sky-500"
                  />
                  {selectedMethod === 'USDT' && (
                    <span className="text-[11px] text-emerald-400 mt-1 block font-mono">
                      ≈ ${approxUsd} USDT (@ Rs {usdRate}/USD)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1.5">
                    {selectedMethod === 'USDT' ? 'Transaction Hash (TxID) *' : 'Transaction ID (TRX / TID) *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder={selectedMethod === 'USDT' ? 'e.g. 0x8a92b... or 7f3b4...' : 'e.g. 02938172651'}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Sender Account */}
              <div>
                <label className="block text-slate-300 font-semibold mb-1.5">
                  Your Sender Account / Number / Wallet (Optional)
                </label>
                <input
                  type="text"
                  value={senderAccount}
                  onChange={(e) => setSenderAccount(e.target.value)}
                  placeholder="e.g. 0300-1234567 or Account Title"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Screenshot Proof Upload */}
              <div className="space-y-2">
                <label className="block text-slate-300 font-semibold">
                  Payment Screenshot / Receipt Proof
                </label>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 cursor-pointer border border-slate-700 transition-colors text-xs font-semibold">
                    <Upload className="w-4 h-4 text-sky-400" />
                    <span>{screenshotUrl ? 'Replace Screenshot' : 'Upload Receipt Image'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>

                  {screenshotUrl && (
                    <button
                      type="button"
                      onClick={() => setScreenshotUrl('')}
                      className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/80 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                {screenshotUrl && (
                  <div className="mt-2 flex items-center gap-3 p-3 rounded-xl bg-[#070b16] border border-slate-800">
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-slate-700 shrink-0">
                      <img src={screenshotUrl} alt="Receipt proof preview" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1 text-xs">
                        <CheckCircle2 className="w-4 h-4" /> Screenshot attached
                      </span>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Attaching receipt image accelerates manual verification by billing operators.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !selectedMethod}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                <span>{submitting ? 'Submitting Payment Request...' : `Submit Deposit Request (Rs ${amount.toFixed(2)})`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

            </form>
          </div>

        </div>
      )}

      {/* Payment Requests History Table */}
      <div className="rounded-2xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl space-y-4">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Your Deposit Submissions</h3>
            <p className="text-xs text-slate-400">Track pending and approved manual gateway requests</p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Total: {paymentRequests.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Req ID</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Method & Network</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">TRX ID / Hash</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {paymentRequests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No deposit requests submitted yet. Select a method above to add funds.
                  </td>
                </tr>
              ) : (
                paymentRequests.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{p.id}</td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(p.created_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-semibold text-white">{p.method}</span>
                        {p.network && (
                          <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                            p.network.toUpperCase() === 'BEP20'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                          }`}>
                            {p.network}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-400 tabular-nums">
                      Rs {p.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{p.trx_id}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold capitalize ${
                        p.status === 'approved'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : p.status === 'pending'
                          ? 'bg-amber-950/80 text-amber-300 border border-amber-800/60 animate-pulse'
                          : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px]">
                      {p.admin_notes || (p.status === 'pending' ? 'Verification in progress' : '-')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enlarged QR Modal */}
      {enlargedQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="bg-[#0c1326] border border-slate-700 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative text-center">
            <button
              type="button"
              onClick={() => setEnlargedQrModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div>
              <h4 className="text-base font-bold text-white">{enlargedQrModal.title}</h4>
              <p className="text-xs text-slate-400 mt-0.5">Scan with your mobile banking or wallet app</p>
            </div>

            <div className="p-4 bg-white rounded-xl flex items-center justify-center shadow-inner">
              <img
                src={enlargedQrModal.image}
                alt="Enlarged QR"
                className="max-h-72 max-w-full object-contain"
              />
            </div>

            <button
              type="button"
              onClick={() => setEnlargedQrModal(null)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
