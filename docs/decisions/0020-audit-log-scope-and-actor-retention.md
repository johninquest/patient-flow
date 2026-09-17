# Audit Log Scope Columns and Actor Retention

**Date:** 2026-09-17  
**Status:** decided  
**Relates to:** [0009](./0009-audit-log-visibility.md), [0018](./0018-polymorphic-audit-resource-id-as-text.md)

## Problem

A patient's Activity tab did not record everything that happened to that patient.
Creating an encounter for a patient produced an audit entry, but the encounter
never appeared on the patient's timeline. The same applied to tasks.

The cause was structural, not a missing call. `audit_log` recorded only the
**target** of an action, via `resource_type` + `resource_id`. An encounter created
for a patient is stored as `resource_type = 'encounter'`, while the patient
timeline queried `resource_type = 'patient' AND resource_id = :id`. Those two
conditions can never both hold, so encounter and task events were unreachable from
the patient timeline by construction. No query against the existing columns could
return them — the row carried no reference to the patient at all.

The reporting user put it directly: "Record keeping is very important in
healthcare, we need to track everything related to a patient." A partial record is
worse than a known gap, because staff trust it.

Three adjacent defects surfaced while investigating:

1. **Create events recorded no diff.** `encounter.created`, `task.created` and
   `patient.created` passed no `diff`, so expanding one showed an empty panel. The
   timeline said something happened but not what.
2. **`actor_user_id` was `NOT NULL` with `onDelete: 'cascade'`.** Deleting a staff
   member would have deleted their entire audit history — the opposite of an audit
   trail's purpose. No delete endpoint exists yet, so this was latent.
3. **`GET /api/audit/patient/:id` had no role filtering.** The response includes
   `diff` payloads, which for patients can contain fields from the `medical`
   section. `front_desk` cannot read that section on the patient record itself
   (`PATIENT_READ_VISIBILITY`), but could read it through the audit endpoint.

## Decision

Add **denormalized scope columns** to `audit_log`, plus an actor name snapshot, and
switch the patient/encounter audit queries to use them.

```ts
// Denormalized scope. Deliberately NOT foreign keys: audit rows must outlive the
// entities they describe, and a cascade would erase history exactly when it
// matters most.
patient_id: uuid('patient_id'),
encounter_id: uuid('encounter_id'),
actor_name: text('actor_name'),

// Was .notNull() with onDelete: 'cascade'.
actor_user_id: text('actor_user_id').references(() => user.id, {
  onDelete: 'set null',
}),
```

Indexes on `(patient_id, created_at)` and `(encounter_id, created_at)`.

**Scope rules** — every event populates:

| Action | `resource_id` | `patient_id` | `encounter_id` |
|---|---|---|---|
| `patient.*` | patient id | patient id | — |
| `encounter.*` | encounter id | the encounter's patient | encounter id |
| `task.*` | task id | the encounter's patient | the task's encounter |
| `user.*`, `admin.*` | user id | — | — |

Scope is computed by pure helpers in `modules/audit/audit-scope.ts`, which are unit
tested directly rather than through the services that touch the database.

**Read semantics** change accordingly:

- `GET /api/audit/patient/:id` → `WHERE patient_id = :id`, restricted to
  `admin`/`provider`/`clinical_staff`. Now returns the patient, its encounters and
  its tasks — the fix.
- `GET /api/audit/encounter/:id` → `WHERE encounter_id = :id`. Now also returns the
  encounter's task events.

**Create and delete record snapshots** (`{ field: { from: null, to: value } }` and
its mirror), reusing the same field lists as update diffs.

**`actor_name` is snapshotted at write time**, resolved inside
`AuditService.record()` so no call site changes.

A backfill script (`pnpm run db:backfill-audit-scope`) scopes existing rows and
populates `actor_name`. It is idempotent and only touches rows where the scope is
still null.

## Rationale

1. **Denormalized columns, not joins.** Deriving the patient by joining
   `encounters`/`tasks` would need no migration, but would lose history the moment
   an encounter is deleted — the cascade removes the encounter, so the join finds
   nothing. That is precisely the situation in which a record matters most. Storing
   the scope on the row makes the audit trail self-contained.
2. **No foreign keys on the scope columns.** Same reasoning as ADR 0018 gave for
   `resource_id` being plain `text`: audit rows must outlive the entities they
   describe. An FK with `cascade` erases history; with `set null` it silently loses
   the scope.
3. **`actor_user_id` becomes nullable rather than being dropped.** Keeping the FK
   preserves the link while the account exists, which is what
   `GET /api/audit/user/:id` (actor-scoped) needs. `set null` plus the `actor_name`
   snapshot means the entry stays attributable and readable after deletion.
4. **`actor_name` also fixes a display bug.** The client resolved actor names
   through `GET /api/users/assignable`, which deliberately excludes suspended and
   `pending` accounts — so a suspended actor rendered as a truncated id. A snapshot
   is correct for every actor, and correct for all time.
5. **Snapshots on create/delete reuse the existing tracked-field lists.** No new
   concept, no per-entity field vocabulary, and create/delete entries become
   readable in the same way update entries already were.
6. **Patient history restricted to clinical roles.** The straightforward option
   over per-role diff redaction: `front_desk` does not read the `medical` section
   on the patient record, so it should not read it through the audit trail either.
   The cost is that `front_desk` loses the Activity tab entirely.
7. **Derived, not inferred, scope.** `patient_id` is set explicitly per event type
   rather than guessed from `resource_type` at read time, so the mapping is
   testable and a future resource type cannot silently fall through to a wrong
   scope.

## Consequences

- **Positive:** a patient timeline now shows encounters and tasks — the reported
  gap is closed. Encounter timelines include their tasks.
- **Positive:** create and delete entries show what was created or removed.
- **Positive:** audit history survives staff deletion; actor names are correct for
  suspended and deleted accounts.
- **Positive:** the `front_desk` PHI leak through the patient audit endpoint is
  closed.
- **Trade-off:** `front_desk` loses the patient Activity tab. Encounter and task
  audit endpoints remain open to all authenticated roles, so encounter `notes` and
  task `description` diffs are still readable by `front_desk`. Left as is; noted
  here as a known boundary rather than an oversight.
- **Trade-off:** rows written before this change whose entity has already been
  deleted cannot be scoped — there is nothing left to join to. They stay null and
  remain readable by `resource_type`/`resource_id`. The backfill reports how many
  such rows it found.
- **Trade-off:** `patient_id`/`encounter_id` can drift from the source entity if an
  encounter is ever re-parented. Encounters are not re-parentable today (there is
  no way to change `patient_id`), so this is a standing assumption worth revisiting
  if that changes.
- **Note:** the project's "every mutation calls `AuditService.record()`" mandate was
  previously satisfied nominally but not actually for patient-scoped reads. ADR 0018
  recorded the same class of problem for `user.*` events. Both are now covered by
  tests on the scope helpers rather than relying on inspection.
- **Dev database note:** the dev DB was created with `drizzle-kit push`, so
  `drizzle.__drizzle_migrations` is empty and `db:migrate` fails replaying `0000`.
  Apply with `db:push`. Migration `0004_careless_chimera.sql` holds the change for
  real environments.
