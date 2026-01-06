// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
    namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
    }

    const __APP_VERSION__: string;
}

/// <reference types="vite-plugin-pwa/info" />

declare module 'virtual:pwa-register/svelte' {
    import type { Writable } from 'svelte/store';
    
    export interface RegisterSWOptions {
        immediate?: boolean;
        onNeedRefresh?: () => void;
        onOfflineReady?: () => void;
        onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
        onRegisterError?: (error: Error) => void;
    }
    
    export function useRegisterSW(options?: RegisterSWOptions): {
        needRefresh: Writable<boolean>;
        offlineReady: Writable<boolean>;
        updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
    };
}

export {};
