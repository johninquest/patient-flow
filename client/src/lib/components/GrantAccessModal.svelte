<script lang="ts">
    import Modal from './Modal.svelte';
    import Select from './Select.svelte';
    import Button from './Button.svelte';
    import Alert from './Alert.svelte';
    import { userAccessService } from '$lib/services/user-access.service';
    import type { AccessRole } from '$lib/types/user-access.types';

    interface Props {
        open: boolean;
        propertyId: string;
        propertyName?: string;
        onclose?: () => void;
        ongranted?: (data: { email: string; role: AccessRole }) => void;
    }

    let {
        open = $bindable(),
        propertyId,
        propertyName = '',
        onclose,
        ongranted
    }: Props = $props();

    let email = $state('');
    let role = $state<AccessRole>('viewer');
    let loading = $state(false);
    let error = $state('');

    const roleOptions = [
        { value: 'viewer', label: 'Viewer (read-only)' },
        { value: 'manager', label: 'Manager (can edit)' }
    ];

    async function grantAccess() {
        if (!email.trim()) {
            error = 'Please enter an email address';
            return;
        }

        loading = true;
        error = '';

        try {
            await userAccessService.grantAccess({
                email: email.trim(),
                property: propertyId,
                role
            });

            ongranted?.({ email: email.trim(), role });
            resetForm();
            handleClose();
        } catch (e: any) {
            if (e.status === 400) {
                if (e.message?.includes('already has access')) {
                    error = 'This user already has access to this property.';
                } else if (e.message?.includes('pending invitation')) {
                    error = 'A pending invitation already exists for this email. Please update or revoke it instead.';
                } else {
                    error = e.message || 'Failed to grant access.';
                }
            } else {
                error = 'Failed to grant access. Please try again.';
            }
        } finally {
            loading = false;
        }
    }

    function resetForm() {
        email = '';
        role = 'viewer';
        error = '';
    }

    function handleClose() {
        resetForm();
        open = false;
        onclose?.();
    }

    function handleRoleChange(value: string) {
        role = value as AccessRole;
    }
</script>

<Modal bind:open title="Grant Access" onclose={handleClose}>
    <div class="space-y-4">
        <p class="text-sm text-gray-600">
            Grant access to <strong>{propertyName || 'this property'}</strong>
        </p>

        {#if error}
            <Alert type="error" message={error} />
        {/if}

        <div class="space-y-2">
            <label for="grant-email" class="block text-sm font-medium text-gray-700">
                Email Address
            </label>
            <input
                id="grant-email"
                type="email"
                bind:value={email}
                placeholder="user@example.com"
                disabled={loading}
                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-200"
            />
            <p class="text-xs text-gray-500">
                If the user doesn't have an account yet, they'll receive access when they sign in with this email.
            </p>
        </div>

        <div class="space-y-2">
            <label for="grant-role" class="block text-sm font-medium text-gray-700">
                Access Level
            </label>
            <Select
                id="grant-role"
                bind:value={role}
                options={roleOptions}
                disabled={loading}
                onchange={handleRoleChange}
            />
            <p class="text-xs text-gray-500">
                {#if role === 'viewer'}
                    Viewers can see property details, tenants, and rent entries but cannot make changes.
                {:else}
                    Managers can view and edit property details, tenants, and rent entries.
                {/if}
            </p>
        </div>
    </div>

    {#snippet footer()}
        <Button variant="secondary" onclick={handleClose} disabled={loading}>
            Cancel
        </Button>
        <Button
            variant="primary"
            onclick={grantAccess}
            disabled={loading || !email.trim()}
        >
            {loading ? 'Granting Access...' : 'Grant Access'}
        </Button>
    {/snippet}
</Modal>
