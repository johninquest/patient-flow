import { describe, expect, it } from 'vitest';
import {
  DIAGNOSES,
  DIAGNOSIS_GROUPS,
  findDiagnosisByCode,
  findDiagnosisBySlug,
  validateDiagnosisCode,
} from './diagnoses.js';

/**
 * Guards on the ICD-10 shortlist.
 *
 * The list is deliberately capped at 30 so the dropdown stays scannable, and
 * codes must be unique because `patient_problems.code` is what a future
 * reporting query would group by. Both are easy to break by hand-editing the
 * array, so they are enforced here.
 */

describe('diagnosis catalogue', () => {
  it('has at most 30 items', () => {
    // The cap is a product decision, not a technical limit: a longer list
    // stops being scannable in a dropdown.
    expect(DIAGNOSES.length).toBeLessThanOrEqual(30);
  });

  it('has unique ICD-10 codes', () => {
    const codes = DIAGNOSES.map((entry) => entry.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('has unique slugs', () => {
    const slugs = DIAGNOSES.map((entry) => entry.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it('only uses declared groups', () => {
    for (const entry of DIAGNOSES) {
      expect(DIAGNOSIS_GROUPS).toContain(entry.group);
    }
  });

  it('gives every entry a non-empty name', () => {
    for (const entry of DIAGNOSES) {
      expect(entry.name.trim().length).toBeGreaterThan(0);
    }
  });

  it('indexes every entry by code and by slug', () => {
    for (const entry of DIAGNOSES) {
      expect(findDiagnosisByCode(entry.code)).toEqual(entry);
      expect(findDiagnosisBySlug(entry.slug)).toEqual(entry);
    }
  });
});

describe('validateDiagnosisCode', () => {
  it('accepts a triple with no code (off-list diagnosis)', () => {
    // The catalogue is a shortlist, not a coding system, so recording something
    // outside it must remain possible.
    expect(validateDiagnosisCode({})).toBeNull();
    expect(validateDiagnosisCode({ code: null })).toBeNull();
    expect(validateDiagnosisCode({ code: '' })).toBeNull();
  });

  it('accepts a well-formed catalogue triple', () => {
    expect(
      validateDiagnosisCode({
        code: 'B54',
        code_system: 'ICD-10',
        diagnosis_slug: 'malaria',
      }),
    ).toBeNull();
  });

  it('rejects a code that is not in the catalogue', () => {
    const error = validateDiagnosisCode({
      code: 'Z99.9',
      code_system: 'ICD-10',
      diagnosis_slug: 'made-up',
    });

    expect(error).toContain('Z99.9');
    expect(error).toContain('not in the diagnosis catalogue');
  });

  it('rejects a code without an ICD-10 code_system', () => {
    const error = validateDiagnosisCode({
      code: 'B54',
      code_system: 'SNOMED',
      diagnosis_slug: 'malaria',
    });

    expect(error).toContain('code_system');
  });

  it('rejects a slug that disagrees with the code', () => {
    // Prevents a client pairing a real code with an unrelated slug, which would
    // make `diagnosis_slug` untrustworthy as a grouping key.
    const error = validateDiagnosisCode({
      code: 'B54',
      code_system: 'ICD-10',
      diagnosis_slug: 'asthma',
    });

    expect(error).toContain('asthma');
    expect(error).toContain('malaria');
  });
});
