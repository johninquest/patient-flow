# API Contract — Patient Flow

> **Source of truth for all API endpoints.** Frontend and backend must conform to this spec.
>
> **How to use:** Attach `#api_spec.md` to Copilot chat when generating controllers, frontend API calls, or types.
>
> **Drift check:** Run `/check-contract-drift` to compare this spec against live controllers and DTOs.

**Base URL:** `http://localhost:3000/api` (dev) · `https://api.patientflow.app/api` (prod)

**Auth:** Cookie-based (`session_token`). All endpoints except `/auth/*` require `AuthGuard`.

**Content-Type:** `application/json`

---

## Conventions

| Convention | Rule |
|-----------|------|
| ID format | `uuidv7` for business entities, `text` for auth tables (Better Auth) |
| Timestamps | ISO 8601 strings in responses (`created_at`, `updated_at`) |
| Error format | NestJS default: `{ "statusCode": number, "message": string, "error": string }` |
| Validation | Zod v4 schemas via `@Body({ schema })` + `StandardSchemaValidationPipe`. Unknown keys rejected with `.strict()` (replaces `forbidNonWhitelisted`) |
| Audit | Every mutation logged via `AuditService.record()` with action format `entity.verb` |
| Roles | `admin`, `provider`, `clinical_staff`, `front_desk`, `pending` |
| Clinical data | Clinical notes, problem-list entries and the diagnosis catalogue are documented below. Clinical `audit_log` diffs are **metadata-only** — never note text or diagnosis wording |

> **`pending`** is an account state, not a job function: the user is authenticated
> but has been granted no role. New staff reach it by self-registering with
> Google. `AuthGuard` rejects every protected endpoint for these users with
> `403`, so they can only reach the client's waiting-room screen. An admin grants
> access by assigning one of the four real roles via `PATCH /api/users/:id`.

---

## Auth Endpoints

