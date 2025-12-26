import type { RecordModel } from 'pocketbase';

export type AccessRole = 'manager' | 'viewer';

export interface UserAccessUser {
    id: string;
    name: string | null;
    email: string;
}

export interface UserAccessProperty {
    id: string;
    name: string;
    city: string;
    country: string;
}

export interface UserAccess {
    id: string;
    user: string;
    property: string;
    role: AccessRole;
    granted_by: string;
    created: string;
    updated: string;
    // Joined user data (from API)
    user_name?: string | null;
    user_email?: string;
    // Joined property data (from API)
    property_name?: string;
    property_city?: string;
    property_country?: string;
}

export interface UserAccessCreate {
    user: string;
    property: string;
    role: AccessRole;
    granted_by?: string;
}

export interface UserAccessUpdate {
    role?: AccessRole;
}
