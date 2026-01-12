<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Card, Button } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { propertyService } from '$lib/services/property.service';
    import { userAccessService } from '$lib/services/user-access.service';
    import { currentUser, isAuthenticated, logout } from '$lib/auth';
    import { t, locale, setLocale, type Locale } from '$lib/i18n';
    import { APP_NAME, SUPPORTED_LOCALES } from '$lib/config';
    import type { Property } from '$lib/types/property.types';
    import type { UserAccess } from '$lib/types/user-access.types';
    import { get } from 'svelte/store';

    let loading = $state(true);
    let ownedProperties = $state<Property[]>([]);
    let sharedAccess = $state<UserAccess[]>([]);
    let userName = $state('');
    let showLanguageMenu = $state(false);

    const hasAnyAccess = $derived(ownedProperties.length > 0 || sharedAccess.length > 0);

    onMount(async () => {
        // Check auth state synchronously from store
        const user = get(currentUser);
        const authenticated = get(isAuthenticated);
        
        
        if (!authenticated) {
            goto('/auth/login');
            return;
        }

        userName = user?.name || user?.email || 'User';

        try {
            ownedProperties = await propertyService.getOwned();
            sharedAccess = await userAccessService.getMyAccess();
        } catch (e) {
            console.error('Failed to load dashboard:', e);
        } finally {
            loading = false;
        }
    });

    function getPropertyName(access: UserAccess): string {
        return access.property_name || 'Property';
    }

    function getPropertyLocation(access: UserAccess): string {
        const parts = [access.property_city, access.property_country].filter(Boolean);
        return parts.join(', ') || '';
    }

    function getGranterName(access: UserAccess): string {
        return access.granted_by_name || access.granted_by_email || 'Someone';
    }

    async function handleLogout() {
        await logout();
        goto('/auth/login');
    }

    function handleLanguageChange(newLocale: Locale) {
        setLocale(newLocale);
        showLanguageMenu = false;
    }
</script>

<svelte:head>
    <title>{$t('dashboard.title')} | {APP_NAME}</title>
</svelte:head>

