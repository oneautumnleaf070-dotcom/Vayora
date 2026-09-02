import React, { createContext, useContext, useMemo, useState } from 'react';
import { Locale, StringDictionary, getDictionary } from '../i18n/strings';

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  /** Look up a string by key, with optional {placeholder} substitution. */
  t: (key: keyof StringDictionary, vars?: Record<string, string | number>) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

// Task 5 i18n scaffold: only 'en' ships today, but every farmer-facing string
// already flows through t() so adding a language later means adding a
// dictionary in src/i18n/strings.ts, not touching every screen.
export const LocaleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('en');

  const value = useMemo<LocaleContextType>(() => {
    const dict = getDictionary(locale);
    const t = (key: keyof StringDictionary, vars?: Record<string, string | number>) => {
      let str: string = dict[key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }
      return str;
    };
    return { locale, setLocale, t };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = (): LocaleContextType => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
