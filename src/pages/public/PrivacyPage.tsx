import React from 'react';
import { Lock } from 'lucide-react';

export const PrivacyPage: React.FC<{ onNavigate: (view: string) => void }> = () => {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8 text-slate-300 text-xs sm:text-sm leading-relaxed">
      <div className="space-y-2 border-b border-slate-800 pb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold">
          <Lock className="w-3.5 h-3.5" />
          <span>User Privacy</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
        <p className="text-xs text-slate-400">Commitment to security & confidential data handling</p>
      </div>

      <div className="space-y-6">
        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">1. Information We Collect</h2>
          <p>
            When registering on PakServices, we collect your username, email address, and IP address for session security. We never ask for your social media account passwords. Our services only require the public profile or post URL to deliver promotions.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">2. Payment Verification Data</h2>
          <p>
            For manual payment methods (Easypaisa, JazzCash, Bank Transfer), you submit transaction IDs (TRX IDs) and optional payment receipts. This information is solely used to verify deposits and is encrypted within our database.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">3. Non-Disclosure & Reseller Privacy</h2>
          <p>
            We strictly respect reseller confidentiality. Your client usernames, order links, and API activity are never shared, sold, or disclosed to third-party advertisers or competing networks.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="text-base font-bold text-white">4. Cookies and Security</h2>
          <p>
            We store authenticated bearer session tokens locally on your browser. Passwords are encrypted using salted PBKDF2 cryptographic hashing.
          </p>
        </section>
      </div>
    </div>
  );
};
