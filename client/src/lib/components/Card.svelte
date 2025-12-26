<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    children: Snippet;
    class?: string;
  }

  let { children, class: className = '' }: Props = $props();
</script>

<div class="w-full p-6 bg-white rounded-lg shadow-sm border border-neutral-200 {className}">
  {@render children()}
</div>