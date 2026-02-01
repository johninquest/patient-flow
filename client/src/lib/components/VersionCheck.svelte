<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { APP_VERSION } from '$lib/config';

    onMount(() => {
        if (!browser) return;

        // Store current version
        const storedVersion = localStorage.getItem('app-version');
        
        if (storedVersion && storedVersion !== APP_VERSION) {
            console.log(`[Version] Updated from ${storedVersion} to ${APP_VERSION}`);
            // Clear old caches on version change
            if ('caches' in window) {
                caches.keys().then(names => {
                    names.forEach(name => {
                        if (!name.includes(APP_VERSION)) {
                            console.log(`[Version] Deleting old cache: ${name}`);
                            caches.delete(name);
                        }
                    });
                });
            }
        }
        
        localStorage.setItem('app-version', APP_VERSION);
        console.log(`[Version] Current version: ${APP_VERSION}`);
    });
</script>