/**
 * Backfill audit scope columns.
 *
 * Adds the denormalized `patient_id` / `encounter_id` scope and the `actor_name`
 * snapshot to audit rows written before those columns existed. Without this,
 * historical events remain invisible on patient and encounter timelines, since
 * the timelines query the scope columns rather than `resource_type`.
 *
 * Scope is derived from the entity each row targeted:
 *   - `patient.*`   → patient_id = resource_id
 *   - `encounter.*` → encounter_id = resource_id, patient_id = the encounter's patient
 *   - `task.*`      → the task's encounter and that encounter's patient
 *   - `user.*` / `admin.*` → no patient/encounter scope (left null)
 *
 * Rows whose entity no longer exists cannot be resolved and stay null. That is
 * expected and not an error: `audit_log` deliberately holds no foreign keys, so
 * history outlives the entities it describes, and a deleted encounter leaves
 * nothing to join to. The row itself is preserved and still readable by
 * `resource_type`/`resource_id`.
 *
 * Idempotent: only touches rows where the scope column is still null, so it is
 * safe to re-run.
 *
 * Usage:
 *   pnpm run db:backfill-audit-scope
 */

import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { db, pool } from '../core/db/index.js';

interface BackfillStep {
  label: string;
  statement: ReturnType<typeof sql>;
}

const steps: BackfillStep[] = [
  {
    label: 'patient events → patient_id',
    statement: sql`
      UPDATE audit_log
      SET patient_id = resource_id::uuid
      WHERE patient_id IS NULL
        AND resource_type = 'patient'
        AND resource_id ~ '^[0-9a-fA-F-]{36}$'
        AND EXISTS (
          SELECT 1 FROM patients WHERE patients.id = audit_log.resource_id::uuid
        )
    `,
  },
  {
    label: 'encounter events → encounter_id + patient_id',
    statement: sql`
      UPDATE audit_log
      SET encounter_id = encounters.id,
          patient_id = encounters.patient_id
      FROM encounters
      WHERE audit_log.encounter_id IS NULL
        AND audit_log.resource_type = 'encounter'
        AND audit_log.resource_id ~ '^[0-9a-fA-F-]{36}$'
        AND encounters.id = audit_log.resource_id::uuid
    `,
  },
  {
    label: 'task events → encounter_id + patient_id (via the task)',
    statement: sql`
      UPDATE audit_log
      SET encounter_id = tasks.encounter_id,
          patient_id = encounters.patient_id
      FROM tasks
      JOIN encounters ON encounters.id = tasks.encounter_id
      WHERE audit_log.encounter_id IS NULL
        AND audit_log.resource_type = 'task'
        AND audit_log.resource_id ~ '^[0-9a-fA-F-]{36}$'
        AND tasks.id = audit_log.resource_id::uuid
    `,
  },
  {
    label: 'all events → actor_name snapshot',
    statement: sql`
      UPDATE audit_log
      SET actor_name = COALESCE("user".name, "user".email)
      FROM "user"
      WHERE audit_log.actor_name IS NULL
        AND "user".id = audit_log.actor_user_id
    `,
  },
];

async function countUnscopedPatientEvents(): Promise<number> {
  const result = await db.execute<{ count: string }>(sql`
    SELECT count(*)::text AS count
    FROM audit_log
    WHERE patient_id IS NULL
      AND resource_type IN ('patient', 'encounter', 'task')
  `);
  const rows = result.rows ?? [];
  return Number(rows[0]?.count ?? 0);
}

async function main(): Promise<void> {
  console.log('Backfilling audit scope…\n');

  for (const step of steps) {
    // `db.execute` is used rather than the query builder because these are
    // set-based updates across a whole table with no per-row application logic.
    const result = await db.execute(step.statement);
    const affected = result.rowCount ?? 0;
    console.log(`  ${step.label}: ${affected} row(s) updated`);
  }

  const remaining = await countUnscopedPatientEvents();

  console.log('\nDone.');
  if (remaining > 0) {
    console.log(
      `\n${remaining} patient-related row(s) could not be scoped because the\n` +
        'entity they reference no longer exists. They remain readable by\n' +
        'resource_type/resource_id and are left null deliberately.',
    );
  }
}

main()
  .then(async () => {
    await pool.end();
    process.exit(0);
  })
  .catch(async (error: unknown) => {
    console.error('Backfill failed:', error);
    await pool.end();
    process.exit(1);
  });
