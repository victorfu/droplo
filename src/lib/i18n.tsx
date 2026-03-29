import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { en } from '../locales/en';
import { zhTW } from '../locales/zh-TW';

export type Locale = 'en' | 'zh-TW';

const translations = { en, 'zh-TW': zhTW } as const;

function getNestedValue(obj: Record<string, unknown>, path: string): string {
  const result = path.split('.').reduce<unknown>((acc, key) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[key];
    return undefined;
  }, obj);
  return typeof result === 'string' ? result : path;
}

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getInitialLocale(): Locale {
  const saved = localStorage.getItem('droplo-locale');
  if (saved === 'en' || saved === 'zh-TW') return saved;
  return navigator.language.startsWith('zh') ? 'zh-TW' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem('droplo-locale', l);
  }, []);

  const t = useCallback(
    (key: string) => getNestedValue(translations[locale] as unknown as Record<string, unknown>, key),
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
