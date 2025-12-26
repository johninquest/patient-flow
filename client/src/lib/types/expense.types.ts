export type ExpenseCategory =
    | 'maintenance'
    | 'utilities'
    | 'taxes'
    | 'insurance'
    | 'management'
    | 'repairs'
    | 'other';

export const expenseCategories: { value: ExpenseCategory; label: string }[] = [
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'taxes', label: 'Taxes' },
    { value: 'insurance', label: 'Insurance' },
    { value: 'management', label: 'Management' },
    { value: 'repairs', label: 'Repairs' },
    { value: 'other', label: 'Other' },
];

export interface Expense {
    id: string;
    property: string;
    unit?: string;
    category: string;
    description: string;
    amount: number;
    expense_date: string;
    vendor?: string;
    recorded_by: string;
    created: string;
    updated: string;
}

export interface ExpenseCreate {
    property: string;
    unit?: string;
    category: string;
    description: string;
    amount: number;
    expense_date: string;
    vendor?: string;
    recorded_by?: string;
}

export interface ExpenseUpdate extends Partial<ExpenseCreate> {}