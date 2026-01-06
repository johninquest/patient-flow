<script lang="ts">
    import { useRegisterSW } from 'virtual:pwa-register/svelte';
    import Button from './Button.svelte';

    const {
        needRefresh,
        updateServiceWorker
    } = useRegisterSW({
        onRegistered(registration: ServiceWorkerRegistration | undefined) {
            console.log('[PWA] Service worker registered');
            // Check for updates every hour
            if (registration) {
                setInterval(() => {
                    registration.update();
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error: Error) {
            console.error('[PWA] Service worker registration error:', error);
        }
    });

    function close() {
        $needRefresh = false;
    }
</script>

{#if $needRefresh}
    <div class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50">
        <div class="bg-white border border-neutral-200 rounded-lg shadow-lg p-4">
            <div class="flex items-start gap-3">
                <div class="shrink-0">
                    <svg class="h-6 w-6 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-neutral-900">
                        New version available
                    </p>
                    <p class="text-sm text-neutral-500 mt-1">
                        Click reload to update the app.
                    </p>
                    <div class="flex gap-2 mt-3">
                        <Button size="sm" onclick={() => updateServiceWorker(true)}>
                            Reload
                        </Button>
                        <Button size="sm" variant="ghost" onclick={close}>
                            Dismiss
                        </Button>
                    </div>
                </div>
                <button
                    onclick={close}
                    class="shrink-0 text-neutral-400 hover:text-neutral-500"
                    aria-label="Close"
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    </div>
{/if}