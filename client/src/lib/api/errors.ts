/**
 * Structured error types for API responses.
 * Matches the error format returned by the backend's GlobalExceptionFilter.
 */

export interface FieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  errors?: FieldError[];
  timestamp: string;
  path: string;
}

/**
 * Custom error class that preserves structured error information
 * from the API, including field-level validation errors.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorType: string;
  public readonly fieldErrors: FieldError[];

  constructor(
    statusCode: number,
    errorType: string,
    message: string,
    fieldErrors: FieldError[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorType = errorType;
    this.fieldErrors = fieldErrors;
  }

  /**
   * Check if this error has field-level errors
   */
  hasFieldErrors(): boolean {
    return this.fieldErrors.length > 0;
  }

  /**
   * Get the error message for a specific field
   */
  getFieldError(field: string): string | undefined {
    const found = this.fieldErrors.find((e) => e.field === field);
    return found?.message;
  }

  /**
   * Convert field errors to a Record<field, message> for easy form integration
   */
  toFieldErrorMap(): Record<string, string> {
    const map: Record<string, string> = {};
    for (const { field, message } of this.fieldErrors) {
      map[field] = message;
    }
    return map;
  }
}

/**
 * Parse an API error response into an ApiError instance.
 * Falls back gracefully if the response doesn't match the expected format.
 */
export function parseApiError(response: Response, body: unknown): ApiError {
  // Try to parse as structured error response
  if (body && typeof body === 'object') {
    const data = body as Partial<ApiErrorResponse>;
    return new ApiError(
      data.statusCode ?? response.status,
      data.error ?? 'UNKNOWN_ERROR',
      data.message ?? 'An error occurred',
      data.errors ?? [],
    );
  }

  // Fallback for non-JSON responses
  return new ApiError(
    response.status,
    'UNKNOWN_ERROR',
    `HTTP ${response.status}: ${response.statusText}`,
  );
}
