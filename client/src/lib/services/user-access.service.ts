import { api } from '$lib/api/client';
import type { UserAccess, UserAccessCreate, UserAccessUpdate, AccessRole } from '$lib/types/user-access.types';

export const userAccessService = {
    /**
     * Get all access records for a property
     */
    async getByProperty(propertyId: string): Promise<UserAccess[]> {
        return api.get<UserAccess[]>(`/user-access?propertyId=${propertyId}`);
    },

    /**
     * Get all access records for the current user (properties shared with them)
     */
    async getMyAccess(): Promise<UserAccess[]> {
        return api.get<UserAccess[]>('/user-access/my-access');
    },

    /**
     * Get user's role for a specific property
     */
    async getUserRole(propertyId: string): Promise<AccessRole | 'owner' | null> {
        try {
            const result = await api.get<{ role: AccessRole | 'owner' | null }>(`/user-access/role/${propertyId}`);
            return result.role;
        } catch {
            return null;
        }
    },

    /**
     * Find user by email
     */
    async findUserByEmail(email: string): Promise<{ id: string; email: string; name?: string } | null> {
        try {
            return await api.get<{ id: string; email: string; name?: string }>(`/user-access/find-user?email=${encodeURIComponent(email)}`);
        } catch {
            return null;
        }
    },

    /**
     * Grant access to a user by email
     */
    async grantAccess(data: UserAccessCreate): Promise<UserAccess> {
        return api.post<UserAccess>('/user-access', data);
    },

    /**
     * Claim pending access invitations (call after login)
     */
    async claimPendingAccess(): Promise<{ claimed: number }> {
        return api.post<{ claimed: number }>('/user-access/claim-pending', {});
    },

    /**
     * Update access role
     */
    async updateAccess(id: string, data: UserAccessUpdate): Promise<UserAccess> {
        return api.put<UserAccess>(`/user-access/${id}`, data);
    },

    /**
     * Revoke access
     */
    async revokeAccess(id: string): Promise<boolean> {
        await api.delete(`/user-access/${id}`);
        return true;
    },

    /**
     * Check if current user can edit a property
     */
    async canEdit(propertyId: string): Promise<boolean> {
        const role = await this.getUserRole(propertyId);
        return role === 'owner' || role === 'manager';
    },

    /**
     * Check if current user can manage access for a property
     */
    async canManageAccess(propertyId: string): Promise<boolean> {
        const role = await this.getUserRole(propertyId);
        return role === 'owner';
    }
};
