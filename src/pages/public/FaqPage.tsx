import React, { useState } from 'react';
import { ChevronDown, HelpCircle, MessageSquare } from 'lucide-react';

interface FaqPageProps {
  onNavigate: (view: string) => void;
}

interface FaqItem {
  q: string;
  a: string;
  category: 'General' | 'Payments' | 'Orders' | 'Refills & Drops';
}

export const FaqPage: React.FC<FaqPageProps> = ({ onNavigate }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs: FaqItem[] = [
    {
      category: 'General',
      q: 'What is PakServices SMM Panel?',
      a: 'PakServices is a Social Media Marketing (SMM) wholesale reseller platform in Pakistan. We supply followers, likes, views, watchtime, and engagement across TikTok, Instagram, YouTube, Facebook, and Telegram at direct wholesale rates.'
    },
    {
      category: 'Payments',
      q: 'How do I add funds using Easypaisa or JazzCash?',
      a: 'Go to your dashboard and click "Add Funds". Select either Easypaisa or JazzCash, send the desired amount (minimum Rs 100) to our official account number, and submit your 11-digit Transaction ID (TRX ID). Our automated system checks incoming SMS alerts and credits your balance within 2 to 5 minutes.'
    },
    {
      category: 'Payments',
      q: 'Are bank transfers and cryptocurrency (USDT) supported?',
      a: 'Yes! We support 1Link bank transfers to Meezan Bank from any Pakistani bank (HBL, Alfalah, UBL, SadaPay, NayaPay). For international clients, we accept Tether USDT on TRC20 and BEP20 networks.'
    },
    {
      category: 'Orders',
      q: 'What link format should I provide for Instagram, TikTok, and YouTube?',
      a: 'For followers/subscribers, enter your full public profile URL (e.g., https://instagram.com/username or https://tiktok.com/@username). For likes and views, enter the exact link to the post, reel, or video. Always make sure your account is public before placing an order.'
    },
    {
      category: 'Orders',
      q: 'Can I place multiple orders at once (Mass Order)?',
      a: 'Yes! Use the "Mass Order" tab in your user dashboard. You can paste dozens or hundreds of orders simultaneously in the format: service_id | quantity | link.'
    },
    {
      category: 'Refills & Drops',
      q: 'What does the "30-Day Refill" guarantee mean?',
      a: 'If any social media network runs an algorithm update and you notice a drop in count within 30 days of placing an order, simply go to "My Orders" and click the "Refill" button. Our server will automatically check the link and refill the dropped count free of charge.'
    },
    {
      category: 'Orders',
      q: 'Can an order be canceled after submission?',
      a: 'While an order is in "Pending" status before our dispatch engine has started processing it, you can cancel it with 1 click in "My Orders" for an immediate automatic refund to your balance.'
    },
    {
      category: 'General',
      q: 'How does the 5% Referral Commission work?',
      a: 'Every registered user has a unique referral link. Whenever anyone signs up through your link, you automatically earn a lifetime 5% commission on every single order they complete, credited directly to your spendable balance.'
    }
  ];

  const categories = ['All', 'General', 'Payments', 'Orders', 'Refills & Drops'];
  const filtered = selectedCategory === 'All' ? faqs : faqs.filter(f => f.category === selectedCategory);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Knowledge Base</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          Frequently Asked Questions
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
          Everything you need to know about placing orders, adding funds via Easypaisa/JazzCash, and drop refills.
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              selectedCategory === cat
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* FAQ Accordion */}
      <div className="space-y-3">
        {filtered.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div
              key={index}
              className="rounded-xl border border-slate-800 bg-[#090f20] overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenIndex(isOpen ? null : index)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left text-xs sm:text-sm font-semibold text-white hover:text-sky-400 transition-colors"
              >
                <span className="pr-4">{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-slate-400 shrink-0 transform transition-transform duration-200 ${
                    isOpen ? 'rotate-180 text-sky-400' : ''
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-4 sm:px-5 pb-5 text-xs text-slate-300 leading-relaxed border-t border-slate-800/80 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Still need help callout */}
      <div className="p-6 rounded-xl bg-[#0c1426] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div>
          <h4 className="text-sm font-bold text-white mb-1">Still have unanswered questions?</h4>
          <p className="text-xs text-slate-400">Our Pakistani customer care specialists are available 24/7 on WhatsApp and ticket desk.</p>
        </div>
        <button
          onClick={() => onNavigate('contact')}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold text-xs whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Contact Live Support</span>
        </button>
      </div>

    </div>
  );
};
