<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        text: string;
        position?: 'top' | 'bottom' | 'left' | 'right';
        children: Snippet;
    }

    let { text, position = 'top', children }: Props = $props();

    const positions = {
        top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
        bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
        left: 'right-full top-1/2 -translate-y-1/2 mr-2',
        right: 'left-full top-1/2 -translate-y-1/2 ml-2'
    };

    const arrows = {
        top: 'top-full left-1/2 -translate-x-1/2 border-t-neutral-800',
        bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-neutral-800',
        left: 'left-full top-1/2 -translate-y-1/2 border-l-neutral-800',
        right: 'right-full top-1/2 -translate-y-1/2 border-r-neutral-800'
    };

    const arrowBorders = {
        top: 'border-l-transparent border-r-transparent border-b-transparent',
        bottom: 'border-l-transparent border-r-transparent border-t-transparent',
        left: 'border-t-transparent border-b-transparent border-r-transparent',
        right: 'border-t-transparent border-b-transparent border-l-transparent'
    };
</script>

<div class="relative inline-block group">
    {@render children()}
    
    <div class="absolute {positions[position]} px-2 py-1 bg-neutral-800 text-white text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity z-50">
        {text}
        <div class="absolute {arrows[position]} {arrowBorders[position]} border-4 border-solid"></div>
    </div>
</div>