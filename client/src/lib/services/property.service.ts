import { api } from '$lib/api/client';
import type { Property, PropertyCreate, PropertyUpdate } from '$lib/types/property.types';

export const propertyService = {
    async getAll(): Promise<Property[]> {
        return api.get<Property[]>('/properties');
    },

    async getOwned(): Promise<Property[]> {
        return api.get<Property[]>('/properties/owned');
    },

    async getById(id: string): Promise<Property> {
        return api.get<Property>(`/properties/${id}`);
    },

    async create(data: PropertyCreate): Promise<Property> {
        return api.post<Property>('/properties', data);
    },

    async update(id: string, data: PropertyUpdate): Promise<Property> {
        return api.put<Property>(`/properties/${id}`, data);
    },

    async delete(id: string): Promise<boolean> {
        await api.delete(`/properties/${id}`);
        return true;
    },
};