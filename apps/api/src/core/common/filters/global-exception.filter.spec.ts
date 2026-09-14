import { describe, it, expect } from 'vitest';
import { BadRequestException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import { GlobalExceptionFilter } from './global-exception.filter.js';
import { createValidationExceptionFactory } from '../validation-exception.factory.js';

/**
 * Verifies the end-to-end validation error contract that the React client
 * depends on (`apps/client/src/lib/api/errors.ts`):
 *
 *   { statusCode, error, message, errors: [{ field, message }], timestamp, path }
 */
describe('GlobalExceptionFilter + validation exception factory', () => {
  const filter = new GlobalExceptionFilter();
  const factory = createValidationExceptionFactory();

  interface SerializedError {
    statusCode: number;
    error: string;
    message: string;
    errors?: Array<{ field: string; message: string }>;
    timestamp: string;
    path: string;
  }

  function captureResponse(exception: unknown): SerializedError {
    let captured: SerializedError | undefined;
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({
          status: (code: number) => ({
            json: (body: object) => {
              captured = { statusCode: code, ...body } as SerializedError;
            },
          }),
        }),
        getRequest: () => ({ url: '/api/patients' }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);
    if (!captured) {
      throw new Error('filter did not serialize a response');
    }
    return captured;
  }

  it('serializes validation issues into the client error contract', () => {
    // Simulate what StandardSchemaValidationPipe throws.
    const exception = factory([
      { path: ['first_name'], message: 'Invalid input: expected string' },
      { path: ['address', 'country'], message: 'Invalid country code' },
    ]);

    const body = captureResponse(exception);

    expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toBe('Validation failed');
    expect(body.path).toBe('/api/patients');
    expect(typeof body.timestamp).toBe('string');
    expect(body.errors).toEqual([
      { field: 'first_name', message: 'Invalid input: expected string' },
      { field: 'address.country', message: 'Invalid country code' },
    ]);
  });

  it('passes errors through for a plain BadRequestException', () => {
    const body = captureResponse(
      new BadRequestException({ error: 'BAD_REQUEST', message: 'nope' }),
    );

    expect(body.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(body.error).toBe('BAD_REQUEST');
    expect(body.message).toBe('nope');
  });
});
