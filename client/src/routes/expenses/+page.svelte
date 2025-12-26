<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { Button, Card, Table, EmptyState, Select } from '$lib/components';
    import Tooltip from '$lib/components/Tooltip.svelte';
    import { expenseService, propertyService } from '$lib/services';
    import { getCurrencyByCountry } from '$lib/types/currency.types';
    import { expenseCategories, type Expense, type Property } from '$lib/types';
    import { t } from '$lib/i18n';

    let expenses = $state<Expense[]>([]);
    let properties = $state<Property[]>([]);
    let selectedPropertyId = $state<string>('');
    let loading = $state(true);
    let error = $state<string | null>(null);

    const columns = [
        { key: 'category', label: 'Category' },
        { key: 'description', label: 'Description' },
        { key: 'amount', label: 'Amount' },
        { key: 'date', label: 'Date' },
        { key: 'vendor', label: 'Vendor' },
        { key: 'actions', label: '', class: 'w-24' }
    ];

    onMount(async () => {
        await loadProperties();
    });

    async function loadProperties() {
        try {
            properties = await propertyService.getAll();
            if (properties.length > 0) {
                selectedPropertyId = properties[0].id;
                await loadExpenses();
            }
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load properties';
        } finally {
            loading = false;
        }
    }

    async function loadExpenses() {
        if (!selectedPropertyId) return;
        loading = true;
        error = null;

        try {
            expenses = await expenseService.getByProperty(selectedPropertyId);
        } catch (err) {
            // Ignore auto-cancellation errors
            if (err instanceof Error && err.message.includes('autocancelled')) {
                return;
            }
            error = err instanceof Error ? err.message : 'Failed to load expenses';
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

    function getCategoryLabel(value: string): string {
        const cat = expenseCategories.find((c) => c.value === value);
        return cat?.label ?? value;
    }

    // Use onchange handler instead of $effect to avoid race conditions
    function handlePropertyChange(value: string) {
        selectedPropertyId = value;
        loadExpenses();
    }
</script>

<svelte:head>
    <title>Expenses | Popati</title>
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
                    <h1 class="text-2xl font-bold text-neutral-900">Expenses</h1>
                    <p class="text-neutral-500">Track property expenses</p>
                </div>
            </div>
            <Button onclick={() => goto('/expenses/new')}>
                <svg class="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
                </svg>
                Add Expense
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
                <Button variant="secondary" onclick={loadExpenses} class="mt-2">Retry</Button>
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
                description="Create a property first before tracking expenses."
            >
                {#snippet action()}
                    <Button onclick={() => goto('/properties/new')}>Add Property</Button>
                {/snippet}
            </EmptyState>
        {:else if expenses.length === 0}
            <EmptyState
                title="No expenses"
                description="Record your first expense for this property."
            >
                {#snippet action()}
                    <Button onclick={() => goto('/expenses/new')}>Add Expense</Button>
                {/snippet}
            </EmptyState>
        {:else}
            <Table {columns}>
                {#each expenses as expense}
                    <tr class="hover:bg-neutral-50">
                        <td class="px-4 py-3 text-sm">
                            <span class="rounded-full bg-neutral-100 px-2 py-1 text-xs text-neutral-700">
                                {getCategoryLabel(expense.category)}
                            </span>
                        </td>
                        <td class="px-4 py-3 text-sm text-neutral-900">{expense.description}</td>
                        <td class="px-4 py-3 text-sm text-red-600 font-medium">
                            -{formatAmount(expense.amount)}
                        </td>
                        <td class="px-4 py-3 text-sm text-neutral-600">
                            {formatDate(expense.expense_date)}
                        </td>
                        <td class="px-4 py-3 text-sm text-neutral-500">
                            {expense.vendor ?? '—'}
                        </td>
                        <td class="px-4 py-3 text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                onclick={() => goto(`/expenses/${expense.id}/edit`)}
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