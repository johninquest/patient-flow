<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/state';
    import { permissions, createPropertyPermissions } from '$lib/stores/permissions';
    import { getCountryName, getCurrencyByCountryCode } from '$lib/types/currency.types';
    import { 
        Card, 
        Button, 
        Table, 
        EmptyState, 
        Modal, 
        Input, 
        ConfirmDialog,
        Select,
        PermissionButton, 
        Tooltip,
        ActivityFeed,
        GrantAccessModal,
        AccessList,
        PropertyOverview
    } from '$lib/components';
    import { 
        propertyService, 
        unitService, 
        tenantService, 
        userAccessService,
        activityService,
        expenseService,
        rentService 
    } from '$lib/services';
    import type { Property, Unit, Tenant, UserAccess, Activity, ActivityFilters, ActivityAction, Expense, RentEntry } from '$lib/types';

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

    interface UnitFormData {
        unit_name: string;
        unit_number: string;
        property: string;
    }

    let property = $state<Property | null>(null);
    let units = $state<Unit[]>([]);
    let tenants = $state<Tenant[]>([]);
    let accessList = $state<UserAccess[]>([]);
    let loading = $state(true);
    let error = $state<string | null>(null);

    // ✅ Create permission store - loads asynchronously, doesn't block
    const propertyId = $derived(page.params.id ?? '');
    
    // ✅ Use $derived to reactively create permissions when propertyId changes
    const perms = $derived(createPropertyPermissions(propertyId));
    const canManageAccess = $derived($perms.isOwner);
    const canEdit = $derived($perms.canEdit);
    const userRole = $derived($perms.role);
    const permissionsLoading = $derived(!$perms.isLoaded);

    // ✅ Effect to load permissions when propertyId changes
    $effect(() => {
        if (propertyId) {
            permissions.loadPermissions(propertyId);
        }
    });

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
    let deleteTarget = $state<{ type: 'property' | 'unit' | 'tenant' | 'rent' | 'expense'; id: string; name: string } | null>(null);

    // Access management
    let grantAccessModalOpen = $state(false);

    // Activity state
    let activeTab = $state<'overview' | 'setup' | 'rents' | 'expenses' | 'activity'>('overview');
    let activities = $state<Activity[]>([]);
    let activityLoading = $state(false);
    let activityFilters = $state<ActivityFilters>({
        days: 30
    });

    // Add state for expenses and rents
    let expenses = $state<Expense[]>([]);
    let rentEntries = $state<RentEntry[]>([]);

    // Rent modal
    let rentModalOpen = $state(false);
    let editingRent = $state<RentEntry | null>(null);
    let rentForm = $state<{ amount: number; date: string; tenant: string; property: string }>({
        amount: 0,
        date: '',
        tenant: '',
        property: ''
    });
    let rentLoading = $state(false);

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

    const expenseColumns = [
        { key: 'date', label: 'Date' },
        { key: 'category', label: 'Category' },
        { key: 'amount', label: 'Amount' },
        { key: 'actions', label: '', class: 'w-24 hidden sm:table-cell' }
    ];

    const rentColumns = [
        { key: 'date', label: 'Date' },
        { key: 'tenant', label: 'Tenant' },
        { key: 'amount', label: 'Amount' },
        { key: 'period', label: 'Period' },
        { key: 'actions', label: '', class: 'w-24 hidden sm:table-cell' }
    ];

    const expenseCategories = [
        { value: 'maintenance', label: 'Maintenance' },
        { value: 'repairs', label: 'Repairs' },
        { value: 'utilities', label: 'Utilities' },
        { value: 'insurance', label: 'Insurance' },
        { value: 'taxes', label: 'Taxes' },
        { value: 'management', label: 'Management' },
        { value: 'other', label: 'Other' }
    ];

    onMount(async () => {
        const tabParam = page.url.searchParams.get('tab');
        if (tabParam && ['overview', 'setup', 'rents', 'expenses', 'activity'].includes(tabParam)) {
            activeTab = tabParam as typeof activeTab;
        }
        
        await loadData(); // ✅ Only load data, permissions load via $effect
    });

    async function loadData() {
        loading = true;
        error = null;
        const propertyId = page.params.id;

        if (!propertyId) {
            error = 'Property ID is required';
            loading = false;
            return;
        }

        try {
            // ✅ Load property first to get permissions context
            const propertyData = await propertyService.getById(propertyId);
            property = propertyData;

            // ✅ Determine if user can manage access (owner only)
            const role = permissions.getRole(propertyId);
            const isOwner = role === 'owner';

            // ✅ Conditionally fetch access list only for owners
            const [
                unitsData,
                tenantsData,
                accessesData,
                expensesData,
                rentEntriesData
            ] = await Promise.all([
                unitService.getByProperty(propertyId),
                tenantService.getByProperty(propertyId),
                isOwner ? userAccessService.getByProperty(propertyId) : Promise.resolve([]),
                expenseService.getByProperty(propertyId),
                rentService.getByProperty(propertyId)
            ]);

            units = unitsData;
            tenants = tenantsData;
            accessList = accessesData;
            expenses = expensesData;
            rentEntries = rentEntriesData;
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
        // ✅ Refresh permissions after access changes
        if (property?.id) {
            // Permissions will be refreshed automatically on next access
        }
    }

    // Unit functions
    function openUnitModal(unit?: Unit) {
        editingUnit = unit ?? null;
        unitForm = unit
            ? { unit_name: unit.unit_name ?? '', unit_number: unit.unit_number, property: unit.property }
            : { unit_name: '', unit_number: '', property: page.params.id ?? '' };
        unitModalOpen = true;
    }

    async function saveUnit() {
        const propertyId = page.params.id;
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
                property: page.params.id ?? '',
                unit: '',
                active: true
            };
        tenantModalOpen = true;
    }

    async function saveTenant() {
        const propertyId = page.params.id;
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
    function confirmDelete(type: 'property' | 'unit' | 'tenant' | 'rent' | 'expense', id: string, name: string) {
        deleteTarget = { type, id, name };
        deleteDialogOpen = true;
    }

    async function handleDelete() {
        if (!deleteTarget) return;
        const propertyId = page.params.id;
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
            } else if (deleteTarget.type === 'rent') {
                await rentService.delete(deleteTarget.id);
                rentEntries = await rentService.getByProperty(propertyId);
            } else if (deleteTarget.type === 'expense') {
                await expenseService.delete(deleteTarget.id);
                expenses = await expenseService.getByProperty(propertyId);
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

    function getTenantName(tenantId: string | undefined): string {
        if (!tenantId) return '—';
        const tenant = tenants.find((t) => t.id === tenantId);
        if (!tenant) return '—';
        if (tenant.preferred_name) return tenant.preferred_name;
        return `${tenant.first_name} ${tenant.last_name}`;
    }

    // Rent functions
    function openRentModal(rent?: RentEntry) {
        editingRent = rent ?? null;
        rentForm = rent
            ? {
                amount: rent.amount,
                date: rent.payment_date,
                tenant: typeof rent.tenant === 'string' ? rent.tenant : (rent.tenant as any)?.id ?? '',
                property: property?.id ?? ''
            }
            : {
                amount: 0,
                date: new Date().toISOString().split('T')[0],
                tenant: '',
                property: page.params.id ?? ''
            };
        rentModalOpen = true;
    }

    function formatCurrency(amount: number, country?: string): string {
        const c = country ?? property?.country ?? '';
        const currency = getCurrencyByCountryCode(c);
        const symbol = currency?.symbol ?? currency?.currencyCode ?? '';
        return `${symbol} ${amount.toLocaleString()}`;
    }

    function formatRentMonth(rentMonth: string): string {
        if (!rentMonth) return '—';
        const [year, month] = rentMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    }

    function formatPaymentDate(dateStr: string): string {
        if (!dateStr) return '—';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-GB'); // dd/MM/yyyy
    }

    async function loadActivityFeed() {
        if (!property) return;
        
        activityLoading = true;
        try {
            activities = await activityService.getPropertyActivityFeed(
                property.id,
                activityFilters
            );
        } catch (err) {
            console.error('Failed to load activity feed:', err);
        } finally {
            activityLoading = false;
        }
    }

    // Watch for tab changes
    $effect(() => {
        if (activeTab === 'activity' && property && activities.length === 0) {
            loadActivityFeed();
        }
    });

    // Watch for filter changes
    $effect(() => {
        if (activeTab === 'activity') {
            loadActivityFeed();
        }
    });

    // Add an effect to reload expenses when tab changes
    $effect(() => {
        if (activeTab === 'expenses' && property) {
            loadExpenses();
        }
        if (activeTab === 'rents' && property) {
            loadRentEntries();
        }
    });

    async function loadExpenses() {
        if (!property) return;
        try {
            expenses = await expenseService.getByProperty(property.id);
        } catch (err) {
            console.error('Failed to load expenses:', err);
        }
    }

    async function loadRentEntries() {
        if (!property) return;
        try {
            rentEntries = await rentService.getByProperty(property.id);
        } catch (err) {
            console.error('Failed to load rent entries:', err);
        }
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
            <!-- Header -->
            <div class="mb-6">
                <button
                    onclick={() => goto('/dashboard')}
                    class="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-600 transition-colors hover:text-brand-500"
                >
                    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    Back to Dashboard
                </button>

                <div class="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 class="text-3xl font-bold text-neutral-900">{property.name}</h1>
                        <p class="text-neutral-600 mt-2">
                            {[property.city, getCountryName(property.country)].filter(Boolean).join(', ')}
                            <!-- {#if property.construction_year}
                                • Built {property.construction_year}
                            {/if} -->
                        </p>
                    </div>

                    <!-- ✅ Use PermissionButton -->
                    <div class="flex gap-2 items-start">
                        <Tooltip text="Grant another user access to this property" position="bottom">
                            <PermissionButton 
                                loading={permissionsLoading} 
                                show={canManageAccess}
                                variant="secondary"
                                onclick={() => grantAccessModalOpen = true}
                            >
                                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                                </svg>
                                Grant Access
                            </PermissionButton>
                        </Tooltip>

                        <PermissionButton 
                            loading={permissionsLoading} 
                            show={canEdit}
                            variant="secondary"
                            onclick={() => goto(`/properties/${property?.id}/edit`)}
                        >
                            Edit Property
                        </PermissionButton>

                        <PermissionButton 
                            loading={permissionsLoading} 
                            show={canManageAccess}
                            variant="danger"
                            onclick={() => property && confirmDelete('property', property.id, property.name)}
                        >
                            Delete
                        </PermissionButton>
                    </div>
                </div>
            </div>

            <!-- Tab Navigation -->
            <div class="border-b border-neutral-200">
                <nav class="flex gap-4">
                    <button onclick={() => activeTab = 'overview'} class={activeTab === 'overview' ? 'border-b-2 border-brand-500 pb-2 px-1 text-sm font-medium text-brand-600' : 'pb-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700'}>
                        Overview
                    </button>
                    <button onclick={() => activeTab = 'setup'} class={activeTab === 'setup' ? 'border-b-2 border-brand-500 pb-2 px-1 text-sm font-medium text-brand-600' : 'pb-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700'}>
                        Setup
                    </button>
                    <button onclick={() => activeTab = 'rents'} class={activeTab === 'rents' ? 'border-b-2 border-brand-500 pb-2 px-1 text-sm font-medium text-brand-600' : 'pb-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700'}>
                        Rents
                    </button>
                    <button onclick={() => activeTab = 'expenses'} class={activeTab === 'expenses' ? 'border-b-2 border-brand-500 pb-2 px-1 text-sm font-medium text-brand-600' : 'pb-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700'}>
                        Expenses
                    </button>
                    <button onclick={() => activeTab = 'activity'} class={activeTab === 'activity' ? 'border-b-2 border-brand-500 pb-2 px-1 text-sm font-medium text-brand-600' : 'pb-2 px-1 text-sm font-medium text-gray-500 hover:text-gray-700'}>
                        Activity
                    </button>
                </nav>
            </div>

            <!-- Tab Content -->
            {#if activeTab === 'overview'}
                <PropertyOverview
                    {propertyId}
                    country={property.country}
                    {activeTab}
                />

            {:else if activeTab === 'setup'}
                <!-- Units Section -->
                <Card>
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-neutral-900">Units</h2>
                        
                        <PermissionButton 
                            loading={permissionsLoading} 
                            show={canEdit}
                            size="sm"
                            onclick={() => { 
                                editingUnit = null;
                                unitForm = { unit_name: '', unit_number: '', property: property?.id ?? '' };
                                unitModalOpen = true;
                            }}
                        >
                            Add Unit
                        </PermissionButton>
                    </div>

                    {#if units.length === 0}
                        <EmptyState title="No units" description="Add units to this property">
                            {#snippet action()}
                                <Button size="sm" onclick={() => openUnitModal()}>Add Unit</Button>
                            {/snippet}
                        </EmptyState>
                    {:else}
                        <div class="overflow-x-auto">
                            <!-- Units Table -->
                            <Table columns={unitColumns}>
                                {#each units as unit}
                                    <tr class="hover:bg-neutral-50 cursor-pointer" onclick={() => goto(`/units/${unit.id}`)}>
                                        <td class="px-4 py-3 text-sm font-medium text-neutral-900">{unit.unit_number}</td>
                                        <td class="px-4 py-3 text-sm text-neutral-600">{unit.unit_name ?? '—'}</td>
                                        <td class="px-4 py-3 text-right" onclick={(e) => e.stopPropagation()}>
                                            <div class="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" onclick={() => goto(`/units/${unit.id}`)}>View</Button>
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
                        
                        <PermissionButton 
                            loading={permissionsLoading} 
                            show={canEdit}
                            size="sm"
                            onclick={() => openTenantModal()}
                        >
                            Add Tenant
                        </PermissionButton>
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
                            <!-- Tenants Table -->
                            <Table columns={tenantColumns}>
                                {#each tenants as tenant}
                                    <tr class="hover:bg-neutral-50 cursor-pointer" onclick={() => goto(`/tenants/${tenant.id}`)}>
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
                                        <td class="px-4 py-3 text-right" onclick={(e) => e.stopPropagation()}>
                                            <div class="flex justify-end gap-1">
                                                <Button variant="ghost" size="sm" onclick={() => goto(`/tenants/${tenant.id}`)}>View</Button>
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
                            onupdated={loadAccessList}
                            onrevoked={loadAccessList}
                        />
                    </Card>
                {/if}

            {:else if activeTab === 'rents'}
                <!-- Rent Entries Section -->
                <Card>
                    <div class="flex items-center justify-between mb-4">
                        <h2 class="text-lg font-semibold text-neutral-900">Rent Entries</h2>
                    </div>

                    {#if rentEntries.length === 0}
                        <EmptyState title="No rent entries" description="Record your first rent payment">
                            {#snippet action()}
                                {#if canEdit}
                                    <Button onclick={() => property && goto(`/rent/new?property=${property.id}`)}>
                                        Record Payment
                                    </Button>
                                {/if}
                            {/snippet}
                        </EmptyState>
                    {:else}
                        <Table columns={rentColumns}>
                            {#each rentEntries as rent}
                                <tr 
                                    class="hover:bg-neutral-50 cursor-pointer" 
                                    onclick={() => goto(`/rent/${rent.id}`)}
                                >
                                    <td class="px-4 py-3 text-sm text-neutral-600">
                                        {formatPaymentDate(rent.payment_date)}
                                    </td>
                                    <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                                        {getTenantName(rent.tenant)}
                                    </td>
                                    <td class="px-4 py-3 text-sm text-neutral-600">
                                        {formatCurrency(rent.amount, property.country)}
                                    </td>
                                    <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                                        {formatRentMonth(rent.rent_month)}
                                    </td>
                                    <td class="hidden sm:table-cell px-4 py-3 text-right" onclick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" onclick={() => goto(`/rent/${rent.id}`)}>View</Button>
                                    </td>
                                </tr>
                            {/each}
                        </Table>
                    {/if}
                </Card>

                <!-- Floating Action Button for Rents -->
                <PermissionButton 
                    loading={permissionsLoading} 
                    show={canEdit && activeTab === 'rents'}
                    variant="primary"
                    class="fixed bottom-6 right-6 h-14! w-14! rounded-full shadow-lg hover:scale-105 z-50 p-0!"
                    onclick={() => property && goto(`/rent/new?property=${property.id}`)}
                >
                    <svg class="h-6 w-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                </PermissionButton>

            {:else if activeTab === 'expenses'}
                <!-- Expenses Section -->
                <Card>
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-lg font-semibold">Expenses</h2>
                    </div>
                    
                    {#if expenses.length === 0}
                        <EmptyState title="No expenses" description="Record your first expense">
                            {#snippet action()}
                                {#if canEdit}
                                    <Button onclick={() => property && goto(`/expenses/new?property=${property.id}`)}>
                                        Add Expense
                                    </Button>
                                {/if}
                            {/snippet}
                        </EmptyState>
                    {:else}
                        <Table columns={expenseColumns}>
                            {#each expenses as expense}
                                <tr class="hover:bg-neutral-50 cursor-pointer" onclick={() => goto(`/expenses/${expense.id}`)}>
                                    <td class="px-4 py-3 text-sm text-neutral-600">
                                        {formatPaymentDate(expense.expense_date)}
                                    </td>
                                    <td class="px-4 py-3 text-sm font-medium text-neutral-900">
                                        <span class="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-neutral-100 text-neutral-700 capitalize">
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td class="px-4 py-3 text-sm text-neutral-600">
                                        {formatCurrency(expense.amount, property.country)}
                                    </td>
                                    <td class="hidden sm:table-cell px-4 py-3 text-right" onclick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" onclick={() => goto(`/expenses/${expense.id}`)}>View</Button>
                                    </td>
                                </tr>
                            {/each}
                        </Table>
                    {/if}
                </Card>

                <!-- Floating Action Button for Expenses -->
                <PermissionButton 
                    loading={permissionsLoading} 
                    show={canEdit && activeTab === 'expenses'}
                    variant="primary"
                    class="fixed bottom-6 right-6 h-14! w-14! rounded-full shadow-lg hover:scale-105 z-50 p-0!"
                    onclick={() => property && goto(`/expenses/new?property=${property.id}`)}
                >
                    <svg class="h-6 w-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                    </svg>
                </PermissionButton>

            {:else if activeTab === 'activity'}
                <Card>
                    <div class="mb-6">
                        <h2 class="text-lg font-semibold text-neutral-900 mb-4">Recent Activity</h2>
                        
                        <!-- Filters -->
                        <div class="flex gap-3 flex-wrap">
                            <div class="w-48">
                                <Select
                                    label="Time range"
                                    value={activityFilters.days?.toString() ?? '30'}
                                    onchange={(value) => activityFilters.days = parseInt(value)}
                                    options={[
                                        { value: '7', label: 'Last 7 days' },
                                        { value: '30', label: 'Last 30 days' },
                                        { value: '90', label: 'Last 3 months' },
                                        { value: '365', label: 'Last year' },
                                    ]}
                                />
                            </div>
                            
                            <div class="w-48">
                                <Select
                                    label="Filter by action"
                                    value={activityFilters.action ?? ''}
                                    onchange={(value) => activityFilters.action = (value || undefined) as ActivityAction | undefined}
                                    options={[
                                        { value: '', label: 'All actions' },
                                        { value: 'create', label: 'Created' },
                                        { value: 'update', label: 'Updated' },
                                        { value: 'delete', label: 'Deleted' },
                                    ]}
                                />
                            </div>
                        </div>
                    </div>

                    <ActivityFeed {activities} loading={activityLoading} />
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