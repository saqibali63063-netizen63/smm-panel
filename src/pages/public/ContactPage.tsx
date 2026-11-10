import React, { useState } from 'react';
import { api } from '../../lib/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  Headphones,
  Mail,
  MapPin,
  Send,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  LifeBuoy
} from 'lucide-react';

interface ContactPageProps {
  onNavigate: (view: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [name, setName] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      setStatus({ type: 'error', text: 'Please fill out all required fields.' });
      return;
    }

    setSubmitting(true);
    setStatus(null);

    try {
      const res = await api.submitContact({ name, email, subject, message });
      setStatus({ type: 'success', text: res.message });
      setSubject('');
      setMessage('');
    } catch (err: any) {
      setStatus({ type: 'error', text: err.message || 'Failed to send message.' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold">
          <Headphones className="w-3.5 h-3.5" />
          <span>24/7 Dedicated Support</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Get in Touch With Our Pakistan Desk
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Need custom high-volume reseller rates, deposit verification, or technical API support? We are here to help.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Contact Info Cards */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="p-5 rounded-xl bg-[#090f20] border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Direct Instant Messengers
            </h3>

            {/* WhatsApp */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0c1426] border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">WhatsApp Helpline</div>
                  <div className="text-[11px] text-slate-400 font-mono">+92 341 7208670</div>
                </div>
              </div>
              <a
                href="https://wa.me/923417208670?text=Assalam%20o%20Alaikum%20PakServices%20Support%2C%20mujhe%20website%20par%20help%20chahiye."
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors text-xs font-semibold"
              >
                Chat
              </a>
            </div>

            {/* Telegram */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#0c1426] border border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-sky-950 border border-sky-800/60 flex items-center justify-center text-sky-400">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-white">Telegram Channel & Bot</div>
                  <div className="text-[11px] text-slate-400 font-mono">@PakServicesOfficial</div>
                </div>
              </div>
              <a
                href="https://t.me/PakServicesOfficial"
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600 hover:text-white transition-colors text-xs font-semibold"
              >
                Open
              </a>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0c1426] border border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Corporate Inquiries</div>
                <div className="text-[11px] text-slate-400 font-mono">support@pakservices.com</div>
              </div>
            </div>

            {/* Office Address */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-[#0c1426] border border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-white">Technology Office</div>
                <div className="text-[11px] text-slate-400">Software Technology Park, Gulberg III, Lahore, Pakistan</div>
              </div>
            </div>

          </div>

          {/* Ticket desk prompt */}
          {user && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-sky-950/60 to-blue-950/40 border border-sky-800/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white">Logged-in Reseller?</div>
                <div className="text-[11px] text-slate-400">Open a prioritized support ticket for order queries.</div>
              </div>
              <button
                onClick={() => onNavigate('tickets')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold"
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Ticket Desk</span>
              </button>
            </div>
          )}

        </div>

        {/* Contact Form */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#090f20] p-6 space-y-4">
          <h3 className="text-base font-bold text-white">
            Send an Online Inquiry
          </h3>

          {status && (
            <div className={`p-3.5 rounded-lg flex items-center gap-2.5 text-xs font-medium ${
              status.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-800/80 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-800/80 text-rose-300'
            }`}>
              {status.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{status.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Your Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder=""
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=""
                  className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Subject / Department</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g. Deposit Inquiry / Custom API Integration"
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1.5">Message / Details *</label>
              <textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your question, order ID, or partnership proposal..."
                className="w-full bg-[#070b16] border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Sending Message...' : 'Submit Message'}</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
