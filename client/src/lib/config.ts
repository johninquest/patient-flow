export const APP_NAME = 'Popaty';
export const APP_VERSION = '0.2.22';

export const SUPPORTED_LOCALES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    // { code: 'de', name: 'Deutsch' }
] as const;

const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

export const API_URL = isDev
  ? "http://localhost:3000"
  : "https://api.popaty.com";