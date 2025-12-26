<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        title: string;
        description?: string;
        action?: Snippet;
    }

    let { title, description, action }: Props = $props();
</script>

<div class="flex flex-col items-center justify-center rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-6 py-10 text-center">
    <h3 class="text-lg font-medium text-neutral-900">{title}</h3>

    {#if description}
        <p class="mt-1 max-w-sm text-sm text-neutral-500">{description}</p>
    {/if}

    {#if action}
        <div class="mt-4">
            {@render action()}
        </div>
    {/if}
</div>