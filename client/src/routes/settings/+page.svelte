<script lang="ts">
    import { goto } from '$app/navigation';
    import { currentUser, logout } from '$lib/auth';
    import { t, locale, setLocale, type Locale } from '$lib/i18n';
    import { APP_NAME, APP_VERSION, SUPPORTED_LOCALES } from '$lib/config';
    import { onMount } from 'svelte';
    import Tooltip from '$lib/components/Tooltip.svelte';

    onMount(() => {
        const unsubscribe = currentUser.subscribe(user => {
            if (!user) {
                goto('/auth/login');
            }
        });
        return unsubscribe;
    });

    function handleLocaleChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        setLocale(target.value as Locale);
    }

    async function handleLogout() {
        await logout();
        goto('/auth/login');
    }
</script>

<svelte:head>
    <title>{$t('settings.title')} | {$t('app.name')}</title>
</svelte:head>

{#if $currentUser}
    <div class="min-h-screen bg-neutral-50">
        <header class="bg-white border-b border-neutral-200">
            <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
                <h1 class="text-xl font-bold text-neutral-800">{APP_NAME}</h1>
                <Tooltip text={$t('tooltip.back')} position="bottom">
                    <button
                        onclick={() => goto('/dashboard')}
                        class="p-2 text-neutral-600 hover:text-neutral-800 hover:bg-neutral-100 rounded-md transition-colors"
                        aria-label={$t('tooltip.back')}
                    >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                </Tooltip>
            </div>
        </header>

        <main class="max-w-2xl mx-auto px-4 py-8 space-y-6">
            <h2 class="text-2xl font-bold text-neutral-900">{$t('settings.title')}</h2>

            <!-- App Info -->
            <section class="bg-white rounded-lg border border-neutral-200 p-6">
                <h3 class="text-lg font-semibold text-neutral-800 mb-4">{$t('settings.app.info')}</h3>
                <dl class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt class="text-neutral-500">{$t('settings.app.name')}</dt>
                        <dd class="font-medium text-neutral-900">{APP_NAME}</dd>
                    </div>
                    <div>
                        <dt class="text-neutral-500">{$t('settings.app.version')}</dt>
                        <dd class="font-medium text-neutral-900">{APP_VERSION}</dd>
                    </div>
                </dl>
            </section>

            <!-- Account Info -->
            <section class="bg-white rounded-lg border border-neutral-200 p-6">
                <h3 class="text-lg font-semibold text-neutral-800 mb-4">{$t('settings.account')}</h3>
                <dl class="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <dt class="text-neutral-500">{$t('settings.account.email')}</dt>
                        <dd class="font-medium text-neutral-900">{$currentUser?.email}</dd>
                    </div>
                    <div>
                        <dt class="text-neutral-500">{$t('settings.account.name')}</dt>
                        <dd class="font-medium text-neutral-900">{$currentUser?.name || '—'}</dd>
                    </div>
                   <!--  <div>
                        <dt class="text-neutral-500">{$t('settings.account.id')}</dt>
                        <dd class="font-mono text-xs text-neutral-600">{$currentUser?.id}</dd>
                    </div> -->
                </dl>
            </section>

            <!-- Language -->
            <section class="bg-white rounded-lg border border-neutral-200 p-6">
                <h3 class="text-lg font-semibold text-neutral-800 mb-4">{$t('settings.language')}</h3>
                <select
                    value={$locale}
                    onchange={handleLocaleChange}
                    class="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                    {#each SUPPORTED_LOCALES as loc}
                        <option value={loc.code}>{loc.name}</option>
                    {/each}
                </select>
            </section>

            <!-- Actions -->
            <section class="bg-white rounded-lg border border-neutral-200 p-6">
                <h3 class="text-lg font-semibold text-neutral-800 mb-4">{$t('settings.actions')}</h3>
                <button
                    onclick={handleLogout}
                    class="w-full px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-md transition-colors"
                >
                    {$t('auth.signout')}
                </button>
            </section>
        </main>
    </div>
{/if}