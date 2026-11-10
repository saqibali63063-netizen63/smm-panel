import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ThemeMode } from '../types/index.ts';
import { api } from '../lib/api.ts';
import { useAuth } from './AuthContext.tsx';

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
    description: 'Deep navy background, electric blue accents, premium dark cards, and wholesale typography.',
    badge: 'Default',
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
    description: 'Pure white background, sky blue accents, clean light cards, minimal shadows, and crisp legibility.',
    badge: 'Daylight',
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
    description: 'Deep cyber obsidian black, purple and neon cyan gradients, futuristic glowing borders, and animations.',
    badge: 'Futuristic',
    primaryColor: '#8b5cf6',
    accentColor: '#06b6d4',
    bgColor: '#05050b',
    cardColor: '#0d0b1a',
    palette: ['#05050b', '#0d0b1a', '#8b5cf6', '#06b6d4']
  }
};

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (newTheme: ThemeMode, persist?: boolean) => Promise<void>;
  previewTheme: (newTheme: ThemeMode) => void;
  cancelPreview: () => void;
  confirmPreview: () => Promise<void>;
  isPreviewing: boolean;
  previewedTheme: ThemeMode | null;
  configs: typeof THEME_CONFIGS;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = 'pakservices_theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  // Initial theme from user profile or localStorage or default to 'midnight'
  const getInitialTheme = (): ThemeMode => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode;
    if (saved && (saved === 'midnight' || saved === 'crystal' || saved === 'neon')) {
      return saved;
    }
    return 'midnight';
  };

  const [activeTheme, setActiveTheme] = useState<ThemeMode>(getInitialTheme);
  const [previewedTheme, setPreviewedTheme] = useState<ThemeMode | null>(null);

  // Apply theme attribute to document root & body
  const applyThemeToDOM = (t: ThemeMode) => {
    document.documentElement.setAttribute('data-theme', t);
    document.body.setAttribute('data-theme', t);

    // Update meta theme-color for mobile browser address bars
    let metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta');
      metaThemeColor.setAttribute('name', 'theme-color');
      document.head.appendChild(metaThemeColor);
    }
    const color = THEME_CONFIGS[t]?.bgColor || '#080d1a';
    metaThemeColor.setAttribute('content', color);
  };

  // Sync with user's saved preference when logged in
  useEffect(() => {
    if (user?.theme && (user.theme === 'midnight' || user.theme === 'crystal' || user.theme === 'neon')) {
      if (user.theme !== activeTheme) {
        setActiveTheme(user.theme);
        localStorage.setItem(STORAGE_KEY, user.theme);
      }
    }
  }, [user?.theme]);

  // Whenever activeTheme changes (and not previewing), apply to DOM
  useEffect(() => {
    const current = previewedTheme || activeTheme;
    applyThemeToDOM(current);
  }, [activeTheme, previewedTheme]);

  // Set theme permanently (updates state, localStorage, and database if user logged in)
  const setTheme = async (newTheme: ThemeMode, persist = true) => {
    setActiveTheme(newTheme);
    setPreviewedTheme(null);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyThemeToDOM(newTheme);

    if (persist && user) {
      try {
        await api.updateTheme(newTheme);
      } catch (e) {
        // Silent fail on network error, local persistence still works
      }
    }
  };

  // Temporary Live Preview
  const previewTheme = (tempTheme: ThemeMode) => {
    setPreviewedTheme(tempTheme);
    applyThemeToDOM(tempTheme);
  };

  // Revert preview back to saved active theme
  const cancelPreview = () => {
    setPreviewedTheme(null);
    applyThemeToDOM(activeTheme);
  };

  // Confirm and apply the previewed theme
  const confirmPreview = async () => {
    if (previewedTheme) {
      await setTheme(previewedTheme, true);
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        theme: previewedTheme || activeTheme,
        setTheme,
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
