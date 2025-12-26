<script lang="ts">
    import { goto } from '$app/navigation';
    import { Button, Input } from '$lib/components';
    import { propertyService } from '$lib/services';
    import { getCountryList } from '$lib/types/currency.types';
    import type { PropertyFormData } from '$lib/types';

    let loading = $state(false);
    let error = $state<string | null>(null);

    let formData = $state<PropertyFormData>({
        name: '',
        city: '',
        country: '',
        construction_year: undefined
    });

    const countryOptions = getCountryList().map((c) => ({ value: c, label: c }));

    async function handleSubmit(e: Event) {
        e.preventDefault();
        loading = true;
        error = null;

        try {
            // Remove undefined construction_year before sending
            const data: any = {
                name: formData.name,
                city: formData.city,
                country: formData.country,
            };
            
            if (formData.construction_year !== undefined) {
                data.construction_year = formData.construction_year;
            }

            const property = await propertyService.create(data);
            goto(`/properties/${property.id}`);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to create property';
        } finally {
            loading = false;
        }
    }
</script>

<svelte:head>
    <title>New Property | Popati</title>
</svelte:head>

<div class="min-h-screen bg-neutral-50 px-4 py-8">
    <div class="mx-auto max-w-lg">
        <!-- Header -->
        <div class="mb-8">
            <button
                onclick={() => goto('/properties')}
                class="mb-4 inline-flex items-center gap-1.5 text-sm text-neutral-600 transition-colors hover:text-brand-500"
            >
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                </svg>
                Back
            </button>
            <h1 class="text-2xl font-semibold text-neutral-900">New Property</h1>
            <p class="mt-1 text-sm text-neutral-600">Add a rental property to your portfolio</p>
        </div>

        <!-- Form -->
        <div class="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
            <form onsubmit={handleSubmit} class="space-y-5">
                {#if error}
                    <div class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </div>
                {/if}

                <Input
                    id="name"
                    label="Property Name"
                    bind:value={formData.name}
                    placeholder="e.g., Sunset Apartments"
                    required
                />

                <div class="grid gap-4 sm:grid-cols-2">
                    <Input
                        id="city"
                        label="City"
                        bind:value={formData.city}
                        placeholder="e.g., Douala"
                        required
                    />

                    <div>
                        <label for="country" class="mb-1.5 block text-sm font-medium text-neutral-700">
                            Country <span class="text-red-500">*</span>
                        </label>
                        <select
                            id="country"
                            bind:value={formData.country}
                            required
                            class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                        >
                            <option value="" disabled>Select country</option>
                            {#each countryOptions as option}
                                <option value={option.value}>{option.label}</option>
                            {/each}
                        </select>
                    </div>
                </div>

                <div>
                    <label for="construction_year" class="mb-1.5 block text-sm font-medium text-neutral-700">
                        Construction Year
                        <span class="font-normal text-neutral-500">(optional)</span>
                    </label>
                    <input
                        id="construction_year"
                        type="number"
                        min="1900"
                        max={new Date().getFullYear()}
                        bind:value={formData.construction_year}
                        placeholder="e.g., 2015"
                        class="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-900 placeholder-neutral-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    />
                </div>

                <div class="flex justify-end gap-3 pt-2">
                    <button
                        type="button"
                        onclick={() => goto('/properties')}
                        class="rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:bg-neutral-100"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        class="rounded-md bg-brand-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:opacity-50"
                    >
                        {loading ? 'Creating...' : 'Create Property'}
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>