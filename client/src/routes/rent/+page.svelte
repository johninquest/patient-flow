<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button, Card, Table, EmptyState, Select } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { rentService, propertyService } from '$lib/services';
    import { getCurrencyByCountry } from '$lib/types/currency.types';
    import { t } from '$lib/i18n';
    import type { RentEntry, Property } from '$lib/types';

    let rentEntries = $state<RentEntry[]>([]);
    let properties = $state<Property[]>([]);
    let selectedPropertyId = $state<string>('');
    let loading = $state(true);
    let error = $state<string | null>(null);
    let initialized = $state(false);

    const columns = [
        { key: 'tenant', label: 'Tenant' },
        { key: 'amount', label: 'Amount' },
        { key: 'rent_month', label: 'Rent Month' },
        { key: 'payment_date', label: 'Payment Date' },
        { key: 'actions', label: '', class: 'w-24' }
    ];

    onMount(async () => {
        await loadProperties();
        initialized = true;
    });

    async function loadProperties() {
        try {
            properties = await propertyService.getAll();
            if (properties.length > 0) {
                selectedPropertyId = properties[0].id;
                await loadRentEntries();
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load properties';
        } finally {
            loading = false;
        }
    }

    async function loadRentEntries() {
        if (!selectedPropertyId) return;
        loading = true;
        error = null;

        try {
            rentEntries = await rentService.getByProperty(selectedPropertyId);
        } catch (err) {
            // Ignore auto-cancellation errors
            if (err instanceof Error && err.message.includes('autocancelled')) {
                return;
            }
            error = err instanceof Error ? err.message : 'Failed to load rent entries';
        } finally {
            loading = false;
        }
    }

    function getSelectedProperty(): Property | undefined {
        return properties.find((p) => p.id === selectedPropertyId);
    }

    function formatAmount(amount: number): string {
        const property = getSelectedProperty();
        if (!property) return amount.toFixed(2);
        const currency = getCurrencyByCountry(property.country);
        return `${currency?.code ?? ''} ${amount.toLocaleString()}`;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString();
    }

    function formatRentMonth(rentMonth: string): string {
        const [year, month] = rentMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    // Use onchange handler instead of $effect to avoid race conditions
    function handlePropertyChange(value: string) {
        selectedPropertyId = value;
        loadRentEntries();
    }
</script>

<svelte:head>
    <title>Rent Entries | Popati</title>
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
                    <h1 class="text-2xl font-bold text-neutral-900">Rent Entries</h1>
                    <p class="text-neutral-500">Track rent payments from tenants</p>
                </div>
            </div>
            <Button onclick={() => goto('/rent/new')}>
                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Record Payment
            </Button>
        </div>

        {#if properties.length > 0}
            <div class="max-w-xs">
                <Select
                    label="Property"
                    value={selectedPropertyId}
                    options={properties.map((p) => ({ value: p.id, label: p.name }))}
                    onchange={handlePropertyChange}
                />
            </div>
        {/if}

        {#if error}
            <Card>
                <p class="text-red-600">{error}</p>
                <Button variant="secondary" onclick={loadRentEntries} class="mt-2">Retry</Button>
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
                description="Create a property first before recording rent payments."
            >
                {#snippet action()}
                    <Button onclick={() => goto('/properties/new')}>Add Property</Button>
                {/snippet}
            </EmptyState>
        {:else if rentEntries.length === 0}
            <EmptyState
                title="No rent entries"
                description="Record your first rent payment for this property."
            >
                {#snippet action()}
                    <Button onclick={() => goto('/rent/new')}>Record Payment</Button>
                {/snippet}
            </EmptyState>
        {:else}
            <Table {columns}>
                {#each rentEntries as entry}
                    <tr class="hover:bg-neutral-50">
                        <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                            {#if entry.tenant_first_name && entry.tenant_last_name}
                                {entry.tenant_first_name} {entry.tenant_last_name}
                            {:else}
                                —
                            {/if}
                        </td>
                        <td class="px-4 py-3 text-sm text-green-600 font-medium">
                            {formatAmount(entry.amount)}
                        </td>
                        <td class="px-4 py-3 text-sm text-neutral-600">
                            {formatRentMonth(entry.rent_month)}
                        </td>
                        <td class="px-4 py-3 text-sm text-neutral-600">
                            {formatDate(entry.payment_date)}
                        </td>
                        <td class="px-4 py-3 text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => goto(`/rent/${entry.id}/edit`)}
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