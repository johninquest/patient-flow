<script lang="ts">
    import type { Snippet } from 'svelte';
    import { createPropertyPermissions } from '$lib/stores/permissions';

    interface Props {
        propertyId: string;
        requireOwner?: boolean;
        requireEdit?: boolean;
        children: Snippet;
    }

    let { propertyId, requireOwner = false, requireEdit = false, children }: Props = $props();
    
    const perms = $derived(createPropertyPermissions(propertyId));
    
    const canRender = $derived(
        requireOwner ? $perms.isOwner :
        requireEdit ? $perms.canEdit :
        true
    );
</script>

{#if canRender}
    {@render children()}
{/if}