import React from 'react';
import { Zap, ShieldCheck, Headphones, Wallet, CheckCircle2 } from 'lucide-react';

interface FooterProps {
  onNavigate: (view: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="border-t border-slate-800 bg-[#060a14] text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          {/* Brand & Mission */}
          <div className="md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold text-white tracking-tight">
                Pak<span className="text-sky-400">Services</span>
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Pakistan's leading wholesale SMM panel platform. Reliable social growth for agencies, influencers, creators, and digital resellers worldwide.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>100% Secure & AdSense Compliant</span>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Quick Navigation</h4>
            <ul className="space-y-2 text-xs">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-sky-400 transition-colors">
                  Home Overview
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('services')} className="hover:text-sky-400 transition-colors">
                  Wholesale Services List
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('faq')} className="hover:text-sky-400 transition-colors">
                  Frequently Asked Questions
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('contact')} className="hover:text-sky-400 transition-colors">
                  24/7 Customer Support
                </button>
              </li>
            </ul>
          </div>

          {/* Social Platforms */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Supported Platforms</h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5">
                <span className="text-slate-300">Instagram Growth & Reels</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-300">TikTok FYP Views & Likes</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-300">YouTube Watchtime & Subs</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-300">Facebook Monetization Views</span>
              </li>
              <li className="flex items-center gap-1.5">
                <span className="text-slate-300">Telegram & Spotify Streams</span>
              </li>
            </ul>
          </div>

          {/* Payments & Legal */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-3">Local Payment Gateways</h4>
            <div className="space-y-2.5 text-xs text-slate-300 mb-4">
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Easypaisa & JazzCash (Instant 2-min)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <CheckCircle2 className="w-4 h-4 text-sky-400 shrink-0" />
                <span>Meezan Bank & All 1Link Online Transfer</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span>USDT Tether (TRC20 / BEP20)</span>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <button onClick={() => onNavigate('terms')} className="hover:text-slate-300">
                Terms of Service
              </button>
              <span>·</span>
              <button onClick={() => onNavigate('privacy')} className="hover:text-slate-300">
                Privacy Policy
              </button>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            © {new Date().getFullYear()} PakServices Technologies. All rights reserved. SMM Panel Architecture.
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span className="flex items-center gap-1">
              <Headphones className="w-3.5 h-3.5 text-sky-400" /> WhatsApp: +92 312 3456789
            </span>
            <span>·</span>
            <span>Telegram: @PakServicesOfficial</span>
          </div>
        </div>

      </div>
    </footer>
  );
};
