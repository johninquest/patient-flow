<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        columns: { key: string; label: string; class?: string }[];
        children: Snippet;
        class?: string;
    }

    let { columns, children, class: className = '' }: Props = $props();
</script>

<div class="overflow-x-auto rounded-lg border border-neutral-200 bg-white">
    <table class="min-w-full divide-y divide-neutral-200 {className}">
        <thead class="bg-neutral-50">
            <tr>
                {#each columns as column}
                    <th
                        scope="col"
                        class="px-4 py-3 text-left text-xs font-medium tracking-wider text-neutral-500 uppercase {column.class ?? ''}"
                    >
                        {column.label}
                    </th>
                {/each}
            </tr>
        </thead>
        <tbody class="divide-y divide-neutral-100 bg-white">
            {@render children()}
        </tbody>
    </table>
</div>