> Better Auth passthrough — all `/api/auth/*` routes handled by `AuthController` via `toNodeHandler`.

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/sign-in` | Email/password sign-in | Public |
| POST | `/auth/sign-up` | Email/password registration | Public |
| POST | `/auth/sign-out` | Destroy session | Public |
| GET | `/auth/get-session` | Get current session | Public (returns null if unauthenticated) |
| POST | `/auth/sign-in/social` | OAuth sign-in (Google) | Public |

**Session cookie:** `session_token` — HttpOnly, SameSite=Lax, scoped to `.patientflow.app` in production.

### Google self-registration

`POST /auth/sign-in/social` with `{ "provider": "google" }` returns
`{ "url": "..." }`; the client must redirect to that URL (the endpoint does not
redirect on its own).

Implicit sign-up is **enabled**, so an unknown Google account creates a user
rather than being rejected. The new user is created with `role = 'pending'` and
`status = 'active'`, and a `user.registered` audit entry is written. Email/password
sign-up remains disabled (`emailAndPassword.disableSignUp`).

> To restrict signup to a Google Workspace domain, set the `hd` provider option
> (currently commented out in `core/auth/auth.ts`).

---

## Patients

> **Role-Based Visibility:** Patient responses are **server-filtered** by the caller's role. Each role only receives the sections they are permitted to read (see visibility matrix in `schema.md`). The request shapes below show all possible fields; individual roles may only write to their permitted sections.

### `POST /api/patients` — Create Patient
**Roles:** `clinical_staff`, `admin`

**Request:**
```json
{
  "first_name": "string (required)",
  "last_name": "string (required)",
  "date_of_birth": "ISO 8601 date (optional)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "address": { "street": "string", "postal_code": "string", "city": "string", "country": "ISO 3166-1 alpha-2 code" } (optional),
  "identity": { "document_type": "string", "country_national": "ISO 3166-1 alpha-2 code", "scanned_document": "boolean" } (optional),
  "financials": { "health_insurance": "string", "reimbursement": "string", "currency": "ISO 4217 code" } (optional),
  "emergency_contact": { "name": "string", "relation": "string", "phone": "string", "email": "string", "comments": "string" } (optional),
  "medical_history": "string (optional)",
  "medical_history_date": "ISO 8601 date (optional)",
  "physicians": { "attending": "string", "correspondent": "string", "other": "string" } (optional),
  "transport_logistics": { "modes": ["public_transport", "taxi", "ambulance"], "comments": "string" } (optional),
  "notes": "string (optional)"
}
```

> `transport_logistics.modes` is an **array** of transport modes (a patient may use more
> than one). Allowed values: `public_transport`, `taxi`, `ambulance`. Unknown values are
> rejected with `400`. `emergency_contact.relation` is a free string on the wire; the
> client renders it as a dropdown from a standard list.

**Write Enforcement:** Caller can only set fields within their writable sections (see write visibility matrix). Attempting to write disallowed sections returns `403`.

**Response:** `201 Created` — Role-filtered Patient object (only sections the caller can read):
```json
{
  "id": "uuidv7",
  "first_name": "string",
  "last_name": "string",
  "date_of_birth": "timestamp | null",
  "phone": "string | null",
  "email": "string | null",
  "address": "{ street, postal_code, city, country } | null",
  "identity": "{ document_type, country_national, scanned_document } | null",
  "financials": "{ health_insurance, reimbursement, currency } | null",
  "emergency_contact": "{ name, relation, phone, email, comments } | null",
  "medical_history": "string | null",
  "medical_history_date": "timestamp | null",
  "physicians": "{ attending, correspondent, other } | null",
  "transport_logistics": "{ modes: string[], comments } | null",
  "notes": "string | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errors:** `400` Validation · `403` Role not permitted or write outside allowed sections

---

### `GET /api/patients` — List All Patients
**Roles:** All authenticated users

**Response:** `200 OK` — Array of role-filtered Patient objects (each object contains only the sections the caller's role can read).

---

### `GET /api/patients/:id` — Get Patient by ID
**Roles:** All authenticated users

**Response:** `200 OK` — Role-filtered Patient object

**Errors:** `404` Patient not found

---

### `PUT /api/patients/:id` — Update Patient
**Roles:** All authenticated users (mutation audited)

**Request:** All fields optional (partial update). Only sections the caller's role can write are accepted; others return `403`:
```json
{
  "first_name": "string (optional)",
  "last_name": "string (optional)",
  "date_of_birth": "ISO 8601 date (optional)",
  "phone": "string (optional)",
  "email": "string (optional)",
  "address": { "street": "string", "postal_code": "string", "city": "string", "country": "ISO 3166-1 alpha-2 code" } (optional),
  "identity": { "document_type": "string", "country_national": "ISO 3166-1 alpha-2 code", "scanned_document": "boolean" } (optional),
  "financials": { "health_insurance": "string", "reimbursement": "string", "currency": "ISO 4217 code" } (optional),
  "emergency_contact": { "name": "string", "relation": "string", "phone": "string", "email": "string", "comments": "string" } (optional),
  "medical_history": "string (optional)",
  "medical_history_date": "ISO 8601 date (optional)",
  "physicians": { "attending": "string", "correspondent": "string", "other": "string" } (optional),
  "transport_logistics": { "modes": ["public_transport", "taxi", "ambulance"], "comments": "string" } (optional),
  "notes": "string (optional)"
}
```

**Write Enforcement:** Caller can only update fields within their writable sections. Attempting to write disallowed sections returns `403`.

**Response:** `200 OK` — Role-filtered updated Patient object

**Errors:** `403` Write outside allowed sections · `404` Patient not found

---

### `DELETE /api/patients/:id` — Delete Patient
**Roles:** `admin` only (mutation audited)

**Response:** `200 OK`
```json
{ "success": true }
```

**Errors:** `403` Not admin · `404` Patient not found

---

## Encounters

### `POST /api/encounters` — Create Encounter
**Roles:** All authenticated users

> An encounter **is** the appointment record (see ADR and `requirements/plan_v1.md` §4.2).
> Provide `scheduled_time` to book a future appointment; omit it for a walk-in.

**Request:**
```json
{
  "patient_id": "uuid (required)",
  "assigned_to": "text user ID (optional)",
  "scheduled_time": "ISO 8601 datetime (optional) — omit for a walk-in",
  "notes": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuidv7",
  "patient_id": "uuid",
  "patient_name": "string",
  "status": "scheduled",
  "phase": null,
  "assigned_to": "text | null",
  "scheduled_time": "timestamp | null",
  "notes": "string | null",
  "version": 0,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Notes:**
- Every encounter starts as `scheduled`. `phase` is **not** settable at creation — it only applies while the status is `in_progress`.
- `patient_name` is a read-only convenience field (`patients.first_name` + `' '` + `patients.last_name`).

**Errors:** `400` Validation · `404` Patient not found

---

### `GET /api/encounters` — List Encounters
**Roles:** All authenticated users

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `patient_id` | uuid | Filter encounters by patient |
| `from` | ISO 8601 date | Only encounters with `scheduled_time` on/after this instant |
| `to` | ISO 8601 date | Only encounters with `scheduled_time` on/before this instant |

**Ordering:** Results are ordered by `scheduled_time` ascending. Encounters with a `NULL` `scheduled_time` (walk-ins) sort last.

**Response:** `200 OK` — Array of Encounter objects (each includes `patient_name`)

---

### `GET /api/encounters/:id` — Get Encounter by ID
**Roles:** All authenticated users

**Response:** `200 OK` — Encounter object (includes `patient_name`)

**Errors:** `404` Encounter not found

---

### `PUT /api/encounters/:id` — Update Encounter
**Roles:** All authenticated users (ownership lock enforced)

**Request:** All fields optional:
```json
{
  "status": "string (optional) — one of: scheduled, checked_in, in_progress, completed, cancelled, no_show",
  "phase": "string (optional) — one of: consultation, awaiting_lab, awaiting_results, treatment, discharge",
  "assigned_to": "text user ID (optional)",
  "scheduled_time": "ISO 8601 datetime (optional)",
  "notes": "string (optional)"
}
```

**Status Transition Rules (FSM):**
```
scheduled   → checked_in, cancelled, no_show
checked_in  → in_progress, cancelled
in_progress → completed, cancelled
completed   → (terminal)
cancelled   → (terminal)
no_show     → (terminal)
```

**Phase Rules:**
- `phase` tracks the sub-state **within** `in_progress` (see ADR 0008). It is deliberately separate from `status` — the FSM itself is unchanged.
- Setting a `phase` requires the encounter's **current** status to be `in_progress`. Otherwise `400 Bad Request`.
- Transitioning to `completed` or `cancelled` automatically clears `phase` to `null`.
- A phase change is audited as `encounter.phase_changed`, distinct from `encounter.updated`.
- Valid phases: `consultation`, `awaiting_lab`, `awaiting_results`, `treatment`, `discharge`.

**Ownership Lock:** If `assigned_to` is set and differs from the requesting user, only `admin` role can change status.

**Optimistic Locking:** `version` field incremented on each update. Update query uses `WHERE id = ? AND version = ?`. If no row updated → `400` conflict.

**Response:** `200 OK` — Updated Encounter object (with incremented `version`)

**Errors:** `400` Invalid transition / optimistic lock conflict · `403` Not authorized (ownership) · `404` Not found

---

### `DELETE /api/encounters/:id` — Delete Encounter
**Roles:** `admin` only

**Response:** `200 OK`
```json
{ "success": true }
```

**Errors:** `403` Not admin · `404` Not found

---

## Tasks

### `POST /api/tasks` — Create Task
**Roles:** All authenticated users

**Request:**
```json
{
  "encounter_id": "uuid (required)",
  "title": "string (required)",
  "description": "string (optional)",
  "status": "string (optional) — one of: todo, in_progress, done. Default: todo",
  "priority": "string (optional) — one of: low, medium, high. Default: medium",
  "assigned_user_id": "text user ID (optional)",
  "assigned_role": "string (optional)",
  "blocking": "boolean (optional) — default: false",
  "due_at": "ISO 8601 datetime (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuidv7",
  "encounter_id": "uuid",
  "patient_name": "string",
  "title": "string",
  "description": "string | null",
  "status": "todo",
  "priority": "medium",
  "assigned_user_id": "text | null",
  "assigned_role": "string | null",
  "blocking": false,
  "due_at": "timestamp | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Notes:** `patient_name` is a read-only convenience field resolved via the task's encounter.

**Errors:** `400` Validation · `404` Encounter not found

---

### `GET /api/tasks` — List Tasks (with optional filter)
**Roles:** All authenticated users

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `encounter_id` | uuid | Filter tasks by encounter |
| `assigned_user_id` | text | Filter tasks assigned to a specific user |
| `patient_id` | uuid | Filter tasks by the patient the task's encounter belongs to |

**Response:** `200 OK` — Array of Task objects (each includes `patient_name`)

---

### `GET /api/tasks/:id` — Get Task by ID
**Roles:** All authenticated users

**Response:** `200 OK` — Task object

**Errors:** `404` Task not found

---

### `PUT /api/tasks/:id` — Update Task
**Roles:** All authenticated users (mutation audited)

**Request:** All fields optional (except `encounter_id` — not updatable):
```json
{
  "title": "string (optional)",
  "description": "string (optional)",
  "status": "string (optional) — todo, in_progress, done",
  "priority": "string (optional) — low, medium, high",
  "assigned_user_id": "text user ID (optional)",
  "assigned_role": "string (optional)",
  "blocking": "boolean (optional)",
  "due_at": "ISO 8601 datetime (optional)"
}
```

**Response:** `200 OK` — Updated Task object

**Errors:** `404` Task not found

---

### `DELETE /api/tasks/:id` — Delete Task
**Roles:** All authenticated users (mutation audited)

**Response:** `200 OK`
```json
{ "success": true }
```

**Errors:** `404` Task not found

---

## Clinical Notes

> **Roles:** `admin`, `provider`, `clinical_staff` only. `front_desk` and
> `pending` are refused with `403` on every route in this section — a clinical
> note has no partially-safe subset, unlike the patient record where disallowed
> sections are stripped. See the visibility matrix in `schema.md`.

### `POST /api/clinical-notes` — Create Clinical Note
**Roles:** `admin`, `provider`, `clinical_staff`

**Request:**
```json
{
  "encounter_id": "uuid (required) — the visit this note documents",
  "note_type": "string (optional) — consultation, nursing, procedure, other. Default: consultation",
  "subjective": "string (optional, max 10000)",
  "objective": "string (optional, max 10000)",
  "assessment": "string (optional, max 10000) — the diagnosis narrative",
  "plan": "string (optional, max 10000) — the treatment plan",
  "additional_notes": "string (optional, max 10000)"
}
```

**Notes:**
- `patient_id` is **not** accepted. It is derived from the encounter, so a note
  cannot be filed against a patient it does not belong to.
- All SOAP fields are optional: a note can be saved partially and completed
  later. The value of the structure is that `assessment` and `plan` are
  individually addressable, not that they are enforced.
- `author_user_id`, `author_name` and `author_role` are set from the session.
  `author_name` and `author_role` are **snapshots**, so the note stays
  attributable after a rename, suspension or role change.

**Response:** `201 Created`
```json
{
  "id": "uuidv7",
  "patient_id": "uuid",
  "encounter_id": "uuid",
  "patient_name": "string | null",
  "note_type": "consultation",
  "subjective": "string | null",
  "objective": "string | null",
  "assessment": "string | null",
  "plan": "string | null",
  "additional_notes": "string | null",
  "author_user_id": "text | null",
  "author_name": "string | null",
  "author_role": "provider",
  "version": 1,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errors:** `400` Validation · `403` Not a clinical role · `404` Encounter not found

---

### `GET /api/clinical-notes` — List Clinical Notes
**Roles:** `admin`, `provider`, `clinical_staff`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `patient_id` | uuid | Filter notes by patient |
| `encounter_id` | uuid | Filter notes by encounter |

**Ordering:** `created_at` **descending** — a clinician reads the most recent
documentation first.

**Response:** `200 OK` — Array of Clinical Note objects

**Errors:** `403` Not a clinical role

---

### `GET /api/clinical-notes/:id` — Get Clinical Note by ID
**Roles:** `admin`, `provider`, `clinical_staff`

**Response:** `200 OK` — Clinical Note object

**Errors:** `403` Not a clinical role · `404` Note not found

---

### `GET /api/clinical-notes/:id/revisions` — Get Revision History
**Roles:** `admin`, `provider`, `clinical_staff`

**Response:** `200 OK` — Array of revision objects, **oldest first**

```json
[
  {
    "id": "uuidv7",
    "note_id": "uuid",
    "revision_number": 1,
    "note_type": "consultation",
    "subjective": "string | null",
    "objective": "string | null",
    "assessment": "string | null",
    "plan": "string | null",
    "additional_notes": "string | null",
    "edited_by": "text | null",
    "edited_by_name": "string | null",
    "created_at": "timestamp"
  }
]
```

**Notes:**
- Revision 1 is the **original** content; revision N is the Nth superseded
  version. An unedited note returns an empty array.
- **This endpoint is the content trail.** `audit_log` deliberately holds no
  clinical text (see the audit section of `schema.md`), because
  `GET /api/audit/encounter/:id` is readable by every role.

**Errors:** `403` Not a clinical role · `404` Note not found

---

### `PUT /api/clinical-notes/:id` — Edit Clinical Note
**Roles:** `admin`, or the note's **author** (`provider` / `clinical_staff`)

**Request:** All fields optional except `version`:
```json
{
  "version": "integer (required) — the version being replaced (optimistic lock)",
  "note_type": "string (optional) — consultation, nursing, procedure, other",
  "subjective": "string (optional, max 10000)",
  "objective": "string (optional, max 10000)",
  "assessment": "string (optional, max 10000)",
  "plan": "string (optional, max 10000)",
  "additional_notes": "string (optional, max 10000)"
}
```

**Notes:**
- `encounter_id` is **not accepted** — re-pointing a note at another encounter
  would silently rewrite clinical history.
- Sending an empty string clears that field; omitting it leaves it unchanged.

**Revision mechanics:** the current content is copied into
`clinical_note_revisions` with `revision_number = version`, then the note is
overwritten and `version` incremented. All three steps run in one transaction.

**Optimistic Locking:** the update predicate is `WHERE id = ? AND version = ?`
using the supplied `version`. If no row matches, another session edited the note
first: the transaction rolls back (including the revision insert) and `409` is
returned. A clinical record is never silently overwritten.

**Authorisation:** only the note's author or an `admin` may edit. A clinician who
disagrees with a colleague's note writes their own rather than editing it.

**Response:** `200 OK` — Updated Clinical Note object (with incremented `version`)

**Errors:** `400` Validation · `403` Not the author and not an admin ·
`404` Not found · `409` Optimistic lock conflict

---

### `DELETE /api/clinical-notes/:id` — Delete Clinical Note
**Roles:** `admin` only

**Response:** `200 OK`
```json
{ "success": true }
```

**Notes:** Revisions cascade with the note. The audit entry records only
`note_type` and `version` — never the content.

**Errors:** `403` Not admin · `404` Not found

---

## Problems

> **Roles:** `admin`, `provider`, `clinical_staff` only, on every route in this
> section. Same rationale as clinical notes.

### `POST /api/problems` — Record a Problem
**Roles:** `admin`, `provider`, `clinical_staff`

**Request:**
```json
{
  "patient_id": "uuid (required)",
  "encounter_id": "uuid (optional) — where it was recorded",
  "description": "string (required, 1-500) — free text; prefilled from the catalogue",
  "code": "string (optional, max 16) — ICD-10 code from the catalogue",
  "code_system": "string (optional) — must be \"ICD-10\" when code is set",
  "diagnosis_slug": "string (optional) — catalogue slug matching the code",
  "status": "string (optional) — active, resolved, inactive. Default: active",
  "onset_date": "ISO 8601 date (optional)",
  "resolved_date": "ISO 8601 date (optional)",
  "notes": "string (optional, max 5000)"
}
```

**Coding Rules:**
- `description` is **never** constrained. The catalogue is a 30-item shortlist,
  not a coding system, so an off-list diagnosis must remain recordable.
- If `code` is supplied it must match an entry in the diagnosis catalogue, and
  `code_system` / `diagnosis_slug` must agree with it. Otherwise `400`.
- A problem with no `code` at all is valid.

**Business Rules:** if `encounter_id` is supplied it must belong to
`patient_id`, otherwise `400`.

**Response:** `201 Created` — Problem object (includes `patient_name`)

**Errors:** `400` Validation, off-list code, or encounter/patient mismatch ·
`403` Not a clinical role · `404` Patient or encounter not found

---

### `GET /api/problems` — List Problems
**Roles:** `admin`, `provider`, `clinical_staff`

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `patient_id` | uuid | Filter problems by patient |
| `status` | string | Filter by `active`, `resolved` or `inactive` |

**Ordering:** `active` first, then `created_at` descending within each status.

**Response:** `200 OK` — Array of Problem objects

**Errors:** `403` Not a clinical role

---

### `GET /api/problems/:id` — Get Problem by ID
**Roles:** `admin`, `provider`, `clinical_staff`

**Response:** `200 OK` — Problem object

**Errors:** `403` Not a clinical role · `404` Not found

---

### `PUT /api/problems/:id` — Update a Problem
**Roles:** `admin`, `provider`, `clinical_staff`

**Request:** All fields optional:
```json
{
  "description": "string (optional, 1-500)",
  "code": "string (optional) — ICD-10 code from the catalogue",
  "code_system": "string (optional)",
  "diagnosis_slug": "string (optional)",
  "status": "string (optional) — active, resolved, inactive",
  "onset_date": "ISO 8601 date (optional)",
  "resolved_date": "ISO 8601 date (optional)",
  "notes": "string (optional, max 5000)"
}
```

**Notes:**
- `patient_id` and `encounter_id` are **not accepted** — re-pointing a problem
  at another patient or visit would rewrite clinical history.
- Sending `code` as an empty string clears the code, `code_system` and
  `diagnosis_slug` together. This is how a clinician replaces a catalogue pick
  with free text.
- Same coding rules as create.

**Response:** `200 OK` — Updated Problem object

**Errors:** `400` Validation or off-list code · `403` Not a clinical role ·
`404` Not found

---

### `DELETE /api/problems/:id` — Delete a Problem
**Roles:** `admin` only

**Response:** `200 OK`
```json
{ "success": true }
```

**Errors:** `403` Not admin · `404` Not found

---

## Diagnosis Catalogue

### `GET /api/diagnoses` — List the ICD-10 Shortlist
**Roles:** All authenticated users (`front_desk` included)

> Auth-only with **no role restriction**: this is a static clinical reference
> list containing no patient data, and it is the picker source for the
> problem-list form. It is served from the API rather than duplicated in the
> client so the codes have one source of truth.

**Response:** `200 OK`
```json
{
  "groups": ["infectious", "respiratory", "cancer", "chronic", "other"],
  "items": [
    {
      "code": "B54",
      "slug": "malaria",
      "name": "Malaria, unspecified",
      "group": "infectious"
    }
  ]
}
```

**Notes:**
- At most **30 items**, capped by a unit test.
- **`name` is English-only and rendered verbatim in all locales.** This is a
  deliberate exception to the app's i18n rule (ADR 0021). Only `group` is
  translated, client-side via `diagnoses.groups.*`.
- The list is static code, not a database table — see
  `apps/api/src/core/common/clinical/diagnoses.ts`.

**Errors:** `403` Not authenticated or `pending` access

---

## Users

### `POST /api/users` — Create User
**Roles:** `admin` only

**Request:**
```json
{
  "name": "string (required, min 2 chars)",
  "email": "valid email (required)",
  "password": "string (required, min 8 chars)",
  "role": "string (required) — admin, provider, clinical_staff, front_desk",
  "title": "string (optional) — professional designation"
}
```

> `pending` is **not** accepted here. Creating a user who cannot do anything is
> never the intent of "New Staff"; `pending` is reached only by self-service
> Google signup, or by an admin revoking access via `PATCH /api/users/:id`.

**Response:** `201 Created` — User object (no password returned)

**Errors:** `400` Validation · `403` Not admin · `409` Email already exists

---

### `GET /api/users` — List All Users
**Roles:** `admin` only

**Response:** `200 OK` — Array of User objects

> Includes `pending` users, so an admin can see who has self-registered and is
> awaiting access. The client renders these with a "Pending Access" badge.

---

### `GET /api/users/assignable` — List Assignable Users
**Roles:** All authenticated users

> Lightweight picker endpoint for populating "assign to" dropdowns. Unlike `GET /api/users`
> (admin-only), any authenticated user may call this. Only non-sensitive identity fields are returned.

**Response:** `200 OK`
```json
[
  {
    "id": "text",
    "name": "string | null",
    "email": "string",
    "role": "string",
    "title": "string | null"
  }
]
```

**Notes:** Only users with `status = 'active'` **and** a role other than `pending`
are returned. Ordered by `name`.

> `pending` users are excluded because they cannot act on anything yet —
> assigning work to them would create tasks nobody can progress.

---

### `GET /api/users/me` — Get Current User Profile
**Roles:** All authenticated users

**Response:** `200 OK`
```json
{
  "id": "text",
  "name": "string | null",
  "email": "string",
  "emailVerified": "boolean | null",
  "image": "string | null",
  "role": "string",
  "title": "string | null",
  "status": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "lastLogin": "timestamp | null"
}
```

---

### `GET /api/users/:id` — Get User by ID
**Roles:** `admin` only

**Response:** `200 OK` — User object

**Errors:** `404` User not found

---

### `PATCH /api/users/:id` — Update User Role/Title
**Roles:** `admin` only

**Request:**
```json
{
  "role": "string (optional) — admin, provider, clinical_staff, front_desk, pending",
  "title": "string (optional)"
}
```

**Business Rules:**
- Cannot demote self
- Cannot demote last remaining admin
- Setting `role` to `pending` revokes access without suspending the account: the
  user stays signed in and is routed to the waiting-room screen

**Response:** `200 OK` — Updated User object

**Errors:** `400` Validation · `403` Cannot demote self/last admin · `404` Not found

---

### `PATCH /api/users/:id/status` — Update User Status
**Roles:** `admin` only

**Request:**
```json
{
  "status": "string (required) — active, suspended"
}
```

**Business Rules:**
- Cannot suspend self
- Cannot suspend last active admin

**Response:** `200 OK` — Updated User object

**Errors:** `400` Validation · `403` Cannot suspend self/last admin · `404` Not found

---

## Dashboard

### `GET /api/dashboard/stats` — Get Dashboard Statistics
**Roles:** All authenticated users

**Response:** `200 OK`
```json
{
  "totalPatients": 0,
  "activeEncounters": 0,
  "pendingTasks": 0,
  "todayEncounters": 0
}
```

---

### `GET /api/dashboard/flow` — Get Patient Flow Board
**Roles:** All authenticated users

> Powers the patient flow board: "where is every patient right now?".
> Returns all encounters that are **not** terminal, plus today's completed encounters.

**Response:** `200 OK`
```json
[
  {
    "id": "uuidv7",
    "patient_id": "uuid",
    "patient_name": "string",
    "status": "scheduled | checked_in | in_progress | completed",
    "phase": "string | null",
    "assigned_to": "text | null",
    "assigned_to_name": "string | null",
    "scheduled_time": "timestamp | null",
    "updated_at": "timestamp",
    "task_count": 0,
    "task_done_count": 0,
    "task_blocking_open_count": 0
  }
]
```

**Notes:**
- `task_count` / `task_done_count` / `task_blocking_open_count` are aggregate counts across the encounter's tasks.
- Ordered by `status` then `scheduled_time` ascending.

---

## Status Type Mappings (Frontend)

| Entity Field | API Value | Design System Status |
|-------------|-----------|---------------------|
| Encounter `scheduled` | `scheduled` | `waiting` |
| Encounter `checked_in` | `checked_in` | `waiting` |
| Encounter `in_progress` | `in_progress` | `in_progress` |
| Encounter `completed` | `completed` | `ready` |
| Encounter `cancelled` | `cancelled` | `delayed` |
| Encounter `no_show` | `no_show` | `delayed` |
| Task `todo` | `todo` | `waiting` |
| Task `in_progress` | `in_progress` | `in_progress` |
| Task `done` | `done` | `ready` |
| Priority `high` | `high` | `delayed` |
| Priority `medium` | `medium` | `waiting` |
| Priority `low` | `low` | `ready` |

---

## Audit Log

Audit logging is performed server-side by `AuditService.record()`. Read access is
served by these endpoints (all require authentication via `AuthGuard`; the user
collection is admin-only via `RolesGuard`):

| Endpoint | Returns | Roles |
|----------|---------|-------|
| `GET /api/audit/patient/:id` | Every event concerning the patient: the patient itself, **all its encounters, and all tasks on those encounters** | `admin`, `provider`, `clinical_staff` |
| `GET /api/audit/encounter/:id` | The encounter's own events plus **every task event on that encounter** | All authenticated |
| `GET /api/audit/task/:id` | Events targeting that task | All authenticated |
| `GET /api/audit/user/:id` | Audit logs authored by a user | `admin` only |
| `GET /api/audit/users` | All `resource_type='user'` logs (provisioning/access events) | `admin` only |

**Scoping:** the patient and encounter endpoints read the denormalized
`audit_log.patient_id` / `encounter_id` columns rather than matching
`resource_type`. Matching on the target type alone cannot return a patient's
encounters or tasks, because those rows name `encounter`/`task` as the target and
carry no reference to the patient.

**Patient history is restricted to clinical roles.** `front_desk` is excluded
because the response includes `diff` payloads that can contain fields from the
patient `medical` section, which `front_desk` cannot read on the patient record
itself (see the read visibility matrix). The client hides the Activity tab for
those roles accordingly.

**Note:** `GET /api/audit/encounter/:id` and `/task/:id` remain open to all
authenticated roles and may include encounter `notes` / task `description` diffs.

**Action naming convention:** `entity.verb` (e.g., `patient.created`, `encounter.updated`, `task.deleted`)

**User-specific actions:**
| Action | When |
|--------|------|
| `user.created` | Admin provisioned an account via `POST /api/users` |
| `user.registered` | A user self-registered via Google. Written by a Better Auth `databaseHooks.user.create.after` hook, since signup bypasses every service |
| `user.role_changed` | Role or title changed via `PATCH /api/users/:id` |
| `user.status_changed` | Status changed via `PATCH /api/users/:id/status` |
| `admin.seeded` | `ADMIN_EMAIL` promoted on startup |
| `admin.bootstrapped` | First admin created by `pnpm run db:create-admin` |

**Encounter-specific actions:**
| Action | When |
|--------|------|
| `encounter.created` | Encounter created |
| `encounter.updated` | Non-phase field changed |
| `encounter.phase_changed` | `phase` field changed (see ADR 0008) |
| `encounter.deleted` | Encounter deleted |

**Diff format:** `{ "field": { "from": oldValue, "to": newValue } }`

**Snapshots:** create events record the created values as
`{ "field": { "from": null, "to": value } }` and delete events record
`{ "field": { "from": value, "to": null } }`, so a creation or deletion shows what
was created or removed instead of rendering as an empty entry. The tracked fields
are the same ones used for update diffs (e.g. encounters: `status`, `phase`,
`assigned_to`, `scheduled_time`, `notes`).

**Actor attribution:** each entry stores `actor_name`, a snapshot of the acting
user's name at write time, in addition to `actor_user_id`. This keeps the timeline
readable after a rename and when the actor's account has been suspended or
deleted — the assignable-staff lookup the client uses excludes those accounts.
