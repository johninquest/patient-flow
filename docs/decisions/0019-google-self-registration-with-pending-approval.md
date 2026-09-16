# Google Self-Registration with Pending Access Approval

**Date:** 2026-09-16
**Status:** decided
**Relates to:** [0007](./0007-casl-authorization-implementation.md), [0017](./0017-better-auth-admin-plugin-for-staff-provisioning.md), [0018](./0018-polymorphic-audit-resource-id-as-text.md)

## Problem

Staff accounts could only be created by an admin (`POST /api/users`) or by the
bootstrap script. Google sign-in was wired up in the UI but could never work for
a new person, because ADR 0017 set `disableImplicitSignUp: true` on the Google
provider to stop self-provisioning.

The requirement is the opposite: new staff should be able to register themselves
with their Google account, but must not gain any access until an admin approves
them. An admin then sees them as staff with no role and assigns one.

Three things blocked this, and one was a security hole:

1. **No "no access" role existed.** `user.role` was `NOT NULL DEFAULT 'front_desk'`
   and the admin plugin was configured `admin({ defaultRole: 'front_desk' })`.
   Simply enabling Google signup would have handed every new registrant **full
   Front Desk access** — the exact opposite of a waiting room.
2. **Two endpoints were protected by `AuthGuard` alone** — the dashboard
   (`/api/dashboard/*`) and `GET /api/users/assignable`. Neither applied
   `CaslGuard` or `RolesGuard`, so any authenticated user could read them
   regardless of role.
3. **The client's Google button was broken.** It navigated to
   `GET /api/auth/sign-in/google`, which Better Auth does not serve. Social
   sign-in is `POST /api/auth/sign-in/social`, which returns an authorization
   URL for the client to follow.

## Decision

Introduce a fifth role, **`pending`**, meaning *authenticated but granted
nothing*, and make it the default for every creation path that does not set a
role explicitly.

- **`pending` is a role, not a `status` value.** It reuses CASL's existing
  `default:` branch, which already returns an **empty ability** for unrecognised
  roles, and the existing `PATCH /api/users/:id` flow — so no new endpoint, no
  new permission model, and no change to the `suspended` mechanism.
- **The default flips to fail-closed.** `user.role` defaults to `'pending'` in
  the schema, and `admin({ defaultRole: 'pending' })` matches it. A user created
  by any path that forgets to set a role now gets nothing instead of Front Desk.
- **Enforcement lives in `AuthGuard`, not in controllers.** After the suspended
  check, the guard rejects `role === 'pending'` with `403`. This is the only
  place that cannot be forgotten, and it closes the dashboard and
  `/users/assignable` gaps in one edit rather than two.
- **Two role vocabularies, deliberately separate** (`core/auth/roles.ts`):
  `ASSIGNABLE_ROLES` (the four real roles) for *creating* a user, and `ALL_ROLES`
  (plus `pending`) for *updating* one. An admin can revoke access by setting a
  user back to `pending`, but cannot mint a pending user from the "New Staff"
  modal — that would just produce a broken account.
- **`pending` users are hidden from assign-to pickers** (`findAssignable()`),
  because assigning work to someone who cannot act on it creates tasks nobody
  can progress. `findAll()` still returns them so admins can grant access.
- **Google implicit sign-up is enabled**, with the `hd` Workspace-domain
  restriction left commented out in `auth.ts` so it can be switched on later
  without a code change. Email/password sign-up stays disabled.
- **Self-registration is audited** via a `databaseHooks.user.create.after` hook
  writing `user.registered`. Signup bypasses every service, so a hook is the
  only place that observes it.

## Rationale

**Why a role rather than a `status`?** `status` already means "may this account
be used at all" and is enforced as a hard block. A pending user is not blocked —
they are signed in, and the client needs to route them somewhere specific. Making
it a role also means the existing role-assignment endpoint and audit trail work
unchanged, and CASL's empty-ability default gives correct behaviour for free.

**Why enforce in the guard?** The alternative — adding `RolesGuard` to the
dashboard and assignable endpoints — fixes today's two gaps but leaves the next
`AuthGuard`-only endpoint exposed. Putting the check where every protected route
already passes through makes the safe behaviour the default.

**Why keep `pending` out of the create schema?** The two vocabularies exist
because the two operations have different intents. Creating a user is an act of
granting access; updating a role is an act of managing it, which includes
revoking. Collapsing them would let an admin accidentally create an unusable
account.

**Why open signup rather than a domain restriction?** Chosen deliberately for
now: the admin approval step is the real gate, and a pending user can reach
nothing. The `hd` option is documented in place so a Workspace restriction can be
added if spam registrations become a problem.

**Accepted trade-off:** any Google account on the internet can create a `pending`
row, which an admin must then ignore or suspend. This is bounded — a pending user
has no read access to any data — but it does mean the staff list can accumulate
unwanted entries.

**Note on account linking:** Better Auth's implicit linking remains enabled, so a
Google sign-in whose email matches an existing password account links to that
user rather than creating a second one. This is intentional (staff can add Google
to an account an admin already provisioned), but it means a self-registration
with a known staff email does not produce a new pending user.
