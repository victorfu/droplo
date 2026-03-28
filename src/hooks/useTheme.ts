import { useState, useEffect, useCallback } from 'react';
import type { ThemeMode, UseThemeReturn } from '@/types';

const STORAGE_KEY = 'droplo-theme';

function applyTheme(theme: ThemeMode): void {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
}

export function useTheme(): UseThemeReturn {
  const [mode, setMode] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === 'light' || saved === 'dark' ? saved : 'dark';
  });

  useEffect(() => {
    applyTheme(mode);
  }, [mode]);

  const toggle = useCallback(() => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark';
    setMode(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, [mode]);

  return { mode, toggle };
}
