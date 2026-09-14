import { BadRequestException } from '@nestjs/common';
import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Field-level validation error, matching the shape the React client expects
 * (see `apps/client/src/lib/api/errors.ts`).
 */
export interface FieldError {
  field: string;
  message: string;
}

/**
 * Converts Standard Schema validation issues (as produced by Zod via
 * `StandardSchemaValidationPipe`) into the API's structured validation error.
 *
 * Preserves the contract that existed under `class-validator`:
 *
 * ```json
 * {
 *   "error": "VALIDATION_ERROR",
 *   "message": "Validation failed",
 *   "errors": [{ "field": "address.country", "message": "..." }]
 * }
 * ```
 *
 * Nested paths are joined with `.` so `errors[].field` continues to line up with
 * the client's `parent.child` convention.
 */
export function createValidationExceptionFactory() {
  return (issues: readonly StandardSchemaV1.Issue[]): BadRequestException => {
    const fieldErrors = issues.map(toFieldError);

    return new BadRequestException({
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      errors: fieldErrors,
    });
  };
}

function toFieldError(issue: StandardSchemaV1.Issue): FieldError {
  // Zod reports unknown keys as an `unrecognized_keys` issue whose `path`
  // points at the *parent* object; the offending key names live in `keys`.
  const unrecognizedKeys = (issue as { keys?: PropertyKey[] }).keys;

  if (issue.path?.length) {
    const field = issue.path.map(String).join('.');

    if (unrecognizedKeys?.length) {
      return {
        field: unrecognizedKeys.map(String).join(', '),
        message: issue.message,
      };
    }

    return { field, message: issue.message };
  }

  if (unrecognizedKeys?.length) {
    return {
      field: unrecognizedKeys.map(String).join(', '),
      message: issue.message,
    };
  }

  return { field: '', message: issue.message };
}
