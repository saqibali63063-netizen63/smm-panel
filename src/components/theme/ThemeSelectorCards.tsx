import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { ThemeMode } from '../../types/index.ts';
import { Palette, Check, Eye, Sun, Moon, Sparkles, CheckCircle2, RotateCcw } from 'lucide-react';

export const ThemeSelectorCards: React.FC = () => {
  const { theme, setTheme, previewTheme, cancelPreview, confirmPreview, isPreviewing, previewedTheme, configs } = useTheme();
  const [savingTheme, setSavingTheme] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const currentActiveTheme = previewedTheme || theme;

  const handleApply = async (t: ThemeMode) => {
    setSavingTheme(t);
    try {
      await setTheme(t, true);
      setMsg(`${configs[t].name} applied and saved to your profile!`);
      setTimeout(() => setMsg(null), 3500);
    } finally {
      setSavingTheme(null);
    }
  };

  const getThemeIcon = (id: ThemeMode) => {
    switch (id) {
      case 'crystal':
        return <Sun className="w-5 h-5 text-amber-500" />;
      case 'neon':
        return <Sparkles className="w-5 h-5 text-purple-400" />;
      case 'midnight':
      default:
        return <Moon className="w-5 h-5 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Live Preview Notification Bar */}
      {isPreviewing && (
        <div className="p-3.5 rounded-xl bg-purple-950/70 border border-purple-800 text-purple-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400 shrink-0" />
            <span>
              Previewing <strong>{configs[previewedTheme!].name}</strong> live on this screen.
            </span>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={cancelPreview}
              className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Cancel Preview</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await confirmPreview();
                setMsg(`${configs[previewedTheme!].name} saved to your profile!`);
                setTimeout(() => setMsg(null), 3500);
              }}
              className="px-3.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1 shadow-md cursor-pointer"
            >
              <Check className="w-3 h-3" />
              <span>Save & Apply</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {msg && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{msg}</span>
        </div>
      )}

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(Object.keys(configs) as ThemeMode[]).map((themeKey) => {
          const conf = configs[themeKey];
          const isSelected = currentActiveTheme === themeKey;

          return (
            <div
              key={themeKey}
              className={`rounded-2xl border p-4.5 flex flex-col justify-between transition-all ${
                isSelected
                  ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/40 shadow-xl'
                  : 'border-slate-800 bg-[#070b16] hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center">
                    {getThemeIcon(themeKey)}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {conf.badge}
                  </span>
                </div>

                {/* Title */}
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-1.5">
                    {conf.name}
                    {isSelected && <Check className="w-4 h-4 text-sky-400" />}
                  </h4>
                  <div className="text-xs text-slate-400 font-medium">
                    {conf.tagline}
                  </div>
                </div>

                {/* UI Miniature Visual Preview */}
                <div 
                  className="p-3 rounded-xl border border-slate-700/60 space-y-2 shadow-inner"
                  style={{ backgroundColor: conf.bgColor }}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-2 rounded-full" style={{ backgroundColor: conf.primaryColor }} />
                    <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: conf.accentColor }} />
                  </div>
                  <div className="p-2 rounded-lg border border-slate-700/40 space-y-1" style={{ backgroundColor: conf.cardColor }}>
                    <div className="w-20 h-1.5 rounded" style={{ backgroundColor: conf.primaryColor }} />
                    <div className="w-12 h-1 rounded bg-slate-500/40" />
                  </div>
                  <div className="flex items-center gap-1.5 pt-1">
                    {conf.palette.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-black/30 shadow-xs" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  {conf.description}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex items-center gap-2 border-t border-slate-800/80 mt-3">
                <button
                  type="button"
                  onClick={() => previewTheme(themeKey)}
                  className="flex-1 py-2 px-3 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700/70 transition-all cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Live Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleApply(themeKey)}
                  disabled={savingTheme === themeKey}
                  className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/30'
                      : 'bg-slate-700/60 hover:bg-sky-600 text-slate-200 hover:text-white'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Current</span>
                    </>
                  ) : (
                    <span>{savingTheme === themeKey ? 'Applying...' : 'Apply Theme'}</span>
                  )}
                </button>
              </div>

            </div>
          );
        })}
      </div>
    </div>
  );
};
