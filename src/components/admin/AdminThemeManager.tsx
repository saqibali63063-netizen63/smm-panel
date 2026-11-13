import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext.tsx';
import type { ThemeMode } from '../../types/index.ts';
import {
  Palette,
  Check,
  Eye,
  Sparkles,
  Sun,
  Moon,
  Globe,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react';

export const AdminThemeManager: React.FC = () => {
  const {
    theme,
    activeTheme,
    applyGlobalTheme,
    previewTheme,
    cancelPreview,
    isPreviewing,
    previewedTheme,
    configs
  } = useTheme();

  const [pendingConfirmTheme, setPendingConfirmTheme] = useState<ThemeMode | null>(null);
  const [applying, setApplying] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleConfirmApply = async () => {
    if (!pendingConfirmTheme) return;
    setApplying(true);
    setFeedback(null);
    try {
      await applyGlobalTheme(pendingConfirmTheme);
      setFeedback({
        type: 'success',
        text: `Global website theme updated to "${configs[pendingConfirmTheme].name}". All visitors and users now see this theme.`
      });
      setPendingConfirmTheme(null);
      setTimeout(() => setFeedback(null), 5000);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err.message || 'Failed to save global theme setting.'
      });
    } finally {
      setApplying(false);
    }
  };

  const renderMockPreview = (key: ThemeMode) => {
    if (key === 'midnight') {
      return (
        <div className="w-full h-36 rounded-xl bg-[#080d1a] border border-slate-800 p-2.5 flex flex-col gap-2 overflow-hidden relative select-none">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-sky-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div className="h-2 w-14 rounded bg-slate-200/80" />
            </div>
            <div className="flex gap-1">
              <div className="h-2.5 w-8 rounded bg-sky-600/80" />
            </div>
          </div>
          <div className="flex gap-2 flex-1">
            <div className="w-1/4 rounded-lg bg-[#090e1c] border border-slate-800/80 p-1.5 space-y-1.5">
              <div className="h-1.5 w-full rounded bg-sky-600" />
              <div className="h-1.5 w-4/5 rounded bg-slate-700" />
              <div className="h-1.5 w-3/4 rounded bg-slate-800" />
              <div className="h-1.5 w-full rounded bg-slate-800" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-9 rounded-lg bg-[#090f20] border border-slate-800 p-1.5 flex flex-col justify-between">
                  <div className="h-1 w-6 rounded bg-slate-500" />
                  <div className="h-2 w-9 rounded bg-sky-400" />
                </div>
                <div className="h-9 rounded-lg bg-[#090f20] border border-slate-800 p-1.5 flex flex-col justify-between">
                  <div className="h-1 w-6 rounded bg-slate-500" />
                  <div className="h-2 w-9 rounded bg-emerald-400" />
                </div>
                <div className="h-9 rounded-lg bg-[#090f20] border border-slate-800 p-1.5 flex flex-col justify-between">
                  <div className="h-1 w-6 rounded bg-slate-500" />
                  <div className="h-2 w-9 rounded bg-amber-400" />
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-[#090f20] border border-slate-800 p-2 space-y-1.5">
                <div className="flex justify-between">
                  <div className="h-1.5 w-14 rounded bg-slate-600" />
                  <div className="h-1.5 w-8 rounded bg-sky-500" />
                </div>
                <div className="h-1.5 w-full rounded bg-slate-800" />
                <div className="h-1.5 w-5/6 rounded bg-slate-800" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (key === 'crystal') {
      return (
        <div className="w-full h-36 rounded-xl bg-[#f8fafc] border border-slate-200 p-2.5 flex flex-col gap-2 overflow-hidden relative select-none">
          <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
            <div className="flex items-center gap-1.5">
              <div className="w-3.5 h-3.5 rounded bg-sky-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-white" />
              </div>
              <div className="h-2 w-14 rounded bg-slate-800" />
            </div>
            <div className="flex gap-1">
              <div className="h-2.5 w-8 rounded bg-sky-500" />
            </div>
          </div>
          <div className="flex gap-2 flex-1">
            <div className="w-1/4 rounded-lg bg-white border border-slate-200 p-1.5 space-y-1.5 shadow-2xs">
              <div className="h-1.5 w-full rounded bg-sky-600" />
              <div className="h-1.5 w-4/5 rounded bg-slate-300" />
              <div className="h-1.5 w-3/4 rounded bg-slate-200" />
              <div className="h-1.5 w-full rounded bg-slate-200" />
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              <div className="grid grid-cols-3 gap-1.5">
                <div className="h-9 rounded-lg bg-white border border-slate-200 p-1.5 flex flex-col justify-between shadow-2xs">
                  <div className="h-1 w-6 rounded bg-slate-400" />
                  <div className="h-2 w-9 rounded bg-sky-600" />
                </div>
                <div className="h-9 rounded-lg bg-white border border-slate-200 p-1.5 flex flex-col justify-between shadow-2xs">
                  <div className="h-1 w-6 rounded bg-slate-400" />
                  <div className="h-2 w-9 rounded bg-emerald-600" />
                </div>
                <div className="h-9 rounded-lg bg-white border border-slate-200 p-1.5 flex flex-col justify-between shadow-2xs">
                  <div className="h-1 w-6 rounded bg-slate-400" />
                  <div className="h-2 w-9 rounded bg-amber-500" />
                </div>
              </div>
              <div className="flex-1 rounded-lg bg-white border border-slate-200 p-2 space-y-1.5 shadow-2xs">
                <div className="flex justify-between">
                  <div className="h-1.5 w-14 rounded bg-slate-400" />
                  <div className="h-1.5 w-8 rounded bg-sky-600" />
                </div>
                <div className="h-1.5 w-full rounded bg-slate-200" />
                <div className="h-1.5 w-5/6 rounded bg-slate-200" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-36 rounded-xl bg-[#05050b] border border-purple-500/40 p-2.5 flex flex-col gap-2 overflow-hidden relative shadow-[0_0_18px_rgba(168,85,247,0.18)] select-none">
        <div className="flex items-center justify-between border-b border-purple-500/30 pb-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded bg-gradient-to-tr from-purple-600 to-cyan-500 flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-white" />
            </div>
            <div className="h-2 w-14 rounded bg-purple-100" />
          </div>
          <div className="flex gap-1">
            <div className="h-2.5 w-8 rounded bg-gradient-to-r from-purple-500 to-cyan-400" />
          </div>
        </div>
        <div className="flex gap-2 flex-1">
          <div className="w-1/4 rounded-lg bg-[#0a0817] border border-purple-500/30 p-1.5 space-y-1.5">
            <div className="h-1.5 w-full rounded bg-gradient-to-r from-purple-500 to-cyan-400" />
            <div className="h-1.5 w-4/5 rounded bg-purple-900" />
            <div className="h-1.5 w-3/4 rounded bg-purple-950" />
            <div className="h-1.5 w-full rounded bg-purple-950" />
          </div>
          <div className="flex-1 flex flex-col gap-1.5">
            <div className="grid grid-cols-3 gap-1.5">
              <div className="h-9 rounded-lg bg-[#0d0a1f] border border-purple-500/35 p-1.5 flex flex-col justify-between">
                <div className="h-1 w-6 rounded bg-purple-400/70" />
                <div className="h-2 w-9 rounded bg-cyan-400" />
              </div>
              <div className="h-9 rounded-lg bg-[#0d0a1f] border border-purple-500/35 p-1.5 flex flex-col justify-between">
                <div className="h-1 w-6 rounded bg-purple-400/70" />
                <div className="h-2 w-9 rounded bg-purple-400" />
              </div>
              <div className="h-9 rounded-lg bg-[#0d0a1f] border border-purple-500/35 p-1.5 flex flex-col justify-between">
                <div className="h-1 w-6 rounded bg-purple-400/70" />
                <div className="h-2 w-9 rounded bg-emerald-400" />
              </div>
            </div>
            <div className="flex-1 rounded-lg bg-[#0d0a1f] border border-purple-500/35 p-2 space-y-1.5">
              <div className="flex justify-between">
                <div className="h-1.5 w-14 rounded bg-purple-400/60" />
                <div className="h-1.5 w-8 rounded bg-cyan-400" />
              </div>
              <div className="h-1.5 w-full rounded bg-purple-950" />
              <div className="h-1.5 w-5/6 rounded bg-purple-950" />
            </div>
          </div>
        </div>
      </div>
    );
  };

  const getThemeIcon = (key: ThemeMode) => {
    switch (key) {
      case 'crystal':
        return <Sun className="w-4 h-4 text-sky-500" />;
      case 'neon':
        return <Sparkles className="w-4 h-4 text-purple-400" />;
      case 'midnight':
      default:
        return <Moon className="w-4 h-4 text-sky-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1.5">
            <Globe className="w-3.5 h-3.5" />
            <span>Global Website Appearance</span>
          </div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Palette className="w-6 h-6 text-sky-400" />
            <span>Theme &amp; Appearance Control</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Manage the global theme across the entire PakServices platform—including Homepage, Login, Register, User Dashboard, Orders, Add Funds, and Admin Panel. Only Administrators can switch the website theme.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-[#090f20] border border-slate-800 flex items-center gap-3 self-start">
          <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center shrink-0">
            {getThemeIcon(activeTheme)}
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
              Live Global Theme
            </div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{configs[activeTheme].name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-200'
              : 'bg-rose-950/60 border-rose-800 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span className="font-medium">{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-slate-400 hover:text-white px-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Live Preview Banner */}
      {isPreviewing && previewedTheme && (
        <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-xs">
            <Eye className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-white">
                Live Previewing: {configs[previewedTheme].name}
              </div>
              <div className="text-slate-300">
                Only you see this preview right now. Click &ldquo;Apply Globally&rdquo; to publish this theme to all users and pages.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={cancelPreview}
              className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Revert Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setPendingConfirmTheme(previewedTheme)}
              className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/20"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Apply Globally</span>
            </button>
          </div>
        </div>
      )}

      {/* 3 Theme Selector Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {(['midnight', 'crystal', 'neon'] as ThemeMode[]).map((key) => {
          const cfg = configs[key];
          const isActiveGlobal = activeTheme === key;
          const isCurrentlyDisplayed = theme === key;
          const isThisPreviewing = previewedTheme === key && previewedTheme !== activeTheme;

          return (
            <div
              key={key}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all bg-[#090f20] ${
                isThisPreviewing
                  ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                  : isActiveGlobal
                  ? 'border-sky-500 ring-2 ring-sky-500/25 shadow-lg'
                  : 'border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="space-y-4">
                {/* Live Mockup Preview */}
                {renderMockPreview(key)}

                {/* Title & Badges */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {getThemeIcon(key)}
                      <h3 className="text-base font-bold text-white">{cfg.name}</h3>
                    </div>

                    {isActiveGlobal ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/80">
                        <Check className="w-3 h-3" />
                        Active Global
                      </span>
                    ) : isThisPreviewing ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-700/80">
                        <Eye className="w-3 h-3" />
                        Previewing
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                        {cfg.badge}
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] font-semibold text-sky-400">{cfg.tagline}</div>
                  <p className="text-xs text-slate-400 leading-relaxed">{cfg.description}</p>
                </div>

                {/* Color Palette Swatches */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] text-slate-400 font-medium">Palette Tokens</span>
                  <div className="flex items-center gap-1.5">
                    {cfg.palette.map((hex, i) => (
                      <span
                        key={i}
                        title={hex}
                        className="w-5 h-5 rounded-full border border-slate-600/70 shadow-2xs"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                {isThisPreviewing ? (
                  <button
                    type="button"
                    onClick={cancelPreview}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Revert</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => previewTheme(key)}
                    disabled={isCurrentlyDisplayed && !isPreviewing}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 disabled:cursor-not-allowed text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>Live Preview</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setPendingConfirmTheme(key)}
                  disabled={isActiveGlobal}
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    isActiveGlobal
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800 cursor-default'
                      : 'bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/20'
                  }`}
                >
                  {isActiveGlobal ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Applied</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-3.5 h-3.5" />
                      <span>Apply Globally</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {pendingConfirmTheme && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0b1220] border border-slate-700 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-sky-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Apply {configs[pendingConfirmTheme].name} Globally?
                  </h3>
                  <p className="text-[11px] text-slate-400">Admin Global Appearance Update</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPendingConfirmTheme(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-[#070b16] border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed">
              <p>
                This will immediately activate <strong className="text-white">{configs[pendingConfirmTheme].name}</strong> across the entire PakServices website for all visitors, users, and administrators.
              </p>
              <p className="text-[11px] text-slate-400">
                Saved permanently in database settings and preserved across future deployments.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingConfirmTheme(null)}
                disabled={applying}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApply}
                disabled={applying}
                className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-sky-600/20"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{applying ? 'Applying...' : 'Confirm & Apply Globally'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
