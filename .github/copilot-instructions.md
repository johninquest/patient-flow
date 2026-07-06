# Patient Flow — Copilot Instructions

## Project Identity

**Patient Flow** is a lightweight patient workflow orchestration system for clinics and healthcare organizations. It tracks patients through care stages, assigns tasks to staff, and ensures clear handoffs.

> This is a **coordination layer for patient movement and staff execution** — not a medical record system, not a billing system, not a full EHR.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | NestJS · Node.js LTS · npm |
| Database | PostgreSQL 18 · Drizzle ORM |
| Auth | Better Auth (basic — no org plugin) |
| Validation | class-validator + class-transformer |
| API Docs | @nestjs/swagger |
| Frontend | React 19 · TypeScript · Vite 7 (CSR SPA) |
| Styling | Tailwind CSS v4 |
| Server state | TanStack Query v5 |
| Client state | React Context (auth/session only) |
| Routing | React Router v7 (lazy routes) |
| i18n | react-i18next + i18next (en + fr) |

## Project Layout

```
api/
  src/
    core/
      auth/          # Better Auth wiring, AuthGuard, @CurrentUser()
      db/            # Drizzle schema (schema.ts) + connection (index.ts)
      common/        # Shared utilities (roles guard, access checks)
    modules/
      patients/      # Patient CRUD
      encounters/    # Encounter workflow + FSM
      tasks/         # Task management
      audit/         # Audit logging service
      user/          # User management + role assignment
client/
  src/
    components/      # Reusable UI primitives (Button, Modal, Table, etc.)
    features/        # Feature modules (patients, encounters, tasks, staff)
    hooks/           # Custom hooks (useAuth, query wrappers)
    lib/             # API client, config, utils, types
    routes/          # Lazy-loaded route components
    i18n/            # Translation files (en.json, fr.json)
docs/
  decisions/         # Architecture Decision Records (ADRs)
```

## Core Entities

- **Patient** — id (uuidv7), first_name, last_name, date_of_birth, phone, email, address, notes, timestamps
- **Encounter** — id (uuidv7), patient_id, status (FSM), assigned_to (ownership lock), scheduled_time, notes, version (optimistic lock), timestamps
- **Task** — id (uuidv7), encounter_id, title, description, status (todo/in_progress/done), priority (low/medium/high), assigned_user_id, assigned_role, blocking, due_at, timestamps
- **Audit Log** — id (uuidv7), actor_user_id, actor_role, action, resource_type, resource_id, diff (jsonb), ip_address, created_at. **Append-only.**

## User Roles

| Slug | Display Name | Scope |
|------|-------------|-------|
| `admin` | Admin | Full access: staff management, all data, configuration |
| `provider` | Provider | Clinical access: own patients/encounters, clinical notes |
| `clinical_staff` | Clinical Staff | Clinical support tasks, vitals, lab prep |
| `front_desk` | Front Desk | Scheduling, intake, demographics; no clinical notes |

## Workflow States (Encounter FSM)

`scheduled` → `checked_in` → `in_progress` → `completed` / `cancelled`

- Transition map in TypeScript (plain object, no library)
- Ownership lock via `assigned_to` — prevents another staff member from picking up an in-progress encounter
- Optimistic locking: `WHERE id = ? AND version = ?`
- Every transition logged to `audit_log`
- Admin role can override ownership

## Key Conventions

### Backend
- **Thin controllers, service-heavy** — controllers handle HTTP concerns only (guards, decorators, params). All business logic and DB queries in services.
- **AuthGuard + @CurrentUser()** — every protected endpoint uses `@UseGuards(AuthGuard)` at class level and `@CurrentUser()` to access the user.
- **RBAC** — `@Roles('admin', 'provider')` decorator + `RolesGuard` for role-based access control.
- **Audit logging** — every mutation (create/update/delete) calls `AuditService.record()`. Read audit for sensitive endpoints logged async.
- **DTOs** — all request bodies validated via class-validator DTOs. Create DTOs mark required fields, Update DTOs make everything `@IsOptional()`.
- **Swagger** — every endpoint documented with `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`.
- **Exceptions** — use NestJS built-in: `NotFoundException`, `ForbiddenException`, `BadRequestException`. Never return error objects.

### Database
- **All business entity IDs use `uuidv7()`** — `uuid("id").primaryKey().default(sql\`uuidv7()\`)`. Never `gen_random_uuid()`.
- **Auth tables use text IDs** — Better Auth convention for user/session/account/verification.
- **Timestamps** — `created_at` / `updated_at` with `.defaultNow().notNull()`.
- **Migration workflow** — schema change → `npm run db:generate` → review SQL → `npm run db:migrate`. Never edit files in `drizzle/` manually.
- **Table naming** — snake_case, plural (e.g., `patients`, `encounters`, `tasks`).

### Frontend
- **Function components only** — no class components.
- **TanStack Query** — all server state via `useQuery`/`useMutation`. No manual fetch/axios in components.
- **React Context** — auth/session state only. Everything else in TanStack Query or local state.
- **i18n everywhere** — all user-facing strings via `useTranslation()` hook. Never hardcode English text.
- **Tailwind CSS v4 only** — no inline styles, no CSS modules, no styled-components.
- **Lazy routes** — all feature routes lazy-loaded with `React.lazy()` + `Suspense`.

## Commands

### API (`cd api`)
| Task | Command |
|------|---------|
| Dev server | `npm run start:dev` |
| Build | `npm run build` |
| Unit tests | `npm test` |
| E2E tests | `npm run test:e2e` |
| Lint | `npm run lint` |
| Generate migration | `npm run db:generate` |
| Run migrations | `npm run db:migrate` |
| DB studio | `npm run db:studio` |

### Client (`cd client`)
| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npm run check` |
| Lint | `npm run lint` |

### Docker (repo root)
```bash
docker-compose up            # Dev (API :3000, client :5173, postgres :5432)
docker-compose up -d         # Background
```

## Scoped Instructions

For detailed patterns per area, see:
- `.github/instructions/api-module.instructions.md` — NestJS module patterns (applies to `api/src/modules/**`)
- `.github/instructions/drizzle-schema.instructions.md` — Database schema patterns (applies to `api/src/core/db/schema.ts`)
- `.github/instructions/react.instructions.md` — React component patterns (applies to `client/src/**`)
- `.github/instructions/architecture-decision-reminder.instructions.md` — Remind to log ADRs on significant changes (applies to `**`)

## Architecture Decision Records

Major architectural decisions are logged in `docs/decisions/` as lightweight ADRs.
- Use the `/log-architecture-decision` prompt to create a new ADR after a significant change.
- ADRs are numbered sequentially: `NNNN-short-description.md`.
- The `architecture-decision-reminder` instruction prompts Copilot to suggest logging a decision when it detects significant changes.

## Reusable Prompts

Common scaffolding tasks have dedicated prompts in `.github/prompts/`:
- `scaffold-api-module.prompt.md` — Generate a complete NestJS module
- `scaffold-react-feature.prompt.md` — Generate a React feature page
- `generate-unit-tests.prompt.md` — Generate service unit tests
- `add-swagger-decorators.prompt.md` — Audit and add Swagger decorators
- `log-architecture-decision.prompt.md` — Create an Architecture Decision Record

## Explicitly Deferred (Do Not Build)

- Better Auth organization plugin / multi-tenancy
- PostgreSQL RLS policies
- CASL authorization library
- Configurable workflow states per clinic
- XState / BPM engine workflow orchestration
- BullMQ job queue
- Multi-clinic staff membership / active-org switching
- Full EHR / billing / claims / medical coding
- Mobile apps
- EHR integrations
