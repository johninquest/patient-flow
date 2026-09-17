import { describe, it, expect } from 'vitest';
import {
  patientAuditScope,
  encounterAuditScope,
  taskAuditScope,
  userAuditScope,
  createdSnapshot,
  deletedSnapshot,
} from './audit-scope.js';

/**
 * The scope helpers decide which patient and encounter an audit entry is filed
 * under. That mapping is the whole reason an encounter created for a patient
 * appears on that patient's timeline, so it is worth pinning down precisely.
 *
 * These are pure functions by design — the services that call them touch the
 * database, which makes them awkward to test. Keeping the mapping here means it
 * can be verified directly.
 */

const PATIENT_ID = '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f60';
const ENCOUNTER_ID = '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f61';
const TASK_ID = '0192a3f4-1b2c-7d8e-9f0a-1b2c3d4e5f62';

describe('patientAuditScope', () => {
  it('targets the patient and scopes to the same patient', () => {
    expect(patientAuditScope({ id: PATIENT_ID })).toEqual({
      resource_type: 'patient',
      resource_id: PATIENT_ID,
      patient_id: PATIENT_ID,
      encounter_id: null,
    });
  });
});

describe('encounterAuditScope', () => {
  it('targets the encounter but is scoped to its patient too', () => {
    // The patient_id here is what makes the event show up on the patient
    // timeline — the bug this whole change addresses.
    expect(
      encounterAuditScope({ id: ENCOUNTER_ID, patient_id: PATIENT_ID }),
    ).toEqual({
      resource_type: 'encounter',
      resource_id: ENCOUNTER_ID,
      patient_id: PATIENT_ID,
      encounter_id: ENCOUNTER_ID,
    });
  });
});

describe('taskAuditScope', () => {
  it('reaches the patient through the encounter', () => {
    expect(
      taskAuditScope({ id: TASK_ID, encounter_id: ENCOUNTER_ID }, PATIENT_ID),
    ).toEqual({
      resource_type: 'task',
      resource_id: TASK_ID,
      patient_id: PATIENT_ID,
      encounter_id: ENCOUNTER_ID,
    });
  });

  it('still scopes to the encounter when the patient cannot be resolved', () => {
    // The patient is resolved through a left join, so it can be absent. The
    // encounter scope must survive — a partly-scoped entry beats a missing one.
    expect(
      taskAuditScope({ id: TASK_ID, encounter_id: ENCOUNTER_ID }, null),
    ).toEqual({
      resource_type: 'task',
      resource_id: TASK_ID,
      patient_id: null,
      encounter_id: ENCOUNTER_ID,
    });
  });
});

describe('userAuditScope', () => {
  it('is not patient or encounter scoped', () => {
    expect(userAuditScope('user-1')).toEqual({
      resource_type: 'user',
      resource_id: 'user-1',
      patient_id: null,
      encounter_id: null,
    });
  });
});

describe('createdSnapshot', () => {
  it('records each tracked field as going from null to its value', () => {
    expect(
      createdSnapshot(
        { status: 'scheduled', notes: 'First visit', phase: null },
        ['status', 'notes', 'phase'],
      ),
    ).toEqual({
      status: { from: null, to: 'scheduled' },
      notes: { from: null, to: 'First visit' },
      phase: { from: null, to: null },
    });
  });

  it('skips fields the entity does not carry', () => {
    // A create diff should never claim a field exists when it was not returned.
    const snapshot = createdSnapshot({ status: 'scheduled' }, [
      'status',
      'not_a_column',
    ]);

    expect(snapshot).toEqual({ status: { from: null, to: 'scheduled' } });
    expect(snapshot).not.toHaveProperty('not_a_column');
  });

  it('returns null when nothing is trackable, so no empty diff is written', () => {
    expect(createdSnapshot({}, ['status'])).toBeNull();
  });
});

describe('deletedSnapshot', () => {
  it('records each tracked field as going from its value to null', () => {
    expect(
      deletedSnapshot({ status: 'in_progress', notes: null }, [
        'status',
        'notes',
      ]),
    ).toEqual({
      status: { from: 'in_progress', to: null },
      notes: { from: null, to: null },
    });
  });

  it('is the mirror of createdSnapshot', () => {
    const entity = { title: 'Bloods', blocking: true };

    const created = createdSnapshot(entity, ['title', 'blocking']);
    const deleted = deletedSnapshot(entity, ['title', 'blocking']);

    expect(created).toEqual({
      title: { from: null, to: 'Bloods' },
      blocking: { from: null, to: true },
    });
    expect(deleted).toEqual({
      title: { from: 'Bloods', to: null },
      blocking: { from: true, to: null },
    });
  });

  it('returns null when nothing is trackable', () => {
    expect(deletedSnapshot({}, ['status'])).toBeNull();
  });
});
