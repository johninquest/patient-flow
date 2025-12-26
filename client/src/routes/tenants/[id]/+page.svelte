<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { Button, Card, Input, Select, ConfirmDialog } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { tenantService, unitService, rentService } from '$lib/services';
    import { t } from '$lib/i18n';
    import type { Tenant, Unit, RentEntry } from '$lib/types';

    let tenant = $state<Tenant | null>(null);
    let units = $state<Unit[]>([]);
    let rentHistory = $state<RentEntry[]>([]);
    let loading = $state(true);
    let saving = $state(false);
    let error = $state<string | null>(null);
    let isEditing = $state(false);

    let formData = $state({
        first_name: '',
        last_name: '',
        preferred_name: '',
        id_card_number: '',
        phone: '',
        unit: '',
        active: true
    });

    // Delete confirmation
    let deleteDialogOpen = $state(false);

    onMount(async () => {
        await loadData();
    });

    async function loadData() {
        loading = true;
        error = null;
        const tenantId = $page.params.id;

        if (!tenantId) {
            error = 'Tenant ID is required';
            loading = false;
            return;
        }

        try {
            tenant = await tenantService.getById(tenantId);
            formData = {
                first_name: tenant.first_name,
                last_name: tenant.last_name,
                preferred_name: tenant.preferred_name ?? '',
                id_card_number: tenant.id_card_number ?? '',
                phone: tenant.phone ?? '',
                unit: tenant.unit ?? '',
                active: tenant.active
            };

            // Load units for the property
            units = await unitService.getByProperty(tenant.property);

            // Load rent history
            rentHistory = await rentService.getByTenant(tenantId);
        } catch (err) {
            console.error('Failed to load tenant:', err);
            error = err instanceof Error ? err.message : 'Failed to load tenant';
        } finally {
            loading = false;
        }
    }

    async function handleSave() {
        if (!tenant) return;
        saving = true;
        error = null;

        try {
            await tenantService.update(tenant.id, {
                ...formData,
                property: tenant.property
            });
            tenant = await tenantService.getById(tenant.id);
            isEditing = false;
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to update tenant';
        } finally {
            saving = false;
        }
    }

    async function handleDelete() {
        if (!tenant) return;

        try {
            await tenantService.delete(tenant.id);
            goto(`/properties/${tenant.property}`);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to delete tenant';
        }
    }

    function cancelEdit() {
        if (!tenant) return;
        formData = {
            first_name: tenant.first_name,
            last_name: tenant.last_name,
            preferred_name: tenant.preferred_name ?? '',
            id_card_number: tenant.id_card_number ?? '',
            phone: tenant.phone ?? '',
            unit: tenant.unit ?? '',
            active: tenant.active
        };
        isEditing = false;
    }

    function formatDate(dateStr: string): string {
        return new Date(dateStr).toLocaleDateString();
    }

    function formatRentMonth(rentMonth: string): string {
        const [year, month] = rentMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }

    function getUnitDisplay(): string {
        if (!tenant?.unit) return 'No unit assigned';
        const unit = units.find((u) => u.id === tenant?.unit);
        return unit ? `${unit.unit_number}${unit.unit_name ? ` - ${unit.unit_name}` : ''}` : 'No unit assigned';
    }
</script>

<svelte:head>
    <title>{tenant ? `${tenant.first_name} ${tenant.last_name}` : 'Tenant'} | Popati</title>
</svelte:head>

