import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { ThemeMode } from '../../types/index.ts';
import {
  Palette,
  Check,
  Eye,
  RotateCcw,
  Sparkles,
  Sun,
  Moon,
  X,
  CheckCircle2,
  Sliders
} from 'lucide-react';

interface ThemeSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ThemeSwitcherModal: React.FC<ThemeSwitcherModalProps> = ({ isOpen, onClose }) => {
  const { theme, setTheme, previewTheme, cancelPreview, confirmPreview, isPreviewing, previewedTheme, configs } = useTheme();
  const [savingTheme, setSavingTheme] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentActiveTheme = previewedTheme || theme;

  const handleSelectTheme = async (themeId: ThemeMode) => {
    setSavingTheme(themeId);
    try {
      await setTheme(themeId, true);
      setSuccessBanner(`Applied ${configs[themeId].name}!`);
      setTimeout(() => setSuccessBanner(null), 3000);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-[#0c1326] border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={() => {
            if (isPreviewing) cancelPreview();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Palette className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-sky-400">
              Appearance & Personalization
            </div>
            <h2 className="text-xl font-bold text-white">Select Workspace Theme</h2>
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Choose a visual design language for your wholesale dashboard. Your selection is automatically persisted to your account and devices.
        </p>

        {/* Live Preview Notification Bar */}
        {isPreviewing && (
          <div className="p-3 rounded-xl bg-purple-950/60 border border-purple-800 text-purple-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-purple-400 shrink-0" />
              <span>
                Currently previewing <strong>{configs[previewedTheme!].name}</strong> in real-time.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                type="button"
                onClick={cancelPreview}
                className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert</span>
              </button>
              <button
                type="button"
                onClick={async () => {
                  await confirmPreview();
                  setSuccessBanner(`Saved ${configs[previewedTheme!].name} to profile!`);
                  setTimeout(() => setSuccessBanner(null), 3000);
                }}
                className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Apply Permanently</span>
              </button>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {successBanner && (
          <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-800 text-emerald-200 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successBanner}</span>
          </div>
        )}

        {/* 3 Theme Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {(Object.keys(configs) as ThemeMode[]).map((themeKey) => {
            const conf = configs[themeKey];
            const isSelected = currentActiveTheme === themeKey;

            return (
              <div
                key={themeKey}
                className={`relative rounded-xl border p-4 flex flex-col justify-between transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-sky-950/20 ring-1 ring-sky-500/50 shadow-lg'
                    : 'border-slate-800 bg-[#070b16] hover:border-slate-700'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Bar with Icon & Badge */}
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center">
                      {getThemeIcon(themeKey)}
                    </div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {conf.badge}
                    </span>
                  </div>

                  {/* Title & Tagline */}
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      {conf.name}
                      {isSelected && <Check className="w-3.5 h-3.5 text-sky-400" />}
                    </h3>
                    <div className="text-[11px] text-slate-400 font-medium">
                      {conf.tagline}
                    </div>
                  </div>

                  {/* Mini Visual UI Mockup */}
                  <div className="p-2.5 rounded-lg border border-slate-700/60 space-y-1.5" style={{ backgroundColor: conf.bgColor }}>
                    <div className="flex items-center justify-between px-1">
                      <div className="w-8 h-1.5 rounded-full" style={{ backgroundColor: conf.primaryColor }} />
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: conf.accentColor }} />
                    </div>
                    <div className="p-2 rounded border border-slate-700/40 space-y-1" style={{ backgroundColor: conf.cardColor }}>
                      <div className="w-16 h-1 rounded" style={{ backgroundColor: conf.primaryColor }} />
                      <div className="w-10 h-1 rounded bg-slate-500/40" />
                    </div>
                    <div className="flex gap-1 pt-0.5">
                      {conf.palette.map((col, idx) => (
                        <div key={idx} className="w-3.5 h-3.5 rounded-full border border-black/40 shadow-xs" style={{ backgroundColor: col }} />
                      ))}
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {conf.description}
                  </p>
                </div>

                {/* Actions: Live Preview / Apply */}
                <div className="pt-4 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => previewTheme(themeKey)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1 border border-slate-700/60 transition-colors cursor-pointer"
                    title="Test theme before applying"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Preview</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectTheme(themeKey)}
                    disabled={savingTheme === themeKey}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                        : 'bg-slate-700/50 hover:bg-sky-600 text-slate-200 hover:text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Active</span>
                      </>
                    ) : (
                      <span>{savingTheme === themeKey ? 'Saving...' : 'Apply'}</span>
                    )}
                  </button>
                </div>

              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <span>Themes adapt all components, tables, buttons, and charts automatically.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 text-slate-200 hover:text-white font-medium cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
