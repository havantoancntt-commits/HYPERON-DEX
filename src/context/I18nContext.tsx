import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES, LanguageMeta, getTranslation } from '../lib/i18n';

export type AppTheme = 'dark' | 'light' | 'cyberpunk';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  languageMeta: LanguageMeta;
  t: (key: string) => string;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  supportedLanguages: LanguageMeta[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem('hyperon_lang');
      if (saved && SUPPORTED_LANGUAGES.some((l) => l.code === saved)) {
        return saved as SupportedLanguage;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const savedTheme = localStorage.getItem('hyperon_theme');
      if (savedTheme && (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'cyberpunk')) {
        return savedTheme as AppTheme;
      }
    } catch {
      // ignore
    }
    return 'dark';
  });

  const languageMeta = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  const setLanguage = (lang: SupportedLanguage) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('hyperon_lang', lang);
    } catch {
      // ignore
    }
  };

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem('hyperon_theme', newTheme);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = languageMeta.dir;
    
    // Apply theme classes to root element
    document.documentElement.classList.remove('theme-dark', 'theme-light', 'theme-cyberpunk');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [language, languageMeta.dir, theme]);

  const t = (key: string): string => {
    return getTranslation(language, key);
  };

  return (
    <I18nContext.Provider
      value={{
        language,
        setLanguage,
        languageMeta,
        t,
        theme,
        setTheme,
        supportedLanguages: SUPPORTED_LANGUAGES,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
};
