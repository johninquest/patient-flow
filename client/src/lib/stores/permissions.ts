import { writable, get } from 'svelte/store';
import type { AccessRole } from '$lib/types/user-access.types';

function createPermissionsStore() {
    const { subscribe, set, update } = writable<Map<string, AccessRole | 'owner' | null>>(new Map());

    return {
        subscribe,
        setRole(propertyId: string, role: AccessRole | 'owner' | null) {
            update(map => {
                map.set(propertyId, role);
                return new Map(map);
            });
        },
        getRole(propertyId: string): AccessRole | 'owner' | null {
            const map = get({ subscribe });
            return map.get(propertyId) ?? null;
        },
        clear() {
            set(new Map());
        },
        canEdit(propertyId: string): boolean {
            const role = this.getRole(propertyId);
            return role === 'owner' || role === 'manager';
        },
        canManageAccess(propertyId: string): boolean {
            return this.getRole(propertyId) === 'owner';
        },
        isViewer(propertyId: string): boolean {
            return this.getRole(propertyId) === 'viewer';
        }
    };
}

export const permissions = createPermissionsStore();
