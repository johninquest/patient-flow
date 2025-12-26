export interface Tenant {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string;
    id_card_number?: string;
    phone?: string;
    property: string;
    unit?: string;
    active: boolean;
    created: string;
    updated: string;
    // Joined unit data (from API)
    unit_number?: string;
    unit_name?: string;
}

export interface TenantCreate {
    first_name: string;
    last_name: string;
    preferred_name?: string;
    id_card_number?: string;
    phone?: string;
    property: string;
    unit?: string;
    active?: boolean;
}

export interface TenantUpdate {
    first_name?: string;
    last_name?: string;
    preferred_name?: string;
    id_card_number?: string;
    phone?: string;
    unit?: string;
    active?: boolean;
}