import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api.ts';
import type { SupportTicket, TicketMessage } from '../../types/index.ts';
import {
  LifeBuoy,
  MessageSquare,
  Send,
  X,
  User,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export const AdminTicketsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Active chat
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  const fetchTickets = () => {
    setLoading(true);
    api.admin.getTickets(statusFilter)
      .then(res => setTickets(res.tickets))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchTickets();
  }, [statusFilter]);

  const openThread = async (t: SupportTicket) => {
    setActiveTicket(t);
    try {
      const res = await api.getTicketDetails(t.id);
      setMessages(res.messages);
    } catch {
      // quiet
    }
  };

  const handleSendAdminReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;

    setSending(true);
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
      setSending(false);
    }
  };

  const handleClose = async () => {
    if (!activeTicket) return;
    try {
      await api.closeTicket(activeTicket.id);
      setActiveTicket({ ...activeTicket, status: 'closed' });
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Failed to close');
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono">
            Support Desk Operations
          </div>
          <h1 className="text-2xl font-bold text-white">Customer Support Tickets</h1>
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#090f20] border border-slate-800 rounded-lg">
          {['all', 'open', 'answered', 'closed'].map(st => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors ${
                statusFilter === st ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c1428] text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Ticket ID</th>
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Subject</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    Loading tickets queue...
                  </td>
                </tr>
              ) : tickets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No tickets found in this filter.
                  </td>
                </tr>
              ) : (
                tickets.map(t => (
                  <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-400">#{t.id}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{t.username}</div>
                      <div className="text-[11px] text-slate-400 font-mono">{t.email}</div>
                    </td>
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
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        t.status === 'answered'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : t.status === 'open'
                          ? 'bg-sky-950 text-sky-300 border border-sky-800'
                          : 'bg-slate-800 text-slate-400'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => openThread(t)}
                        className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px]"
                      >
                        Reply / View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Conversation Modal */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-2xl bg-[#0c1326] border border-slate-700 rounded-2xl p-6 shadow-2xl relative flex flex-col h-[85vh]">
            
            <div className="flex items-start justify-between border-b border-slate-800 pb-3 shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-amber-400 font-bold">Ticket #{activeTicket.id}</span>
                  <span className="text-xs text-slate-400">User: {activeTicket.username}</span>
                </div>
                <h3 className="text-base font-bold text-white mt-1">
                  {activeTicket.subject}
                </h3>
              </div>

              <div className="flex items-center gap-2">
                {activeTicket.status !== 'closed' && (
                  <button
                    onClick={handleClose}
                    className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs"
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

            {/* Messages list */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-2">
              {messages.map(m => {
                const isAdmin = m.sender_role === 'admin';
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-xl text-xs max-w-[85%] ${
                      isAdmin
                        ? 'bg-amber-950/40 border border-amber-800/80 ml-auto text-amber-100'
                        : 'bg-[#080d1a] border border-slate-800 mr-auto text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 font-semibold text-[11px]">
                      {isAdmin ? (
                        <div className="flex items-center gap-1 text-amber-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Admin Response (You)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-sky-400">
                          <User className="w-3.5 h-3.5" />
                          <span>{m.sender_username || activeTicket.username}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-slate-500 font-mono ml-auto">
                        {new Date(m.created_at).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="leading-relaxed whitespace-pre-wrap">{m.message}</p>
                  </div>
                );
              })}
            </div>

            {/* Admin reply input */}
            <form onSubmit={handleSendAdminReply} className="pt-3 border-t border-slate-800 flex gap-2 shrink-0">
              <input
                type="text"
                required
                placeholder="Type official admin reply to user..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={sending}
                className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{sending ? 'Sending...' : 'Send Reply'}</span>
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};