<div class="min-h-screen bg-neutral-50">
    <!-- Header -->
    <header class="bg-white border-b border-neutral-200">
        <div class="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="text-2xl font-semibold text-neutral-900">{$t('dashboard.title')}</h1>
                    <p class="text-sm text-neutral-500 mt-1">{$t('dashboard.welcome', { name: userName })}</p>
                </div>
                <div class="flex items-center gap-3">
                    <!-- Language Toggle -->
                    <div class="relative">
                        <Tooltip text={$t('settings.language')} position="bottom">
                            <button
                                onclick={() => showLanguageMenu = !showLanguageMenu}
                                class="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                                aria-label={$t('settings.language')}
                            >
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                                </svg>
                            </button>
                        </Tooltip>
                        
                        {#if showLanguageMenu}
                            <button 
                                class="fixed inset-0 z-10" 
                                onclick={() => showLanguageMenu = false}
                                aria-label={$t('dashboard.close.menu')}
                            ></button>
                            
                            <div class="absolute right-0 mt-2 w-40 bg-white rounded-md shadow-lg border border-neutral-200 z-20">
                                <div class="py-1">
                                    {#each SUPPORTED_LOCALES as loc}
                                        <button
                                            onclick={() => handleLanguageChange(loc.code as Locale)}
                                            class="w-full px-4 py-2 text-left text-sm hover:bg-neutral-100 flex items-center justify-between
                                                {$locale === loc.code ? 'text-brand-600 font-medium' : 'text-neutral-700'}"
                                        >
                                            {loc.name}
                                            {#if $locale === loc.code}
                                                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                                </svg>
                                            {/if}
                                        </button>
                                    {/each}
                                </div>
                            </div>
                        {/if}
                    </div>

                    <Tooltip text={$t('tooltip.settings')} position="bottom">
                        <a
                            href="/settings"
                            class="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                            aria-label={$t('tooltip.settings')}
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        </a>
                    </Tooltip>
                    
                    <Tooltip text={$t('auth.signout')} position="bottom">
                        <button
                            onclick={handleLogout}
                            class="p-2 text-neutral-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            aria-label={$t('auth.signout')}
                        >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                        </button>
                    </Tooltip>
                </div>
            </div>
        </div>
    </header>

    <!-- Main Content -->
    <main class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {#if loading}
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        {:else if !hasAnyAccess}
            <!-- New User / No Access State -->
            <Card>
                <div class="text-center py-12">
                    <div class="mx-auto w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mb-4">
                        <svg class="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                    <h2 class="text-xl font-semibold text-neutral-900 mb-2">{$t('dashboard.welcome.new')}</h2>
                    <p class="text-neutral-600 mb-6 max-w-md mx-auto">
                        {$t('dashboard.no.properties')}
                    </p>
                    <Button onclick={() => goto('/properties/new')}>{$t('dashboard.add.property')}</Button>
                </div>
            </Card>
        {:else}
            <div class="space-y-8">
                <!-- Owned Properties Section -->
                {#if ownedProperties.length > 0}
                    <section>
                        <div class="flex items-center justify-between mb-4">
                            <h2 class="text-lg font-semibold text-neutral-900">{$t('dashboard.my.properties')}</h2>
                            <Button variant="primary" onclick={() => goto('/properties/new')}>
                                {$t('dashboard.add.property')}
                            </Button>
                        </div>
                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {#each ownedProperties as property (property.id)}
                                <a href="/properties/{property.id}" class="block hover:shadow-md transition-shadow rounded-lg">
                                    <Card>
                                        <div class="flex items-start justify-between">
                                            <div>
                                                <h3 class="font-medium text-neutral-900">{property.name}</h3>
                                                <p class="text-sm text-neutral-500 mt-1">
                                                    {[property.city, property.country].filter(Boolean).join(', ')}
                                                </p>
                                            </div>
                                            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                                                {$t('dashboard.owner')}
                                            </span>
                                        </div>
                                    </Card>
                                </a>
                            {/each}
                        </div>
                    </section>
                {/if}

                <!-- Shared Access Section -->
                {#if sharedAccess.length > 0}
                    <!-- Visual separator -->
                    <div class="border-t border-gray-200 my-8"></div>
                    
                    <section>
                        <h2 class="text-lg font-semibold text-neutral-900 mb-4">{$t('dashboard.shared.with.me', { count: sharedAccess.length.toString() })}</h2>
                        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {#each sharedAccess as access (access.id)}
                                <a href="/properties/{access.property}" class="block hover:shadow-md transition-shadow rounded-lg">
                                    <Card>
                                        <div class="flex items-start justify-between mb-2">
                                            <div class="flex-1">
                                                <h3 class="font-medium text-neutral-900">
                                                    {getPropertyName(access)}
                                                </h3>
                                                <p class="text-sm text-neutral-500 mt-1">
                                                    {getPropertyLocation(access)}
                                                </p>
                                            </div>
                                            <span class="px-2 py-1 text-xs font-medium rounded-full
                                                {access.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                                                {access.role}
                                            </span>
                                        </div>
                                        <p class="text-xs text-gray-500 mt-2">
                                            {$t('dashboard.shared.by', { name: getGranterName(access) })}
                                        </p>
                                    </Card>
                                </a>
                            {/each}
                        </div>
                    </section>
                {/if}

                <!-- Quick Actions -->
                <section>
                    <h2 class="text-lg font-semibold text-neutral-900 mb-4">{$t('dashboard.quick.actions')}</h2>
                    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <a href="/rent" class="block hover:shadow-md transition-shadow rounded-lg">
                            <Card>
                                <div class="text-center py-4">
                                    <div class="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <p class="font-medium text-neutral-900">{$t('actions.record.rent')}</p>
                                    <p class="text-sm text-neutral-500">{$t('actions.record.rent.desc')}</p>
                                </div>
                            </Card>
                        </a>
                        <a href="/tenants" class="block hover:shadow-md transition-shadow rounded-lg">
                            <Card>
                                <div class="text-center py-4">
                                    <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    <p class="font-medium text-neutral-900">{$t('actions.view.tenants')}</p>
                                    <p class="text-sm text-neutral-500">{$t('actions.view.tenants.desc')}</p>
                                </div>
                            </Card>
                        </a>
                        <a href="/expenses" class="block hover:shadow-md transition-shadow rounded-lg">
                            <Card>
                                <div class="text-center py-4">
                                    <div class="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                                d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
                                        </svg>
                                    </div>
                                    <p class="font-medium text-neutral-900">{$t('actions.track.expenses')}</p>
                                    <p class="text-sm text-neutral-500">{$t('actions.track.expenses.desc')}</p>
                                </div>
                            </Card>
                        </a>
                    </div>
                </section>
            </div>
        {/if}
    </main>
</div>
