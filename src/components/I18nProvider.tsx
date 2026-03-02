import React, { useState, useCallback, useEffect } from 'react';
import { I18nContext, Language, translate } from '@/lib/i18n';

const getDefaultLanguage = (): Language => {
  const saved = localStorage.getItem('glow-lang');
  if (saved === 'en' || saved === 'he') return saved;
  return 'he'; // Force Hebrew by default
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Language>(getDefaultLanguage);

  const setLang = (newLang: Language) => {
    localStorage.setItem('glow-lang', newLang);
    setLangState(newLang);
  };

  const t = useCallback((key: string) => translate(key, lang), [lang]);
  const dir = lang === 'he' ? 'rtl' : 'ltr';

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = lang;
  }, [dir, lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      <div dir={dir}>
        {children}
      </div>
    </I18nContext.Provider>
  );
};
