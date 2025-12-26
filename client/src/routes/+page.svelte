<script lang="ts">
    import { goto } from '$app/navigation';
    import { isAuthenticated, isInitialized } from '$lib/auth';
    import { onMount } from 'svelte';

    onMount(() => {
        const unsubscribe = isInitialized.subscribe(initialized => {
            if (initialized) {
                isAuthenticated.subscribe(authenticated => {
                    if (authenticated) {
                        goto('/dashboard');
                    } else {
                        goto('/login');
                    }
                });
            }
        });
        return unsubscribe;
    });
</script>

<div class="min-h-screen flex items-center justify-center bg-neutral-50">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
</div>

<style>
</style>
