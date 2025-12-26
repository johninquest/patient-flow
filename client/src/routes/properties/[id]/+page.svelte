<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { Button, Card, Table, EmptyState, Modal, Input, ConfirmDialog } from '$lib/components';
    import { propertyService, unitService, tenantService } from '$lib/services';
    import type { Property, Unit, Tenant, UnitFormData, TenantFormData } from '$lib/types';

    let property = $state<Property | null>(null);
    let units = $state<Unit[]>([]);
    let tenants = $state<Tenant[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // Unit modal
    let unitModalOpen = $state(false);
    let editingUnit = $state<Unit | null>(null);
    let unitForm = $state<UnitFormData>({ unit_name: '', unit_number: '', property: '' });
    let unitLoading = $state(false);

    // Tenant modal
    let tenantModalOpen = $state(false);
    let editingTenant = $state<Tenant | null>(null);
    let tenantForm = $state<TenantFormData>({
        first_name: '',
        last_name: '',
        preferred_name: '',
        id_card_number: '',
        phone: '',
        property: '',
        unit: '',
        active: true
    });
    let tenantLoading = $state(false);

    // Delete confirmation
    let deleteDialogOpen = $state(false);
    let deleteTarget = $state<{ type: 'property' | 'unit' | 'tenant'; id: string; name: string } | null>(null);

    const unitColumns = [
        { key: 'unit_number', label: 'Unit #' },
        { key: 'unit_name', label: 'Name' },
        { key: 'actions', label: '', class: 'w-24' }
    ];

    const tenantColumns = [
        { key: 'name', label: 'Name' },
        { key: 'unit', label: 'Unit' },
        { key: 'phone', label: 'Phone' },
        { key: 'status', label: 'Status' },
        { key: 'actions', label: '', class: 'w-24' }
    ];

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        error = null;
        const propertyId = $page.params.id;

        if (!propertyId) {
            error = 'Property ID is required';
            loading = false;
            return;
        }

        console.log('Loading property with ID:', propertyId);

        // Load property first
        try {
            console.log('Fetching property...');
            property = await propertyService.getById(propertyId);
            console.log('Property loaded:', property);
        } catch (err) {
            console.error('Failed to load property:', err);
            error = err instanceof Error ? err.message : 'Failed to load property';
            loading = false;
            return;
        }

        // Load units separately with error handling
        try {
            console.log('Fetching units...');
            units = await unitService.getByProperty(propertyId);
            console.log('Units loaded:', units);
        } catch (err) {
            console.error('Failed to load units:', err);
            // Don't fail completely, just show empty units
            units = [];
        }

        // Load tenants separately with error handling
        try {
            console.log('Fetching tenants...');
            tenants = await tenantService.getByProperty(propertyId);
            console.log('Tenants loaded:', tenants);
        } catch (err) {
            console.error('Failed to load tenants:', err);
            // Don't fail completely, just show empty tenants
            tenants = [];
        }

        loading = false;
    }

    // Unit functions
    function openUnitModal(unit?: Unit) {
        editingUnit = unit ?? null;
        unitForm = unit
            ? { unit_name: unit.unit_name ?? '', unit_number: unit.unit_number, property: unit.property }
            : { unit_name: '', unit_number: '', property: $page.params.id ?? '' };
        unitModalOpen = true;
    }

    async function saveUnit() {
        const propertyId = $page.params.id;
        if (!propertyId) return;
        
        unitLoading = true;
        error = null;
        
        try {
            if (editingUnit) {
                await unitService.update(editingUnit.id, {
                    unit_name: unitForm.unit_name || undefined,
                    unit_number: unitForm.unit_number
                });
            } else {
                await unitService.create({
                    unit_name: unitForm.unit_name || undefined,
                    unit_number: unitForm.unit_number,
                    property: propertyId
                });
            }
            unitModalOpen = false;
            units = await unitService.getByProperty(propertyId);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to save unit';
        } finally {
            unitLoading = false;
        }
    }

    // Tenant functions
    function openTenantModal(tenant?: Tenant) {
        editingTenant = tenant ?? null;
        tenantForm = tenant
            ? {
                first_name: tenant.first_name,
                last_name: tenant.last_name,
                preferred_name: tenant.preferred_name ?? '',
                id_card_number: tenant.id_card_number ?? '',
                phone: tenant.phone ?? '',
                property: tenant.property,
                unit: tenant.unit ?? '',
                active: tenant.active
            }
            : {
                first_name: '',
                last_name: '',
                preferred_name: '',
                id_card_number: '',
                phone: '',
                property: $page.params.id ?? '',
                unit: '',
                active: true
            };
        tenantModalOpen = true;
    }

    async function saveTenant() {
        const propertyId = $page.params.id;
        if (!propertyId) return;
        
        tenantLoading = true;
        error = null;
        
        try {
            const data = {
                first_name: tenantForm.first_name,
                last_name: tenantForm.last_name,
                preferred_name: tenantForm.preferred_name || undefined,
                id_card_number: tenantForm.id_card_number || undefined,
                phone: tenantForm.phone ?? '',
                property: propertyId,
                unit: tenantForm.unit || undefined,
                active: tenantForm.active
            };

            if (editingTenant) {
                await tenantService.update(editingTenant.id, data);
            } else {
                await tenantService.create(data);
            }
            tenantModalOpen = false;
            tenants = await tenantService.getByProperty(propertyId);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to save tenant';
        } finally {
            tenantLoading = false;
        }
    }

    // Delete functions
    function confirmDelete(type: 'property' | 'unit' | 'tenant', id: string, name: string) {
        deleteTarget = { type, id, name };
        deleteDialogOpen = true;
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        const propertyId = $page.params.id;
        if (!propertyId) return;

        try {
            if (deleteTarget.type === 'property') {
                await propertyService.delete(deleteTarget.id);
                goto('/properties');
            } else if (deleteTarget.type === 'unit') {
                await unitService.delete(deleteTarget.id);
                units = await unitService.getByProperty(propertyId);
            } else if (deleteTarget.type === 'tenant') {
                await tenantService.delete(deleteTarget.id);
                tenants = await tenantService.getByProperty(propertyId);
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to delete';
        }
        deleteTarget = null;
    }

    function getUnitName(unitId: string | undefined): string {
        if (!unitId) return '—';
        const unit = units.find((u) => u.id === unitId);
        if (!unit) return '—';
        return unit.unit_name ? `${unit.unit_number} - ${unit.unit_name}` : unit.unit_number;
    }
</script>

<svelte:head>
    <title>{property?.name ?? 'Property'} | Popati</title>
</svelte:head>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    </div>
{:else if error && !property}
    <div class="mx-auto max-w-2xl px-4 py-8">
        <Card>
            <p class="text-red-600">{error}</p>
            <Button variant="secondary" onclick={loadData} class="mt-2">Retry</Button>
        </Card>
    </div>
{:else if property}
    <div class="w-full px-4 py-8 sm:px-6 lg:px-8">
        <!-- Changed: Added proper responsive max-width container -->
        <div class="mx-auto w-full max-w-7xl space-y-6">
            <!-- Header -->
            <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                    <div class="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onclick={() => goto('/properties')}>
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                            </svg>
                        </Button>
                        <h1 class="text-2xl font-bold text-neutral-900">{property.name}</h1>
                    </div>
                    <p class="mt-1 text-neutral-500">{property.city}, {property.country}</p>
                </div>
                <div class="flex gap-2">
                    <Button variant="secondary" onclick={() => goto(`/properties/${property!.id}/edit`)}>Edit</Button>
                    <Button variant="danger" onclick={() => confirmDelete('property', property!.id, property!.name)}>Delete</Button>
                </div>
            </div>

            {#if error}
                <div class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
            {/if}

            <!-- Units Section -->
            <Card>
                <div class="mb-4 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-neutral-900">Units</h2>
                    <Button size="sm" onclick={() => openUnitModal()}>Add Unit</Button>
                </div>

                {#if units.length === 0}
                    <EmptyState title="No units" description="Add units to this property">
                        {#snippet action()}
                            <Button size="sm" onclick={() => openUnitModal()}>Add Unit</Button>
                        {/snippet}
                    </EmptyState>
                {:else}
                    <!-- Changed: Removed negative margins for better mobile experience -->
                    <div class="overflow-x-auto">
                        <Table columns={unitColumns}>
                            {#each units as unit}
                                <tr class="hover:bg-neutral-50">
                                    <td class="px-4 py-3 text-sm font-medium text-neutral-900">{unit.unit_number}</td>
                                    <td class="px-4 py-3 text-sm text-neutral-600">{unit.unit_name ?? '—'}</td>
                                    <td class="px-4 py-3 text-right">
                                        <div class="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onclick={() => goto(`/units/${unit.id}`)}>View</Button>
                                            <Button variant="ghost" size="sm" onclick={() => openUnitModal(unit)}>Edit</Button>
                                            <Button variant="ghost" size="sm" onclick={() => confirmDelete('unit', unit.id, unit.unit_number)}>Delete</Button>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </Table>
                    </div>
                {/if}
            </Card>

            <!-- Tenants Section -->
            <Card>
                <div class="mb-4 flex items-center justify-between">
                    <h2 class="text-lg font-semibold text-neutral-900">Tenants</h2>
                    <Button size="sm" onclick={() => openTenantModal()}>Add Tenant</Button>
                </div>

                {#if tenants.length === 0}
                    <EmptyState title="No tenants" description="Add tenants to this property">
                        {#snippet action()}
                            <Button size="sm" onclick={() => openTenantModal()}>Add Tenant</Button>
                        {/snippet}
                    </EmptyState>
                {:else}
                    <!-- Changed: Removed negative margins for better mobile experience -->
                    <div class="overflow-x-auto">
                        <Table columns={tenantColumns}>
                            {#each tenants as tenant}
                                <tr class="hover:bg-neutral-50">
                                    <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                                        <div class="min-w-37.5">
                                            {tenant.first_name} {tenant.last_name}
                                            {#if tenant.preferred_name}
                                                <span class="block text-neutral-500 text-xs mt-0.5">({tenant.preferred_name})</span>
                                            {/if}
                                        </div>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-neutral-600">{getUnitName(tenant.unit)}</td>
                                    <td class="px-4 py-3 text-sm text-neutral-600 whitespace-nowrap">{tenant.phone}</td>
                                    <td class="px-4 py-3 text-sm">
                                        <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium whitespace-nowrap {tenant.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}">
                                            {tenant.active ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-right">
                                        <div class="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onclick={() => goto(`/tenants/${tenant.id}`)}>View</Button>
                                            <Button variant="ghost" size="sm" onclick={() => openTenantModal(tenant)}>Edit</Button>
                                            <Button variant="ghost" size="sm" onclick={() => confirmDelete('tenant', tenant.id, `${tenant.first_name} ${tenant.last_name}`)}>Delete</Button>
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </Table>
                    </div>
                {/if}
            </Card>
        </div>
    </div>

    <!-- Unit Modal -->
    <Modal bind:open={unitModalOpen} title={editingUnit ? 'Edit Unit' : 'Add Unit'}>
        <form onsubmit={(e) => { e.preventDefault(); saveUnit(); }} class="space-y-4">
            <Input id="unit_number" label="Unit Number" bind:value={unitForm.unit_number} placeholder="e.g., A1" required />
            <Input id="unit_name" label="Unit Name" bind:value={unitForm.unit_name} placeholder="e.g., Ground Floor Left (Optional)" />
        </form>

        {#snippet footer()}
            <Button variant="secondary" onclick={() => (unitModalOpen = false)}>Cancel</Button>
            <Button loading={unitLoading} onclick={saveUnit}>{editingUnit ? 'Save' : 'Add'}</Button>
        {/snippet}
    </Modal>

    <!-- Tenant Modal -->
    <Modal bind:open={tenantModalOpen} title={editingTenant ? 'Edit Tenant' : 'Add Tenant'} size="lg">
        <form onsubmit={(e) => { e.preventDefault(); saveTenant(); }} class="space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
                <Input id="first_name" label="First Name" bind:value={tenantForm.first_name} required />
                <Input id="last_name" label="Last Name" bind:value={tenantForm.last_name} required />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                <Input id="preferred_name" label="Preferred Name" bind:value={tenantForm.preferred_name} placeholder="Optional" />
                <Input id="id_card_number" label="ID Card Number" bind:value={tenantForm.id_card_number} placeholder="Optional" />
            </div>
            <div class="grid gap-4 sm:grid-cols-2">
                <Input id="phone" label="Phone" type="tel" bind:value={tenantForm.phone} required />
                <div class="space-y-1.5">
                    <label for="unit" class="block text-sm font-medium text-neutral-700">Unit</label>
                    <select
                        id="unit"
                        bind:value={tenantForm.unit}
                        class="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="">No unit assigned</option>
                        {#each units as unit}
                            <option value={unit.id}>
                                {unit.unit_name ? `${unit.unit_number} - ${unit.unit_name}` : unit.unit_number}
                            </option>
                        {/each}
                    </select>
                </div>
            </div>
            <label class="flex items-center gap-2">
                <input type="checkbox" bind:checked={tenantForm.active} class="h-4 w-4 rounded border-neutral-300 bg-white text-brand-500 focus:ring-brand-500" />
                <span class="text-sm text-neutral-700">Active tenant</span>
            </label>
        </form>

        {#snippet footer()}
            <Button variant="secondary" onclick={() => (tenantModalOpen = false)}>Cancel</Button>
            <Button loading={tenantLoading} onclick={saveTenant}>{editingTenant ? 'Save' : 'Add'}</Button>
        {/snippet}
    </Modal>

    <!-- Delete Confirmation -->
    <ConfirmDialog
        bind:open={deleteDialogOpen}
        title="Delete {deleteTarget?.type}"
        message="Are you sure you want to delete {deleteTarget?.name}? This action cannot be undone."
        onconfirm={handleDelete}
    />
{/if}