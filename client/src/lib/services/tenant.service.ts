import { api } from '$lib/api/client';
import type { Tenant, TenantCreate, TenantUpdate } from '$lib/types';

export const tenantService = {
    async getByProperty(propertyId: string): Promise<Tenant[]> {
        return api.get<Tenant[]>(`/tenants?propertyId=${propertyId}`);
    },

    async getById(id: string): Promise<Tenant> {
        return api.get<Tenant>(`/tenants/${id}`);
    },

    async create(data: TenantCreate): Promise<Tenant> {
        return api.post<Tenant>('/tenants', data);
    },

    async update(id: string, data: TenantUpdate): Promise<Tenant> {
        return api.put<Tenant>(`/tenants/${id}`, data);
    },

    async delete(id: string): Promise<boolean> {
        await api.delete(`/tenants/${id}`);
        return true;
    },
};