import { describe, it, expect } from 'vitest';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import type { ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { createValidationExceptionFactory } from './validation-exception.factory.js';
import { createPatientSchema } from '../../modules/patients/dto/create-patient.dto.js';
import { updatePatientSchema } from '../../modules/patients/dto/update-patient.dto.js';

const pipe = new StandardSchemaValidationPipe({
  exceptionFactory: createValidationExceptionFactory(),
});

const bodyMeta = (schema: unknown): ArgumentMetadata =>
  ({
    type: 'body',
    metatype: undefined,
    data: undefined,
    schema,
  }) as ArgumentMetadata;

/** Runs the pipe and returns the thrown BadRequestException payload. */
async function validate(schema: unknown, value: unknown) {
  try {
    await pipe.transform(value, bodyMeta(schema));
    return { ok: true as const };
  } catch (e: unknown) {
    const error = e as BadRequestException;
    return {
      ok: false as const,
      status: error.getStatus(),
      body: error.getResponse() as {
        error: string;
        message: string;
        errors: Array<{ field: string; message: string }>;
      },
    };
  }
}

describe('StandardSchemaValidationPipe + exception factory', () => {
  it('accepts a valid create payload', async () => {
    const r = await validate(createPatientSchema, {
      first_name: 'Jane',
      last_name: 'Doe',
    });
    expect(r.ok).toBe(true);
  });

  it('reports a missing required field with the field name', async () => {
    const r = await validate(createPatientSchema, { last_name: 'Doe' });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.status).toBe(400);
    expect(r.body.error).toBe('VALIDATION_ERROR');
    expect(r.body.message).toBe('Validation failed');
    expect(r.body.errors).toContainEqual(
      expect.objectContaining({ field: 'first_name' }),
    );
  });

  it('rejects unknown top-level keys (strict)', async () => {
    const r = await validate(createPatientSchema, {
      first_name: 'Jane',
      last_name: 'Doe',
      bogus: 1,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.body.errors).toContainEqual(
      expect.objectContaining({ field: 'bogus' }),
    );
  });

  it('reports nested field paths with dot notation', async () => {
    const r = await validate(createPatientSchema, {
      first_name: 'Jane',
      last_name: 'Doe',
      address: { country: 'XX' },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.body.errors).toContainEqual(
      expect.objectContaining({ field: 'address.country' }),
    );
  });

  it('rejects unknown nested keys (strict)', async () => {
    const r = await validate(createPatientSchema, {
      first_name: 'Jane',
      last_name: 'Doe',
      address: { nope: 1 },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.body.errors).toContainEqual(
      expect.objectContaining({ field: 'nope' }),
    );
  });

  it('rejects a malformed date_of_birth', async () => {
    const r = await validate(createPatientSchema, {
      first_name: 'Jane',
      last_name: 'Doe',
      date_of_birth: 'not-a-date',
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.body.errors).toContainEqual(
      expect.objectContaining({ field: 'date_of_birth' }),
    );
  });

  it('accepts the datetime-local format the client sends', async () => {
    const r = await validate(createPatientSchema, {
      first_name: 'Jane',
      last_name: 'Doe',
      date_of_birth: '1990-01-15',
      medical_history_date: '2026-01-15T10:00',
    });
    expect(r.ok).toBe(true);
  });

  it('accepts an empty update payload (all fields optional)', async () => {
    const r = await validate(updatePatientSchema, {});
    expect(r.ok).toBe(true);
  });

  it('still rejects unknown keys on update (strict survives)', async () => {
    const r = await validate(updatePatientSchema, { bogus: 1 });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.body.errors).toContainEqual(
      expect.objectContaining({ field: 'bogus' }),
    );
  });
});
