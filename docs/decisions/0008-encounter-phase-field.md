# Encounter Phase Field for Patient Journey Tracking

**Date:** 2026-07-24  
**Status:** decided

## Problem

The encounter finite state machine (FSM) tracks lifecycle stages (`scheduled` → `checked_in` → `in_progress` → `completed` / `cancelled`), but doesn't capture what's happening **within** the `in_progress` state. Real-world patient journeys involve multiple phases:

1. **Consultation** — doctor examines patient
2. **Awaiting lab results** — patient leaves for testing, returns later
3. **Treatment** — doctor administers treatment
4. **Discharge** — patient is prepared for departure

Without phase tracking:
- Staff can't see "where is this patient now?" during a long encounter
- Handoffs between providers (e.g., doctor → lab tech → doctor) aren't visible
- Reporting on "how many patients are awaiting lab results?" requires querying audit logs
- The patient journey view lacks granularity

The system needs a lightweight way to track sub-states within `in_progress` encounters without complicating the FSM.

## Decision

Add a nullable `phase` field to the `encounters` table. The `phase` tracks what's happening within the `in_progress` status. Keep the FSM simple (status = lifecycle stage), use phase for granular tracking.

### Schema Change

```typescript
// api/src/core/db/schema.ts
export const encounters = pgTable('encounters', {
  // ... existing fields
  status: text('status').notNull(), // 'scheduled' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled'
  phase: text('phase'), // 'consultation' | 'awaiting_lab' | 'awaiting_results' | 'treatment' | 'discharge' | null
  // ... rest of fields
});
```

### Implementation

**Backend (API):**
- Add `phase` column to `encounters` table (nullable text)
- Add `phaseIdx` index for efficient querying
- Generate and apply migration: `npm run db:generate` → `npm run db:migrate`
- Update `UpdateEncounterDto` to include optional `phase` field
- Update `EncountersService.update()` to handle phase changes
- Log phase changes to audit log with action `encounter.phase_changed`

**Frontend (Client):**
- Update `EncounterDetail.tsx` to display current phase
- Add phase transition buttons (e.g., "Mark Lab Results Received")
- Update `PatientDetail.tsx` encounters tab to show phase
- Add i18n keys for phase labels in en.json and fr.json

**Phase Values:**
- `consultation` — initial examination
- `awaiting_lab` — patient sent for lab work
- `awaiting_results` — waiting for lab results to return
- `treatment` — administering treatment
- `discharge` — preparing patient for departure
- `null` — no specific phase (default)

### Usage Pattern

```typescript
// Doctor orders lab work
await encountersService.update(encounterId, {
  phase: 'awaiting_lab'
}, userId, userRole, ability);

// Patient returns with results
await encountersService.update(encounterId, {
  phase: 'treatment'
}, userId, userRole, ability);

// Audit log captures phase history
// action: 'encounter.phase_changed'
// diff: { phase: { from: 'awaiting_lab', to: 'treatment' } }
```

## Rationale

1. **Separation of concerns.** Status = lifecycle stage (is the encounter active or done?). Phase = what's happening right now (where is the patient in the process?). This keeps the FSM simple while capturing granular journey stages.

2. **Flexible and extensible.** Adding new phases (e.g., `awaiting_imaging`, `pharmacy`) requires no schema changes — just new text values. The FSM remains stable.

3. **Queryable.** Can easily query "how many patients are awaiting lab results?" with `WHERE phase = 'awaiting_lab'`. This is more efficient than parsing audit logs.

4. **Audit trail.** Phase changes are logged to `audit_log`, providing a complete handoff history. The patient journey view can display phase transitions from audit logs.

5. **No FSM complexity.** The alternative of adding states like `awaiting_lab_results` to the FSM would complicate the state machine (8+ states instead of 5) and require defining valid transitions between all combinations.

6. **Optional field.** Phase is nullable, so encounters that don't need phase tracking (e.g., quick check-ups) can leave it null. No forced complexity.

7. **Consistent with project philosophy.** Lightweight coordination layer — adds visibility without heavy infrastructure (no new tables, no job queues, no BPM engine).

## Alternatives Considered

- **Add states to FSM.** Extend the FSM with states like `awaiting_lab`, `awaiting_results`, `treatment`. Rejected — complicates the FSM (8+ states), requires defining transitions between all combinations, and conflates lifecycle stage with current activity.

- **Use tasks for waiting states.** Create tasks like "Awaiting lab results" to track waiting periods. Rejected — semantically awkward (encounter is "in progress" but patient isn't there), harder to query, loses the "where is this patient now?" visibility.

- **Multiple encounters per visit.** Create separate encounters for each phase (consultation encounter, lab encounter, treatment encounter). Rejected — loses continuity, scatters patient data across encounters, more administrative overhead.

- **Separate `encounter_phases` table.** Create a junction table to track phase history with timestamps. Rejected — over-engineering for current needs. Audit log already captures phase changes with timestamps. Can extract to a separate table later if needed.

- **No phase tracking.** Keep encounters as-is without phase tracking. Rejected — staff can't see where patients are in the process, handoffs aren't visible, reporting is difficult.

## Consequences

- **Positive:** Staff can see "where is this patient now?" during long encounters (e.g., "In Progress — Awaiting Lab Results").
- **Positive:** Phase history is captured in audit logs, providing a complete handoff trail.
- **Positive:** Easy to query patients by phase (e.g., "show all patients awaiting lab results").
- **Positive:** Flexible — new phases can be added without schema changes.
- **Positive:** Optional — encounters that don't need phase tracking can leave it null.
- **Negative:** Two fields to manage (status + phase) instead of one. Developers must understand the distinction.
- **Negative:** Phase transitions require explicit API calls — not automatic. Staff must manually update phase when patient moves to next stage.
- **Neutral:** Phase values are not validated at the database level (text column). Validation happens at the DTO level. This matches the project's pattern of validating at the API edge.

## Verification

- **Schema:** `encounters` table has `phase` column (nullable text) with index
- **Migration:** `npm run db:migrate` applies successfully
- **API:** PUT `/api/encounters/:id` with `{ phase: 'awaiting_lab' }` updates phase and logs to audit
- **Audit log:** Phase change creates audit entry with `action: 'encounter.phase_changed'` and `diff: { phase: { from: null, to: 'awaiting_lab' } }`
- **Frontend:** Encounter detail page displays current phase (e.g., "Phase: Awaiting Lab Results")
- **Frontend:** Patient detail encounters tab shows phase for each encounter
- **Query:** `SELECT * FROM encounters WHERE phase = 'awaiting_lab'` returns all patients awaiting lab results
- **Build:** `npm run build` completes without errors in both API and client
