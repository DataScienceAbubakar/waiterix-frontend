import { createContext, useContext, ReactNode, useEffect } from 'react';
import { useLanguage } from './LanguageContext';

interface RestaurantContextType {
  currencyCode?: string;
  defaultLanguage?: string;
}

const RestaurantContext = createContext<RestaurantContextType | undefined>(undefined);

interface RestaurantProviderProps {
  children: ReactNode;
  currencyCode?: string;
  defaultLanguage?: string;
}

export function RestaurantProvider({ children, currencyCode, defaultLanguage }: RestaurantProviderProps) {
  const { setCurrencyCode, setLanguage } = useLanguage();

  // Automatically sync currency to LanguageProvider when currencyCode is available
  useEffect(() => {
    if (currencyCode) {
      setCurrencyCode(currencyCode);
    }
    
    // Cleanup: clear currency code on unmount (don't force USD)
    return () => {
      setCurrencyCode(undefined);
    };
  }, [currencyCode, setCurrencyCode]);

  useEffect(() => {
    if (defaultLanguage) {
      setLanguage(defaultLanguage);
    }
  }, [defaultLanguage, setLanguage]);

  return (
    <RestaurantContext.Provider value={{ currencyCode, defaultLanguage }}>
      {children}
    </RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const context = useContext(RestaurantContext);
  return context || {};
}
