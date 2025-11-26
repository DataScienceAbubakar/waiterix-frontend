import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

/**
 * Hook to automatically sync restaurant currency to LanguageProvider
 * Handles lifecycle cleanup to prevent stale currency between restaurant navigations
 */
export function useRestaurantCurrency(currencyCode?: string) {
  const { setCurrencyCode } = useLanguage();

  // Set currency when it changes
  useEffect(() => {
    if (currencyCode) {
      setCurrencyCode(currencyCode);
    }
  }, [currencyCode, setCurrencyCode]);

  // Cleanup only on unmount (empty deps = runs once on mount, cleanup on unmount)
  useEffect(() => {
    return () => {
      setCurrencyCode(undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
