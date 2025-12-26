<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button, Card, Table, EmptyState, Select } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { unitService, propertyService } from '$lib/services';
    import { t } from '$lib/i18n';
    import type { Unit, Property } from '$lib/types';

    let units = $state<Unit[]>([]);
    let properties = $state<Property[]>([]);
    let selectedPropertyId = $state<string>('');
    let loading = $state(true);
    let error = $state<string | null>(null);

    const columns = [
        { key: 'unit_number', label: 'Unit #' },
        { key: 'unit_name', label: 'Name' },
        { key: 'property', label: 'Property' }
    ];

    onMount(async () => {
        await loadProperties();
    });

    async function loadProperties() {
        try {
            properties = await propertyService.getAll();
            if (properties.length > 0) {
                selectedPropertyId = properties[0].id;
                await loadUnits();
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load properties';
        } finally {
            loading = false;
        }
    }

    async function loadUnits() {
        if (!selectedPropertyId) return;
        loading = true;
        error = null;

        try {
            units = await unitService.getByProperty(selectedPropertyId);
        } catch (err) {
            console.error('Failed to load units:', err);
            error = err instanceof Error ? err.message : 'Failed to load units';
            units = [];
        } finally {
            loading = false;
        }
    }

    function getPropertyName(propertyId: string): string {
        const property = properties.find((p) => p.id === propertyId);
        return property?.name ?? '—';
    }

    $effect(() => {
        if (selectedPropertyId) {
            loadUnits();
        }
    });
</script>

<svelte:head>
    <title>Units | Popati</title>
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
                    <h1 class="text-2xl font-bold text-neutral-900">Units</h1>
                    <p class="text-neutral-500">View units across your properties</p>
                </div>
            </div>
        </div>

        {#if properties.length > 0}
            <div class="max-w-xs">
                <Select
                    label="Property"
                    bind:value={selectedPropertyId}
                    options={properties.map((p) => ({ value: p.id, label: p.name }))}
                />
            </div>
        {/if}

        {#if error}
            <Card>
                <p class="text-red-600">{error}</p>
                <Button variant="secondary" onclick={loadUnits} class="mt-2">Retry</Button>
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
                description="Create a property first to add units."
            >
                {#snippet action()}
                    <Button onclick={() => goto('/properties/new')}>Add Property</Button>
                {/snippet}
            </EmptyState>
        {:else if units.length === 0}
            <EmptyState
                title="No units"
                description="This property has no units yet. Add units from the property detail page."
            >
                {#snippet action()}
                    <Button onclick={() => goto(`/properties/${selectedPropertyId}`)}>Go to Property</Button>
                {/snippet}
            </EmptyState>
        {:else}
            <Table {columns}>
                {#each units as unit}
                    <tr 
                        class="hover:bg-neutral-50 cursor-pointer"
                        onclick={() => goto(`/units/${unit.id}`)}
                    >
                        <td class="px-4 py-3 text-sm font-medium text-neutral-900">{unit.unit_number}</td>
                        <td class="px-4 py-3 text-sm text-neutral-600">{unit.unit_name ?? '—'}</td>
                        <td class="px-4 py-3 text-sm text-neutral-600">{getPropertyName(unit.property)}</td>
                    </tr>
                {/each}
            </Table>
        {/if}
    </div>
</div>