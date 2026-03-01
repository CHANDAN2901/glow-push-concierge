import React, { useState, useCallback, useEffect } from 'react';
import { I18nContext, Language, translate } from '@/lib/i18n';

const detectBrowserLanguage = (): Language => {
  const browserLang = navigator.language || (navigator as any).userLanguage || '';
  return browserLang.startsWith('he') ? 'he' : 'en';
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Language>(detectBrowserLanguage);

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
