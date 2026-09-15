# Patient Flow Board and Schedule View

**Date:** 2026-09-15  
**Status:** decided

## Problem

The app could list encounters and tasks, but had no surface answering the question
a clinician actually asks during a shift: **"where is every patient right now?"**
The dashboard showed four aggregate counters (total patients, active encounters,
pending tasks, today's encounters) — useful for a manager, useless for a nurse
deciding what to do next.

Separately, the appointment workflow was invisible. An encounter *is* the
appointment record (`requirements/plan_v1.md` §4.2: "Scheduled appointment or
admission event"), and `scheduled_time` already existed — but nothing displayed
upcoming appointments in time order. `GET /api/encounters` returned rows in
arbitrary order with no date filtering.

## Decision

**Add a Patient Flow board** at `/flow`, backed by a new `GET /api/dashboard/flow`
endpoint. It returns every encounter that is still active (`scheduled`,
`checked_in`, `in_progress`) plus those completed today, rendered as four columns
with patient name, phase, assignee, and task progress. The client polls every 10
seconds.

**Add a Schedule view** as tabs on the existing Encounters page
(`Upcoming | In Progress | Completed`) rather than a new route. The *Upcoming* tab
groups encounters by day (Today / Tomorrow / This week / Later).

**Extend `GET /api/encounters`** with `patient_id`, `from`, and `to` query
parameters, ordered by `scheduled_time` ascending with `NULL` (walk-ins) last.

**Add `GET /api/users/assignable`** — a non-admin picker endpoint returning only
`{ id, name, email, role, title }` for active users.

## Rationale

**Why a board rather than more dashboard metrics?** Aggregates answer "how many";
a board answers "who, and where". The board is the demo's centrepiece precisely
because it makes handoffs visible — a patient moving from *Checked In* to
*In Progress* is the product's core value made legible.

**Why polling instead of WebSockets/SSE?** The demo runs two browser windows side
by side to show a handoff propagating. A 10-second `refetchInterval` achieves that
with zero new infrastructure, no connection lifecycle to manage, and no auth
changes for a long-lived connection. Real-time push is a legitimate future
improvement, but it is not worth the complexity for a coordination tool where
seconds of latency are acceptable.

**Why tabs on Encounters rather than a separate `/schedule` route?** The mobile
bottom tab bar already had four items and adding both *Flow* and *Schedule* would
push it to six, breaking the mobile-first navigation rule. Folding the schedule
into Encounters keeps the nav at five items and reflects the domain truth that a
schedule *is* a view of encounters, not a separate entity.

**Why a list grouped by day rather than a month-grid calendar?** No date library
(`date-fns`, `dayjs`) is installed, so a grid would be built from scratch. More
importantly, a worklist grouped by day is closer to how clinic staff actually
consume a schedule — they scan "what's next", not "what does the month look like".

**Why a separate `assignable` endpoint instead of relaxing `GET /api/users`?**
`GET /api/users` is admin-only and returns account-management fields (status,
verification, timestamps). Assignment pickers are needed by *every* role, so
relaxing that endpoint would have leaked administrative data to all staff. A
narrow projection is both safer and cheaper to query.

**Why `patient_name` on encounter and task responses?** Both lists previously
required a client-side join against a separate patients fetch, which the client
never actually performed — patient names rendered blank. Denormalising the display
name into the response removes an N+1 and fixes the bug at the source.

**Consequences accepted:** the flow board's "completed today" window uses
`updated_at`, not a dedicated `completed_at` column, so an encounter completed
yesterday but edited today would appear. Adding `completed_at` would be more
correct but requires a migration; deferred until reporting needs justify it.
