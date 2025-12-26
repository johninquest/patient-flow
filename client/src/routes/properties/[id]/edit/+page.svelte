<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { page } from '$app/stores';
    import { Button, Card, Input, Select } from '$lib/components';
    import { propertyService } from '$lib/services';
    import { getCountryList } from '$lib/types/currency.types';
    import type { Property, PropertyFormData } from '$lib/types';

    let property = $state<Property | null>(null);
    let loading = $state(true);
    let saving = $state(false);
    let error = $state<string | null>(null);

    let formData = $state<PropertyFormData>({
        name: '',
        city: '',
        country: '',
        construction_year: undefined
    });

    const countryOptions = getCountryList().map((c) => ({ value: c, label: c }));

    onMount(async () => {
        try {
            property = await propertyService.getById($page.params.id);
            formData = {
                name: property.name,
                city: property.city,
                country: property.country,
                construction_year: property.construction_year
            };
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to load property';
        } finally {
            loading = false;
        }
    });

    async function handleSubmit(e: Event) {
        e.preventDefault();
        saving = true;
        error = null;

        try {
            await propertyService.update($page.params.id, formData);
            goto(`/properties/${$page.params.id}`);
        } catch (err) {
            error = err instanceof Error ? err.message : 'Failed to update property';
        } finally {
            saving = false;
        }
    }
</script>

<svelte:head>
    <title>Edit {property?.name ?? 'Property'} | Popati</title>
</svelte:head>

<div class="mx-auto max-w-2xl space-y-6">
    <div class="flex items-center gap-2">
        <Button variant="ghost" size="sm" onclick={() => goto(`/properties/${$page.params.id}`)}>
            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
        </Button>
        <div>
            <h1 class="text-2xl font-bold text-white">Edit Property</h1>
            <p class="text-gray-400">Update property details</p>
        </div>
    </div>

    {#if loading}
        <Card>
            <div class="flex items-center justify-center py-8">
                <svg class="h-8 w-8 animate-spin text-teal-500" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            </div>
        </Card>
    {:else}
        <Card>
            <form onsubmit={handleSubmit} class="space-y-4">
                {#if error}
                    <div class="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
                {/if}

                <Input
                    label="Property Name"
                    bind:value={formData.name}
                    placeholder="e.g., Sunset Apartments"
                    required
                />

                <div class="grid gap-4 sm:grid-cols-2">
                    <Input label="City" bind:value={formData.city} placeholder="e.g., Nairobi" required />
                    <Select label="Country" bind:value={formData.country} options={countryOptions} placeholder="Select country" required />
                </div>

                <Input label="Construction Year" type="number" bind:value={formData.construction_year} placeholder="e.g., 2015" />

                <div class="flex justify-end gap-3 pt-4">
                    <Button variant="secondary" onclick={() => goto(`/properties/${$page.params.id}`)}>Cancel</Button>
                    <Button type="submit" loading={saving}>Save Changes</Button>
                </div>
            </form>
        </Card>
    {/if}
</div>