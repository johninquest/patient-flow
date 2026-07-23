# Audit Log Visibility and Timeline UI

**Date:** 2026-07-24  
**Status:** decided

## Problem

The application logs all mutations to the `audit_log` table (who did what, when, with diffs), but this data was never exposed to users. This created several issues:

1. **No accountability trail** — staff couldn't see who changed a patient record or encounter status
2. **Compliance gaps** — healthcare regulations require audit trails to be accessible to authorized personnel
3. **Debugging difficulty** — when something went wrong, staff had no way to investigate what happened
4. **Handoff invisibility** — provider handoffs (tracked via `assigned_to` changes) were buried in the database, not visible in the UI
5. **Lost value** — the audit infrastructure existed but provided no user-facing benefit

The system needed a way to make audit logs visible and actionable for staff while maintaining security and performance.

## Decision

Create **audit log query endpoints** for each resource type (patient, encounter, task, user). Build a reusable **AuditTimeline component** to display audit logs in a chronological, human-readable format. Add activity tabs to PatientDetail, EncounterDetail, and Staff pages.

### Implementation

**Backend (API):**
- Create `api/src/modules/audit/audit.controller.ts` with endpoints:
  - `GET /api/audit/patient/:id` — audit logs for a patient
  - `GET /api/audit/encounter/:id` — audit logs for an encounter
  - `GET /api/audit/task/:id` — audit logs for a task
  - `GET /api/audit/user/:id` — audit logs for a user (admin only)
- Update `AuditService` with query methods:
  - `findByResource(resourceType, resourceId)` — returns logs ordered by `created_at DESC`
  - `findByActor(actorUserId)` — returns logs for a specific user
- Register `AuditController` in `AuditModule`
- Protect endpoints with `AuthGuard` and `CaslGuard`

**Frontend (Client):**
- Create `client/src/components/AuditTimeline.tsx` — reusable timeline component
  - Props: `logs: AuditLog[]`, `title?: string`
  - Displays chronological list of audit events
  - Shows actor (user ID), role, action, timestamp, and diff
  - Formats diffs as "field: old → new"
  - Empty state when no logs exist
- Update `PatientDetail.tsx`:
  - Add "Activity" tab
  - Fetch audit logs via `GET /api/audit/patient/:id`
  - Display `AuditTimeline` component
- Update `EncounterDetail.tsx`:
  - Add "Activity" tab
  - Fetch audit logs via `GET /api/audit/encounter/:id`
  - Display `AuditTimeline` component
- Update `Staff.tsx`:
  - Add "Activity" tab (admin only)
  - Fetch audit logs via `GET /api/audit/resource/user`
  - Display `AuditTimeline` component

**Audit Log Display Format:**
```
[User Icon] abc12345... (admin)
  Created patient
  2026-07-24 10:30:15

[User Icon] def67890... (provider)
  Updated encounter
  2026-07-24 11:45:22
  status: scheduled → checked_in
  assigned_to: null → def67890...
```

### Security Considerations

- All audit endpoints require authentication (`AuthGuard`)
- CASL permissions enforced — users can only view audit logs for resources they can access
- User audit logs restricted to admin role
- Audit logs are append-only — no update/delete endpoints exposed
- Sensitive data (IP addresses) included in logs but not prominently displayed

## Rationale

1. **Compliance requirement.** Healthcare regulations (HIPAA, GDPR) require audit trails to be accessible to authorized personnel. Exposing audit logs via the UI demonstrates compliance during audits.

2. **Accountability and transparency.** Staff can see who made changes, when, and what was changed. This builds trust and reduces disputes about "who did what."

3. **Debugging and investigation.** When something goes wrong (e.g., patient status changed unexpectedly), staff can investigate the audit trail to understand what happened.

4. **Handoff visibility.** Provider handoffs (tracked via `assigned_to` changes) are now visible in the encounter activity tab, making the patient journey clearer.

5. **Reusable component.** The `AuditTimeline` component can be used anywhere audit logs need to be displayed (patient, encounter, task, user, or future resources).

6. **Performance-conscious.** Audit logs are fetched on-demand (when user clicks the Activity tab), not eagerly loaded. Queries are indexed for fast retrieval.

7. **Append-only enforcement.** No update/delete endpoints are exposed, maintaining the integrity of the audit trail. The database constraint (no `updated_at` column) is reinforced at the API level.

8. **Consistent with project philosophy.** Lightweight coordination layer — adds visibility without heavy infrastructure (no separate audit service, no event streaming, no complex analytics).

## Alternatives Considered

- **Admin-only audit dashboard.** Create a separate `/admin/audit` page showing all audit logs. Rejected — too centralized, doesn't provide context-specific visibility. Staff need to see audit logs in the context of the resource they're viewing.

- **Real-time audit notifications.** Use WebSockets to push audit events to staff in real-time. Rejected — over-engineering for current needs. Manual refresh is acceptable for MVP. Can add real-time updates later if needed.

- **Audit log filtering and search.** Add advanced filtering (by date range, actor, action type) and full-text search. Rejected — adds complexity without clear benefit for MVP. Simple chronological list is sufficient. Can add filtering later if users request it.

- **Separate audit microservice.** Extract audit logging into a separate service with its own database. Rejected — over-engineering for current scale. Single database with append-only table is sufficient. Can extract later if audit volume becomes a performance issue.

- **No audit log UI.** Keep audit logs in the database only, accessible via direct SQL queries. Rejected — doesn't meet compliance requirements, not user-friendly, defeats the purpose of logging.

## Consequences

- **Positive:** Audit logs are now visible to staff in context (patient, encounter, user pages).
- **Positive:** Compliance teams can demonstrate audit trail accessibility during audits.
- **Positive:** Staff can investigate what happened when something goes wrong.
- **Positive:** Provider handoffs are visible in encounter activity tabs.
- **Positive:** Reusable `AuditTimeline` component can be used for future resources.
- **Positive:** Append-only enforcement maintained — no update/delete endpoints exposed.
- **Negative:** Additional API endpoints increase the attack surface. Mitigated by authentication and CASL permissions.
- **Negative:** Audit logs can grow large over time, potentially slowing queries. Mitigated by indexing and on-demand fetching. Can add pagination or archiving later if needed.
- **Negative:** User IDs are displayed as truncated strings (e.g., "abc12345...") rather than full names. This is acceptable for MVP but could be improved by joining with the `user` table to display names.
- **Neutral:** Audit logs include IP addresses, but these are not prominently displayed in the UI. Can be added to the timeline display later if needed for security investigations.

## Verification

- **API endpoints:** `GET /api/audit/patient/:id`, `/api/audit/encounter/:id`, `/api/audit/task/:id`, `/api/audit/user/:id` return audit logs
- **Authentication:** Unauthenticated requests return `401 Unauthorized`
- **Authorization:** Non-admin users cannot access `/api/audit/user/:id` (returns `403 Forbidden`)
- **Patient detail:** Activity tab displays audit logs for the patient
- **Encounter detail:** Activity tab displays audit logs for the encounter, including status transitions and phase changes
- **Staff page:** Activity tab (admin only) displays audit logs for all users
- **Empty state:** Resources with no audit logs display "No activity recorded yet"
- **Diff display:** Audit logs with diffs show "field: old → new" format
- **Performance:** Audit log queries complete in <100ms for resources with <1000 audit entries
- **Build:** `npm run build` completes without errors in both API and client
