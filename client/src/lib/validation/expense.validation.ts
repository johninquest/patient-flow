import type { ValidationResult } from './types';
import type { ExpenseCategory } from '$lib/types';
import { isValidDate, isNotTooFarInFuture } from './patterns';

const validCategories: ExpenseCategory[] = [
    'maintenance', 'utilities', 'taxes', 'insurance', 'management', 'repairs', 'other'
];

interface ExpenseData {
    property: string;
    category: ExpenseCategory;
    description?: string;
    amount: number;
    expense_date: string;
}

export function validateExpense(data: ExpenseData): ValidationResult {
    const errors: Record<string, string> = {};

    // Property
    if (!data.property) {
        errors.property = 'Property is required';
    }

    // Category
    if (!data.category) {
        errors.category = 'Category is required';
    } else if (!validCategories.includes(data.category)) {
        errors.category = 'Invalid category';
    }

    // Description (optional, but validate length if provided)
    if (data.description && data.description.length > 500) {
        errors.description = 'Description must be at most 500 characters';
    }

    // Amount
    if (!data.amount || data.amount <= 0) {
        errors.amount = 'Amount must be greater than 0';
    } else if (data.amount > 999999999) {
        errors.amount = 'Amount is too large';
    }

    // Date
    if (!data.expense_date) {
        errors.expense_date = 'Date is required';
    } else if (!isValidDate(data.expense_date)) {
        errors.expense_date = 'Invalid date format';
    } else if (!isNotTooFarInFuture(data.expense_date)) {
        errors.expense_date = 'Date cannot be more than 1 year in the future';
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors
    };
}