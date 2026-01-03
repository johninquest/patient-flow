import { writable, derived, get } from 'svelte/store';
import { userAccessService } from '$lib/services/user-access.service';
import type { AccessRole } from '$lib/types/user-access.types';

interface PropertyPermissions {
    propertyId: string;
    role: AccessRole | 'owner' | null;
    loadedAt: number;
    loading: boolean; // ✅ Add loading state per property
}

function createPermissionsStore() {
    const { subscribe, set, update } = writable<Map<string, PropertyPermissions>>(new Map());

    return {
        subscribe,

        /**
         * Load permissions for a property (with caching)
         */
        async loadPermissions(propertyId: string, forceRefresh = false): Promise<AccessRole | 'owner' | null> {
            const existing = get({ subscribe }).get(propertyId);
            const now = Date.now();
            
            // Return cached if fresh and not forcing refresh
            if (!forceRefresh && existing && !existing.loading && (now - existing.loadedAt) < 5 * 60 * 1000) {
                return existing.role;
            }

            // If already loading, wait for it
            if (existing?.loading) {
                return new Promise((resolve) => {
                    const unsubscribe = subscribe((map) => {
                        const perm = map.get(propertyId);
                        if (perm && !perm.loading) {
                            unsubscribe();
                            resolve(perm.role);
                        }
                    });
                });
            }

            // Mark as loading
            update(map => {
                map.set(propertyId, {
                    propertyId,
                    role: null,
                    loadedAt: 0,
                    loading: true
                });
                return new Map(map);
            });

            try {
                const role = await userAccessService.getUserRole(propertyId);
                
                update(map => {
                    map.set(propertyId, {
                        propertyId,
                        role,
                        loadedAt: now,
                        loading: false
                    });
                    return new Map(map);
                });

                return role;
            } catch (error) {
                console.error(`Failed to load permissions for ${propertyId}:`, error);
                
                // Mark as failed but not loading
                update(map => {
                    map.set(propertyId, {
                        propertyId,
                        role: null,
                        loadedAt: now,
                        loading: false
                    });
                    return new Map(map);
                });
                
                return null;
            }
        },

        /**
         * Get cached role (synchronous)
         */
        getRole(propertyId: string): AccessRole | 'owner' | null {
            return get({ subscribe }).get(propertyId)?.role ?? null;
        },

        isLoading(propertyId: string): boolean {
            return get({ subscribe }).get(propertyId)?.loading ?? false;
        },

        /**
         * Check permissions synchronously (assumes already loaded)
         */
        canEdit(propertyId: string): boolean {
            const role = this.getRole(propertyId);
            return role === 'owner' || role === 'manager';
        },

        canManageAccess(propertyId: string): boolean {
            return this.getRole(propertyId) === 'owner';
        },

        isViewer(propertyId: string): boolean {
            return this.getRole(propertyId) === 'viewer';
        },

        isOwner(propertyId: string): boolean {
            return this.getRole(propertyId) === 'owner';
        },

        /**
         * Invalidate cache for a property (e.g., after access changes)
         */
        invalidate(propertyId: string) {
            update(map => {
                map.delete(propertyId);
                return new Map(map);
            });
        },

        /**
         * Clear all cached permissions
         */
        clear() {
            set(new Map());
        }
    };
}

export const permissions = createPermissionsStore();

export function createPropertyPermissions(propertyId: string) {
    return derived(permissions, ($permissions) => {
        const perm = $permissions.get(propertyId);
        return {
            role: perm?.role ?? null,
            canEdit: perm?.role === 'owner' || perm?.role === 'manager',
            canManageAccess: perm?.role === 'owner',
            isViewer: perm?.role === 'viewer',
            isOwner: perm?.role === 'owner',
            isLoaded: !!perm && !perm.loading,
            isLoading: perm?.loading ?? false
        };
    });
}
