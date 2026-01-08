import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { readFileSync } from 'fs';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
    plugins: [
        sveltekit(),
        SvelteKitPWA({
            srcDir: 'src',
            mode: 'production',
            strategies: 'generateSW',
            scope: './',
            base: './',
            selfDestroying: process.env.SELF_DESTROYING_SW === 'true',
            manifest: {
                short_name: 'Popaty',
                name: 'Popaty - Property rent and expense manager',
                start_url: './',
                scope: './',
                display: 'standalone',
                theme_color: '#8c6a3a',
                background_color: '#F9FAFB',
                description: 'Property rent and expense management app',
                icons: [
                    {
                        src: '/icon-192.png',
                        sizes: '192x192',
                        type: 'image/png', 
                        purpose: 'any'
                    },
                    {
                        src: '/icon-512.png',
                        sizes: '512x512',
                        type: 'image/png', 
                        purpose: 'any'
                    },
                    {
                        src: '/icon-512-maskable.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            },
            workbox: {
                globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'],
                runtimeCaching: [
                    {
                        urlPattern: /^https:\/\/api\.popaty\.com\/.*/i,
                        handler: 'NetworkFirst',
                        options: {
                            cacheName: 'api-cache',
                            expiration: {
                                maxEntries: 100,
                                maxAgeSeconds: 60 * 60 * 24 // 24 hours
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'google-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
                            },
                            cacheableResponse: {
                                statuses: [0, 200]
                            }
                        }
                    },
                    {
                        urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                        handler: 'CacheFirst',
                        options: {
                            cacheName: 'gstatic-fonts-cache',
                            expiration: {
                                maxEntries: 10,
                                maxAgeSeconds: 60 * 60 * 24 * 365
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
    ],
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version)
    }
});

export {};
