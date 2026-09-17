# Clinical Documentation: SOAP Notes, Problem List and an ICD-10 Shortlist

**Date:** 2026-09-18
**Status:** decided

## Problem

Patient Flow could move a patient through a visit but had **nowhere to record what
was found or decided**. Diagnosis, medical history and treatment plans had no
home:

- `patients.medical_history` was one unattributed free-text blob plus a date. No
  author, no encounter link, no structure, overwritten on every edit.
- `encounters.notes` had the same defects: unattributed, unstructured, no history.

ADR 0020 had already identified `medical_history` diffs in `audit_log` as a PHI
leak, so the existing blob was simultaneously un-auditable and over-exposed.
There was no way to answer "who recorded this diagnosis, when, and in which
visit?" — which is the minimum standard for clinical documentation.

## Decision

Added two clinical artifacts plus a curated diagnosis catalogue.

### 1. `clinical_notes` — SOAP documentation of a visit

Structured Subjective / Objective / Assessment / Plan fields, plus a free-text
`additional_notes` escape hatch. This answers the original three questions by
structure rather than by convention: **diagnosis goes in `assessment`**, **the
treatment plan in `plan`**, and both are individually addressable rather than
buried in a paragraph.

Every SOAP field is optional, so a note can be saved partially and completed
later. `encounter_id` is NOT NULL — a note documents a visit — and `patient_id` is
denormalized from it, so a note can never be filed against the wrong patient.

Attribution is snapshotted: `author_name` and `author_role` are stored alongside
`author_user_id`, for the same reason `audit_log.actor_name` exists. The note
stays attributable after a rename, suspension or deletion, and `author_role`
records *who this was written as* — a nursing note reads differently from a
doctor's.

### 2. `clinical_note_revisions` — head-plus-history amendability

