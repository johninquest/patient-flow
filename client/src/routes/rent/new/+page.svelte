<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button, Card, Input, Select } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { rentService, propertyService, tenantService } from '$lib/services';
    import { getCurrencyByCountry } from '$lib/types/currency.types';
    import { paymentMethods, type PaymentMethod } from '$lib/types';
    import { validateRentEntry } from '$lib/validation';
    import { t } from '$lib/i18n';
    import type { Property, Tenant } from '$lib/types';

    interface RentEntryFormData {
        tenant: string;
        amount: number;
        payment_date: string;
        rent_month: string;
        payment_method: PaymentMethod;
        notes: string;
    }

    let properties = $state<Property[]>([]);
    let tenants = $state<Tenant[]>([]);
    let loading = $state(true);
    let loadingTenants = $state(false);
    let saving = $state(false);
    let error = $state<string | null>(null);
    let fieldErrors = $state<Record<string, string>>({});

    let selectedPropertyId = $state<string>('');
    
    // Separate month and year selections
    const currentDate = new Date();
    let selectedMonth = $state<string>(String(currentDate.getMonth() + 1).padStart(2, '0'));
    let selectedYear = $state<string>(String(currentDate.getFullYear()));
    
    let formData = $state<RentEntryFormData>({
        tenant: '',
        amount: 0,
        payment_date: new Date().toISOString().split('T')[0],
        rent_month: `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`,
        payment_method: 'cash',
        notes: ''
    });

    const monthOptions = [
        { value: '01', label: 'January' },
        { value: '02', label: 'February' },
        { value: '03', label: 'March' },
        { value: '04', label: 'April' },
        { value: '05', label: 'May' },
        { value: '06', label: 'June' },
        { value: '07', label: 'July' },
        { value: '08', label: 'August' },
        { value: '09', label: 'September' },
        { value: '10', label: 'October' },
        { value: '11', label: 'November' },
        { value: '12', label: 'December' }
    ];

    function generateYearOptions(): { value: string; label: string }[] {
        const currentYear = new Date().getFullYear();
        const years = [];
        for (let i = currentYear - 3; i <= currentYear + 3; i++) {
            years.push({ value: String(i), label: String(i) });
        }
        return years;
    }

    const yearOptions = generateYearOptions();

    function updateRentMonth() {
        formData.rent_month = `${selectedYear}-${selectedMonth}`;
        clearFieldError('rent_month');
    }

    function clearFieldError(field: string) {
        if (fieldErrors[field]) {
            const { [field]: _, ...rest } = fieldErrors;
            fieldErrors = rest;
        }
    }

    onMount(async () => {
        try {
            properties = await propertyService.getAll();
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load data';
        } finally {
            loading = false;
        }
    });

    async function loadTenants() {
        if (!selectedPropertyId) {
            tenants = [];
            return;
        }

        loadingTenants = true;

        try {
            tenants = await tenantService.getByProperty(selectedPropertyId);
            formData.tenant = '';
        } catch (err) {
            if (err instanceof Error && err.message.includes('autocancelled')) {
                return;
            }
            error = err instanceof Error ? err.message : 'Failed to load tenants';
        } finally {
            loadingTenants = false;
        }
    }

    function getSelectedProperty(): Property | undefined {
        return properties.find((p) => p.id === selectedPropertyId);
    }

    function getCurrencyCode(): string {
        const property = getSelectedProperty();
        if (!property) return '';
        const currency = getCurrencyByCountry(property.country);
        return currency?.code ?? '';
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = null;

        // Validate form
        const validation = validateRentEntry(formData, selectedPropertyId);
        fieldErrors = validation.errors;

        if (!validation.valid) {
            error = 'Please fix the errors below';
            return;
        }

        saving = true;

        try {
            await rentService.create(formData);
            goto('/rent');
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to record payment';
        } finally {
            saving = false;
        }
    }

    function handlePropertyChange(value: string) {
        selectedPropertyId = value;
        formData.tenant = '';
        clearFieldError('property');
        loadTenants();
    }

    function handleMonthChange(value: string) {
        selectedMonth = value;
        updateRentMonth();
    }

    function handleYearChange(value: string) {
        selectedYear = value;
        updateRentMonth();
    }
</script>

