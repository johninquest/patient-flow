# Plan: Patient Flow - Tech Migration and Copilot Automation Setup

## Decisions
- Frontend: React 19 + TypeScript + Vite 7 (CSR SPA, no Next.js)
- Styling: Tailwind CSS v4
- i18n: react-i18next + i18next (en + fr from day 1)
- Client state split: TanStack Query v5 for server state; React Context for auth/session state
- Routing: React Router v7 with lazy-loaded routes
- Backend: Keep NestJS auth/core patterns; replace current business domain modules
- API runtime: Node.js LTS (no Bun), npm package manager
- Database: PostgreSQL 18 in docker-compose for local dev
- API docs: Swagger/OpenAPI via @nestjs/swagger
- Multi-tenancy: deferred (single-org MVP)

## Scope
- Keep existing Better Auth integration and backend core design patterns
- Replace Svelte frontend with a fresh React/TS frontend
- Add database container to local Docker Compose
- Add Copilot customizations (instructions + prompts) to automate implementation quality

## What to keep from current codebase
- apps/api/src/core/auth (auth wiring, guard, decorator)
- apps/api/src/core/db/index.ts and auth-related schema tables
- apps/api/src/main.ts shell (update for Swagger as needed)
- Docker compose shell and env-file conventions
- Portable TS utilities from old client (types and pure validation helpers)

## What to discard/reset
- Existing domain modules under apps/api/src/modules/* (properties, units, tenants, rent, expenses, etc.)
- Existing drizzle migration history under drizzle/* (regenerate from new schema)
- Svelte client implementation under apps/client/src/* (except optional portable TS-only helpers)

## Phase 0 - Cleanup and baseline
1. Rename project metadata from Popaty to Patient Flow (README/package names/container names)
2. Remove old NestJS domain modules in apps/api/src/modules/*
3. Reset drizzle migrations (keep folder, regenerate from new schema)
4. Replace Svelte frontend implementation with React app skeleton

## Phase 1 - Infrastructure updates
1. Add postgres:18 service to docker-compose.yml with named volume
2. Optionally add pgAdmin service for local DB exploration
3. Update API container env/dependency wiring to use postgres service hostname
4. Keep production compose using managed external Postgres
5. Update .env.example defaults to local postgres service

## Phase 2 - Backend domain reset (NestJS + Drizzle)
1. Keep auth tables and add Patient Flow tables in apps/api/src/core/db/schema.ts:
- patients: id, names, dob, contact, notes, timestamps
- encounters: id, patient_id, workflow status, scheduled_time, notes, timestamps
- tasks: id, encounter_id, title/description, status, priority, assignees, blocking flag, due_at, timestamps
- audit_log: id, actor_id, action, entity_type, entity_id, changes jsonb, timestamp
2. Run npm run db:generate -> review SQL -> npm run db:migrate
3. Add Swagger setup in main.ts and expose /api/docs
4. Create modules: patients, encounters, tasks, audit
5. Use thin controller / service-heavy pattern and DTO validation decorators
6. Add audit logging on all mutation endpoints

## Phase 3 - Frontend rebuild (React)
1. Scaffold Vite React TypeScript app in apps/client/
2. Configure Tailwind CSS v4 and base design system tokens
3. Install core libs: react-router-dom@7, @tanstack/react-query@5, react-i18next, i18next, better-auth
4. Create centralized API client (credentials: include)
5. Implement auth context + useAuth hook + ProtectedRoute
6. Configure QueryClientProvider and feature query/mutation hooks
7. Wire i18n bootstrap and locale resources for en/fr
8. Build lazy routes for auth, dashboard, patients, encounters, tasks, settings
9. Implement shared UI primitives (Button, Modal, Table, FormInput, Alert, etc.)

## Phase 4 - Copilot automation artifacts
1. .github/instructions/api-module.instructions.md (for apps/api/src/modules/**)
- Enforce thin controllers, DTO validation, swagger decorators, audit logging, access checks
2. .github/instructions/drizzle-schema.instructions.md (for apps/api/src/core/db/schema.ts)
- Enforce uuidv7, migration workflow, no manual edits in drizzle/
3. .github/instructions/react.instructions.md (for apps/client/src/**)
- Enforce function components, TanStack Query for data fetching, i18n usage, Tailwind-only styling
4. .github/prompts/scaffold-api-module.prompt.md
5. .github/prompts/scaffold-react-feature.prompt.md
6. .github/prompts/generate-unit-tests.prompt.md
7. .github/prompts/add-swagger-decorators.prompt.md
8. Update AGENTS.md to reflect the new stack and workflows

## Verification checklist
1. docker-compose up brings API, client, and postgres:18 up successfully
2. npm run db:migrate succeeds
3. /api/docs loads Swagger with expected endpoints
4. Auth flow works cookie-based across protected routes
5. npm run build passes in client
6. npm test passes in api
7. Copilot scaffold prompts produce convention-compliant outputs

## Out of scope for this implementation round
- Multi-tenancy
- Intake forms
- Notifications
- Analytics/reporting
- Mobile apps
- EHR integrations
