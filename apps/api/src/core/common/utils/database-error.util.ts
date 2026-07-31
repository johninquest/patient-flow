import { BadRequestException, ConflictException } from '@nestjs/common';

/**
 * PostgreSQL error codes we handle
 * See: https://www.postgresql.org/docs/current/errcodes-appendix.html
 */
const PG_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02',
  DATETIME_FIELD_OVERFLOW: '22008',
  STRING_DATA_RIGHT_TRUNCATION: '22001',
} as const;

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
  column?: string;
  table?: string;
}

/**
 * Extract field name from PostgreSQL error detail or constraint name
 */
function extractFieldFromError(error: PostgresError): string | null {
  // Try to extract from detail message
  // Example: Key (email)=(test@example.com) already exists.
  const detailMatch = error.detail?.match(/Key \(([^)]+)\)/);
  if (detailMatch) {
    return detailMatch[1];
  }

  // Try to extract from constraint name
  // Example: patients_email_idx
  if (error.constraint) {
    const parts = error.constraint.split('_');
    if (parts.length >= 2) {
      // Remove table name prefix and index suffix
      return parts.slice(1, -1).join('_') || parts[1];
    }
  }

  return error.column || null;
}

/**
 * Extract the duplicate value from PostgreSQL error detail
 */
function extractDuplicateValue(error: PostgresError): string | null {
  // Example: Key (email)=(test@example.com) already exists.
  const match = error.detail?.match(/=\(([^)]+)\)/);
  return match ? match[1] : null;
}

/**
 * Translate PostgreSQL errors to user-friendly NestJS exceptions
 * 
 * @param error - The caught error (may or may not be a Postgres error)
 * @returns NestJS exception with user-friendly message
 */
export function translateDatabaseError(error: unknown): Error {
  const pgError = error as PostgresError;

  // If it's not a Postgres error, re-throw as-is
  if (!pgError.code) {
    return error instanceof Error ? error : new Error(String(error));
  }

  switch (pgError.code) {
    case PG_ERROR_CODES.UNIQUE_VIOLATION: {
      const field = extractFieldFromError(pgError) || 'field';
      const value = extractDuplicateValue(pgError);
      const message = value
        ? `A record with this ${field} (${value}) already exists`
        : `A record with this ${field} already exists`;
      return new ConflictException(message);
    }

    case PG_ERROR_CODES.FOREIGN_KEY_VIOLATION: {
      const field = extractFieldFromError(pgError) || 'reference';
      return new BadRequestException(
        `The referenced ${field} does not exist or cannot be deleted`,
      );
    }

    case PG_ERROR_CODES.NOT_NULL_VIOLATION: {
      const field = pgError.column || 'field';
      return new BadRequestException(`${field} is required`);
    }

    case PG_ERROR_CODES.CHECK_VIOLATION: {
      const constraint = pgError.constraint || 'constraint';
      return new BadRequestException(
        `Value violates constraint: ${constraint}`,
      );
    }

    case PG_ERROR_CODES.INVALID_TEXT_REPRESENTATION: {
      const field = pgError.column || 'field';
      return new BadRequestException(
        `Invalid format for ${field}. Please check the value and try again.`,
      );
    }

    case PG_ERROR_CODES.DATETIME_FIELD_OVERFLOW: {
      const field = pgError.column || 'date field';
      return new BadRequestException(
        `Invalid date/time value for ${field}`,
      );
    }

    case PG_ERROR_CODES.STRING_DATA_RIGHT_TRUNCATION: {
      const field = pgError.column || 'field';
      return new BadRequestException(
        `Value for ${field} is too long`,
      );
    }

    default:
      // For unhandled Postgres errors, return a generic message
      // but log the actual error for debugging
      console.error('Unhandled database error:', {
        code: pgError.code,
        message: pgError.message,
        detail: pgError.detail,
        constraint: pgError.constraint,
      });
      return new BadRequestException(
        'A database error occurred. Please try again or contact support.',
      );
  }
}
