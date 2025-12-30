<script lang="ts">
    import type { Activity } from '$lib/types/activity.types';
    import { formatRelativeTime, formatAbsoluteTime } from '$lib/utils/date';
    import Tooltip from './Tooltip.svelte';

    interface Props {
        activities: Activity[];
        loading?: boolean;
    }

    let { activities, loading = false }: Props = $props();

    function getActionIcon(action: string): string {
        switch (action) {
            case 'create': return '➕';
            case 'update': return '✏️';
            case 'delete': return '🗑️';
            default: return '📝';
        }
    }

    function getActionColor(action: string): string {
        switch (action) {
            case 'create': return 'text-green-600';
            case 'update': return 'text-blue-600';
            case 'delete': return 'text-red-600';
            default: return 'text-gray-600';
        }
    }

    function getActionText(action: string): string {
        switch (action) {
            case 'create': return 'created';
            case 'update': return 'updated';
            case 'delete': return 'deleted';
            default: return 'modified';
        }
    }

    function getEntityLabel(entityType: string): string {
        switch (entityType) {
            case 'rent_entry': return 'rent entry';
            case 'user_access': return 'user access';
            default: return entityType;
        }
    }

    function formatFieldName(field: string): string {
        return field.replace(/_/g, ' ');
    }

    function formatValue(value: any): string {
        if (value === null || value === undefined) {
            return 'empty';
        }
        if (typeof value === 'boolean') {
            return value ? 'yes' : 'no';
        }
        if (typeof value === 'string' && value.length > 50) {
            return value.substring(0, 50) + '...';
        }
        return String(value);
    }
</script>

{#if loading}
    <div class="flex justify-center py-12">
        <svg class="h-8 w-8 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
    </div>
{:else if activities.length === 0}
    <div class="text-center py-12">
        <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="mt-2 text-sm font-medium text-gray-900">No activity yet</h3>
        <p class="mt-1 text-sm text-gray-500">Activity will appear here when changes are made to this property.</p>
    </div>
{:else}
    <div class="flow-root">
        <ul class="-mb-8">
            {#each activities as activity, idx (activity.id)}
                <li>
                    <div class="relative pb-8">
                        <!-- Vertical line connecting activities -->
                        {#if idx !== activities.length - 1}
                            <span class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                        {/if}

                        <div class="relative flex space-x-3">
                            <!-- Icon -->
                            <div class="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-lg shrink-0">
                                {getActionIcon(activity.action)}
                            </div>

                            <!-- Content -->
                            <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                                <div class="min-w-0 flex-1">
                                    <p class="text-sm text-gray-900">
                                        <span class="font-medium">{activity.user_name || activity.user_email || 'Someone'}</span>
                                        {' '}
                                        <span class={getActionColor(activity.action)}>
                                            {getActionText(activity.action)}
                                        </span>
                                        {' '}
                                        <span class="font-medium">{getEntityLabel(activity.entity_type)}</span>
                                    </p>

                                    <!-- Show specific changes for updates -->
                                    {#if activity.action === 'update' && activity.changes}
                                        <ul class="mt-2 text-xs text-gray-600 space-y-1 bg-gray-50 rounded p-2">
                                            {#each Object.entries(activity.changes) as [field, change]}
                                                <li class="flex items-start gap-2">
                                                    <span class="font-medium text-gray-700">{formatFieldName(field)}:</span>
                                                    <span class="line-through text-gray-500">{formatValue(change.from)}</span>
                                                    <span class="text-gray-400">→</span>
                                                    <span class="text-gray-900 font-medium">{formatValue(change.to)}</span>
                                                </li>
                                            {/each}
                                        </ul>
                                    {/if}
                                </div>

                                <div class="whitespace-nowrap text-right text-sm">
                                    <Tooltip text={formatAbsoluteTime(activity.created_at)} position="left">
                                        <time datetime={activity.created_at} class="text-gray-500">
                                            {formatRelativeTime(activity.created_at)}
                                        </time>
                                    </Tooltip>
                                </div>
                            </div>
                        </div>
                    </div>
                </li>
            {/each}
        </ul>
    </div>
{/if}