import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

export default defineConfig({
    plugins: [
        sveltekit(),
        SvelteKitPWA({
            srcDir: 'src',
            mode: 'production',
            strategies: 'generateSW',
            registerType: 'autoUpdate',
            scope: '/',
            base: '/',
            selfDestroying: process.env.SELF_DESTROYING_SW === 'true',
            manifest: {
                id: '/',
                short_name: 'Popaty',
                name: 'Popaty',
                start_url: '/',
                scope: '/',
                display: 'standalone',
                theme_color: '#8c6a3a',
                background_color: '#F9FAFB',
                description: 'Property rent and expense management app',
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png', 
                        purpose: 'maskable any'
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png', 
                        purpose: 'maskable any'
                    }
                ]
            },
            workbox: {
                navigateFallback: '/',
                additionalManifestEntries: [{ url: '/', revision: null }],
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
                skipWaiting: true,
                clientsClaim: true, 
                runtimeCaching: [
                    {
                        urlPattern: ({ url }) => url.origin === 'https://api.popaty.com',
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    }
                ]
            },
            devOptions: {
                enabled: true,
                suppressWarnings: true,
                type: 'module'
            },
            kit: {
                includeVersionFile: true
            }
        })
    ]
});
