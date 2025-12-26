<script lang="ts">
    let { id, label, type = 'text', value = $bindable(), error = '' }: {
        id: string;
        label: string;
        type?: string;
        value: string;
        error?: string;
    } = $props();
</script>

<div class="space-y-1">
    <label for={id} class="block text-sm font-medium text-neutral-700">{label}</label>
    <input
        {id}
        {type}
        bind:value
        class="w-full rounded border px-3 py-2 text-neutral-800 placeholder-neutral-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 {error ? 'border-red-500' : 'border-neutral-300'}"
    />
    {#if error}<p class="text-sm text-red-600">{error}</p>{/if}
</div>