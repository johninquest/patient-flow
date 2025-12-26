export const patterns = {
    date: /^\d{4}-\d{2}-\d{2}$/,
    rentMonth: /^\d{4}-(0[1-9]|1[0-2])$/
};

export function isValidDate(value: string): boolean {
    if (!patterns.date.test(value)) return false;
    const date = new Date(value);
    return !isNaN(date.getTime());
}

export function isNotTooFarInFuture(value: string, maxYearsAhead = 1): boolean {
    const date = new Date(value);
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + maxYearsAhead);
    return date <= maxDate;
}

export function isValidRentMonth(value: string): boolean {
    if (!patterns.rentMonth.test(value)) return false;
    const [year] = value.split('-').map(Number);
    const currentYear = new Date().getFullYear();
    return year >= currentYear - 10 && year <= currentYear + 2;
}