# Patient Data Model Expansion with Role-Based Field Visibility

**Date:** 2026-07-15  
**Status:** decided  
**Partially superseded by:** `0005-collapse-patient-dtos-and-inline-visibility.md` (the DTO/visibility *file structure* introduced here was simplified; the schema, visibility matrices, and enforcement behavior are unchanged)

## Problem

The original `patients` table had only 7 flat data fields (`first_name`, `last_name`, `date_of_birth`, `phone`, `email`, `address`, `notes`), which was insufficient for real-world clinic operations. The actual patient data structure includes identity/administration details, structured address, financials/insurance, emergency contacts, medical history with attending physicians, and transport logistics — all with different relevance depending on who is viewing the patient.

All authenticated users could see all patient fields equally, including clinical notes visible to front desk staff and financial details visible to clinical staff. There was no mechanism to control which data sections each role could read or write.

## Decision

Expanded the `patients` table to a **hybrid schema** (flat identity columns + jsonb nested sections) and implemented **server-side, role-based field filtering** so each role only receives the sections they are permitted to see.

### Schema Design

- **Flat columns kept** for core identity and queryable fields: `first_name`, `last_name`, `date_of_birth`, `phone`, `email`, `notes`, `medical_history`, `medical_history_date`.
- **`address` changed** from `text` to `jsonb` (`{ street, postal_code, city, country }`).
- **New jsonb columns**: `identity` (`{ document_type, country_national, scanned_document }`), `financials` (`{ health_insurance, reimbursement }`), `emergency_contact` (`{ name, relation, phone, email, comments }`), `physicians` (`{ attending, correspondent, other }`), `transport_logistics` (`{ modes: { public, taxi, ambulance }, comments }`).

### Visibility Model

Role-based only (not journey-stage). Each role sees a fixed set of sections:

| Section | admin | provider | clinical_staff | front_desk |
|---------|:-----:|:-------:|:--------------:|:----------:|
| identity | ✓ | ✓ | ✓ | ✓ |
| contact | ✓ | ✓ | ✓ | ✓ |
| financials | ✓ | ✓ | ✗ | ✓ |
| emergency | ✓ | ✓ | ✓ | ✓ |
| medical | ✓ | ✓ | ✓ | ✗ |
| transport | ✓ | ✓ | ✓ | ✓ |
| notes | ✓ | ✓ | ✓ | ✗ |

Write visibility is more restrictive — e.g., `front_desk` can write identity/financials/transport (intake tasks) but not medical; `provider` can write medical/notes/emergency but not demographics/financials.

### Enforcement

- **Server-side filtering** is the primary enforcement layer. `filterPatientByRole()` strips disallowed fields before returning the response. Sensitive data never leaves the server.
- **Write enforcement** via `assertCanWriteFields()` throws `ForbiddenException` if a role attempts to write fields outside their allowed sections.
- **Frontend** also hides form sections by role for UX (using the same visibility matrix), but this is a convenience layer — the server is the authority.
- **`DELETE /patients/:id`** tightened from all-authenticated to admin-only, matching the encounters pattern.

## Rationale

1. **Hybrid schema over pure flat or pure jsonb** — Core identity fields stay as queryable/indexable columns (name index, email index). Complex nested structures (address parts, transport modes, physician details) are jsonb for flexibility without schema proliferation. This balances queryability with data structure fidelity.

2. **Server-side filtering over client-side** — Sensitive data (medical history, financial details) must never be exposed in network traffic to roles that shouldn't see it. Client-side hiding alone would leak data via the API response. The server is the single source of truth for access control.

3. **Role-based over journey-stage visibility** — While the patient journey (scheduled → checked_in → in_progress → completed) informs *why* each role needs access, tying visibility to encounter status would add significant complexity (the patient's "current stage" must be resolved for every request, and patients can have multiple concurrent encounters). Role-based visibility is simpler, predictable, and sufficient for the current access model. Journey-stage visibility is explicitly deferred.

4. **Section-level granularity over field-level matrix** — Grouping fields into 7 logical sections (identity, contact, financials, emergency, medical, transport, notes) keeps the visibility configuration maintainable. A per-field matrix would be 14+ fields × 4 roles = 56+ entries to manage.

5. **Write enforcement in the service layer** — Rather than restricting entire endpoints by role (which would prevent, e.g., a provider from updating a patient at all), section-level write checks allow each role to update only their permitted sections. The endpoint stays open to all authenticated users; the service enforces field-level permissions.

6. **`DELETE` restricted to admin** — Aligns with the encounters module's pattern where deletion is admin-only. Patient records are permanent clinical data and should not be deletable by non-admin roles.

## Consequences

- API responses for `GET /patients` and `GET /patients/:id` now vary by caller role — the same patient returns different fields depending on who asks. Frontend code must handle optional fields gracefully (already done via conditional rendering).
- The `address` column type change (text → jsonb) requires a data migration if existing patient rows have non-null address values.
- Audit logging (`calculateDiff`) uses shallow field comparison; jsonb fields are compared by reference, which may produce less granular diffs for nested objects. Deep comparison can be added later if needed.
- Adding new patient fields in the future requires updating the visibility matrices in `patient-visibility.ts` (backend) and `patient.types.ts` (frontend) to include the new field in the appropriate section.
