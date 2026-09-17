import { describe, expect, it } from 'vitest';
import {
  SOAP_CONTENT_FIELDS,
  AUDIT_SNAPSHOT_FIELDS,
} from './clinical-notes.service.js';

/**
 * The invariant that lets `GET /api/audit/encounter/:id` stay open to every
 * authenticated role.
 *
 * Clinical notes are scoped to an encounter as well as a patient, so their audit
 * entries appear on the encounter timeline — which `front_desk` can read. If a
 * note's content ever reached an audit diff, a clinician's assessment would be
 * readable by the front desk. These tests lock that shut.
 *
 * They live at the module level rather than calling the service, because the
 * service touches `db` and the guarantee is about which *fields* are used, not
 * about runtime behaviour.
 */

describe('clinical note audit safety', () => {
  it('never audits SOAP content fields', () => {
    const overlap = AUDIT_SNAPSHOT_FIELDS.filter((field) =>
      (SOAP_CONTENT_FIELDS as readonly string[]).includes(field),
    );

    expect(overlap).toEqual([]);
  });

  it('audits only metadata', () => {
    // Asserted as an exact set, not a subset check: adding a new audited field
    // should force a deliberate decision here rather than passing silently.
    expect([...AUDIT_SNAPSHOT_FIELDS].sort()).toEqual(['note_type', 'version']);
  });

  it('covers every SOAP content field in the deny list', () => {
    // Guards against a new SOAP field being added to the schema and the DTO
    // without also being recognised as content.
    expect([...SOAP_CONTENT_FIELDS].sort()).toEqual([
      'additional_notes',
      'assessment',
      'objective',
      'plan',
      'subjective',
    ]);
  });
});
