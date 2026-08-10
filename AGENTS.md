# Patient Flow – AI Agent Instructions

**Patient Flow** is a lightweight patient workflow orchestration system for clinics and healthcare organizations. Stack: NestJS API + React client, PostgreSQL with Drizzle ORM, Better Auth.

## Project Layout

```
apps/
  api/        # NestJS backend (Node.js LTS, pnpm)
  client/     # React 18 + Vite 5 frontend (CSR SPA)
drizzle/    # Migration SQL files (generated, do not edit manually)
docs/
  decisions/  # Architecture Decision Records (ADRs)
```

## Commands

### API (`pnpm --filter patient-flow-api`)
| Task | Command |
|------|---------|
| Dev server | `pnpm run start:dev` |
| Build | `pnpm run build` |
| Unit tests | `pnpm test` |
| E2E tests | `pnpm run test:e2e` |
| Lint | `pnpm run lint` |
| Generate migration | `pnpm run db:generate` |
| Run migrations | `pnpm run db:migrate` |
| DB studio | `pnpm run db:studio` |

### Client (`pnpm --filter patient-flow-client`)
| Task | Command |
|------|---------|
| Dev server | `pnpm run dev` |
| Build | `pnpm run build` |
| Type check | `pnpm run check` |
| Lint | `pnpm run lint` |

### Docker (repo root)
```bash
docker-compose up            # Dev (API :3000, client :5173, postgres :5432)
docker-compose up -d         # Background
docker-compose exec api pnpm run db:migrate  # Run migrations inside container (api service)
docker-compose -f docker-compose.prod.yml up  # Production
```

> **Package manager**: This monorepo uses **pnpm** (pinned in `package.json#packageManager`).
> **Install policy**: Use `pnpm install --frozen-lockfile` for reproducible installs in CI, Docker, and after cloning. Use `pnpm install` or `pnpm add` only when intentionally updating dependencies locally. The root `.npmrc` enforces `minimumReleaseAge=10080` (7 days) to reduce supply-chain risk.

## Environment Variables

Configuration is split by responsibility:

