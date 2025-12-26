<script lang="ts">
    import { goto } from '$app/navigation';
    import { register } from '$lib/auth/register';
    import FormInput from '$lib/components/FormInput.svelte';

    let email = $state('');
    let password = $state('');
    let passwordConfirm = $state('');
    let error = $state('');
    let loading = $state(false);

    async function handleSubmit() {
        if (password !== passwordConfirm) {
            error = 'Passwords do not match';
            return;
        }
        
        loading = true;
        error = '';
        
        const result = await register(email, password, passwordConfirm);
        
        if (result.success) {
            goto('/');
        } else {
            error = result.error ?? 'Registration failed';
        }
        loading = false;
    }
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50">
    <div class="w-full max-w-sm space-y-6 rounded-lg bg-white p-8 shadow">
        <h1 class="text-2xl font-bold">Create account</h1>
        
        {#if error}
            <p class="rounded bg-red-100 p-3 text-red-700">{error}</p>
        {/if}
        
        <form onsubmit={handleSubmit} class="space-y-4">
            <FormInput id="email" label="Email" type="email" bind:value={email} />
            <FormInput id="password" label="Password" type="password" bind:value={password} />
            <FormInput id="passwordConfirm" label="Confirm Password" type="password" bind:value={passwordConfirm} />
            
            <button
                type="submit"
                disabled={loading}
                class="w-full rounded bg-blue-600 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
            >
                {loading ? 'Creating...' : 'Register'}
            </button>
        </form>
        
        <p class="text-center text-sm">
            Have an account? <a href="/login" class="text-blue-600 hover:underline">Sign in</a>
        </p>
    </div>
</div>