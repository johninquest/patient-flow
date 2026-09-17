import { describe, expect, it } from 'vitest';
import {
  TRANSPORT_MODES,
  createPatientSchema,
  emergencyContactSchema,
  transportLogisticsSchema,
} from './create-patient.dto.js';

/**
 * Schema-level tests for the patient intake fields that were converted from
 * free text to constrained input (transport modes) or documented as a
 * standard-list slug (emergency contact relation).
 *
 * These exercise the Zod schemas directly rather than the service, so they
 * need no database.
 */

const basePatient = { first_name: 'Amara', last_name: 'Diallo' };

describe('transportLogisticsSchema', () => {
  it('accepts a subset of the known transport modes', () => {
    const result = transportLogisticsSchema.safeParse({
      modes: ['public_transport', 'taxi'],
    });

    expect(result.success).toBe(true);
    expect(result.data?.modes).toEqual(['public_transport', 'taxi']);
  });

  it('accepts an empty modes array', () => {
    const result = transportLogisticsSchema.safeParse({ modes: [] });

    expect(result.success).toBe(true);
    expect(result.data?.modes).toEqual([]);
  });

  it('accepts comments without modes', () => {
    const result = transportLogisticsSchema.safeParse({
      comments: 'Prefers morning appointments',
    });

    expect(result.success).toBe(true);
    expect(result.data?.modes).toBeUndefined();
  });

  it('rejects an unknown transport mode', () => {
    const result = transportLogisticsSchema.safeParse({
      modes: ['helicopter'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects the legacy object shape', () => {
    // The pre-change shape was `{ public_transport: string, taxi: string, ... }`.
    // It must no longer validate, otherwise a stale client would silently write
    // a shape the UI can no longer read.
    const result = transportLogisticsSchema.safeParse({
      modes: { public_transport: 'Bus 21', taxi: '', ambulance: '' },
    });

    expect(result.success).toBe(false);
  });

  it('rejects more entries than there are distinct modes', () => {
    const result = transportLogisticsSchema.safeParse({
      modes: ['taxi', 'taxi', 'taxi', 'taxi'],
    });

    expect(result.success).toBe(false);
  });

  it('rejects unknown keys inside the section', () => {
    const result = transportLogisticsSchema.safeParse({
      modes: ['taxi'],
      notes: 'not a real field',
    });

    expect(result.success).toBe(false);
  });

  it('exposes exactly the three documented modes', () => {
    expect(TRANSPORT_MODES).toEqual(['public_transport', 'taxi', 'ambulance']);
  });
});

describe('emergencyContactSchema', () => {
  it('accepts a standard-list relation slug', () => {
    const result = emergencyContactSchema.safeParse({ relation: 'partner' });

    expect(result.success).toBe(true);
    expect(result.data?.relation).toBe('partner');
  });

  it('still accepts a free-text relation', () => {
    // The dropdown is a client-side constraint only. Legacy records and
    // off-list relationships must keep round-tripping through the API.
    const result = emergencyContactSchema.safeParse({ relation: 'Neighbour' });

    expect(result.success).toBe(true);
    expect(result.data?.relation).toBe('Neighbour');
  });
});

describe('createPatientSchema', () => {
  it('accepts a patient with transport modes and a relation', () => {
    const result = createPatientSchema.safeParse({
      ...basePatient,
      emergency_contact: { name: 'Fatou Diallo', relation: 'sibling' },
      transport_logistics: { modes: ['ambulance'] },
    });

    expect(result.success).toBe(true);
  });

  it('rejects an unknown transport mode nested in a create payload', () => {
    const result = createPatientSchema.safeParse({
      ...basePatient,
      transport_logistics: { modes: ['bicycle'] },
    });

    expect(result.success).toBe(false);
  });
});
