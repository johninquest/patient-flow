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
| Validation | `class-validator` + `class-transformer` — `whitelist: true`, `forbidNonWhitelisted: true` |
| Audit | Every mutation logged via `AuditService.record()` with action format `entity.verb` |
| Roles | `admin`, `provider`, `clinical_staff`, `front_desk` |

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
  "address": { "street": "string", "postal_code": "string", "city": "string", "country": "string" } (optional),
  "identity": { "document_type": "string", "country_national": "string", "scanned_document": "boolean" } (optional),
  "financials": { "health_insurance": "string", "reimbursement": "string" } (optional),
  "emergency_contact": { "name": "string", "relation": "string", "phone": "string", "email": "string", "comments": "string" } (optional),
  "medical_history": "string (optional)",
  "medical_history_date": "ISO 8601 date (optional)",
  "physicians": { "attending": "string", "correspondent": "string", "other": "string" } (optional),
  "transport_logistics": { "modes": { "public": "string", "taxi": "string", "ambulance": "string" }, "comments": "string" } (optional),
  "notes": "string (optional)"
}
```

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
  "financials": "{ health_insurance, reimbursement } | null",
  "emergency_contact": "{ name, relation, phone, email, comments } | null",
  "medical_history": "string | null",
  "medical_history_date": "timestamp | null",
  "physicians": "{ attending, correspondent, other } | null",
  "transport_logistics": "{ modes: { public, taxi, ambulance }, comments } | null",
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
  "address": { "street": "string", "postal_code": "string", "city": "string", "country": "string" } (optional),
  "identity": { "document_type": "string", "country_national": "string", "scanned_document": "boolean" } (optional),
  "financials": { "health_insurance": "string", "reimbursement": "string" } (optional),
  "emergency_contact": { "name": "string", "relation": "string", "phone": "string", "email": "string", "comments": "string" } (optional),
  "medical_history": "string (optional)",
  "medical_history_date": "ISO 8601 date (optional)",
  "physicians": { "attending": "string", "correspondent": "string", "other": "string" } (optional),
  "transport_logistics": { "modes": { "public": "string", "taxi": "string", "ambulance": "string" }, "comments": "string" } (optional),
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

**Request:**
```json
{
  "patient_id": "uuid (required)",
  "assigned_to": "text user ID (optional)",
  "scheduled_time": "ISO 8601 datetime (optional)",
  "notes": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuidv7",
  "patient_id": "uuid",
  "status": "scheduled",
  "assigned_to": "text | null",
  "scheduled_time": "timestamp | null",
  "notes": "string | null",
  "version": 0,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errors:** `400` Validation · `404` Patient not found

---

### `GET /api/encounters` — List All Encounters
**Roles:** All authenticated users

**Response:** `200 OK` — Array of Encounter objects

---

### `GET /api/encounters/:id` — Get Encounter by ID
**Roles:** All authenticated users

**Response:** `200 OK` — Encounter object

**Errors:** `404` Encounter not found

---

### `PUT /api/encounters/:id` — Update Encounter
**Roles:** All authenticated users (ownership lock enforced)

**Request:** All fields optional:
```json
{
  "status": "string (optional) — one of: scheduled, checked_in, in_progress, completed, cancelled",
  "assigned_to": "text user ID (optional)",
  "scheduled_time": "ISO 8601 datetime (optional)",
  "notes": "string (optional)"
}
```

**Status Transition Rules (FSM):**
```
scheduled   → checked_in, cancelled
checked_in  → in_progress, cancelled
in_progress → completed, cancelled
completed   → (terminal)
cancelled   → (terminal)
```

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
  "priority": "string (optional) — one of: low, medium, high. Default: low",
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
  "title": "string",
  "description": "string | null",
  "status": "todo",
  "priority": "low",
  "assigned_user_id": "text | null",
  "assigned_role": "string | null",
  "blocking": false,
  "due_at": "timestamp | null",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

**Errors:** `400` Validation · `404` Encounter not found

---

### `GET /api/tasks` — List All Tasks (with optional filter)
**Roles:** All authenticated users

**Query Parameters:**
| Param | Type | Description |
|-------|------|-------------|
| `encounter_id` | uuid | Filter tasks by encounter |

**Response:** `200 OK` — Array of Task objects

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

**Response:** `201 Created` — User object (no password returned)

**Errors:** `400` Validation · `403` Not admin · `409` Email already exists

---

### `GET /api/users` — List All Users
**Roles:** `admin` only

**Response:** `200 OK` — Array of User objects

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
  "role": "string (optional) — admin, provider, clinical_staff, front_desk",
  "title": "string (optional)"
}
```

**Business Rules:**
- Cannot demote self
- Cannot demote last remaining admin

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

## Status Type Mappings (Frontend)

| Entity Field | API Value | Design System Status |
|-------------|-----------|---------------------|
| Encounter `scheduled` | `scheduled` | `waiting` |
| Encounter `checked_in` | `checked_in` | `waiting` |
| Encounter `in_progress` | `in_progress` | `in_progress` |
| Encounter `completed` | `completed` | `ready` |
| Encounter `cancelled` | `cancelled` | `delayed` |
| Task `todo` | `todo` | `waiting` |
| Task `in_progress` | `in_progress` | `in_progress` |
| Task `done` | `done` | `ready` |
| Priority `high` | `high` | `delayed` |
| Priority `medium` | `medium` | `waiting` |
| Priority `low` | `low` | `ready` |

---

## Audit Log (Internal Service)

> Audit logging is performed server-side by `AuditService.record()`. No public API endpoints expose audit logs in the current version.

**Action naming convention:** `entity.verb` (e.g., `patient.created`, `encounter.updated`, `task.deleted`, `encounter.status_changed`)

**Diff format:** `{ "field": { "from": oldValue, "to": newValue } }`
