<script lang="ts">
    import Button from './Button.svelte';
    import Modal from './Modal.svelte';

    interface Props {
        open: boolean;
        title: string;
        message: string;
        confirmText?: string;
        cancelText?: string;
        variant?: 'danger' | 'primary' | 'secondary' | 'ghost';
        onconfirm: () => void;
        oncancel?: () => void;
    }

    let {
        open = $bindable(),
        title,
        message,
        confirmText = 'Delete',
        cancelText = 'Cancel',
        variant = 'danger',
        onconfirm,
        oncancel
    }: Props = $props();

    function handleConfirm() {
        onconfirm();
        open = false;
    }

    function handleCancel() {
        oncancel?.();
        open = false;
    }
</script>

<Modal bind:open {title} onclose={handleCancel}>
    <p class="text-text">{message}</p>

    {#snippet footer()}
        <Button variant="secondary" onclick={handleCancel}>{cancelText}</Button>
        <Button variant={variant} onclick={handleConfirm}>{confirmText}</Button>
    {/snippet}
</Modal>