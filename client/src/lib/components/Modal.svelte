<script lang="ts">
    import type { Snippet } from 'svelte';

    interface Props {
        open: boolean;
        title: string;
        children: Snippet;
        footer?: Snippet;
        onclose?: () => void;
        size?: 'sm' | 'md' | 'lg' | 'xl';
    }

    let { open = $bindable(), title, children, footer, onclose, size = 'md' }: Props = $props();

    const sizeClasses: Record<string, string> = {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl'
    };

    function handleBackdropClick(e: MouseEvent) {
        if (e.target === e.currentTarget) {
            close();
        }
    }

    function handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            close();
        }
    }

    function close() {
        open = false;
        onclose?.();
    }
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabindex="-1"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        onclick={handleBackdropClick}
    >
        <div class="w-full {sizeClasses[size]} rounded-lg bg-background text-text shadow-xl">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
                <h3 id="modal-title" class="text-lg font-semibold">{title}</h3>
                <button
                    type="button"
                    onclick={close}
                    aria-label="Close"
                    class="rounded-lg p-1 text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                >
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                            d="M6 18L18 6M6 6l12 12"
                        />
                    </svg>
                </button>
            </div>

            <!-- Body -->
            <div class="px-4 py-4">
                {@render children()}
            </div>

            <!-- Footer -->
            {#if footer}
                <div class="flex justify-end gap-2 border-t border-neutral-200 px-4 py-3">
                    {@render footer()}
                </div>
            {/if}
        </div>
    </div>
{/if}