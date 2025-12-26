<script lang="ts">
    interface Props {
        type?: 'error' | 'success' | 'info';
        message: string;
    }

    let { type = 'error', message }: Props = $props();

    const styles = {
        error: 'bg-red-50 border-red-200 text-red-700',
        success: 'bg-green-50 border-green-200 text-green-700',
        info: 'bg-blue-50 border-blue-200 text-blue-700'
    };
</script>

{#if message}
    <div class="rounded-md border p-4 {styles[type]}" role="alert">
        <p class="text-sm">{message}</p>
    </div>
{/if}