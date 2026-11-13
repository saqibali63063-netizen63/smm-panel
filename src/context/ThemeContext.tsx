import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ThemeMode } from '../types/index.ts';
import { api } from '../lib/api.ts';

export interface ThemeConfig {
  id: ThemeMode;
  name: string;
  tagline: string;
  description: string;
  badge: string;
  primaryColor: string;
  accentColor: string;
  bgColor: string;
  cardColor: string;
  palette: string[];
}

export const THEME_CONFIGS: Record<ThemeMode, ThemeConfig> = {
  midnight: {
    id: 'midnight',
    name: 'Midnight Pro',
    tagline: 'Dark Navy & Electric Blue',
    description: 'Deep navy background, electric blue accents, premium dark cards, modern sidebar, and wholesale typography.',
    badge: 'Executive Dark',
    primaryColor: '#0284c7',
    accentColor: '#38bdf8',
    bgColor: '#080d1a',
    cardColor: '#090f20',
    palette: ['#080d1a', '#090f20', '#38bdf8', '#0284c7']
  },
  crystal: {
    id: 'crystal',
    name: 'Crystal Light',
    tagline: 'Pure White & Sky Blue',
    description: 'Clean white background, sky blue accents, crisp light cards, minimal shadows, and high-legibility daylight styling.',
    badge: 'Daylight Clean',
    primaryColor: '#0284c7',
    accentColor: '#0ea5e9',
    bgColor: '#f8fafc',
    cardColor: '#ffffff',
    palette: ['#f8fafc', '#ffffff', '#e2e8f0', '#0284c7']
  },
  neon: {
    id: 'neon',
    name: 'Neon Galaxy',
    tagline: 'Obsidian Black & Cyber Neon',
    description: 'Deep black background, purple and neon cyan gradients, glowing borders, and subtle cyber animations.',
    badge: 'Cyber Gradient',
    primaryColor: '#8b5cf6',
    accentColor: '#06b6d4',
    bgColor: '#05050b',
    cardColor: '#0d0b1a',
    palette: ['#05050b', '#0d0b1a', '#8b5cf6', '#06b6d4']
  }
};

interface ThemeContextType {
  theme: ThemeMode;
  activeTheme: ThemeMode;
  applyGlobalTheme: (newTheme: ThemeMode) => Promise<void>;
  refreshGlobalTheme: () => Promise<void>;
  previewTheme: (newTheme: ThemeMode) => void;
  cancelPreview: () => void;
  confirmPreview: () => Promise<void>;
  isPreviewing: boolean;
  previewedTheme: ThemeMode | null;
  configs: typeof THEME_CONFIGS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'pakservices_global_theme';

function isValidTheme(val: any): val is ThemeMode {
  return val === 'midnight' || val === 'crystal' || val === 'neon';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const getCachedTheme = (): ThemeMode => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isValidTheme(saved) ? saved : 'midnight';
  };

  const [activeTheme, setActiveTheme] = useState<ThemeMode>(getCachedTheme);
  const [previewedTheme, setPreviewedTheme] = useState<ThemeMode | null>(null);

  const applyThemeToDOM = useCallback((t: ThemeMode) => {
    document.documentElement.setAttribute('data-theme', t);
    document.body.setAttribute('data-theme', t);

    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    const color = THEME_CONFIGS[t]?.bgColor || '#080d1a';
    metaThemeColor.setAttribute('content', color);
  }, []);

  const refreshGlobalTheme = useCallback(async () => {
    try {
      const res = await api.getGlobalTheme();
      if (isValidTheme(res.theme)) {
        setActiveTheme(res.theme);
        localStorage.setItem(STORAGE_KEY, res.theme);
      }
    } catch {
      // Keep cached/default theme on transient network error
    }
  }, []);

  // Load authoritative global theme from backend on mount & window focus
  useEffect(() => {
    refreshGlobalTheme();
    const handleFocus = () => {
      refreshGlobalTheme();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refreshGlobalTheme]);

  // Apply active or previewed theme to DOM whenever changed
  useEffect(() => {
    const current = previewedTheme || activeTheme;
    applyThemeToDOM(current);
  }, [activeTheme, previewedTheme, applyThemeToDOM]);

  // Admin-only persistent global theme update
  const applyGlobalTheme = async (newTheme: ThemeMode) => {
    const res = await api.admin.setGlobalTheme(newTheme);
    const savedTheme = isValidTheme(res.theme) ? res.theme : newTheme;
    setActiveTheme(savedTheme);
    setPreviewedTheme(null);
    localStorage.setItem(STORAGE_KEY, savedTheme);
    applyThemeToDOM(savedTheme);
  };

  // Admin local live preview before saving globally
  const previewTheme = (tempTheme: ThemeMode) => {
    setPreviewedTheme(tempTheme);
    applyThemeToDOM(tempTheme);
  };

  const cancelPreview = () => {
    setPreviewedTheme(null);
    applyThemeToDOM(activeTheme);
  };

  const confirmPreview = async () => {
    if (previewedTheme) {
      await applyGlobalTheme(previewedTheme);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: previewedTheme || activeTheme,
        activeTheme,
        applyGlobalTheme,
        refreshGlobalTheme,
        previewTheme,
        cancelPreview,
        confirmPreview,
        isPreviewing: previewedTheme !== null && previewedTheme !== activeTheme,
        previewedTheme,
        configs: THEME_CONFIGS
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
