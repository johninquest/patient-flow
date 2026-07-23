# CASL Authorization Implementation

**Date:** 2026-07-24  
**Status:** decided

## Problem

The application needed a robust, maintainable authorization system to enforce role-based access control across multiple resources (patients, encounters, tasks, users). The existing approach used scattered permission checks throughout controllers and services, leading to:

1. **Inconsistent enforcement** — permission logic was duplicated across endpoints with slight variations
2. **Poor auditability** — compliance teams couldn't easily review who can do what without reading scattered code
3. **Maintenance burden** — adding new roles or changing permissions required updates in multiple files
4. **Limited expressiveness** — complex rules like "providers can only update encounters they own" required custom logic in each service

The system needed a centralized, declarative authorization layer that is easy to audit, maintain, and extend as business rules evolve.

## Decision

Implement **CASL (Common Ability Specification Library)** for backend authorization. Define all permissions in a single `ability.ts` file using declarative rules. Create a `CaslGuard` to attach the ability object to requests. Use `ability.can()` checks in services to enforce permissions.

### Implementation

**Backend (API):**
- Install `@casl/ability` package
- Create `api/src/core/auth/ability.ts` with:
  - `AppAbility` type definition
  - `defineAbilitiesFor(user)` function that builds ability based on user role
  - Role-based rules:
    - **admin**: `can('manage', 'all')` — full access
    - **provider**: read all patients, update own encounters, manage tasks
    - **clinical_staff**: create/read/update patients and encounters, manage tasks
    - **front_desk**: read patients, update demographics, manage encounters and tasks
- Create `api/src/core/auth/guards/casl.guard.ts` — attaches `request.ability` after AuthGuard
- Create `api/src/core/auth/decorators/ability.decorator.ts` — `@Ability()` parameter decorator
- Update all controllers to use `@UseGuards(AuthGuard, CaslGuard)`
- Update all services to accept `ability: AppAbility` parameter and check `ability.can()` before operations
- Replace hardcoded role checks (e.g., `if (userRole !== 'admin')`) with CASL checks

**Integration Pattern:**
```typescript
// Controller
@UseGuards(AuthGuard, CaslGuard)
@Post()
create(@Body() dto, @CurrentUser() user, @Ability() ability) {
  return this.service.create(dto, user.id, user.role, ability);
}

// Service
async create(dto, userId, userRole, ability: AppAbility) {
  if (!ability.can('create', 'Patient')) {
    throw new ForbiddenException('You are not allowed to create patients');
  }
  // ... business logic
}
```

### Field-Level Permissions

Patient field-level write permissions (from ADR 0004) remain enforced in `PatientsService.assertCanWrite()` using the existing `PATIENT_WRITE_VISIBILITY` matrix. CASL handles resource-level permissions (can create/update/delete), while the service handles field-level permissions (which sections can be written).

## Rationale

1. **Centralized policy.** All authorization rules live in one file (`ability.ts`), making it easy for compliance teams to audit who can do what without searching through the codebase.

2. **Declarative syntax.** CASL's `can('action', 'Subject')` syntax is more readable than scattered `if (userRole === 'admin')` checks. Rules are self-documenting.

3. **Backend-only scope.** CASL is used only on the backend, avoiding the complexity of syncing frontend/backend abilities. The frontend continues to use role-based conditional rendering for UX, while the backend is the authority.

4. **Performance is negligible.** Building an ability object takes microseconds. For simple rules like Patient Flow's, the overhead is <1% of request time. CASL is used in production by companies handling millions of requests.

5. **Tool-agnostic.** CASL is a library, not a framework. Rules are defined in our code, not locked into a proprietary system. If we need to migrate to Casbin, Oso, or a custom solution later, the business logic (what each role can do) is separate from CASL syntax.

6. **Regulatory compliance.** In healthcare, authorization rules must be explicit and reviewable. CASL's declarative approach makes it easier to demonstrate compliance during audits.

7. **Future-proof.** CASL supports complex rules (attribute-based, relationship-based, dynamic permissions) that we may need later. Starting with CASL now avoids a future migration.

## Alternatives Considered

- **Keep scattered role checks.** Continue using `if (userRole !== 'admin')` in services. Rejected — poor auditability, inconsistent enforcement, maintenance burden.

- **CASL with frontend integration.** Use CASL on both backend and frontend to hide/show UI elements. Rejected — adds complexity (passing abilities to client, keeping rules in sync) without significant benefit. Role-based conditional rendering is sufficient for UX.

- **Casbin or Oso.** Use alternative authorization libraries. Rejected — CASL has better TypeScript integration, simpler API for our use case, and is more widely adopted in the Node.js ecosystem.

- **Database-level RLS (Row-Level Security).** Use PostgreSQL RLS policies to enforce tenant isolation. Rejected — explicitly deferred in AGENTS.md. RLS is complex to maintain and doesn't handle field-level permissions well.

- **Custom authorization service.** Build a custom `AuthorizationService` with methods like `canCreatePatient(user)`. Rejected — reinvents CASL, less expressive, harder to maintain.

## Consequences

- **Positive:** All authorization rules are centralized in `ability.ts` — easy to audit and maintain.
- **Positive:** Consistent enforcement pattern across all services — `ability.can()` checks replace scattered role checks.
- **Positive:** Adding new roles or permissions requires updating only `ability.ts` and relevant services.
- **Positive:** Compliance teams can review authorization rules in one place.
- **Positive:** Foundation for future complex rules (attribute-based, relationship-based) without architectural changes.
- **Negative:** Services now require an additional `ability` parameter, slightly increasing method signatures.
- **Negative:** Developers must understand CASL concepts (abilities, rules, conditions) — minor learning curve.
- **Neutral:** Field-level patient permissions still use the existing `PATIENT_WRITE_VISIBILITY` matrix. CASL handles resource-level permissions; the service handles field-level permissions. This separation is intentional and clear.

## Verification

- **Admin access:** Admin user can create/update/delete all resources (patients, encounters, tasks, users)
- **Provider access:** Provider can read all patients, create encounters, update own encounters, manage tasks, but cannot delete encounters or manage users
- **Clinical staff access:** Clinical staff can create/read/update patients and encounters, manage tasks, but cannot delete patients or manage users
- **Front desk access:** Front desk can read patients, update demographics (not medical), manage encounters and tasks, but cannot create patients or delete resources
- **Forbidden errors:** Attempting unauthorized actions returns `403 Forbidden` with clear error message (e.g., "You are not allowed to create patients")
- **Audit logs:** All mutations are still logged to `audit_log` table with actor, action, and diff
- **Build:** `npm run build` completes without errors in both API and client
