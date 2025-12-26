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
    let checking = $state(false);
    let error = $state('');
    let userFound = $state<{ id: string; email: string; name?: string } | null>(null);
    let userChecked = $state(false);

    const roleOptions = [
        { value: 'viewer', label: 'Viewer (read-only)' },
        { value: 'manager', label: 'Manager (can edit)' }
    ];

    async function checkUser() {
        if (!email.trim()) {
            error = 'Please enter an email address';
            return;
        }

        checking = true;
        error = '';
        userFound = null;
        userChecked = false;

        try {
            userFound = await userAccessService.findUserByEmail(email.trim());
            userChecked = true;
            if (!userFound) {
                error = 'User not found. They must sign up with Google first.';
            }
        } catch (e) {
            error = 'Error checking user. Please try again.';
        } finally {
            checking = false;
        }
    }

    async function grantAccess() {
        if (!userFound) return;

        loading = true;
        error = '';

        try {
            await userAccessService.grantAccess({
                user: userFound.id,
                property: propertyId,
                role
            });

            ongranted?.({ email: userFound.email, role });
            resetForm();
            handleClose();
        } catch (e: any) {
            if (e.status === 400) {
                error = 'This user already has access to this property.';
            } else {
                error = e.message || 'Failed to grant access. Please try again.';
            }
        } finally {
            loading = false;
        }
    }

    function resetForm() {
        email = '';
        role = 'viewer';
        userFound = null;
        userChecked = false;
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
                User Email (Gmail)
            </label>
            <div class="flex gap-2">
                <div class="flex-1">
                    <input
                        id="grant-email"
                        type="email"
                        bind:value={email}
                        placeholder="user@gmail.com"
                        disabled={loading || checking}
                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow duration-200"
                    />
                </div>
                <Button
                    variant="secondary"
                    onclick={checkUser}
                    disabled={loading || checking || !email.trim()}
                >
                    {checking ? 'Checking...' : 'Check'}
                </Button>
            </div>
        </div>

        {#if userChecked && userFound}
            <Alert type="success" message="User found: {userFound.name || userFound.email}" />

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
        {/if}

        {#if userChecked && !userFound}
            <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p class="text-sm text-yellow-800">
                    <strong>User not found.</strong> Ask them to sign up first using their Google account,
                    then try again.
                </p>
            </div>
        {/if}
    </div>

    {#snippet footer()}
        <Button variant="secondary" onclick={handleClose} disabled={loading}>
            Cancel
        </Button>
        <Button
            variant="primary"
            onclick={grantAccess}
            disabled={loading || !userFound}
        >
            {loading ? 'Granting...' : 'Grant Access'}
        </Button>
    {/snippet}
</Modal>
