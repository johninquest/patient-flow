<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button, Card, Table, EmptyState } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { propertyService } from '$lib/services';
    import { t } from '$lib/i18n';
    import type { Property } from '$lib/types';

    let properties = $state<Property[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'city', label: 'City' },
        { key: 'country', label: 'Country' },
        { key: 'construction_year', label: 'Year Built' },
        { key: 'actions', label: '', class: 'w-24' }
    ];

    onMount(async () => {
        await loadProperties();
    });

    async function loadProperties() {
        loading = true;
        error = null;
        try {
            properties = await propertyService.getAll();
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load properties';
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>Properties | Popati</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="space-y-6">
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
                <Tooltip text={$t('tooltip.back')} position="bottom">
                    <button
                        onclick={() => goto('/dashboard')}
                        class="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                        aria-label={$t('tooltip.back')}
                    >
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                </Tooltip>
                <div>
                    <h1 class="text-2xl font-bold text-text">Properties</h1>
                    <p class="text-neutral-500">Manage your rental properties</p>
                </div>
            </div>
            <Button onclick={() => goto('/properties/new')}>
                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Property
            </Button>
        </div>

        {#if error}
            <Card>
                <p class="text-red-600">{error}</p>
                <Button variant="secondary" onclick={loadProperties} class="mt-2">Retry</Button>
            </Card>
        {:else if loading}
            <Card>
                <div class="flex items-center justify-center py-8">
                    <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            </Card>
        {:else if properties.length === 0}
            <EmptyState
                title="No properties yet"
                description="Get started by adding your first rental property."
            >
                {#snippet action()}
                    <Button onclick={() => goto('/properties/new')}>Add Property</Button>
                {/snippet}
            </EmptyState>
        {:else}
            <Table {columns}>
                {#each properties as property}
                    <tr
                        class="cursor-pointer hover:bg-neutral-50"
                        onclick={() => goto(`/properties/${property.id}`)}
                    >
                        <td class="px-4 py-3 text-sm font-medium text-text">{property.name}</td>
                        <td class="px-4 py-3 text-sm text-neutral-600">{property.city}</td>
                        <td class="px-4 py-3 text-sm text-neutral-600">{property.country}</td>
                        <td class="px-4 py-3 text-sm text-neutral-500">{property.construction_year ?? '—'}</td>
                        <td class="px-4 py-3 text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={(e) => { e.stopPropagation(); goto(`/properties/${property.id}/edit`); }}
                            >
                                Edit
                            </Button>
                        </td>
                    </tr>
                {/each}
            </Table>
        {/if}
    </div>
</div>