export const APP_NAME = 'Popati';
export const APP_VERSION = '0.12.27';

export const SUPPORTED_LOCALES = [
    { code: 'en', name: 'English' },
    { code: 'fr', name: 'Français' },
    { code: 'de', name: 'Deutsch' }
] as const;

const isDev = typeof window !== "undefined" && window.location.hostname === "localhost";

export const API_URL = isDev
  ? "http://localhost:3000"
  : "https://api.lanlod.com"; // TODO: Update with your production API URL