export interface RentEntry {
    id: string;
    tenant: string;
    amount: number;
    payment_date: string;
    rent_month: string; // Format: "YYYY-MM"
    notes?: string;
    recorded_by: string;
    created: string;
    updated: string;
}

export interface RentEntryCreate {
    tenant: string;
    amount: number;
    payment_date: string;
    rent_month: string;
    notes?: string;
    recorded_by?: string;
}

export interface RentEntryUpdate extends Partial<RentEntryCreate> {}