<svelte:head>
    <title>Record Payment | Popati</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="space-y-6">
        <div class="flex items-center gap-3">
            <Tooltip text={$t('tooltip.back')} position="bottom">
                <button
                    onclick={() => goto('/rent')}
                    class="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                    aria-label={$t('tooltip.back')}
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </Tooltip>
            <div>
                <h1 class="text-2xl font-bold text-neutral-900">Record Rent Payment</h1>
                <p class="text-neutral-500">Record a rent payment from a tenant</p>
            </div>
        </div>

        {#if loading}
            <Card>
                <div class="flex items-center justify-center py-8">
                    <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                </div>
            </Card>
        {:else if properties.length === 0}
            <Card>
                <div class="py-8 text-center">
                    <p class="text-neutral-600 mb-4">You need to create a property first.</p>
                    <Button onclick={() => goto('/properties/new')}>Add Property</Button>
                </div>
            </Card>
        {:else}
            <Card>
                <form onsubmit={handleSubmit} class="space-y-4">
                    {#if error}
                        <div class="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-600">{error}</div>
                    {/if}

                    <!-- Property Select -->
                    <Select
                        label="Property"
                        value={selectedPropertyId}
                        options={[
                            { value: '', label: 'Select a property', disabled: true },
                            ...properties.map((p) => ({ value: p.id, label: p.name }))
                        ]}
                        onchange={handlePropertyChange}
                        error={fieldErrors.property}
                        required
                    />

                    <!-- Tenant Select -->
                    {#if selectedPropertyId}
                        {#if loadingTenants}
                            <div class="flex items-center gap-2 text-neutral-500 text-sm">
                                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Loading tenants...
                            </div>
                        {:else if tenants.length === 0}
                            <div class="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-700">
                                No active tenants for this property. 
                                <a href="/properties/{selectedPropertyId}" class="underline hover:text-yellow-800">Add tenants</a> first.
                            </div>
                        {:else}
                            <Select
                                label="Tenant"
                                bind:value={formData.tenant}
                                options={[
                                    { value: '', label: 'Select a tenant', disabled: true },
                                    ...tenants.map((t) => ({ 
                                        value: t.id, 
                                        label: `${t.first_name} ${t.last_name}${t.preferred_name ? ` (${t.preferred_name})` : ''}` 
                                    }))
                                ]}
                                onchange={() => clearFieldError('tenant')}
                                error={fieldErrors.tenant}
                                required
                            />
                        {/if}
                    {/if}

                    <div class="grid gap-4 sm:grid-cols-2">
                        <!-- Amount -->
                        <div class="space-y-1.5">
                            <label for="amount" class="block text-sm font-medium text-neutral-700">
                                Amount {#if getCurrencyCode()}<span class="text-neutral-500 font-normal">({getCurrencyCode()})</span>{/if} <span class="text-red-500">*</span>
                            </label>
                            <input
                                id="amount"
                                type="number"
                                bind:value={formData.amount}
                                oninput={() => clearFieldError('amount')}
                                min="0"
                                step="0.01"
                                required
                                class="block w-full rounded-md border bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 {fieldErrors.amount ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-brand-500'}"
                            />
                            {#if fieldErrors.amount}
                                <p class="text-sm text-red-600">{fieldErrors.amount}</p>
                            {/if}
                        </div>

                        <!-- Payment Date -->
                        <div class="space-y-1.5">
                            <label for="payment_date" class="block text-sm font-medium text-neutral-700">
                                Payment Date <span class="text-red-500">*</span>
                            </label>
                            <input
                                id="payment_date"
                                type="date"
                                bind:value={formData.payment_date}
                                oninput={() => clearFieldError('payment_date')}
                                required
                                class="block w-full rounded-md border bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 {fieldErrors.payment_date ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-brand-500'}"
                            />
                            {#if fieldErrors.payment_date}
                                <p class="text-sm text-red-600">{fieldErrors.payment_date}</p>
                            {/if}
                        </div>
                    </div>

                    <!-- Payment Method -->
                    <Select
                        label="Payment Method"
                        bind:value={formData.payment_method}
                        options={paymentMethods}
                        onchange={() => clearFieldError('payment_method')}
                        error={fieldErrors.payment_method}
                        required
                    />

                    <!-- Rent Month -->
                    <fieldset class="space-y-1.5">
                        <legend class="block text-sm font-medium text-neutral-700">
                            Rent Month <span class="text-red-500">*</span>
                        </legend>
                        <div class="grid gap-4 sm:grid-cols-2">
                            <Select
                                value={selectedMonth}
                                options={monthOptions}
                                onchange={handleMonthChange}
                                required
                            />
                            <Select
                                value={selectedYear}
                                options={yearOptions}
                                onchange={handleYearChange}
                                required
                            />
                        </div>
                        {#if fieldErrors.rent_month}
                            <p class="text-sm text-red-600">{fieldErrors.rent_month}</p>
                        {/if}
                    </fieldset>

                    <!-- Notes -->
                    <div class="space-y-1.5">
                        <label for="notes" class="block text-sm font-medium text-neutral-700">Notes</label>
                        <textarea
                            id="notes"
                            bind:value={formData.notes}
                            rows="3"
                            placeholder="Optional notes about this payment"
                            class="block w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500"
                        ></textarea>
                    </div>

                    <div class="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onclick={() => goto('/rent')}>Cancel</Button>
                        <Button type="submit" loading={saving} disabled={!selectedPropertyId || !formData.tenant}>
                            Record Payment
                        </Button>
                    </div>
                </form>
            </Card>
        {/if}
    </div>
</div>