1. **API environment** — copy `apps/api/.env.example` to `apps/api/.env` and fill in server-side variables:
   - `DATABASE_URL` – PostgreSQL connection string
   - `AUTH_SECRET` – random secret (generate: `openssl rand -base64 32`)
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` – Google OAuth
   - `API_URL` / `CLIENT_URL` – service URLs
   - `ADMIN_EMAIL` – user to promote to admin on startup
   - `PORT` – optional, defaults to `3000`

2. **Client environment** — copy `apps/client/.env.example` to `apps/client/.env` and fill in browser-safe variables:
   - `VITE_API_URL` – base URL of the API (must be accessible from the browser)

3. **Docker orchestration** — copy `.env.example` to `.env` at the repo root. This file is used only by Docker Compose and contains shared variables for the API and database containers:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - `API_URL`
   - `CLIENT_URL`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

## Architecture

### API (NestJS)

- **Entry**: `apps/api/src/main.ts`
- **Modules**: `apps/api/src/modules/` — each feature (patients, encounters, tasks, audit, user) is a self-contained NestJS module.
- **Database**: `apps/api/src/core/db/schema.ts` — single Drizzle schema file. All IDs are UUIDs generated with `uuidv7()`, **not** `gen_random_uuid()`.
- **Auth**: Better Auth via `apps/api/src/core/auth/auth.ts`. The `AuthGuard` resolves the session and attaches `request.user`. Use `@CurrentUser()` to access the user in controllers.
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
1. Create `apps/api/src/modules/<name>/` with `*.module.ts`, `*.controller.ts`, `*.service.ts`, and `dto/` folder.
2. Register in `apps/api/src/app.module.ts`.
3. All DB queries go in the service; controllers are thin.
4. Use `@Roles()` decorator + `RolesGuard` for role-based access control.
5. Log all mutations to the `audit_log` table via `AuditService.record()`.
6. Add Swagger decorators: `@ApiTags()`, `@ApiOperation()`, `@ApiResponse()`.

#### Database / Drizzle workflow
- Schema: `apps/api/src/core/db/schema.ts` (single file, do not split)
- After any schema change: `pnpm run db:generate` → review generated SQL → `pnpm run db:migrate`
- Never edit files in `drizzle/` manually.
- `drizzle.config.ts` references `./src/core/db/schema.ts` (note: path relative to `apps/api/`).

### Client (React)

- **CSR SPA**: Pure client-side rendered application using React 18 + Vite 5.
- **API client**: `apps/client/src/lib/api/client.ts` — centralized fetch wrapper with `credentials: 'include'` for cookie-based auth.
- **API URL**: resolved in `apps/client/src/lib/config.ts` — automatically switches between `localhost:3000` (dev) and production URL.
- **Auth**: Better Auth client-side SDK; auth state managed via React Context in `apps/client/src/hooks/useAuth.ts`.
- **Server state**: TanStack Query v5 for all API data fetching and caching.
- **i18n**: `apps/client/src/i18n/` — supported locales: `en`, `fr`. Always use `useTranslation()` hook for user-facing strings.
- **Design System**: Comprehensive component library in `apps/client/src/components/ui/` (Button, Card, StatusPill, MetricCard, FormInput, Modal, EmptyState, LoadingSpinner, Avatar). **Always use these instead of building custom UI.**
- **Design Tokens**: All colors, spacing, typography defined in `apps/client/src/index.css` via Tailwind v4 `@theme` directive. Use tokens (e.g., `text-primary`, `bg-canvas`, `status-ready-bg`), never hardcoded values.
- **Icons**: Use `@heroicons/react` only. Outline icons for navigation, solid for active states. Never inline SVGs.
- **Styling**: Tailwind CSS v4 only — no inline styles, no CSS modules.
- **Accessibility**: WCAG AA compliance. Status indicators must include icon + label (never color alone). All list views need empty/loading/error states.
- **Responsive**: Mobile-first. Bottom tab bar on mobile (<1024px), sidebar on desktop (≥1024px).

#### React feature pattern
```
features/<name>/
  <Name>ListPage.tsx       # List view (default export for lazy loading)
  <Name>DetailPage.tsx     # Detail view
  <Name>Form.tsx           # Create/edit form
  <Name>Card.tsx           # Card/list item component
  index.ts                 # Public exports
```
r/index.tsx`

#### Design System Components

Located in `apps/client/src/components/ui/`:
- **Button** — Primary, secondary, ghost, danger variants with loading states
- **Card** — Container with surface background and border
- **StatusPill** — Status indicators with icon + label (never color alone)
- **MetricCard** — Dashboard metric display with label, value, icon, link
- **FormInput** — Form field with label, input, error, help text
- **Modal** — Accessible modal with focus trap
- **EmptyState** — Empty list/view state with icon, title, description, action
- **LoadingSpinner** — Loading indicator with optional text
- **Avatar** — User initials with status-based coloring

Import pattern:
```typescript
import { Button, Card, StatusPill } from '../components/ui';
```

#### Status Mapping

Map entity statuses to design system status types:
- Encounter `scheduled`/`checked_in` → `waiting`
- Encounter `in_progress` → `in_progress`
- Encounter `completed` → `ready`
- Encounter `cancelled` → `delayed`
- Task `todo` → `waiting`
- Task `in_progress` → `in_progress`
- Task `done` → `ready`
- Priority `high` → `delayed`
- Priority `medium` → `waiting`
- Priority `low` → `ready
#### Routing
- All routes lazy-loaded with `React.lazy()` + `Suspense`
- Protected routes wrapped in `ProtectedRoute` component
- Route definitions in `apps/client/src/routes/AppRoutes.tsx`

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
- Migrations must be run manually after deploy: `docker-compose exec api pnpm run db:migrate`.
