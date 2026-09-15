# Encounter FSM Extension (`no_show`) and Phase Activation

**Date:** 2026-09-15  
**Status:** decided

## Problem

Two gaps in the encounter workflow surfaced while preparing a customer demo of a
realistic patient journey:

1. **No way to record a no-show.** The FSM had `cancelled` as the only terminal
   exit from `scheduled`, but a patient who never arrives is not the same event as
   a visit that was called off. Clinics measure no-show rates, and collapsing the
   two makes that impossible. The original requirements (`requirements/plan_v1.md`
   §4.3) listed "Cancelled / No-show" as distinct concepts, but only `cancelled`
   was ever implemented.

2. **`phase` was dead code.** ADR 0008 added a `phase` column to `encounters` to
   track sub-states within `in_progress` (consultation, awaiting lab, etc.), and
   the column, index, and response DTO field all existed — but nothing wrote to
   it. It was absent from `UpdateEncounterDto`, ignored by `EncountersService.update()`,
   and never rendered in the UI. The feature was documented but not functional.

## Decision

**Add `no_show` to the FSM** as a terminal state reachable only from `scheduled`:

```
scheduled   → checked_in, cancelled, no_show
checked_in  → in_progress, cancelled
in_progress → completed, cancelled
completed   → (terminal)
cancelled   → (terminal)
no_show     → (terminal)
```

**Activate `phase`** as a sub-state of `in_progress` only:

- Added to `updateEncounterSchema` as a Zod enum.
- Rejected with `400` unless the encounter's *effective* status is `in_progress`.
- **Auto-cleared to `null`** when transitioning to any terminal status
  (`completed`, `cancelled`, `no_show`), so a finished encounter never carries a
  stale sub-state.
- Audited as a **separate action**, `encounter.phase_changed`, distinct from
  `encounter.updated`. When a single request changes both status and phase, two
  audit rows are written.

No database migration was required: `no_show` is a value in an existing `text`
column, and `phase` already existed from ADR 0008.

## Rationale

**Why a new status rather than a flag or a phase value?** A no-show ends the
encounter's life — it is a terminal outcome, not a sub-state of an active visit.
Modelling it as a status keeps the FSM the single source of truth for "is this
encounter still live?", which the flow board and dashboard queries depend on.
Modelling it as a boolean would have required every consumer to check two fields.

**Why keep `phase` separate from `status` instead of flattening them?** This
preserves ADR 0008's core insight: the FSM stays small and stable across customer
types, while `phase` absorbs clinic-specific granularity. Flattening would mean
adding a status for every conceivable sub-step, and every new phase would become a
breaking FSM change.

**Why auto-clear `phase` on terminal transitions?** Without it, a completed
encounter could still report `awaiting_lab`, which is actively misleading on a
board whose whole purpose is answering "where is this patient right now?".
Clearing on exit makes the invariant enforceable: *phase is non-null only while
in progress*.

**Why a separate audit action?** ADR 0008 specified `encounter.phase_changed`.
Keeping it distinct means status history and sub-state history remain separately
queryable — useful for reporting on time-in-phase (e.g. "how long do patients
wait for lab results?") without parsing a mixed diff.

**Consequences accepted:** `no_show` and `cancelled` both map to the `delayed`
design-system status, so they are distinguished by label only. This is
intentional — the design system has four status colours and adding a fifth for a
rare terminal state was not justified. Both are terminal, so neither appears on
the active flow board.
