import { api } from '$lib/api/client';
import type { Unit, UnitCreate, UnitUpdate } from '$lib/types';

export const unitService = {
    async getByProperty(propertyId: string): Promise<Unit[]> {
        return api.get<Unit[]>(`/units?propertyId=${propertyId}`);
    },

    async getById(id: string): Promise<Unit> {
        return api.get<Unit>(`/units/${id}`);
    },

    async create(data: UnitCreate): Promise<Unit> {
        return api.post<Unit>('/units', data);
    },

    async update(id: string, data: UnitUpdate): Promise<Unit> {
        return api.put<Unit>(`/units/${id}`, data);
    },

    async delete(id: string): Promise<boolean> {
        await api.delete(`/units/${id}`);
        return true;
    },
};