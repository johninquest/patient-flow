# Better Auth Admin Plugin for Staff Provisioning

**Date:** 2026-09-15  
**Status:** decided  
**Relates to:** [0001](./0001-text-fk-for-better-auth-user-id.md), [0007](./0007-casl-authorization-implementation.md), [0012](./0012-casl-v7-ability-api-migration.md)

## Problem

`POST /api/users` returned `500 INTERNAL_ERROR` for every request:

```
auth.api.createUser is not a function
```

`UserService.createUser()` called `auth.api.createUser()`, but the Better Auth
instance in `core/auth/auth.ts` was configured with **no `plugins` array**.
`createUser` is contributed by the **admin plugin** (`better-auth/plugins`), so
the method never existed. The service and its `createUserSchema` were fully
built for staff provisioning; the auth instance had simply never been given the
capability.

This was invisible at compile time because `getAuth()` returned `any`, so
calling a non-existent endpoint type-checked cleanly and failed only at runtime.

Two further problems surfaced while fixing it:

1. **Privilege escalation.** `user.additionalFields.role` was declared without
   `input: false`, so `role` was writable through Better Auth's generic input
   routes. `POST /api/auth/sign-up/email` with `{"role":"admin"}` provisioned a
   working admin account, publicly, bypassing the Zod validation pipe entirely
   (the auth controller mounts `toNodeHandler(auth)` with no `@Body({schema})`).
2. **Staff provisioning was coupled to public self-signup.** The obvious
   alternative, `auth.api.signUpEmail`, is gated by
   `emailAndPassword.disableSignUp`. Using it would have permanently tied
   account creation to public signup staying open.

## Decision

Register the admin plugin and use it **purely as a user-provisioning API**:

```ts
plugins: [admin({ defaultRole: 'front_desk' })],
```

- **No `ac` and no `roles` are passed.** Authorization stays with CASL
  (`core/auth/ability.ts`). The plugin's access-control model is a flat
  `resource -> action[]` over string roles; it governs only the plugin's own
  `/admin/*` HTTP endpoints, which this app never calls — it invokes
  `auth.api.createUser` in-process from a service, behind `AuthGuard` and
  `RolesGuard`. CASL is kept because it supports **conditions** and
  **field-level** rules, which this app actually needs (the encounter ownership
  lock via `assigned_to`, and the `PATIENT_WRITE_VISIBILITY` matrix from ADRs
  0004/0005) — things the plugin's model cannot express.
- **`defaultRole: 'front_desk'` is mandatory.** The plugin declares `user.role`
  itself, and plugin schema fields are spread *after* `additionalFields`, so it
  **overrides** our declaration and its default. The plugin substitutes
  `"user"`, which is not one of our four roles, so `defineAbilitiesFor()` would
  hit its `default:` branch and return an **empty ability** — every provisioned
  staff member would be able to do nothing. `defaultRole` keeps "role is always
  a valid app role" an invariant rather than a convention.
- **`role` travels in the call's `data` field, not the top-level `role` param.**
  The plugin types that param as its built-in vocabulary (`"user" | "admin"`),
  which excludes ours. Both paths are read identically, and the plugin only
  validates against an allow-list when `roles` is configured — we configure
  none. `createUserSchema` (Zod, `USER_ROLES`) is the real validator.
- **`input: false` on `role` and `status`.** These are server-owned. This closes
  the escalation independently of which plugin happens to be installed.
- **`emailAndPassword.disableSignUp: true`**, with a new
  `db:create-admin` script as the bootstrap path. Google gets
  `disableImplicitSignUp: true` for the same reason.
- **`getAuth()` is now typed** (`ReturnType<typeof createAuth>`, via a
  dedicated `createAuth()` factory so the plugin-augmented endpoint types are
  *inferred* rather than erased). This is what makes a missing plugin endpoint a
  compile error instead of a 500.

`UserService.createUser()` consequently collapses to a **single write**: the
plugin creates the user row and links a `credential` account with a hashed
password, and accepts `role` and `title` in the same call. The previous
follow-up Drizzle `UPDATE` was deleted, so the "orphaned user if the second
write fails" scenario is unreachable rather than handled.

## Rationale

1. **The rules are enforced where they can actually express them.** CASL owns
   authorization; the plugin owns credential creation. Two flat role
   vocabularies would drift, so only one is used.
2. **`createUser` is ungated; `signUpEmail` is not.** Provisioning must not
   depend on public signup being enabled, which is exactly the state we wanted
   to move away from.
3. **Trusted internal call rather than an HTTP round trip.** `createUser` only
   enforces its own `hasPermission` check when a session is present, so the
   in-process call works without granting any plugin permission to the actor.
   The actor is still authorized by `RolesGuard` (`@Roles('admin')`).
4. **One write beats two.** Passing `role`/`title` in the create call removes a
   second write, its failure mode, and the rollback logic that failure would
   have required.
5. **Hand-rolling was rejected** — it would mean reimplementing Better Auth's
   account conventions (`providerId: 'credential'`, `accountId: user.id`), ID
   generation, and transactional atomicity.

## Consequences

- **Positive:** `POST /api/users` works; the `role` escalation is closed; public
  signup is closed; the first-admin path is explicit and scriptable; a missing
  plugin endpoint is now a compile error.
- **Cost:** four new columns (`user.banned`, `user.banReason`, `user.banExpires`,
  `session.impersonatedBy`) exist solely because the plugin validates its schema
  at startup. They are **unused** by app code — `status`
  (`active`/`suspended`) remains the single suspend mechanism, enforced by
  `AuthGuard`. Documented in `docs/contracts/schema.md` as plugin-owned.
- **Behaviour change:** `user.additionalFields.role.defaultValue` is no longer
  what the plugin's create hook writes; `defaultRole` is. The Drizzle column
  default (`'front_desk'`) still applies to direct inserts.
- **`db:setup` provisioning note:** the dev database was created with
  `drizzle-kit push`, so `drizzle.__drizzle_migrations` is empty while all
  tables exist. `db:migrate` therefore fails (it tries to replay `0000`).
  Use `db:push` there, or stamp the baseline. Fresh databases should use
  `db:migrate`.