A note is editable, and the superseded content is preserved. On `PUT`, inside one
transaction, the current head is copied into `clinical_note_revisions`
(`revision_number` = the head's `version`), the head is overwritten, and `version`
is incremented. Revision 1 is therefore the original content.

`version` doubles as the optimistic lock: the update predicate is
`WHERE id = ? AND version = ?`, so a stale form cannot silently overwrite an edit
made in another session — the whole transaction rolls back with `409`.

**Edit authority is the author or an `admin`.** A clinician who disagrees with a
colleague's note writes their own rather than editing it. The revision table
preserves history, but attribution is the stronger guarantee, and this keeps the
common case (my note, my correction) simple.

### 3. `patient_problems` — the longitudinal problem list

Deliberately separate from notes. A note records what happened in **one visit**; a
problem is the durable clinical state that outlives any single encounter.
`encounter_id` records provenance but is nullable and `set null`, so deleting a
visit does not erase a diagnosis.

### 4. A static 30-item ICD-10 catalogue

`apps/api/src/core/common/clinical/diagnoses.ts`, served by `GET /api/diagnoses`,
weighted toward conditions a West African clinic actually sees (malaria, typhoid,
dengue, typhus, leptospirosis, leprosy, filariasis), plus common respiratory
presentations and cancers that drive referral decisions.

`description` is **never** constrained — the list is a shortlist, not a coding
system, so an off-list diagnosis stays recordable. The rule is narrower: *if* a
`code` is supplied it must be a real catalogue entry, and `code_system` /
`diagnosis_slug` must agree with it. This mirrors how
`transport_logistics.modes` is server-validated while `emergency_contact.relation`
is UI-only.

`diagnosis_slug` is persisted rather than derived, so a catalogue pick is
distinguishable from free text that reads the same.

## Rationale

1. **SOAP over a bespoke format.** SOAP is the near-universal clinical note
   structure. Using it means the field set is defensible to a clinician without
   explanation, and diagnosis/treatment-plan land in named sections instead of
   being an implicit convention.

2. **Head-plus-history over append-only addenda.** An addendum-only model is
   arguably stronger clinically, but it forces a clinician to write a correction
   note for a typo. Head-plus-history keeps the common case cheap while still
   making the original content recoverable — no authored content is ever
   destroyed. The optimistic lock is what makes editing safe.

3. **Problems separate from notes.** Collapsing them into one table would mean
   either a diagnosis dies with its visit (bad: the problem list is
   longitudinal) or notes accumulate duplicates of the same diagnosis.

4. **Catalogue in code, not a table.** It is reference data with no PHI, no
   per-clinic variation and no runtime mutation. A table would need a seed
   migration and a join for no benefit.

5. **Clinical audit diffs are metadata-only.** This is the load-bearing decision.
   `GET /api/audit/encounter/:id` is readable by **every** authenticated role,
   unlike `GET /api/audit/patient/:id` which ADR 0020 restricted to clinical
   roles. Clinical notes and problems are encounter-scoped, so their audit entries
   appear on that timeline. Putting note text or diagnosis wording in a diff would
   therefore leak PHI to `front_desk`.

   So `clinical_note.*` diffs carry only `note_type` and `version`, and
   `problem.*` diffs only `status` / `code` / `code_system`. **The content trail
   is the revisions endpoint**, which is role-restricted. This is locked by a unit
   test asserting the audited field list and the SOAP content list stay disjoint.

6. **`FormSelect` gained optgroups rather than a custom picker.** 30 items in a
   flat list is hard to scan, but building a bespoke dropdown would breach the
   design-system rule. Extending a shared component additively (the existing flat
   `options` prop is untouched) keeps the change inside the system.

## Accepted trade-off: the catalogue is English-only

`DiagnosisEntry.name` does **not** go through `useTranslation()`. The client
renders it verbatim in all locales, so **French users see English disease names**.
Only the group headings (`diagnoses.groups.*`) are translated.

This is a deliberate decision, not an oversight, and it is recorded here because
it is invisible to tooling: `i18n:check` compares *key sets* between locale files,
so a string that never becomes a key cannot be detected as missing. Nothing will
fail in CI — it will simply show English.

Mitigations so the gap stays visible:

- A prominent comment in `diagnoses.ts`.
- This ADR entry.
- The 30 names listed as pending work in `i18n-review-queue.md`.

**Migration path if French names are wanted later:** add a
`diagnoses.items.<slug>` namespace to `en.json`/`fr.json` and resolve by slug on
the client. `slug` is already in the catalogue *and* already persisted on every
`patient_problems` row, so **no data migration is needed** — the cost is 30 keys ×
2 locales plus glossary review.

## Alternatives Considered

- **Append-only notes with no editing.** Strongest authorship guarantee, but a
  typo would require writing a whole correction note. Rejected — the revision
  table achieves the same traceability with a far better common case.
- **One free-text note body plus a type.** Leanest schema, but "where does the
  diagnosis go?" becomes "somewhere in this paragraph", which is exactly the
  ambiguity being fixed.
- **A full ICD-10 code table with search.** `requirements/plan_v1.md` lists "deep
  medical coding systems (ICD, CPT automation)" as an explicit non-goal, and it
  would pull in a large dataset. The 30-item shortlist plus free text covers the
  real use case.
- **Requiring a catalogue pick.** Would produce the cleanest data, but a 30-item
  list would block real cases on day one.
- **Duplicating note content into `audit_log` for a single readable trail.**
  Rejected outright — it is the PHI leak this design exists to avoid.
- **Restricting `GET /api/audit/encounter/:id` to clinical roles.** Would also
  solve the leak, but costs `front_desk` the encounter activity timeline they
  legitimately need for coordination. Metadata-only diffs keep both.

## Consequences

- Two new modules, three tables, two CASL subjects (`ClinicalNote`, `Problem`).
- `GET /api/audit/encounter/:id` stays open to all roles, which is now safe by
  construction rather than by luck.
- Clinical documentation is gated to `admin`/`provider`/`clinical_staff`,
  matching the existing patient `medical` section rule so there is one
  clinical-visibility concept rather than two.
- The encounter FSM is unchanged: completing an encounter without a note is not
  blocked. The UI prompts; the API does not enforce.
- `patients.medical_history` is retained as intake narrative history, distinct
  from the problem list.
- 30 diagnosis names remain untranslated by design; see the trade-off section.
