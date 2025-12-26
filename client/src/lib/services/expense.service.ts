import { api } from '$lib/api/client';
import type { Expense, ExpenseCreate, ExpenseUpdate } from '$lib/types';

export const expenseService = {
    async getByProperty(propertyId: string): Promise<Expense[]> {
        return api.get<Expense[]>(`/expenses?propertyId=${propertyId}`);
    },

    async getById(id: string): Promise<Expense> {
        return api.get<Expense>(`/expenses/${id}`);
    },

    async create(data: Omit<ExpenseCreate, 'recorded_by'>): Promise<Expense> {
        return api.post<Expense>('/expenses', data);
    },

    async update(id: string, data: ExpenseUpdate): Promise<Expense> {
        return api.put<Expense>(`/expenses/${id}`, data);
    },

    async delete(id: string): Promise<boolean> {
        await api.delete(`/expenses/${id}`);
        return true;
    },
};