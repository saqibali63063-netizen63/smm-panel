import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const TermsPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Legal Agreement</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Terms of Service</h1>
        <p className="text-xs text-slate-400">Last updated: November 2026</p>
      </div>

      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Acceptance of Terms</h2>
          <p>
            By creating an account, depositing funds, or placing orders through PakServices, you agree to be bound by these Terms of Service. If you do not accept these terms, please do not use the service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. SMM Services & Delivery</h2>
          <p>
            PakServices provides promotional social media marketing services strictly for visibility, social proof, and engagement enhancement. We guarantee the numerical delivery of orders according to the specific service parameters (start time, speed, and min/max quantities).
          </p>
          <p>
            Users agree not to submit links containing adult, illegal, hateful, or fraudulent content. PakServices reserves the right to terminate accounts that violate community standards.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Payments, Deposits & Refunds</h2>
          <p>
            All deposits made via Easypaisa, JazzCash, Bank Transfer, or USDT are final once credited to your account balance. Your balance can be used to purchase any services on our catalog at any time.
          </p>
          <p>
            If an order is canceled or partially delivered due to a server disruption, the unfulfilled portion is automatically refunded back to your PakServices account balance. Balance refunds to personal bank accounts can be requested via support tickets subject to verification.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Refill Policy</h2>
          <p>
            Services designated with "Refill" support include a 30-day warranty window. If a drop in count occurs within this timeframe, clicking the "Refill" button will re-dispatch followers/views to restore the count. Refill is void if you change your account username, make the account private, or submit conflicting orders from other panels.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">5. Account Security</h2>
          <p>
            Users are responsible for keeping their login credentials confidential. PakServices employs rate limiting and audit controls to safeguard your balance and order history.
          </p>
        </section>
      </div>
    </div>
  );
};
