import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

type Lang = 'ar' | 'en';

interface LangContextValue {
  lang: Lang;
  dir: 'rtl' | 'ltr';
  toggle: () => void;
  setLang: (l: Lang) => void;
  t: (ar: string, en: string) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('lang');
    return saved === 'en' ? 'en' : 'ar';
  });

  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  useEffect(() => {
    const html = document.documentElement;
    html.dir = dir;
    html.lang = lang;
    localStorage.setItem('lang', lang);
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => setLangState(l), []);
  const toggle = useCallback(() => setLangState((prev) => (prev === 'ar' ? 'en' : 'ar')), []);
  const t = useCallback((ar: string, en: string) => (lang === 'ar' ? ar : en), [lang]);

  return (
    <LangContext.Provider value={{ lang, dir, toggle, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLanguage(): LangContextValue {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
