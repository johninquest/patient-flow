<script lang="ts">
    import Button from './Button.svelte';
    import Modal from './Modal.svelte';

    interface Props {
        open: boolean;
        title?: string;
        message: string;
        details?: string;
        onclose?: () => void;
    }

    let {
        open = $bindable(),
        title = 'Error',
        message,
        details,
        onclose
    }: Props = $props();

    function handleClose() {
        open = false;
        onclose?.();
    }
</script>

<Modal bind:open {title} onclose={handleClose} size="md">
    <div class="space-y-3">
        <!-- Error Icon -->
        <div class="flex justify-center">
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                <svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
            </div>
        </div>

        <!-- Message -->
        <p class="text-center text-neutral-900">{message}</p>

        <!-- Details (if provided) -->
        {#if details}
            <div class="rounded-md bg-neutral-50 border border-neutral-200 p-3">
                <p class="text-sm text-neutral-600 font-mono">{details}</p>
            </div>
        {/if}
    </div>

    {#snippet footer()}
        <Button variant="primary" onclick={handleClose} class="w-full sm:w-auto">
            OK
        </Button>
    {/snippet}
</Modal>