export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string>;
}

export function validateEmail(email: string): string | null {
    if (!email) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Invalid email format';
    return null;
}

export function validatePassword(password: string): string | null {
    if (!password) return 'Password is required';
    if (password.length < 8) return 'Password must be at least 8 characters';
    return null;
}

export function validatePasswordMatch(password: string, confirm: string): string | null {
    if (password !== confirm) return 'Passwords do not match';
    return null;
}

export function validateLoginForm(email: string, password: string): ValidationResult {
    const errors: Record<string, string> = {};

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);

    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;

    return { valid: Object.keys(errors).length === 0, errors };
}

export function validateRegisterForm(
    email: string,
    password: string,
    passwordConfirm: string
): ValidationResult {
    const errors: Record<string, string> = {};

    const emailError = validateEmail(email);
    const passwordError = validatePassword(password);
    const matchError = validatePasswordMatch(password, passwordConfirm);

    if (emailError) errors.email = emailError;
    if (passwordError) errors.password = passwordError;
    if (matchError) errors.passwordConfirm = matchError;

    return { valid: Object.keys(errors).length === 0, errors };
}