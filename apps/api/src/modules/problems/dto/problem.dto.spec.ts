import { describe, expect, it } from 'vitest';
import { createProblemSchema, updateProblemSchema } from './problem.dto.js';

/**
 * Schema-level tests for the problem list, focused on the rule that makes the
 * diagnosis catalogue safe to rely on: `description` is never constrained, but
 * a supplied `code` must be a real catalogue entry with agreeing metadata.
 */

const PATIENT_ID = '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60';
const ENCOUNTER_ID = '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f61';

describe('createProblemSchema', () => {
  it('accepts a free-text diagnosis with no code', () => {
    const result = createProblemSchema.safeParse({
      patient_id: PATIENT_ID,
      description: 'Suspected sickle cell crisis',
    });

    expect(result.success).toBe(true);
    expect(result.data?.code).toBeUndefined();
  });

  it('accepts a catalogue-picked diagnosis', () => {
    const result = createProblemSchema.safeParse({
      patient_id: PATIENT_ID,
      encounter_id: ENCOUNTER_ID,
      description: 'Malaria, unspecified',
      code: 'B54',
      code_system: 'ICD-10',
      diagnosis_slug: 'malaria',
    });

    expect(result.success).toBe(true);
  });

  it('rejects an off-list code', () => {
    const result = createProblemSchema.safeParse({
      patient_id: PATIENT_ID,
      description: 'Something not in the list',
      code: 'Z99.9',
      code_system: 'ICD-10',
      diagnosis_slug: 'something',
    });

    expect(result.success).toBe(false);
    expect(JSON.stringify(result.error?.issues)).toContain(
      'not in the diagnosis catalogue',
    );
  });

  it('rejects an unknown key', () => {
    const result = createProblemSchema.safeParse({
      patient_id: PATIENT_ID,
      description: 'Malaria',
      is_primary: true,
    });

    expect(result.success).toBe(false);
  });

  it('requires a non-empty description', () => {
    const result = createProblemSchema.safeParse({
      patient_id: PATIENT_ID,
      description: '',
    });

    expect(result.success).toBe(false);
  });
});

describe('updateProblemSchema', () => {
  it('accepts a status-only change', () => {
    const result = updateProblemSchema.safeParse({ status: 'resolved' });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown status', () => {
    const result = updateProblemSchema.safeParse({ status: 'cured' });

    expect(result.success).toBe(false);
  });

  it('rejects an attempt to re-point the problem at another patient', () => {
    // `patient_id` is absent rather than optional: a problem belongs to the
    // patient it was recorded for.
    const result = updateProblemSchema.safeParse({ patient_id: PATIENT_ID });

    expect(result.success).toBe(false);
  });
});
