import { api } from '$lib/api/client';
import type { RentEntry, RentEntryCreate, RentEntryUpdate } from '$lib/types';

export const rentService = {
    async getByProperty(propertyId: string): Promise<RentEntry[]> {
        return api.get<RentEntry[]>(`/rent?propertyId=${propertyId}`);
    },

    async getByTenant(tenantId: string): Promise<RentEntry[]> {
        return api.get<RentEntry[]>(`/rent/by-tenant/${tenantId}`);
    },

    async getById(id: string): Promise<RentEntry> {
        return api.get<RentEntry>(`/rent/${id}`);
    },

    async create(data: Omit<RentEntryCreate, 'recorded_by'>): Promise<RentEntry> {
        return api.post<RentEntry>('/rent', data);
    },

    async update(id: string, data: RentEntryUpdate): Promise<RentEntry> {
        return api.put<RentEntry>(`/rent/${id}`, data);
    },

    async delete(id: string): Promise<boolean> {
        await api.delete(`/rent/${id}`);
        return true;
    },
};