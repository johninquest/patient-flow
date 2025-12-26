<script lang="ts">
    interface Option {
        value: string;
        label: string;
        disabled?: boolean;
    }

    interface Props {
        label?: string;
        value: string;
        options: Option[];
        placeholder?: string;
        error?: string;
        disabled?: boolean;
        required?: boolean;
        name?: string;
        id?: string;
        class?: string;
        onchange?: (value: string) => void;
    }

    let {
        label,
        value = $bindable(),
        options,
        placeholder = 'Select an option',
        error,
        disabled = false,
        required = false,
        name,
        id,
        class: className = '',
        onchange
    }: Props = $props();

    function handleChange(e: Event) {
        const target = e.target as HTMLSelectElement;
        value = target.value;
        onchange?.(value);
    }
</script>

<div class="space-y-1.5 {className}">
    {#if label}
        <label for={id} class="block text-sm font-medium text-neutral-700">
            {label}
            {#if required}<span class="text-red-500">*</span>{/if}
        </label>
    {/if}
    <select
        {id}
        {name}
        {disabled}
        {required}
        value={value}
        onchange={handleChange}
        class="w-full rounded-md border bg-white px-3 py-2 text-neutral-900 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:cursor-not-allowed disabled:opacity-50 {error ? 'border-red-500' : 'border-neutral-300'}"
    >
        {#if placeholder}
            <option value="" disabled>{placeholder}</option>
        {/if}
        {#each options as option}
            <option value={option.value} disabled={option.disabled}>
                {option.label}
            </option>
        {/each}
    </select>
    {#if error}
        <p class="text-sm text-red-600">{error}</p>
    {/if}
</div>