{#if loading}
    <div class="flex items-center justify-center py-12">
        <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    </div>
{:else if error && !tenant}
    <div class="mx-auto max-w-2xl px-4 py-8">
        <Card>
            <p class="text-red-600">{error}</p>
            <Button variant="secondary" onclick={loadData} class="mt-2">Retry</Button>
        </Card>
    </div>
{:else if tenant}
    <div class="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div class="space-y-6">
            <!-- Header -->
            <div class="flex items-start justify-between">
                <div class="flex items-center gap-3">
                    <Tooltip text={$t('tooltip.back')} position="bottom">
                        <button
                            onclick={() => goto(`/properties/${tenant?.property}`)}
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
                            {tenant.first_name} {tenant.last_name}
                            {#if tenant.preferred_name}
                                <span class="text-neutral-500 font-normal">({tenant.preferred_name})</span>
                            {/if}
                        </h1>
                        <div class="flex items-center gap-2 mt-1">
                            <span class="rounded-full px-2 py-1 text-xs {tenant.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}">
                                {tenant.active ? 'Active' : 'Inactive'}
                            </span>
                            <span class="text-neutral-500 text-sm">{getUnitDisplay()}</span>
                        </div>
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
                <h2 class="text-lg font-semibold text-neutral-900 mb-4">Tenant Details</h2>

                {#if isEditing}
                    <form onsubmit={(e) => { e.preventDefault(); handleSave(); }} class="space-y-4">
                        <div class="grid gap-4 sm:grid-cols-2">
                            <Input id="first_name" label="First Name" bind:value={formData.first_name} required />
                            <Input id="last_name" label="Last Name" bind:value={formData.last_name} required />
                        </div>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <Input id="preferred_name" label="Preferred Name" bind:value={formData.preferred_name} placeholder="Optional" />
                            <Input id="id_card_number" label="ID Card Number" bind:value={formData.id_card_number} placeholder="Optional" />
                        </div>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <Input id="phone" label="Phone" bind:value={formData.phone} placeholder="Optional" />
                            <Select
                                label="Unit"
                                bind:value={formData.unit}
                                options={[
                                    { value: '', label: 'No unit assigned' },
                                    ...units.map((u) => ({ value: u.id, label: `${u.unit_number}${u.unit_name ? ` - ${u.unit_name}` : ''}` }))
                                ]}
                            />
                        </div>
                        <label class="flex items-center gap-2">
                            <input type="checkbox" bind:checked={formData.active} class="h-4 w-4 rounded border-neutral-300 bg-white text-brand-500 focus:ring-brand-500" />
                            <span class="text-sm text-neutral-700">Active tenant</span>
                        </label>

                        <div class="flex justify-end gap-3 pt-4 border-t border-neutral-200">
                            <Button variant="secondary" onclick={cancelEdit}>Cancel</Button>
                            <Button type="submit" loading={saving}>Save Changes</Button>
                        </div>
                    </form>
                {:else}
                    <dl class="grid gap-4 sm:grid-cols-2">
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Full Name</dt>
                            <dd class="mt-1 text-neutral-900">{tenant.first_name} {tenant.last_name}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Preferred Name</dt>
                            <dd class="mt-1 text-neutral-900">{tenant.preferred_name || '—'}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Phone</dt>
                            <dd class="mt-1 text-neutral-900">{tenant.phone || '—'}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">ID Card Number</dt>
                            <dd class="mt-1 text-neutral-900">{tenant.id_card_number || '—'}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Unit</dt>
                            <dd class="mt-1 text-neutral-900">{getUnitDisplay()}</dd>
                        </div>
                        <div>
                            <dt class="text-sm font-medium text-neutral-500">Status</dt>
                            <dd class="mt-1">
                                <span class="rounded-full px-2 py-1 text-xs {tenant.active ? 'bg-green-100 text-green-700' : 'bg-neutral-100 text-neutral-500'}">
                                    {tenant.active ? 'Active' : 'Inactive'}
                                </span>
                            </dd>
                        </div>
                    </dl>
                {/if}
            </Card>

            <!-- Rent History Card -->
            <Card>
                <div class="flex items-center justify-between mb-4">
                    <h2 class="text-lg font-semibold text-neutral-900">Rent History</h2>
                    <Button size="sm" onclick={() => goto(`/rent/new?tenant=${tenant?.id}`)}>Record Payment</Button>
                </div>

                {#if rentHistory.length === 0}
                    <p class="text-neutral-500 text-sm py-4 text-center">No rent payments recorded yet.</p>
                {:else}
                    <div class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-neutral-200">
                            <thead class="bg-neutral-50">
                                <tr>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Month</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Amount</th>
                                    <th class="px-4 py-3 text-left text-xs font-medium text-neutral-500 uppercase">Payment Date</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-neutral-100 bg-white">
                                {#each rentHistory as entry}
                                    <tr class="hover:bg-neutral-50">
                                        <td class="px-4 py-3 text-sm text-neutral-900">{formatRentMonth(entry.rent_month)}</td>
                                        <td class="px-4 py-3 text-sm text-green-600 font-medium">{entry.amount.toLocaleString()}</td>
                                        <td class="px-4 py-3 text-sm text-neutral-600">{formatDate(entry.payment_date)}</td>
                                    </tr>
                                {/each}
                            </tbody>
                        </table>
                    </div>
                {/if}
            </Card>
        </div>
    </div>

    <ConfirmDialog
        bind:open={deleteDialogOpen}
        title="Delete Tenant"
        message="Are you sure you want to delete {tenant.first_name} {tenant.last_name}? This will also delete all their rent history. This action cannot be undone."
        onconfirm={handleDelete}
    />
{/if}