<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button, Card, Input, Select } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { expenseService, propertyService, unitService } from '$lib/services';
    import { getCurrencyByCountry } from '$lib/types/currency.types';
    import { expenseCategories, type ExpenseCategory, type Property, type Unit } from '$lib/types';
    import { validateExpense } from '$lib/validation';
    import { t } from '$lib/i18n';

    interface ExpenseFormData {
        property: string;
        unit: string;
        category: ExpenseCategory;
        description: string;
        amount: number;
        expense_date: string;
        vendor: string;
    }

    let properties = $state<Property[]>([]);
    let units = $state<Unit[]>([]);
    let loading = $state(true);
    let loadingUnits = $state(false);
    let saving = $state(false);
    let error = $state<string | null>(null);
    let fieldErrors = $state<Record<string, string>>({});

    let selectedPropertyId = $state<string>('');
    let formData = $state<ExpenseFormData>({
        property: '',
        unit: '',
        category: 'maintenance',
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        vendor: ''
    });

    const categoryOptions = expenseCategories.map((c) => ({ value: c.value, label: c.label }));

    onMount(async () => {
        try {
            properties = await propertyService.getAll();
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load data';
        } finally {
            loading = false;
        }
    });

    async function loadUnits() {
        if (!selectedPropertyId) {
            units = [];
            return;
        }

        loadingUnits = true;
        try {
            units = await unitService.getByProperty(selectedPropertyId);
        } catch (err) {
            // Ignore auto-cancellation errors
            if (err instanceof Error && err.message.includes('autocancelled')) {
                return;
            }
            console.error('Failed to load units:', err);
            units = [];
        } finally {
            loadingUnits = false;
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

    function clearFieldError(field: string) {
        if (fieldErrors[field]) {
            const { [field]: _, ...rest } = fieldErrors;
            fieldErrors = rest;
        }
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = null;

        // Validate form
        const validation = validateExpense({
            property: selectedPropertyId,
            category: formData.category,
            description: formData.description,
            amount: formData.amount,
            expense_date: formData.expense_date
        });
        fieldErrors = validation.errors;

        if (!validation.valid) {
            error = 'Please fix the errors below';
            return;
        }

        saving = true;

        try {
            const data = {
                ...formData,
                property: selectedPropertyId,
                unit: formData.unit || undefined
            };
            await expenseService.create(data);
            goto('/expenses');
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to record expense';
        } finally {
            saving = false;
        }
    }

    function handlePropertyChange(newPropertyId: string) {
        selectedPropertyId = newPropertyId;
        formData.property = newPropertyId;
        formData.unit = '';
        clearFieldError('property');
        loadUnits();
    }
</script>

<svelte:head>
    <title>Add Expense | Popati</title>
</svelte:head>

<div class="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
    <div class="space-y-6">
        <div class="flex items-center gap-3">
            <Tooltip text={$t('tooltip.back')} position="bottom">
                <button
                    onclick={() => goto('/expenses')}
                    class="p-2 text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 rounded-md transition-colors"
                    aria-label={$t('tooltip.back')}
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
            </Tooltip>
            <div>
                <h1 class="text-2xl font-bold text-neutral-900">Add Expense</h1>
                <p class="text-neutral-500">Record a property expense</p>
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

                    <Select
                        label="Property"
                        value={selectedPropertyId}
                        onchange={handlePropertyChange}
                        options={[
                            { value: '', label: 'Select a property', disabled: true },
                            ...properties.map((p) => ({ value: p.id, label: p.name }))
                        ]}
                        error={fieldErrors.property}
                        required
                    />

                    {#if selectedPropertyId}
                        {#if loadingUnits}
                            <div class="flex items-center gap-2 text-sm text-neutral-500">
                                <svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                Loading units...
                            </div>
                        {:else if units.length > 0}
                            <Select
                                label="Unit (Optional)"
                                bind:value={formData.unit}
                                options={[
                                    { value: '', label: 'Property-wide expense' },
                                    ...units.map((u) => ({ value: u.id, label: `${u.unit_number}${u.unit_name ? ` - ${u.unit_name}` : ''}` }))
                                ]}
                            />
                        {/if}
                    {/if}

                    <Select
                        label="Category"
                        bind:value={formData.category}
                        options={categoryOptions}
                        onchange={() => clearFieldError('category')}
                        error={fieldErrors.category}
                        required
                    />

                    <div class="space-y-1.5">
                        <label for="description" class="block text-sm font-medium text-neutral-700">
                            Description
                        </label>
                        <textarea
                            id="description"
                            bind:value={formData.description}
                            oninput={() => clearFieldError('description')}
                            placeholder="e.g., Plumbing repair for kitchen sink"
                            rows="3"
                            class="block w-full rounded-md border bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 {fieldErrors.description ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-brand-500'}"
                        ></textarea>
                        {#if fieldErrors.description}
                            <p class="text-sm text-red-600">{fieldErrors.description}</p>
                        {/if}
                    </div>

                    <div class="grid gap-4 sm:grid-cols-2">
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

                        <div class="space-y-1.5">
                            <label for="expense_date" class="block text-sm font-medium text-neutral-700">
                                Date <span class="text-red-500">*</span>
                            </label>
                            <input
                                id="expense_date"
                                type="date"
                                bind:value={formData.expense_date}
                                oninput={() => clearFieldError('expense_date')}
                                required
                                class="block w-full rounded-md border bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-brand-500 {fieldErrors.expense_date ? 'border-red-500 focus:border-red-500' : 'border-neutral-300 focus:border-brand-500'}"
                            />
                            {#if fieldErrors.expense_date}
                                <p class="text-sm text-red-600">{fieldErrors.expense_date}</p>
                            {/if}
                        </div>
                    </div>

                    <Input
                        id="vendor"
                        label="Vendor (Optional)"
                        bind:value={formData.vendor}
                        placeholder="e.g., ABC Plumbing Services"
                    />

                    <div class="flex justify-end gap-3 pt-4">
                        <Button variant="secondary" onclick={() => goto('/expenses')}>Cancel</Button>
                        <Button type="submit" loading={saving} disabled={!selectedPropertyId}>Add Expense</Button>
                    </div>
                </form>
            </Card>
        {/if}
    </div>
</div>