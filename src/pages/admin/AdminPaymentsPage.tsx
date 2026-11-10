import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { PaymentRequest } from '../../types/index.ts';
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  Eye,
  X,
  AlertCircle,
  Clock,
  ShieldCheck,
  Check,
  AlertTriangle,
  Copy
} from 'lucide-react';

interface ProcessModalState {
  id: number;
  action: 'approve' | 'reject';
  amount: number;
  username: string;
  trx_id: string;
  method: string;
}

export const AdminPaymentsPage: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  const [payments, setPayments] = useState<PaymentRequest[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [networkFilter, setNetworkFilter] = useState('all');
  const [copiedTrx, setCopiedTrx] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // In-app interactive confirmation / reject modal (replaces window.confirm / window.prompt)
  const [processModal, setProcessModal] = useState<ProcessModalState | null>(null);
  const [adminNote, setAdminNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPayments = () => {
    setLoading(true);
    api.admin.getPayments({
      status: statusFilter,
      method: methodFilter,
      network: networkFilter
    })
      .then(res => setPayments(res.payments))
      .catch(err => {
        setFeedback({ type: 'error', message: err.message || 'Failed to fetch payments.' });
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPayments();
  }, [statusFilter, methodFilter, networkFilter]);

  const copyTrxId = (trx: string) => {
    navigator.clipboard.writeText(trx);
    setCopiedTrx(trx);
    setTimeout(() => setCopiedTrx(null), 2000);
  };

  const handleOpenApproveModal = (p: PaymentRequest) => {
    const methodStr = p.network ? `${p.method} (${p.network})` : p.method;
    setProcessModal({
      id: p.id,
      action: 'approve',
      amount: p.amount,
      username: p.username || 'User',
      trx_id: p.trx_id,
      method: methodStr
    });
    setAdminNote('Payment verified and approved by Administrator.');
  };

  const handleOpenRejectModal = (p: PaymentRequest) => {
    setProcessModal({
      id: p.id,
      action: 'reject',
      amount: p.amount,
      username: p.username || 'User',
      trx_id: p.trx_id,
      method: p.method
    });
    setAdminNote('Transaction ID not found in bank SMS records.');
  };

  const handleConfirmProcess = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!processModal) return;

    setIsSubmitting(true);
    setProcessingId(processModal.id);

    try {
      const res = await api.admin.processPayment(processModal.id, {
        action: processModal.action,
        notes: adminNote.trim() || undefined
      });

      setFeedback({ type: 'success', message: res.message });
      setProcessModal(null);
      fetchPayments();
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to process payment request.' });
    } finally {
      setIsSubmitting(false);
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1 font-mono">
            Gateway Verification Desk
          </div>
          <h1 className="text-2xl font-bold text-white">Manual Payment Approvals</h1>
          <p className="text-xs text-slate-400 mt-1">
            Verify Easypaisa, JazzCash, and Bank TRX IDs against incoming SMS alerts. Approving immediately credits client balance.
          </p>
        </div>

        {/* Filter Controls & Settings Navigation */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => onNavigate('admin-settings')}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
          >
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            <span>Manage Gateways & QR</span>
          </button>

          {/* Status Filter */}
          <div className="flex items-center gap-1 p-1 bg-[#090f20] border border-slate-800 rounded-lg">
            {['all', 'pending', 'approved', 'rejected'].map(st => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  statusFilter === st
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Method Filter Dropdown */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-[#090f20] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Methods</option>
            <option value="easypaisa">Easypaisa</option>
            <option value="jazzcash">JazzCash</option>
            <option value="bank transfer">Bank Transfer</option>
            <option value="usdt">USDT</option>
          </select>

          {/* Network Filter Dropdown */}
          <select
            value={networkFilter}
            onChange={(e) => setNetworkFilter(e.target.value)}
            className="bg-[#090f20] border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 cursor-pointer"
          >
            <option value="all">All Networks</option>
            <option value="bep20">BEP20 (BSC)</option>
            <option value="trc20">TRC20 (TRON)</option>
          </select>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-center gap-3 text-xs ${
          feedback.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
            : 'bg-rose-950/60 border-rose-800 text-rose-200'
        }`}>
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="font-medium">{feedback.message}</span>
        </div>
      )}

      {/* Payment Requests Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Req ID</th>
                <th className="py-3 px-4">Client</th>
                <th className="py-3 px-4">Method & Network</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">TRX ID / Hash</th>
                <th className="py-3 px-4">Sender Account</th>
                <th className="py-3 px-4">Receipt Proof</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verification Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Loading payments queue...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No payment requests found matching the current filters.
                  </td>
                </tr>
              ) : (
                payments.map(p => (
                  <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{p.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{p.username}</div>
                      <div className="text-[11px] text-slate-400 font-mono">Current: Rs {p.current_user_balance?.toFixed(2)}</div>
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
                    <td className="py-3 px-4 font-mono text-sky-400 font-semibold">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate max-w-[140px]" title={p.trx_id}>{p.trx_id}</span>
                        <button
                          type="button"
                          onClick={() => copyTrxId(p.trx_id)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
                          title="Copy Transaction ID"
                        >
                          {copiedTrx === p.trx_id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">{p.sender_account || '-'}</td>
                    <td className="py-3 px-4">
                      {p.screenshot_url ? (
                        <button
                          type="button"
                          onClick={() => setSelectedScreenshot(p.screenshot_url || null)}
                          className="flex items-center gap-2 p-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 border border-slate-700 text-sky-400 hover:text-sky-300 transition-colors cursor-pointer"
                        >
                          <img
                            src={p.screenshot_url}
                            alt="Receipt"
                            className="w-7 h-7 object-cover rounded"
                          />
                          <span className="text-[11px] font-medium pr-1">View</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No receipt</span>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        p.status === 'approved'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : p.status === 'pending'
                          ? 'bg-amber-950 text-amber-300 border border-amber-800 animate-pulse'
                          : 'bg-rose-950 text-rose-300 border border-rose-800'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {p.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenApproveModal(p)}
                            disabled={processingId === p.id}
                            className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 shadow-sm transition-all hover:scale-102 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve & Credit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenRejectModal(p)}
                            disabled={processingId === p.id}
                            className="px-2.5 py-1.5 rounded bg-rose-950/70 text-rose-300 hover:bg-rose-900 border border-rose-800 text-[11px] font-medium transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] font-medium">Processed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation & Rejection Modal (In-App, No window.confirm or prompt) */}
      {processModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <form
            onSubmit={handleConfirmProcess}
            className="w-full max-w-md bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4"
          >
            <button
              type="button"
              onClick={() => setProcessModal(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                processModal.action === 'approve'
                  ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950/80 text-rose-400 border border-rose-800'
              }`}>
                {processModal.action === 'approve' ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <XCircle className="w-5 h-5" />
                )}
              </div>
              <div>
                <span className={`text-[10px] font-mono font-bold uppercase tracking-wider ${
                  processModal.action === 'approve' ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {processModal.action === 'approve' ? 'Deposit Approval' : 'Deposit Rejection'}
                </span>
                <h3 className="text-base font-bold text-white">
                  {processModal.action === 'approve' ? 'Approve & Credit Balance' : 'Reject Deposit Request'}
                </h3>
              </div>
            </div>

            {/* Request Summary Box */}
            <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Request ID:</span>
                <span className="font-mono text-white">#{processModal.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Client Username:</span>
                <span className="font-semibold text-white">{processModal.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Gateway:</span>
                <span className="font-semibold text-white">{processModal.method}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transaction ID (TRX):</span>
                <span className="font-mono text-sky-400 font-bold">{processModal.trx_id}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800/80 pt-2 font-bold text-sm">
                <span className="text-slate-300">Amount:</span>
                <span className="font-mono text-emerald-400">Rs {processModal.amount.toFixed(2)}</span>
              </div>
            </div>

            {processModal.action === 'approve' ? (
              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Confirming this action will immediately credit <strong>Rs {processModal.amount.toFixed(2)}</strong> to <strong>{processModal.username}</strong>'s balance and record the deposit in the user transaction ledger.
                </span>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="block text-xs font-medium text-slate-300">
                  Reason for Rejection *
                </label>
                <textarea
                  rows={2}
                  required
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="e.g. TRX ID not found in bank SMS / Invalid receipt"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {[
                    'TRX ID not found in SMS',
                    'Amount mismatch',
                    'Duplicate submission',
                    'Invalid receipt image'
                  ].map(quick => (
                    <button
                      key={quick}
                      type="button"
                      onClick={() => setAdminNote(quick)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] cursor-pointer"
                    >
                      {quick}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProcessModal(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`px-5 py-2 rounded-lg text-xs font-bold text-white shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
                  processModal.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/30'
                }`}
              >
                {processModal.action === 'approve' ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Approving...' : `Confirm & Credit Rs ${processModal.amount.toFixed(2)}`}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Screenshot Viewer Modal */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xs">
          <div className="relative max-w-2xl max-h-[90vh] bg-[#0c1326] border border-slate-700 rounded-2xl p-4 shadow-2xl flex flex-col items-center">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs font-bold text-white mb-2 self-start">Payment Proof Attachment</div>
            <img
              src={selectedScreenshot}
              alt="Deposit proof screenshot"
              className="max-h-[75vh] w-auto rounded-lg object-contain"
            />
          </div>
        </div>
      )}

    </div>
  );
};
