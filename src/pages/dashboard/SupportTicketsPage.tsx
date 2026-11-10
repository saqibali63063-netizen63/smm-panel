import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import type { SupportTicket, TicketMessage } from '../../types/index.ts';
import {
  LifeBuoy,
  PlusCircle,
  MessageSquare,
  Send,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  User,
  ShieldCheck
} from 'lucide-react';

export const SupportTicketsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Modal
  const [createModal, setCreateModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [category, setCategory] = useState('Order');
  const [priority, setPriority] = useState('normal');
  const [orderId, setOrderId] = useState('');
  const [initialMessage, setInitialMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Active Ticket Thread
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replying, setReplying] = useState(false);

  const fetchTickets = () => {
    api.getTickets()
      .then(res => setTickets(res.tickets))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openTicketThread = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    try {
      const res = await api.getTicketDetails(ticket.id);
      setMessages(res.messages);
    } catch {
      // quiet
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !initialMessage.trim()) return;

    setSubmitting(true);
    try {
      await api.createTicket({
        subject: subject.trim(),
        category,
        priority,
        order_id: orderId.trim() || undefined,
        message: initialMessage.trim()
      });

      setCreateModal(false);
      setSubject('');
      setOrderId('');
      setInitialMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to create ticket');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    setReplying(true);
    try {
      await api.sendTicketMessage(activeTicket.id, replyText.trim());
      setReplyText('');
      const res = await api.getTicketDetails(activeTicket.id);
      setMessages(res.messages);
      setActiveTicket(res.ticket);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setReplying(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!activeTicket) return;
    try {
      await api.closeTicket(activeTicket.id);
      setActiveTicket({ ...activeTicket, status: 'closed' });
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to close ticket');
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-sky-400 uppercase tracking-wider mb-1">
            Customer Care Desk
          </div>
          <h1 className="text-2xl font-bold text-white">Support Tickets</h1>
          <p className="text-xs text-slate-400 mt-1">
            24/7 direct communication with PakServices technical team
          </p>
        </div>

        <button
          onClick={() => setCreateModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs transition-colors self-start sm:self-auto shadow-md shadow-sky-600/30"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Open New Ticket</span>
        </button>
      </div>

      {/* Tickets List */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Last Updated</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading tickets...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No support tickets open. Click "Open New Ticket" if you need any assistance!
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{t.id}</td>
                    <td className="py-3 px-4 font-semibold text-white max-w-sm truncate">
                      {t.subject}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{t.category}</td>
                    <td className="py-3 px-4 capitalize">
                      <span className={`text-[11px] font-semibold ${
                        t.priority === 'high' ? 'text-rose-400' : 'text-slate-400'
                      }`}>
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold capitalize ${
                        t.status === 'answered'
                          ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                          : t.status === 'open'
                          ? 'bg-sky-950/80 text-sky-300 border border-sky-800/60'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(t.updated_at).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openTicketThread(t)}
                        className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px]"
                      >
                        View Chat
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Ticket Modal */}
      {createModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setCreateModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-base font-bold text-white">Create New Support Ticket</h3>

            <form onSubmit={handleCreateTicket} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Subject *</label>
                <input
                  type="text"
                  required
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Order #102 speed check"
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="Order">Order Issue</option>
                    <option value="Payment">Payment</option>
                    <option value="Refill">Refill Query</option>
                    <option value="API">API Question</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-2 text-white"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Order ID</label>
                  <input
                    type="number"
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="Optional"
                    className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-2.5 py-2 text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Detailed Message *</label>
                <textarea
                  required
                  rows={4}
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="Describe your issue or question in detail..."
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-3 text-white"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateModal(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-xs font-semibold text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold text-white shadow-md shadow-sky-600/30"
                >
                  {submitting ? 'Creating...' : 'Submit Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Ticket Conversation Thread Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative flex flex-col h-[85vh]">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-sky-400 font-bold">Ticket #{activeTicket.id}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                    activeTicket.status === 'answered' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-sky-950 text-sky-300 border border-sky-800'
                  }`}>
                    {activeTicket.status}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {activeTicket.subject}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {activeTicket.status !== 'closed' && (
                  <button
                    onClick={handleCloseTicket}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-medium"
                  >
                    Close Ticket
                  </button>
                )}
                <button
                  onClick={() => setActiveTicket(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Messages Body */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
              {messages.map(m => {
                const isAdmin = m.sender_role === 'admin';
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl text-xs max-w-[85%] ${
                      isAdmin
                        ? 'bg-sky-950/70 border border-sky-800/80 mr-auto text-sky-100'
                        : 'bg-[#080d1a] border border-slate-800 ml-auto text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 font-semibold text-[11px]">
                      {isAdmin ? (
                        <div className="flex items-center gap-1 text-sky-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>PakServices Admin Support</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400">
                          <User className="w-3.5 h-3.5" />
                          <span>{m.sender_username || user?.username} (You)</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono ml-auto">
                        {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input */}
            {activeTicket.status !== 'closed' ? (
              <form onSubmit={handleSendReply} className="pt-3 border-t border-slate-800 flex gap-2 shrink-0">
                <input
                  type="text"
                  required
                  placeholder="Type your reply message..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
                <button
                  type="submit"
                  disabled={replying}
                  className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{replying ? 'Sending...' : 'Send'}</span>
                </button>
              </form>
            ) : (
              <div className="pt-3 border-t border-slate-800 text-center text-xs text-slate-400">
                This ticket has been marked closed. Open a new ticket if you require further assistance.
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
