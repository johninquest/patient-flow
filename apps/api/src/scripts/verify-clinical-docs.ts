/**
 * Integration smoke test for the clinical documentation modules.
 *
 * Run from `apps/api` with:
 *   npx tsx src/scripts/verify-clinical-docs.ts
 *
 * Exercises the real database rather than mocks, because the behaviour that
 * matters here is transactional: the revision snapshot, the optimistic lock, and
 * the rollback when the lock fails. A unit test with a mocked `db` would not
 * prove any of those.
 *
 * Cleans up after itself (the patient cascade removes notes, revisions and
 * problems).
 */
import 'dotenv/config';
import { db } from '../core/db/index.js';
import { patients, encounters, audit_log, user } from '../core/db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { ClinicalNotesService } from '../modules/clinical-notes/clinical-notes.service.js';
import { ProblemsService } from '../modules/problems/problems.service.js';
import { AuditService } from '../modules/audit/audit.service.js';
import { defineAbilitiesFor } from '../core/auth/ability.js';

const pass = (msg: string) => console.log(`  PASS  ${msg}`);
const fail = (msg: string) => {
  console.error(`  FAIL  ${msg}`);
  process.exitCode = 1;
};
const section = (msg: string) => console.log(`\n== ${msg}`);

async function main() {
  const auditService = new AuditService();
  const notes = new ClinicalNotesService(auditService);
  const problems = new ProblemsService(auditService);

  const providerAbility = defineAbilitiesFor({ id: 'x', role: 'provider' });
  const frontDeskAbility = defineAbilitiesFor({ id: 'x', role: 'front_desk' });
  const adminAbility = defineAbilitiesFor({ id: 'x', role: 'admin' });

  // A real staff user is needed for the attribution snapshot.
  const [provider] = await db.select().from(user).limit(1);
  if (!provider) {
    fail('no user rows found — cannot run the integration test');
    return;
  }
  const providerId = provider.id;

  section('Setup');
  const [patient] = await db
    .insert(patients)
    .values({ first_name: 'Test', last_name: 'ClinicalDocs' })
    .returning();

  const [encounter] = await db
    .insert(encounters)
    .values({ patient_id: patient.id, status: 'in_progress' })
    .returning();
  pass(`created patient ${patient.id} and encounter ${encounter.id}`);

  try {
    // ---------------------------------------------------------------- notes
    section('Clinical notes: create');
    const note = await notes.create(
      {
        encounter_id: encounter.id,
        note_type: 'consultation',
        subjective: 'Fever and headache for 3 days',
        assessment: 'Suspected malaria',
        plan: 'Blood film, artemether-lumefantrine',
      },
      providerId,
      'provider',
      providerAbility,
    );
    pass(`note created, version=${note.version}`);
    if (note.version !== 1) fail(`expected version 1, got ${note.version}`);
    if (note.patient_id !== patient.id)
      fail('patient_id was not derived from encounter');
    if (!note.author_name) fail('author_name snapshot is missing');
    if (note.author_role !== 'provider') fail('author_role snapshot is wrong');

    section('Clinical notes: revision history before any edit');
    const before = await notes.findRevisions(note.id);
    if (before.length !== 0) fail(`expected 0 revisions, got ${before.length}`);
    else pass('no revisions yet, as expected');

    section('Clinical notes: edit creates a revision');
    const edited = await notes.update(
      note.id,
      {
        version: 1,
        assessment: 'Confirmed P. falciparum malaria',
      },
      providerId,
      'provider',
      providerAbility,
    );
    pass(`note updated, version=${edited.version}`);
    if (edited.version !== 2) fail(`expected version 2, got ${edited.version}`);
    if (edited.assessment !== 'Confirmed P. falciparum malaria')
      fail('assessment was not updated');

    const revisions = await notes.findRevisions(note.id);
    if (revisions.length !== 1)
      fail(`expected 1 revision, got ${revisions.length}`);
    else pass('exactly one revision recorded');
    if (revisions[0]?.revision_number !== 1)
      fail(`expected revision_number 1, got ${revisions[0]?.revision_number}`);
    if (revisions[0]?.assessment !== 'Suspected malaria')
      fail('revision did not preserve the ORIGINAL assessment');
    else pass('revision preserved the original content');
    if (revisions[0]?.edited_by_name !== note.author_name)
      fail('revision editor snapshot missing');

    section('Clinical notes: optimistic lock rejects a stale edit');
    let conflictThrown = false;
    try {
      await notes.update(
        note.id,
        { version: 1, assessment: 'Stale overwrite attempt' },
        providerId,
        'provider',
        providerAbility,
      );
    } catch (e: any) {
      conflictThrown = e?.status === 409;
      if (!conflictThrown)
        fail(`expected 409, got ${e?.status}: ${e?.message}`);
    }
    if (conflictThrown) pass('stale edit rejected with 409');

    const afterConflict = await notes.findRevisions(note.id);
    if (afterConflict.length !== 1)
      fail(
        `rollback failed: expected 1 revision after a rejected edit, got ${afterConflict.length}`,
      );
    else pass('transaction rolled back — no orphan revision');
    const reloaded = await notes.findOne(note.id);
    if (reloaded.assessment !== 'Confirmed P. falciparum malaria')
      fail('a rejected edit still modified the note');
    else pass('note content unchanged after the rejected edit');

    section('Clinical notes: author-or-admin edit authority');
    let forbidden = false;
    try {
      // A different user who is not an admin must not edit this note.
      await notes.update(
        note.id,
        { version: 2, assessment: 'Someone else editing' },
        'a-different-user-id',
        'provider',
        providerAbility,
      );
    } catch (e: any) {
      forbidden = e?.status === 403;
      if (!forbidden) fail(`expected 403, got ${e?.status}: ${e?.message}`);
    }
    if (forbidden) pass('non-author provider cannot edit the note');

    // An admin may.
    const adminEdited = await notes.update(
      note.id,
      { version: 2, plan: 'Admitted for IV artesunate' },
      providerId,
      'admin',
      adminAbility,
    );
    if (adminEdited.version !== 3) fail('admin edit did not bump the version');
    else pass('admin can edit any note');

    section('Clinical notes: audit diffs are metadata-only');
    const noteAudits = await db
      .select()
      .from(audit_log)
      .where(
        sql`${audit_log.resource_type} = 'clinical_note' AND ${audit_log.resource_id} = ${note.id}`,
      );
    pass(`${noteAudits.length} audit entries for this note`);

    const CONTENT = [
      'subjective',
      'objective',
      'assessment',
      'plan',
      'additional_notes',
    ];
    const secretText = [
      'Fever and headache',
      'Suspected malaria',
      'Confirmed P. falciparum',
      'artemether',
      'artesunate',
    ];
    let leaked = false;
    for (const entry of noteAudits) {
      const serialised = JSON.stringify(entry.diff ?? {});
      for (const field of CONTENT) {
        if (serialised.includes(field)) {
          fail(
            `audit diff for ${entry.action} contains content field "${field}"`,
          );
          leaked = true;
        }
      }
      for (const text of secretText) {
        if (serialised.includes(text)) {
          fail(`audit diff for ${entry.action} leaked clinical text "${text}"`);
          leaked = true;
        }
      }
      // The scope columns must be populated so the entry reaches both timelines.
      if (entry.patient_id !== patient.id)
        fail(`${entry.action} has no patient scope`);
      if (entry.encounter_id !== encounter.id)
        fail(`${entry.action} has no encounter scope`);
    }
    if (!leaked) pass('no clinical content or text in any note audit diff');
    else process.exitCode = 1;

    // ------------------------------------------------------------- problems
    section('Problems: catalogue-validated create');
    const problem = await problems.create(
      {
        patient_id: patient.id,
        encounter_id: encounter.id,
        description: 'Malaria, unspecified',
        code: 'B54',
        code_system: 'ICD-10',
        diagnosis_slug: 'malaria',
      },
      providerId,
      'provider',
      providerAbility,
    );
    pass(`problem created with code ${problem.code}`);
    if (problem.code_system !== 'ICD-10')
      fail('code_system was not normalised');
    if (!problem.recorded_by_name) fail('recorded_by_name snapshot missing');

    section('Problems: off-list diagnosis without a code');
    const freeText = await problems.create(
      {
        patient_id: patient.id,
        description: 'Suspected sickle cell crisis',
      },
      providerId,
      'provider',
      providerAbility,
    );
    if (freeText.code !== null)
      fail('expected null code for a free-text problem');
    else pass('free-text diagnosis accepted with no code');

    section('Problems: encounter must belong to the patient');
    const [otherPatient] = await db
      .insert(patients)
      .values({ first_name: 'Other', last_name: 'Patient' })
      .returning();
    let mismatch = false;
    try {
      await problems.create(
        {
          patient_id: otherPatient.id,
          encounter_id: encounter.id,
          description: 'Mismatched',
        },
        providerId,
        'provider',
        providerAbility,
      );
    } catch (e: any) {
      mismatch = e?.status === 400;
      if (!mismatch) fail(`expected 400, got ${e?.status}: ${e?.message}`);
    }
    if (mismatch) pass('encounter/patient mismatch rejected with 400');
    await db.delete(patients).where(eq(patients.id, otherPatient.id));

    section('Problems: status change and free-text detach');
    const resolved = await problems.update(
      problem.id,
      { status: 'resolved' },
      providerId,
      'provider',
      providerAbility,
    );
    if (resolved.status !== 'resolved') fail('status was not updated');
    else pass('status updated to resolved');

    const detached = await problems.update(
      problem.id,
      { code: '', description: 'Malaria, treated and resolved' },
      providerId,
      'provider',
      providerAbility,
    );
    if (detached.code !== null || detached.diagnosis_slug !== null)
      fail('clearing the code did not clear code_system/diagnosis_slug');
    else pass('clearing the code cleared the whole coding triple');

    section('Problems: audit diffs are metadata-only');
    const problemAudits = await db
      .select()
      .from(audit_log)
      .where(
        sql`${audit_log.resource_type} = 'problem' AND ${audit_log.resource_id} = ${problem.id}`,
      );
    let problemLeaked = false;
    for (const entry of problemAudits) {
      const serialised = JSON.stringify(entry.diff ?? {});
      for (const text of [
        'Malaria, unspecified',
        'sickle cell',
        'treated and resolved',
      ]) {
        if (serialised.includes(text)) {
          fail(`problem audit ${entry.action} leaked diagnosis text "${text}"`);
          problemLeaked = true;
        }
      }
      if (entry.patient_id !== patient.id)
        fail(`problem audit ${entry.action} has no patient scope`);
    }
    if (!problemLeaked) pass('no diagnosis wording in any problem audit diff');

    // ---------------------------------------------------------- permissions
    section('Permissions: front_desk is refused');
    let fdCreate = false;
    try {
      await notes.create(
        { encounter_id: encounter.id, subjective: 'should not happen' },
        providerId,
        'front_desk',
        frontDeskAbility,
      );
    } catch (e: any) {
      fdCreate = e?.status === 403;
      if (!fdCreate) fail(`expected 403, got ${e?.status}`);
    }
    if (fdCreate) pass('front_desk cannot create a clinical note');

    let fdProblem = false;
    try {
      await problems.create(
        { patient_id: patient.id, description: 'should not happen' },
        providerId,
        'front_desk',
        frontDeskAbility,
      );
    } catch (e: any) {
      fdProblem = e?.status === 403;
      if (!fdProblem) fail(`expected 403, got ${e?.status}`);
    }
    if (fdProblem) pass('front_desk cannot record a problem');

    let fdDelete = false;
    try {
      await notes.remove(note.id, providerId, 'provider', providerAbility);
    } catch (e: any) {
      fdDelete = e?.status === 403;
      if (!fdDelete) fail(`expected 403, got ${e?.status}`);
    }
    if (fdDelete) pass('a provider cannot delete a note (admin only)');

    section('Cascade: deleting the patient removes clinical records');
    await db.delete(patients).where(eq(patients.id, patient.id));
    const orphanNotes = await db
      .select()
      .from(clinicalNotesTable)
      .where(eq(clinicalNotesTable.id, note.id));
    const orphanRevisions = await db
      .select()
      .from(revisionsTable)
      .where(eq(revisionsTable.note_id, note.id));
    const orphanProblems = await db
      .select()
      .from(problemsTable)
      .where(eq(problemsTable.id, problem.id));

    if (orphanNotes.length || orphanRevisions.length || orphanProblems.length)
      fail('cascade delete left orphaned clinical records');
    else pass('notes, revisions and problems all cascaded away');
  } finally {
    // Idempotent cleanup in case an assertion failed before the cascade above.
    await db.delete(patients).where(eq(patients.id, patient.id));
    await db.delete(patients).where(eq(patients.last_name, 'Patient'));
  }

  console.log(
    process.exitCode
      ? '\nRESULT: FAILURES ABOVE'
      : '\nRESULT: all clinical documentation checks passed',
  );
}

// Imported separately so the cascade section reads clearly above.
import {
  clinical_notes as clinicalNotesTable,
  clinical_note_revisions as revisionsTable,
  patient_problems as problemsTable,
} from '../core/db/schema.js';

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error('\nUnexpected error:', e);
    process.exit(1);
  });
