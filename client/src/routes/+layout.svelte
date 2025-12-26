<script lang="ts">
    import type { Snippet } from 'svelte';
    import { onMount } from 'svelte';
    import { t, initLocale } from '$lib/i18n';
    import { initializeAuth, isInitialized } from '$lib/auth';
    import '../app.css';

    let { children }: { children: Snippet } = $props();
    let ready = $state(false);

    onMount(async () => {
        initLocale();
        await initializeAuth();
        ready = true;
    });
</script>

<svelte:head>
    <title>{$t('app.name')}</title>
</svelte:head>

{#if ready}
    {@render children()}
{:else}
    <div class="min-h-screen flex items-center justify-center bg-neutral-50">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
    </div>
{/if}
