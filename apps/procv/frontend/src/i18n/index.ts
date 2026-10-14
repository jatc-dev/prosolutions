import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslations from '../locales/en.json';
import esTranslations from '../locales/es.json';

// Resources object
const resources = {
  en: {
    translation: enTranslations,
  },
  es: {
    translation: esTranslations,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector) // Detect user language
  .use(initReactI18next) // Pass i18n down to react-i18next
  .init({
    resources,
    fallbackLng: 'en', // Fallback language (Spanish)
    debug: import.meta.env.DEV,

    // Language detection options
    detection: {
      order: ['querystring', 'localStorage', 'navigator', 'htmlTag'],
      lookupQuerystring: 'lang',
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes values
    },

    react: {
      useSuspense: false, // Disable suspense for better UX
    },
  });

// Keep the document language in sync with the active language (a11y + SEO).
function syncDocumentLanguage(language: string) {
  if (typeof document !== 'undefined' && language) {
    document.documentElement.lang = language;
  }
}

i18n.on('languageChanged', syncDocumentLanguage);
syncDocumentLanguage(i18n.resolvedLanguage || i18n.language);

export default i18n;