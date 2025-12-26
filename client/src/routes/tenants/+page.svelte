<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button, Card, Table, EmptyState, Select } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { tenantService, propertyService } from '$lib/services';
    import type { Tenant, Property } from '$lib/types';
    import { t } from '$lib/i18n';

    let tenants = $state<Tenant[]>([]);
    let properties = $state<Property[]>([]);
    let selectedPropertyId = $state<string>('');
    let loading = $state(true);
    let error = $state<string | null>(null);

    const columns = [
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'unit', label: 'Unit' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: '' }
    ];

    onMount(async () => {
        try {
            properties = await propertyService.getAll();
            if (properties.length > 0) {
                selectedPropertyId = properties[0].id;
            }
        } catch (e) {
            error = 'Failed to load properties';
            console.error(e);
        } finally {
            loading = false;
        }
    });

    async function loadTenants() {
        if (!selectedPropertyId) return;
        
        loading = true;
        error = null;
        try {
            tenants = await tenantService.getByProperty(selectedPropertyId);
        } catch (e) {
            error = 'Failed to load tenants';
            console.error(e);
        } finally {
            loading = false;
        }
    }

    function getTenantName(tenant: Tenant): string {
        if (tenant.preferred_name) {
            return tenant.preferred_name;
        }
        return `${tenant.first_name} ${tenant.last_name}`;
    }

    function getUnitDisplay(tenant: Tenant): string {
        // Use flat unit data if available from API join
        if (tenant.unit_number) {
            return `${tenant.unit_number}${tenant.unit_name ? ` - ${tenant.unit_name}` : ''}`;
        }
        return '—';
    }

    $effect(() => {
        if (selectedPropertyId) {
            loadTenants();
        }
    });
</script>

<svelte:head>
    <title>Tenants | Popati</title>
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
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                    </button>
                </Tooltip>
                <h1 class="text-2xl font-semibold text-neutral-900">Tenants</h1>
            </div>
            {#if selectedPropertyId}
                <Button onclick={() => goto(`/tenants/new?property=${selectedPropertyId}`)}>
                    Add Tenant
                </Button>
            {/if}
        </div>

        <!-- Property Selector -->
        {#if properties.length > 0}
            <Card>
                <div class="flex items-center gap-4">
                    <label for="property-select" class="text-sm font-medium text-neutral-700">
                        Property:
                    </label>
                    <Select
                        id="property-select"
                        bind:value={selectedPropertyId}
                        options={properties.map(p => ({ value: p.id, label: p.name }))}
                    />
                </div>
            </Card>
        {/if}

        <!-- Tenants List -->
        {#if loading}
            <div class="flex items-center justify-center py-12">
                <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        {:else if error}
            <Card>
                <p class="text-red-600">{error}</p>
            </Card>
        {:else if properties.length === 0}
            <EmptyState
                title="No Properties"
                description="Create a property first before adding tenants."
            >
                {#snippet action()}
                    <Button onclick={() => goto('/properties/new')}>Add Property</Button>
                {/snippet}
            </EmptyState>
        {:else if tenants.length === 0}
            <EmptyState
                title="No Tenants"
                description="Add your first tenant to this property."
            >
                {#snippet action()}
                    <Button onclick={() => goto(`/tenants/new?property=${selectedPropertyId}`)}>Add Tenant</Button>
                {/snippet}
            </EmptyState>
        {:else}
            <Card>
                <Table {columns}>
                    {#each tenants as tenant (tenant.id)}
                        <tr class="hover:bg-neutral-50">
                            <td class="px-6 py-4 whitespace-nowrap">
                                <div class="text-sm font-medium text-neutral-900">
                                    {getTenantName(tenant)}
                                </div>
                                {#if tenant.preferred_name}
                                    <div class="text-sm text-neutral-500">
                                        {tenant.first_name} {tenant.last_name}
                                    </div>
                                {/if}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {tenant.phone || '—'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-sm text-neutral-500">
                                {getUnitDisplay(tenant)}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                    {tenant.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}">
                                    {tenant.active ? 'Active' : 'Inactive'}
                                </span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
                                <a href="/tenants/{tenant.id}" class="text-brand-600 hover:text-brand-900">
                                    View
                                </a>
                            </td>
                        </tr>
                    {/each}
                </Table>
            </Card>
        {/if}
    </div>
</div>