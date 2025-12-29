<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { Button, Card, Table, EmptyState, Modal, Input, ConfirmDialog, GrantAccessModal, AccessList } from '$lib/components';
    import { propertyService, unitService, tenantService, userAccessService } from '$lib/services';
    import type { Property, Unit, Tenant, UnitFormData, UserAccess } from '$lib/types';

    interface TenantFormData {
        first_name: string;
        last_name: string;
        preferred_name: string;
        id_card_number: string;
        phone: string;
        property: string;
        unit: string;
        active: boolean;
    }

    let property = $state<Property | null>(null);
    let units = $state<Unit[]>([]);
    let tenants = $state<Tenant[]>([]);
    let accessList = $state<UserAccess[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // User role for this property
    let userRole = $state<'owner' | 'manager' | 'viewer' | null>(null);
    let canManageAccess = $derived(userRole === 'owner');
    let canEdit = $derived(userRole === 'owner' || userRole === 'manager');

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

    // Access management
    let grantAccessModalOpen = $state(false);

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

        try {
            property = await propertyService.getById(propertyId);
            
            // Check user's role for this property
            userRole = await userAccessService.getUserRole(propertyId);

            // Load units and tenants
            const [unitsData, tenantsData] = await Promise.all([
                unitService.getByProperty(propertyId),
                tenantService.getByProperty(propertyId)
            ]);
            
            units = unitsData;
            tenants = tenantsData;

            // Load access list if owner
            if (canManageAccess) {
                await loadAccessList();
            }
        } catch (err) {
            console.error('Failed to load property:', err);
            error = err instanceof Error ? err.message : 'Failed to load property';
        } finally {
            loading = false;
        }
    }

    async function loadAccessList() {
        if (!property?.id) return;
        try {
            accessList = await userAccessService.getByProperty(property.id);
        } catch (err) {
            console.error('Failed to load access list:', err);
        }
    }

    function handleAccessGranted() {
        loadAccessList();
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
    <title>{property?.name || 'Property'} | Popati</title>
</svelte:head>

<div class="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
    {#if loading}
        <Card>
            <div class="flex items-center justify-center py-8">
                <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        </Card>
    {:else if error}
        <Card>
            <div class="rounded bg-red-100 p-4 text-red-700">
                <p>{error}</p>
                <Button variant="secondary" onclick={loadData} class="mt-2">Retry</Button>
            </div>
        </Card>
    {:else if property}
        <div class="space-y-6">
            <!-- Header with Back Button -->
            <div class="mb-6">
                <button
                    onclick={() => goto('/properties')}
                    class="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-600 transition-colors hover:text-brand-500"
                >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Properties
                </button>

                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 class="text-3xl font-bold text-neutral-900">{property.name}</h1>
                        <p class="text-neutral-600 mt-2">
                            {[property.city, property.country].filter(Boolean).join(', ')}
                            {#if property.construction_year}
                                • Built {property.construction_year}
                            {/if}
                        </p>
                    </div>

                    <div class="flex gap-2 items-start">
                        {#if canManageAccess}
                            <Button variant="secondary" onclick={() => grantAccessModalOpen = true}>
                                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                </svg>
                                Share
                            </Button>
                        {/if}
                        {#if canEdit}
                            <Button variant="secondary" onclick={() => goto(`/properties/${property?.id}/edit`)}>
                                Edit Property
                            </Button>
                        {/if}
                        {#if userRole === 'owner'}
                            <Button variant="danger" onclick={() => property && confirmDelete('property', property.id, property.name)}>
                                Delete
                            </Button>
                        {/if}
                    </div>
                </div>
            </div>

            <!-- User Role Badge -->
            {#if userRole && userRole !== 'owner'}
                <Card>
                    <div class="flex items-center gap-2">
                        <span class="px-2 py-1 text-xs font-medium rounded-full {
                            userRole === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                        }">
                            {userRole}
                        </span>
                        <span class="text-sm text-gray-600">
                            {#if userRole === 'manager'}
                                You can view and edit this property
                            {:else}
                                You have read-only access to this property
                            {/if}
                        </span>
                    </div>
                </Card>
            {/if}

            <!-- Units Section -->
            <Card>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-neutral-900">Units</h2>
                    {#if canEdit}
                        <Button size="sm" onclick={() => { 
                            editingUnit = null;
                            unitForm = { unit_name: '', unit_number: '', property: property?.id ?? '' };
                            unitModalOpen = true;
                        }}>
                            Add Unit
                        </Button>
                    {/if}
                </div>

                {#if units.length === 0}
                    <EmptyState title="No units" description="Add units to this property">
                        {#snippet action()}
                            <Button size="sm" onclick={() => openUnitModal()}>Add Unit</Button>
                        {/snippet}
                    </EmptyState>
                {:else}
                    <div class="overflow-x-auto">
                        <Table columns={unitColumns}>
                            {#each units as unit}
                                <tr class="hover:bg-neutral-50">
                                    <td class="px-4 py-3 text-sm font-medium text-neutral-900">{unit.unit_number}</td>
                                    <td class="px-4 py-3 text-sm text-neutral-600">{unit.unit_name ?? '—'}</td>
                                    <td class="px-4 py-3 text-right">
                                        <div class="flex justify-end gap-1">
                                            <Button variant="ghost" size="sm" onclick={() => goto(`/units/${unit.id}`)}>View</Button>
                                            {#if canEdit}
                                                <Button variant="ghost" size="sm" onclick={() => openUnitModal(unit)}>Edit</Button>
                                                <Button variant="ghost" size="sm" onclick={() => confirmDelete('unit', unit.id, unit.unit_number)}>Delete</Button>
                                            {/if}
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
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-neutral-900">Tenants</h2>
                    {#if canEdit}
                        <Button size="sm" onclick={() => goto(`/tenants/new?property=${property?.id}`)}>
                            Add Tenant
                        </Button>
                    {/if}
                </div>

                {#if tenants.length === 0}
                    <EmptyState title="No tenants" description="Add tenants to this property">
                        {#snippet action()}
                            {#if canEdit}
                                <Button size="sm" onclick={() => openTenantModal()}>Add Tenant</Button>
                            {/if}
                        {/snippet}
                    </EmptyState>
                {:else}
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
                                            {#if canEdit}
                                                <Button variant="ghost" size="sm" onclick={() => openTenantModal(tenant)}>Edit</Button>
                                                <Button variant="ghost" size="sm" onclick={() => confirmDelete('tenant', tenant.id, `${tenant.first_name} ${tenant.last_name}`)}>Delete</Button>
                                            {/if}
                                        </div>
                                    </td>
                                </tr>
                            {/each}
                        </Table>
                    </div>
                {/if}
            </Card>

            <!-- Shared Access Section (Owner Only) -->
            {#if canManageAccess}
                <Card>
                    <div class="mb-4">
                        <h2 class="text-lg font-semibold text-neutral-900">Shared Access</h2>
                        <p class="text-sm text-gray-600 mt-1">Manage who can access this property</p>
                    </div>
                    
                    <AccessList 
                        {accessList}
                        canManage={true}
                        loading={false}
                        onupdated={loadAccessList}
                        onrevoked={loadAccessList}
                    />
                </Card>
            {/if}
        </div>

        <!-- Grant Access Modal -->
        <GrantAccessModal
            bind:open={grantAccessModalOpen}
            propertyId={property.id}
            propertyName={property.name}
            ongranted={handleAccessGranted}
        />

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
</div>