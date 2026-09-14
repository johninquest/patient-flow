import { z } from 'zod';

/**
 * ISO 8601 date or date-time string.
 *
 * Mirrors the permissiveness of class-validator's `@IsDateString()` while still
 * rejecting obviously malformed input. Accepts:
 *   - date only:            `2026-08-15`
 *   - date-time, no secs:   `2026-08-15T10:00`   (HTML `datetime-local`)
 *   - date-time with secs:  `2026-08-15T10:00:00`
 *   - with fractional secs: `2026-08-15T10:00:00.000`
 *   - with offset/UTC:      `2026-08-15T10:00:00Z`, `2026-08-15T10:00:00+02:00`
 */
export const isoDateString = z
  .string()
  .regex(
    /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])(T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d+)?)?(Z|[+-]([01]\d|2[0-3]):?[0-5]\d)?)?$/,
    { error: 'must be a valid ISO 8601 date string' },
  );
