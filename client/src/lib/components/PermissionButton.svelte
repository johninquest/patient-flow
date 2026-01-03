<script lang="ts">
    import type { Snippet } from 'svelte';
    import Button from './Button.svelte';

    interface Props {
        /**
         * Whether permissions are still loading
         */
        loading: boolean;
        /**
         * Whether user has permission to see this button
         */
        show: boolean;
        /**
         * Button variant
         */
        variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
        /**
         * Button size
         */
        size?: 'sm' | 'md' | 'lg';
        /**
         * Click handler
         */
        onclick?: (e: MouseEvent) => void;
        /**
         * Whether button is in loading state (e.g., saving)
         */
        disabled?: boolean;
        /**
         * Show loading spinner
         */
        buttonLoading?: boolean;
        /**
         * Additional CSS classes
         */
        class?: string;
        /**
         * Button content
         */
        children: Snippet;
    }

    let { 
        loading, 
        show, 
        variant = 'secondary',
        size = 'md',
        onclick,
        disabled = false,
        buttonLoading = false,
        class: className = '',
        children 
    }: Props = $props();

    const skeletonHeight = $derived(
        size === 'sm' ? 'h-8' : 
        size === 'lg' ? 'h-12' : 
        'h-10'
    );
</script>

{#if loading}
    <!-- Skeleton loader while permissions load -->
    <div class="{skeletonHeight} w-24 bg-neutral-200 rounded-lg animate-pulse {className}"></div>
{:else if show}
    <!-- Show button if user has permission -->
    <Button 
        {variant} 
        {size} 
        {onclick}
        {disabled}
        loading={buttonLoading}
        class={className}
    >
        {@render children()}
    </Button>
{/if}