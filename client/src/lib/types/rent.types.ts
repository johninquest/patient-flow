export type PaymentMethod = 'cash' | 'bank_transfer' | 'mobile_money';

export const paymentMethods: { value: PaymentMethod; label: string }[] = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mobile_money', label: 'Mobile Money' },
];

export interface RentEntry {
    id: string;
    tenant: string;
    amount: number;
    payment_date: string;
    rent_month: string; // Format: "YYYY-MM"
    payment_method: PaymentMethod;
    notes?: string;
    recorded_by: string;
    created: string;
    updated: string;
    // Joined tenant data (from API)
    tenant_first_name?: string;
    tenant_last_name?: string;
}

export interface RentEntryCreate {
    tenant: string;
    amount: number;
    payment_date: string;
    rent_month: string;
    payment_method: PaymentMethod;
    notes?: string;
    recorded_by?: string;
}

export interface RentEntryUpdate extends Partial<RentEntryCreate> {}