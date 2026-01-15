import { writable, derived } from 'svelte/store';
import en from './locales/en';
import fr from './locales/fr';

export type Locale = 'en' | 'fr' | 'de';
export type TranslationKey = keyof typeof en;

const translations: Record<Locale, Record<string, string>> = {
    en,
    fr,
    de: en  // Fallback to English until German is added
};

// Current locale store
export const locale = writable<Locale>('en');

// Translation function store
export const t = derived(locale, ($locale) => {
    return (key: TranslationKey, params?: Record<string, string>): string => {
        let text = translations[$locale][key] || translations['en'][key] || key;
        
        // Replace parameters like {{name}} with actual values
        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                text = text.replace(new RegExp(`{{${k}}}`, 'g'), v);
            });
        }
        
        return text;
    };
});

// Helper to change locale
export function setLocale(newLocale: Locale) {
    locale.set(newLocale);
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('locale', newLocale);
    }
}

// Initialize from browser or localStorage
export function initLocale() {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('locale') as Locale | null;
        if (saved && translations[saved]) {
            console.log('[i18n] Using saved locale:', saved);
            locale.set(saved);
            return;
        }
        
        // Detect browser language if no saved preference
        const browserLang = navigator.language.toLowerCase();
        console.log('[i18n] Detected browser language:', browserLang);
        
        if (browserLang.startsWith('fr')) {
            console.log('[i18n] Setting locale to: fr');
            locale.set('fr');
        } else if (browserLang.startsWith('de')) {
            console.log('[i18n] Setting locale to: de');
            locale.set('de');
        } else {
            console.log('[i18n] Setting locale to: en (default)');
            locale.set('en'); // Default fallback
        }
    }
}