import type { ValidationResult } from './types';
import { isValidDate, isNotTooFarInFuture, isValidRentMonth } from './patterns';

interface RentEntryData {
    tenant: string;
    amount: number;
    payment_date: string;
    rent_month: string;
}

export function validateRentEntry(data: RentEntryData, propertyId: string): ValidationResult {
    const errors: Record<string, string> = {};

    // Property
    if (!propertyId) {
        errors.property = 'Property is required';
    }

    // Tenant
    if (!data.tenant) {
        errors.tenant = 'Tenant is required';
    }

    // Amount
    if (!data.amount || data.amount <= 0) {
        errors.amount = 'Amount must be greater than 0';
    } else if (data.amount > 999999999) {
        errors.amount = 'Amount is too large';
    }

    // Payment date
    if (!data.payment_date) {
        errors.payment_date = 'Payment date is required';
    } else if (!isValidDate(data.payment_date)) {
        errors.payment_date = 'Invalid date format';
    } else if (!isNotTooFarInFuture(data.payment_date)) {
        errors.payment_date = 'Date cannot be more than 1 year in the future';
    }

    // Rent month
    if (!data.rent_month) {
        errors.rent_month = 'Rent month is required';
    } else if (!isValidRentMonth(data.rent_month)) {
        errors.rent_month = 'Invalid rent month';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}