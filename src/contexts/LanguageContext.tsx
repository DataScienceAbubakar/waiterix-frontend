import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Language, TranslationKey, getTranslation } from '@/lib/translations';
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from '@/lib/formatCurrency';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  formatCurrency: (amount: number | string, currencyCode?: string) => string;
  formatNumber: (amount: number | string, decimals?: number) => string;
  setCurrencyCode: (code: string | undefined) => void;
  currencyCode?: string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
  defaultLanguage?: Language;
}

export function LanguageProvider({ children, defaultLanguage = 'en' }: LanguageProviderProps) {
  // Manage currency code state internally (no dependency on RestaurantContext)
  const [currencyCode, setCurrencyCode] = useState<string | undefined>(undefined);
  
  const [language, setLanguageState] = useState<Language>(() => {
    const stored = localStorage.getItem('language');
    return (stored as Language) || defaultLanguage;
  });

  useEffect(() => {
    localStorage.setItem('language', language);
    document.documentElement.lang = language;
    
    // Set RTL direction for Arabic
    if (language === 'ar') {
      document.documentElement.dir = 'rtl';
    } else {
      document.documentElement.dir = 'ltr';
    }
  }, [language]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
  };

  const t = (key: TranslationKey): string => {
    return getTranslation(language, key);
  };

  const formatCurrency = (amount: number | string, overrideCurrency?: string): string => {
    // Use override currency, then restaurant's currency, then language-based default
    const finalCurrency = overrideCurrency || currencyCode;
    return formatCurrencyUtil(amount, { language, currency: finalCurrency });
  };

  const formatNumber = (amount: number | string, decimals: number = 2): string => {
    return formatNumberUtil(amount, { language, decimals });
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, formatCurrency, formatNumber, setCurrencyCode, currencyCode }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
