<script lang="ts">
    import Button from './Button.svelte';
    import Select from './Select.svelte';
    import ConfirmDialog from './ConfirmDialog.svelte';
    import Modal from './Modal.svelte';
    import { userAccessService } from '$lib/services/user-access.service';
    import type { UserAccess, AccessRole } from '$lib/types/user-access.types';

    interface Props {
        accessList?: UserAccess[];
        canManage?: boolean;
        loading?: boolean;
        onupdated?: () => void;
        onrevoked?: () => void;
    }

    let {
        accessList = [],
        canManage = false,
        loading = false,
        onupdated,
        onrevoked
    }: Props = $props();

    let showConfirm = $state(false);
    let revokeTarget = $state<UserAccess | null>(null);
    let updating = $state<string | null>(null);
    
    // New state for role editing
    let editModalOpen = $state(false);
    let editTarget = $state<UserAccess | null>(null);
    let newRole = $state<AccessRole>('viewer');

    const roleOptions = [
        { value: 'viewer', label: 'Viewer' },
        { value: 'manager', label: 'Manager' }
    ];

    function openEditModal(access: UserAccess) {
        editTarget = access;
        newRole = access.role;
        editModalOpen = true;
    }

    async function handleRoleUpdate() {
        if (!editTarget || newRole === editTarget.role) {
            editModalOpen = false;
            return;
        }

        updating = editTarget.id;
        try {
            await userAccessService.updateAccess(editTarget.id, { role: newRole });
            onupdated?.();
            editModalOpen = false;
        } catch (e) {
            console.error('Failed to update access:', e);
        } finally {
            updating = null;
        }
    }

    function confirmRevoke(access: UserAccess) {
        revokeTarget = access;
        showConfirm = true;
    }

    async function handleRevoke() {
        if (!revokeTarget) return;

        updating = revokeTarget.id;
        try {
            await userAccessService.revokeAccess(revokeTarget.id);
            onrevoked?.();
        } catch (e) {
            console.error('Failed to revoke access:', e);
        } finally {
            updating = null;
            showConfirm = false;
            revokeTarget = null;
        }
    }

    function getUserDisplay(access: UserAccess): { name: string; email: string; isPending: boolean } {
        const isPending = !!access.pending_email;
        
        if (isPending) {
            return {
                name: access.pending_email || 'Pending User',
                email: access.pending_email || '',
                isPending: true
            };
        }
        
        return {
            name: access.user_name || access.user_email || 'Unknown User',
            email: access.user_email || '',
            isPending: false
        };
    }

    function getUserInitial(access: UserAccess): string {
        const display = getUserDisplay(access);
        return display.name[0]?.toUpperCase() || '?';
    }

    function getRevokeTargetName(): string {
        if (!revokeTarget) return 'this user';
        const display = getUserDisplay(revokeTarget);
        return display.name;
    }

    function getRoleLabel(role: AccessRole): string {
        return role === 'manager' ? 'Manager' : 'Viewer';
    }

    function getRoleDescription(role: AccessRole): string {
        return role === 'manager' 
            ? 'Can view and edit property data'
            : 'Can only view property data';
    }
</script>

{#if loading}
    <div class="text-center py-4 text-gray-500">Loading access list...</div>
{:else if accessList.length === 0}
    <div class="text-center py-4 text-gray-500">
        No users have been granted access yet.
    </div>
{:else}
    <div class="divide-y divide-gray-200">
        {#each accessList as access (access.id)}
            {@const display = getUserDisplay(access)}
            <div class="py-4 flex items-center justify-between gap-4">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center shrink-0">
                        <span class="text-sm font-medium text-gray-600">
                            {getUserInitial(access)}
                        </span>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <p class="text-sm font-medium text-gray-900 truncate">
                                {display.name}
                            </p>
                            {#if display.isPending}
                                <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 shrink-0">
                                    Pending
                                </span>
                            {/if}
                        </div>
                        <p class="text-xs text-gray-500 truncate">
                            {display.email}
                        </p>
                        <div class="mt-1 flex items-center gap-2">
                            <span class="px-2 py-0.5 text-xs font-medium rounded-full shrink-0 {access.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                                {getRoleLabel(access.role)}
                            </span>
                            <span class="text-xs text-gray-500 hidden sm:inline">
                                {getRoleDescription(access.role)}
                            </span>
                        </div>
                    </div>
                </div>

                {#if canManage}
                    <div class="flex items-center gap-2 shrink-0">
                        <Button
                            variant="secondary"
                            size="sm"
                            onclick={() => openEditModal(access)}
                            disabled={updating === access.id || display.isPending}
                        >
                            Edit
                        </Button>
                        <Button
                            variant="danger"
                            size="sm"
                            onclick={() => confirmRevoke(access)}
                            disabled={updating === access.id}
                        >
                            Revoke
                        </Button>
                    </div>
                {/if}
            </div>
        {/each}
    </div>
{/if}

<!-- Role Edit Modal -->
<Modal bind:open={editModalOpen} title="Change Access Role">
    {#if editTarget}
        {@const display = getUserDisplay(editTarget)}
        <div class="space-y-4">
            <div>
                <p class="text-sm text-gray-600 mb-1">User</p>
                <p class="text-base font-medium text-gray-900">{display.name}</p>
                <p class="text-sm text-gray-500">{display.email}</p>
            </div>

            <div class="space-y-2">
                <label for="role-select" class="block text-sm font-medium text-gray-700">
                    Access Level
                </label>
                <Select
                    id="role-select"
                    bind:value={newRole}
                    options={roleOptions}
                />
                <p class="text-xs text-gray-500 mt-2">
                    {getRoleDescription(newRole)}
                </p>
            </div>

            {#if newRole !== editTarget.role}
                <div class="rounded-md bg-yellow-50 border border-yellow-200 p-3">
                    <p class="text-sm text-yellow-800">
                        <strong>Warning:</strong> Changing this user's role will {newRole === 'viewer' ? 'remove their ability to edit' : 'grant them editing access to'} this property.
                    </p>
                </div>
            {/if}
        </div>
    {/if}

    {#snippet footer()}
        <Button 
            variant="secondary" 
            onclick={() => editModalOpen = false}
            disabled={updating !== null}
        >
            Cancel
        </Button>
        <Button 
            variant="primary" 
            onclick={handleRoleUpdate}
            disabled={updating !== null || newRole === editTarget?.role}
            loading={updating === editTarget?.id}
        >
            {newRole === editTarget?.role ? 'No Changes' : 'Update Role'}
        </Button>
    {/snippet}
</Modal>

<!-- Revoke Confirmation Dialog -->
<ConfirmDialog
    bind:open={showConfirm}
    title="Revoke Access"
    message="Are you sure you want to revoke access for {getRevokeTargetName()}? They will no longer be able to view this property."
    confirmText="Revoke"
    onconfirm={handleRevoke}
/>
