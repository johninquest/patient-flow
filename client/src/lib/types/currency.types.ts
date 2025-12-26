export interface CountryCurrency {
    country: string;
    code: string;
    symbol: string;
}

export const COUNTRY_CURRENCIES: CountryCurrency[] = [
    { country: 'Cameroon', code: 'XAF', symbol: 'FCFA' },
    { country: 'Ghana', code: 'GHS', symbol: 'GH₵' },
    { country: 'Ivory Coast', code: 'XOF', symbol: 'CFA' },
    { country: 'Kenya', code: 'KES', symbol: 'KSh' },
    { country: 'Nigeria', code: 'NGN', symbol: '₦' },
    { country: 'Rwanda', code: 'RWF', symbol: 'FRw' },
    { country: 'South Africa', code: 'ZAR', symbol: 'R' },
];

export const countryCurrencyMap: Record<string, string> = Object.fromEntries(
    COUNTRY_CURRENCIES.map((c) => [c.country, c.code])
);

export const supportedCountries = COUNTRY_CURRENCIES.map((c) => c.country);

export function getCurrencyForCountry(country: string): string {
    return countryCurrencyMap[country] ?? 'USD';
}

export function getCurrencyByCountry(country: string): CountryCurrency | undefined {
    return COUNTRY_CURRENCIES.find((c) => c.country === country);
}

export function getCurrencySymbol(country: string): string {
    const currency = COUNTRY_CURRENCIES.find((c) => c.country === country);
    return currency?.symbol ?? '$';
}

export function getCountryList(): string[] {
    return COUNTRY_CURRENCIES.map((c) => c.country);
}

export function formatCurrency(amount: number, country: string): string {
    const currency = getCurrencyForCountry(country);
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
    }).format(amount);
}