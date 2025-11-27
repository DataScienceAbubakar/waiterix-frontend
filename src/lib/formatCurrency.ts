import type { Language } from './translations';
import { CURRENCY_LOCALES } from '@/shared/currencyMapping';

// Currency code mapping based on language/region (DEPRECATED - use explicit currency code instead)
// Only used as fallback when no explicit currency is provided
const CURRENCY_BY_LANGUAGE: Record<Language, string> = {
  en: 'USD',
  es: 'EUR',
  fr: 'EUR',
  de: 'EUR',
  it: 'EUR',
  zh: 'CNY',
  ja: 'JPY',
  ar: 'SAR',
  pt: 'EUR',
  ru: 'RUB',
};

// Locale mapping for number formatting
const LOCALE_BY_LANGUAGE: Record<Language, string> = {
  en: 'en-US',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ar: 'ar-SA',
  pt: 'pt-PT',
  ru: 'ru-RU',
};

interface FormatCurrencyOptions {
  currency?: string;
  language?: Language;
  locale?: string;
}

/**
 * Format a number as currency using Intl.NumberFormat
 * 
 * @param amount - The amount to format
 * @param options - Formatting options (currency code, language, or explicit locale)
 * @returns Formatted currency string
 * 
 * @example
 * formatCurrency(12.50, { language: 'en' }) // "$12.50"
 * formatCurrency(12.50, { language: 'fr' }) // "12,50 €"
 * formatCurrency(1200, { language: 'ja' }) // "¥1,200"
 * formatCurrency(12.50, { currency: 'GBP', locale: 'en-GB' }) // "£12.50"
 */
export function formatCurrency(
  amount: number | string,
  options: FormatCurrencyOptions = {}
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '0';
  }

  const { currency, language, locale } = options;
  
  // Determine currency code (PRIORITY: explicit currency > language-based fallback > USD)
  let currencyCode = currency;
  if (!currencyCode && language) {
    currencyCode = CURRENCY_BY_LANGUAGE[language];
  }
  if (!currencyCode) {
    currencyCode = 'USD'; // Default fallback
  }

  // Determine locale (PRIORITY: explicit locale > currency-based > language-based > en-US)
  let localeString = locale;
  if (!localeString && currencyCode) {
    localeString = CURRENCY_LOCALES[currencyCode];
  }
  if (!localeString && language) {
    localeString = LOCALE_BY_LANGUAGE[language];
  }
  if (!localeString) {
    localeString = 'en-US'; // Default fallback
  }

  try {
    return new Intl.NumberFormat(localeString, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (error) {
    // Fallback if Intl.NumberFormat fails
    console.error('Currency formatting error:', error);
    return `${currencyCode} ${numericAmount.toFixed(2)}`;
  }
}

/**
 * Format a number without currency symbol (just locale-aware number formatting)
 */
export function formatNumber(
  amount: number | string,
  options: { language?: Language; locale?: string; decimals?: number } = {}
): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) {
    return '0';
  }

  const { language, locale, decimals = 2 } = options;
  
  let localeString = locale;
  if (!localeString && language) {
    localeString = LOCALE_BY_LANGUAGE[language];
  }
  if (!localeString) {
    localeString = 'en-US';
  }

  try {
    return new Intl.NumberFormat(localeString, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(numericAmount);
  } catch (error) {
    console.error('Number formatting error:', error);
    return numericAmount.toFixed(decimals);
  }
}
