<script lang="ts">
    import Button from './Button.svelte';
    import Select from './Select.svelte';
    import ConfirmDialog from './ConfirmDialog.svelte';
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

    const roleOptions = [
        { value: 'viewer', label: 'Viewer' },
        { value: 'manager', label: 'Manager' }
    ];

    async function handleRoleChange(access: UserAccess, newRole: string) {
        if (newRole === access.role) return;

        updating = access.id;
        try {
            await userAccessService.updateAccess(access.id, { role: newRole as AccessRole });
            onupdated?.();
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
            <div class="py-3 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span class="text-sm font-medium text-gray-600">
                            {getUserInitial(access)}
                        </span>
                    </div>
                    <div>
                        <div class="flex items-center gap-2">
                            <p class="text-sm font-medium text-gray-900">
                                {display.name}
                            </p>
                            {#if display.isPending}
                                <span class="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                    Pending
                                </span>
                            {/if}
                        </div>
                        <p class="text-xs text-gray-500">
                            {display.email}
                        </p>
                    </div>
                </div>

                <div class="flex items-center gap-2">
                    {#if canManage}
                        <Select
                            value={access.role}
                            options={roleOptions}
                            disabled={updating === access.id || display.isPending}
                            onchange={(value) => handleRoleChange(access, value)}
                        />
                        <Button
                            variant="danger"
                            size="sm"
                            onclick={() => confirmRevoke(access)}
                            disabled={updating === access.id}
                        >
                            Revoke
                        </Button>
                    {:else}
                        <span class="px-2 py-1 text-xs font-medium rounded-full {access.role === 'manager' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}">
                            {access.role}
                        </span>
                    {/if}
                </div>
            </div>
        {/each}
    </div>
{/if}

<ConfirmDialog
    bind:open={showConfirm}
    title="Revoke Access"
    message="Are you sure you want to revoke access for {getRevokeTargetName()}? They will no longer be able to view this property."
    confirmText="Revoke"
    onconfirm={handleRevoke}
/>
