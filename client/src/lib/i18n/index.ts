import { writable, derived } from 'svelte/store';
import en from './locales/en';

export type Locale = 'en' | 'fr' | 'de';
export type TranslationKey = keyof typeof en;

const translations: Record<Locale, Record<string, string>> = {
    en,
    fr: en, // Fallback to English until French is added
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

// Initialize from localStorage
export function initLocale() {
    if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem('locale') as Locale | null;
        if (saved && translations[saved]) {
            locale.set(saved);
        }
    }
}