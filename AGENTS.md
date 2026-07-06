# Patient Flow – AI Agent Instructions

**Patient Flow** is a lightweight patient workflow orchestration system for clinics and healthcare organizations. Stack: NestJS API + React client, PostgreSQL with Drizzle ORM, Better Auth.

## Project Layout

```
api/        # NestJS backend (Node.js LTS, npm)
client/     # React 19 + Vite 7 frontend (CSR SPA)
drizzle/    # Migration SQL files (generated, do not edit manually)
docs/
  decisions/  # Architecture Decision Records (ADRs)
```

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
docker-compose exec api npm run db:migrate  # Run migrations inside container
docker-compose -f docker-compose.prod.yml up  # Production
```

> **Package manager**: Both API and client use **npm**.

## Environment Variables

Copy `.env.example` to `.env` at the repo root. Required vars:
- `DATABASE_URL` – PostgreSQL connection string
- `AUTH_SECRET` – random secret (generate: `openssl rand -base64 32`)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – Google OAuth
- `API_URL` / `CLIENT_URL` – service URLs

## Architecture

### API (NestJS)

- **Entry**: `api/src/main.ts`
- **Modules**: `api/src/modules/` — each feature (patients, encounters, tasks, audit, user) is a self-contained NestJS module.
- **Database**: `api/src/core/db/schema.ts` — single Drizzle schema file. All IDs are UUIDs generated with `uuidv7()`, **not** `gen_random_uuid()`.
- **Auth**: Better Auth via `api/src/core/auth/auth.ts`. The `AuthGuard` resolves the session and attaches `request.user`. Use `@CurrentUser()` to access the user in controllers.
- **Access control**: Role-based access control (RBAC) with four roles:
  - **admin** – full access: staff management, all data, configuration
  - **provider** – clinical access: own patients/encounters, clinical notes
  - **clinical_staff** – clinical support tasks, vitals, lab prep
  - **front_desk** – scheduling, intake, demographics; no clinical notes

#### Controller pattern
```ts
@Controller('resource')
@UseGuards(AuthGuard)          // Always at class level
@ApiTags('Resource')           // Swagger documentation
export class ResourceController {
  @Get()
  @ApiOperation({ summary: 'List all resources' })
  findAll(@CurrentUser() user: any) { ... }
}
```

#### Adding a new module
1. Create `api/src/modules/<name>/` with `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `dto/` folder.
2. Register in `api/src/app.module.ts`.
3. All DB queries go in the service; controllers are thin.
4. Use `@Roles()` decorator + `RolesGuard` for role-based access control.
5. Log all mutations to the `audit_log` table via `AuditService.record()`.
6. Add Swagger decorators: `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`.

#### Database / Drizzle workflow
- Schema: `api/src/core/db/schema.ts` (single file, do not split)
- After any schema change: `npm run db:generate` → review generated SQL → `npm run db:migrate`
- Never edit files in `drizzle/` manually.
- `drizzle.config.ts` references `./src/core/db/schema.ts` (note: path relative to `api/`).

### Client (React)

- **CSR SPA**: Pure client-side rendered application using React 19 + Vite 7.
- **API client**: `client/src/lib/api/client.ts` — centralized fetch wrapper with `credentials: 'include'` for cookie-based auth.
- **API URL**: resolved in `client/src/lib/config.ts` — automatically switches between `localhost:3000` (dev) and production URL.
- **Auth**: Better Auth client-side SDK; auth state managed via React Context in `client/src/hooks/useAuth.ts`.
- **Server state**: TanStack Query v5 for all API data fetching and caching.
- **i18n**: `client/src/i18n/` — supported locales: `en`, `fr`. Always use `useTranslation()` hook for user-facing strings.
- **Components**: `client/src/components/` — reusable UI primitives (Button, Modal, Table, FormInput, etc.). Prefer these over new one-off components.
- **Styling**: Tailwind CSS v4 only — no inline styles, no CSS modules.

#### React feature pattern
```
features/<name>/
  <Name>ListPage.tsx       # List view (default export for lazy loading)
  <Name>DetailPage.tsx     # Detail view
  <Name>Form.tsx           # Create/edit form
  <Name>Card.tsx           # Card/list item component
  index.ts                 # Public exports
```

#### Routing
- All routes lazy-loaded with `React.lazy()` + `Suspense`
- Protected routes wrapped in `ProtectedRoute` component
- Route definitions in `client/src/routes/AppRoutes.tsx`

## Core Entities

- **Patient** — id (uuidv7), first_name, last_name, date_of_birth, phone, email, address, notes, timestamps
- **Encounter** — id (uuidv7), patient_id, status (FSM), assigned_to (ownership lock), scheduled_time, notes, version (optimistic lock), timestamps
- **Task** — id (uuidv7), encounter_id, title, description, status (todo/in_progress/done), priority (low/medium/high), assigned_user_id, assigned_role, blocking, due_at, timestamps
- **Audit Log** — id (uuidv7), actor_user_id, actor_role, action, resource_type, resource_id, diff (jsonb), ip_address, created_at. **Append-only.**

## Workflow States (Encounter FSM)

`scheduled` → `checked_in` → `in_progress` → `completed` / `cancelled`

- Transition map in TypeScript (plain object, no library)
- Ownership lock via `assigned_to` — prevents another staff member from picking up an in-progress encounter
- Optimistic locking: `WHERE id = ? AND version = ?`
- Every transition logged to `audit_log`
- Admin role can override ownership

## Architecture Decision Records

Major architectural decisions are logged in `docs/decisions/` as lightweight ADRs.
- Use the `/log-architecture-decision` prompt to create a new ADR after a significant change.
- ADRs are numbered sequentially: `NNNN-short-description.md`.
- Format: Problem → Decision → Rationale (10-20 lines, lightweight).
- The `architecture-decision-reminder` instruction prompts Copilot to suggest logging a decision when it detects significant changes.

## Auth Flow

1. Browser → POST `/api/auth/sign-in` (or Google OAuth redirect) → Better Auth sets `session_token` cookie.
2. Every API request includes the cookie (`credentials: 'include'`).
3. `AuthGuard` calls `auth.api.getSession()` to validate; attaches `session.user` to `request.user`.
4. In production, cross-subdomain cookies are scoped to `.patientflow.app` — API on `api.patientflow.app`, client on `app.patientflow.app`.

## Production Deployment

- Traefik reverse proxy handles TLS termination and routing.
- API: `api.patientflow.app` → container port 3000.
- Client: `app.patientflow.app` → container port 3000 (Vite build output).
- Migrations must be run manually after deploy: `docker-compose exec api npm run db:migrate`.
