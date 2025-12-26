import type { RecordModel } from 'pocketbase';

export interface Property {
    id: string;
    name: string;
    city: string;
    country: string;
    construction_year?: number;
    owner: string;
    created: string;  // Changed from RecordModel timestamps
    updated: string;  // Changed from RecordModel timestamps
}

export interface PropertyCreate {
    name: string;
    city: string;
    country: string;
    construction_year?: number;
    // Note: owner is automatically set by the API from the authenticated user
}

export interface PropertyUpdate extends Partial<Omit<PropertyCreate, 'owner'>> {}

export interface PropertyFormData {
    name: string;
    city: string;
    country: string;
    construction_year?: number;
}