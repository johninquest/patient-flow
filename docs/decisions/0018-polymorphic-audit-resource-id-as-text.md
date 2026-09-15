# Polymorphic `audit_log.resource_id` Must Be `text`, Not `uuid`

**Date:** 2026-09-15  
**Status:** decided  
**Relates to:** [0001](./0001-text-fk-for-better-auth-user-id.md), [0017](./0017-better-auth-admin-plugin-for-staff-provisioning.md)

## Problem

Found while verifying ADR 0017. `audit_log.resource_id` was declared
`uuid('resource_id').notNull()`, but the column is **polymorphic** — it holds
the ID of whichever resource an entry concerns:

| `resource_type` | `resource_id` type |
|---|---|
| `patient`, `encounter`, `task` | `uuidv7()` — genuinely a UUID |
| `user` | Better Auth **nanoid text** (e.g. `jeeAAbOv47oX5BDQP05E2OAzXfG0QZs1`) |

Since Better Auth user IDs are not UUIDs, **every audit entry with
`resource_type = 'user'` failed**:

```
invalid input syntax for type uuid: "jeeAAbOv47oX5BDQP05E2OAzXfG0QZs1"
```

Affected actions: `user.created`, `admin.seeded`, `admin.bootstrapped`,
`user.role_changed`, `user.status_changed`.

This went unnoticed for a long time because `AuditService.record()` deliberately
swallows errors ("audit failures should not break the main operation"). Every
one of those writes raised an exception that was caught and logged, so the
failures were invisible and the Staff page's audit tab was simply empty for user
events. It also meant the project's mandate that "every mutation calls
`AuditService.record()`" was being satisfied *nominally* but not *actually* for
all user mutations.

ADR 0001 already established that Better Auth uses text IDs by convention and
converted the `user.id` **foreign keys** from `uuid` to `text` accordingly. It
missed this column, because the column is not an FK and its UUID-ness looks
correct when you only consider the business entities.

## Decision

Change the column to `text`:

```ts
// Polymorphic, so it cannot be `uuid`: it holds uuidv7 IDs for business
// entities and Better Auth's nanoid text IDs for `user` resources.
resource_id: text('resource_id').notNull(),
```

Migration (lossless — a UUID's text form is still a valid UUID string):

```sql
ALTER TABLE "audit_log" ALTER COLUMN "resource_id" SET DATA TYPE text;
```

The error swallow in `AuditService.record()` is retained deliberately: audit
logging must never break the primary operation. That makes silent failure a
standing risk, so the mitigation is the type being correct plus the existing
index on `(resource_type, resource_id)`, which continues to work on `text`.

The `createAuditLogSchema` DTO's `resource_id` changes from `z.uuid()` to
`z.string()` to match.

## Rationale

1. **`text` is the only correct type for a polymorphic column.** It must be able
   to hold both a UUID rendering and a nanoid. Any narrower type is wrong for
   at least one resource type.
2. **Consistent with ADR 0001's reasoning.** That ADR accepted text IDs because
   "we cannot change Better Auth's convention without fighting the library". The
   same applies to any column that must store a `user.id`.
3. **Lossless and cheap.** `uuid -> text` is a widening cast. No data
   transformation, no rewrite risk, and UUID values remain comparable and
   still work with the existing composite index.
4. **Do not convert the column to `uuid` and cast on write.** That would push a
   `::uuid` cast into every query and still be unable to store Better Auth IDs.

## Consequences

- **Positive:** user-resource audit entries (creation, seeding, role changes,
  status changes) are now actually persisted. The Staff audit tab has data.
- **Positive:** the bootstrap script (`db:create-admin`) completes, since its
  audit insert previously failed after the user had been created.
- **Trade-off:** the column no longer self-documents its type, so it cannot
  enforce UUID-ness for business entities. That check moves to the DTO, which is
  an application-level concern rather than a database constraint — acceptable
  for an internal, append-only audit table.
- **Process note:** a swallowed error hid a total feature failure. Consider
  counting or surfacing audit-write failures (a metric or a startup health
  check) so the next such failure is visible.
- **Provisioning note:** the dev database was created with `drizzle-kit push`,
  so `drizzle.__drizzle_migrations` is empty and `db:migrate` fails trying to
  replay `0000`. Apply here with `db:push`.
