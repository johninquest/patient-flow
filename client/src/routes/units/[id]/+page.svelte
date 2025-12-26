<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { Button, Card, Input, Table, EmptyState, ConfirmDialog } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { unitService, tenantService } from '$lib/services';
    import { t } from '$lib/i18n';
    import type { Unit, Tenant } from '$lib/types';

    let unit = $state<Unit | null>(null);
    let tenants = $state<Tenant[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let error = $state<string | null>(null);
    let isEditing = $state(false);

    let formData = $state({
        unit_number: '',
        unit_name: ''
    });

    // Delete confirmation
    let deleteDialogOpen = $state(false);

    const tenantColumns = [
        { key: 'name', label: 'Name' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' }
    ];

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        error = null;
        const unitId = $page.params.id;

        if (!unitId) {
            error = 'Unit ID is required';
            loading = false;
            return;
        }

        try {
            unit = await unitService.getById(unitId);
            formData = {
                unit_number: unit.unit_number,
                unit_name: unit.unit_name ?? ''
            };

            // Load tenants assigned to this unit
            const allTenants = await tenantService.getByProperty(unit.property);
            tenants = allTenants.filter((t) => t.unit === unitId);
        } catch (err) {
            console.error('Failed to load unit:', err);
            error = err instanceof Error ? err.message : 'Failed to load unit';
        } finally {
            loading = false;
        }
    }

    async function handleSave() {
        if (!unit) return;
        saving = true;
        error = null;

        try {
            await unitService.update(unit.id, {
                ...formData,
                property: unit.property
            });
            unit = await unitService.getById(unit.id);
            isEditing = false;
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to update unit';
        } finally {
            saving = false;
        }
    }

    async function handleDelete() {
        if (!unit) return;

        try {
            await unitService.delete(unit.id);
            goto(`/properties/${unit.property}`);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to delete unit';
        }
    }

    function cancelEdit() {
        if (!unit) return;
        formData = {
            unit_number: unit.unit_number,
            unit_name: unit.unit_name ?? ''
        };
        isEditing = false;
    }
</script>

<svelte:head>
    <title>{unit ? `Unit ${unit.unit_number}` : 'Unit'} | Popati</title>
</svelte:head>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    </div>
{:else if error && !unit}
    <div class="mx-auto max-w-2xl px-4 py-8">
        <Card>
            <p class="text-red-600">{error}</p>
            <Button variant="secondary" onclick={loadData} class="mt-2">Retry</Button>
        </Card>
    </div>
{:else if unit}
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                    <Tooltip text={$t('tooltip.back')} position="bottom">
                        <button
                            onclick={() => goto(`/properties/${unit?.property}`)}
                            class="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                            aria-label={$t('tooltip.back')}
                        >
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                    </Tooltip>
                    <div>
                        <h1 class="text-2xl font-bold text-neutral-900">
                            Unit {unit.unit_number}
                            {#if unit.unit_name}
                                <span class="text-neutral-500 font-normal">— {unit.unit_name}</span>
                            {/if}
                        </h1>
                        <p class="text-neutral-500 text-sm mt-1">
                            {tenants.length} tenant{tenants.length !== 1 ? 's' : ''} assigned
                        </p>
                    </div>
                </div>
                <div class="flex gap-2">
                    {#if !isEditing}
                        <Button variant="secondary" onclick={() => (isEditing = true)}>Edit</Button>
                        <Button variant="danger" onclick={() => (deleteDialogOpen = true)}>Delete</Button>
                    {/if}
                </div>
            </div>

            {#if error}
                <div class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
            {/if}

            <!-- Details Card -->
            <Card>
                <h2 class="text-lg font-semibold text-neutral-900 mb-4">Unit Details</h2>

                {#if isEditing}
                    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
                        <div class="grid gap-4 sm:grid-cols-2">
                            <Input id="unit_number" label="Unit Number" bind:value={formData.unit_number} placeholder="e.g., A1" required />
                            <Input id="unit_name" label="Unit Name" bind:value={formData.unit_name} placeholder="e.g., Ground Floor Left" />
                        </div>

                        <div class="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                            <Button variant="secondary" onclick={cancelEdit}>Cancel</Button>
                            <Button type="submit" loading={saving}>Save Changes</Button>
                        </div>
                    </form>
                {:else}
                    <dl class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Unit Number</dt>
                            <dd class="mt-1 text-neutral-900">{unit.unit_number}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Unit Name</dt>
                            <dd class="mt-1 text-neutral-900">{unit.unit_name || '—'}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Property</dt>
                            <dd class="mt-1 text-neutral-900">
                                {#if unit.expand?.property}
                                    <a href="/properties/{unit.property}" class="text-brand-600 hover:text-brand-700 underline">
                                        {unit.expand.property.name}
                                    </a>
                                {:else}
                                    —
                                {/if}
                            </dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Tenants</dt>
                            <dd class="mt-1 text-neutral-900">{tenants.length} assigned</dd>
                        </div>
                    </dl>
                {/if}
            </Card>

            <!-- Tenants Card -->
            <Card>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-neutral-900">Assigned Tenants</h2>
                </div>

                {#if tenants.length === 0}
                    <EmptyState
                        title="No tenants assigned"
                        description="No tenants are currently assigned to this unit."
                    >
                        {#snippet action()}
                            <Button size="sm" onclick={() => goto(`/properties/${unit?.property}`)}>Manage Tenants</Button>
                        {/snippet}
                    </EmptyState>
                {:else}
                    <Table columns={tenantColumns}>
                        {#each tenants as tenant}
                            <tr 
                                class="hover:bg-neutral-50 cursor-pointer"
                                onclick={() => goto(`/tenants/${tenant.id}`)}
                            >
                                <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                                    {tenant.first_name} {tenant.last_name}
                                    {#if tenant.preferred_name}
                                        <span class="text-neutral-500">({tenant.preferred_name})</span>
                                    {/if}
                                </td>
                                <td class="px-4 py-3 text-sm text-neutral-600">{tenant.phone || '—'}</td>
                                <td class="px-4 py-3 text-sm">
                                    <span class="rounded-full px-2 py-1 text-xs {tenant.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}">
                                        {tenant.active ? 'Active' : 'Inactive'}
                                    </span>
                                </td>
                            </tr>
                        {/each}
                    </Table>
                {/if}
            </Card>
        </div>
    </div>

    <ConfirmDialog
        bind:open={deleteDialogOpen}
        title="Delete Unit"
        message="Are you sure you want to delete Unit {unit.unit_number}? Tenants assigned to this unit will be unassigned. This action cannot be undone."
        onconfirm={handleDelete}
    />
{/if}