import React, { useState } from 'react';
import { Code, Copy, Check, Terminal, ExternalLink } from 'lucide-react';

interface ApiDocsPageProps {
  onNavigate: (view: string) => void;
}

export const ApiDocsPage: React.FC<ApiDocsPageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'add' | 'status' | 'services' | 'balance' | 'refill'>('add');
  const [selectedLang, setSelectedLang] = useState<'curl' | 'python' | 'node' | 'php'>('curl');
  const [copied, setCopied] = useState<boolean>(false);

  const API_URL = `${window.location.origin}/api/v2`;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCodeSnippet = () => {
    if (activeTab === 'add') {
      if (selectedLang === 'curl') {
        return `curl -X POST "${API_URL}" \\
  -d "key=YOUR_API_KEY" \\
  -d "action=add" \\
  -d "service=1" \\
  -d "link=https://instagram.com/p/your_post" \\
  -d "quantity=1000"`;
      }
      if (selectedLang === 'python') {
        return `import requests

payload = {
    'key': 'YOUR_API_KEY',
    'action': 'add',
    'service': 1,
    'link': 'https://instagram.com/p/your_post',
    'quantity': 1000
}

response = requests.post('${API_URL}', data=payload)
print(response.json())`;
      }
      if (selectedLang === 'node') {
        return `const response = await fetch('${API_URL}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'YOUR_API_KEY',
    action: 'add',
    service: 1,
    link: 'https://instagram.com/p/your_post',
    quantity: 1000
  })
});
const data = await response.json();
console.log(data);`;
      }
      if (selectedLang === 'php') {
        return `<?php
$ch = curl_init('${API_URL}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'key' => 'YOUR_API_KEY',
    'action' => 'add',
    'service' => 1,
    'link' => 'https://instagram.com/p/your_post',
    'quantity' => 1000
]));
$response = curl_exec($ch);
curl_close($ch);
echo $response;`;
      }
    }

    if (activeTab === 'status') {
      if (selectedLang === 'curl') {
        return `curl -X POST "${API_URL}" \\
  -d "key=YOUR_API_KEY" \\
  -d "action=status" \\
  -d "order=101"`;
      }
      if (selectedLang === 'python') {
        return `import requests
response = requests.post('${API_URL}', data={'key': 'YOUR_API_KEY', 'action': 'status', 'order': 101})
print(response.json())`;
      }
      if (selectedLang === 'node') {
        return `const response = await fetch('${API_URL}?key=YOUR_API_KEY&action=status&order=101');
const data = await response.json();
console.log(data);`;
      }
      if (selectedLang === 'php') {
        return `<?php
$response = file_get_contents('${API_URL}?key=YOUR_API_KEY&action=status&order=101');
echo $response;`;
      }
    }

    if (activeTab === 'services') {
      if (selectedLang === 'curl') {
        return `curl -X POST "${API_URL}" \\
  -d "key=YOUR_API_KEY" \\
  -d "action=services"`;
      }
      if (selectedLang === 'python') {
        return `import requests
response = requests.post('${API_URL}', data={'key': 'YOUR_API_KEY', 'action': 'services'})
print(response.json())`;
      }
      if (selectedLang === 'node') {
        return `const res = await fetch('${API_URL}?key=YOUR_API_KEY&action=services');
console.log(await res.json());`;
      }
      if (selectedLang === 'php') {
        return `<?php
$response = file_get_contents('${API_URL}?key=YOUR_API_KEY&action=services');
echo $response;`;
      }
    }

    if (activeTab === 'balance') {
      return `curl -X POST "${API_URL}" \\
  -d "key=YOUR_API_KEY" \\
  -d "action=balance"`;
    }

    if (activeTab === 'refill') {
      return `curl -X POST "${API_URL}" \\
  -d "key=YOUR_API_KEY" \\
  -d "action=refill" \\
  -d "order=101"`;
    }

    return '';
  };

  const getResponseExample = () => {
    switch (activeTab) {
      case 'add':
        return `{\n  "order": 10429\n}`;
      case 'status':
        return `{\n  "charge": "299.00",\n  "start_count": "1420",\n  "status": "Completed",\n  "remains": "0",\n  "currency": "PKR"\n}`;
      case 'services':
        return `[\n  {\n    "service": 1,\n    "name": "Instagram Followers [HQ Real - 30 Days Refill]",\n    "type": "Default",\n    "category": "Instagram",\n    "rate": "299.00",\n    "min": "50",\n    "max": "100000",\n    "refill": true,\n    "cancel": false\n  }\n]`;
      case 'balance':
        return `{\n  "balance": "4500.00",\n  "currency": "PKR"\n}`;
      case 'refill':
        return `{\n  "refill": 101\n}`;
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      
      {/* Intro */}
      <div className="space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded bg-sky-950/60 border border-sky-800/60 text-sky-400 text-xs font-semibold">
          <Terminal className="w-3.5 h-3.5" />
          <span>Standard SMM Panel v2 Specification</span>
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          PakServices Reseller API Documentation
        </h1>
        <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
          Easily connect your own SMM panel (Perfect Panel, SmartPanel, WordPress, custom software) to PakServices. Use your private API key to query services, dispatch orders, and check live delivery status.
        </p>
      </div>

      {/* Base URL Box */}
      <div className="p-4 rounded-xl bg-[#090f20] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs text-slate-400 block font-medium">HTTP Method & Public Endpoint:</span>
          <span className="text-sm font-mono font-bold text-sky-400">
            POST {API_URL}
          </span>
        </div>
        <button
          onClick={() => onNavigate('api-keys')}
          className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white transition-colors self-start sm:self-auto"
        >
          Get My API Key
        </button>
      </div>

      {/* Action Tabs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-800 pb-2">
          {[
            { id: 'add', label: '1. Add Order' },
            { id: 'status', label: '2. Order Status' },
            { id: 'services', label: '3. Services List' },
            { id: 'balance', label: '4. User Balance' },
            { id: 'refill', label: '5. Refill Request' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Runner & Response Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Code Snippet */}
          <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-[#070c18] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0a1022] border-b border-slate-800">
              <div className="flex items-center gap-1.5">
                {(['curl', 'python', 'node', 'php'] as const).map(lang => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold uppercase ${
                      selectedLang === lang ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <button
                onClick={() => copyToClipboard(getCodeSnippet())}
                className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>

            <div className="p-4 flex-1 font-mono text-xs text-sky-200 overflow-x-auto whitespace-pre leading-relaxed">
              {getCodeSnippet()}
            </div>
          </div>

          {/* Right: Response Output */}
          <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#070c18] overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 bg-[#0a1022] border-b border-slate-800 text-xs font-bold text-slate-300">
              JSON Response Example (200 OK)
            </div>
            <div className="p-4 flex-1 font-mono text-xs text-emerald-400 overflow-x-auto whitespace-pre leading-relaxed">
              {getResponseExample()}
            </div>
          </div>

        </div>
      </div>

      {/* Standard SMM v2 Parameters Reference Table */}
      <div className="rounded-xl border border-slate-800 bg-[#090f20] p-6 space-y-4">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider">
          Parameters Description
        </h3>
        <table className="w-full text-left text-xs">
          <thead className="text-slate-400 border-b border-slate-800 font-semibold">
            <tr>
              <th className="py-2.5 px-3">Parameter</th>
              <th className="py-2.5 px-3">Type</th>
              <th className="py-2.5 px-3">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300 font-mono">
            <tr>
              <td className="py-2.5 px-3 text-sky-400">key</td>
              <td className="py-2.5 px-3 text-slate-400 font-sans">string</td>
              <td className="py-2.5 px-3 font-sans">Your unique PakServices API key (generated in your dashboard).</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-sky-400">action</td>
              <td className="py-2.5 px-3 text-slate-400 font-sans">string</td>
              <td className="py-2.5 px-3 font-sans">Action type: 'services', 'add', 'status', 'refill', 'balance'.</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-sky-400">service</td>
              <td className="py-2.5 px-3 text-slate-400 font-sans">integer</td>
              <td className="py-2.5 px-3 font-sans">Target service ID (required for 'add' action).</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-sky-400">link</td>
              <td className="py-2.5 px-3 text-slate-400 font-sans">string</td>
              <td className="py-2.5 px-3 font-sans">Public link to profile, post, or channel.</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-sky-400">quantity</td>
              <td className="py-2.5 px-3 text-slate-400 font-sans">integer</td>
              <td className="py-2.5 px-3 font-sans">Order quantity between min and max limits.</td>
            </tr>
            <tr>
              <td className="py-2.5 px-3 text-sky-400">order</td>
              <td className="py-2.5 px-3 text-slate-400 font-sans">integer</td>
              <td className="py-2.5 px-3 font-sans">Order ID returned after creating an order.</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
};
