# CASL v7 Ability API Migration

**Date:** 2026-08-11  
**Status:** decided  
**Relates to:** [0007](./0007-casl-authorization-implementation.md)

## Problem

ADR 0007 chose CASL for backend authorization and implemented it using the `@casl/ability` v6 API. The installed package is `@casl/ability@7.0.1`, where `PureAbility` and `AbilityClass` were removed (renamed to `Ability` and replaced by the `createMongoAbility` factory, respectively). The original `ability.ts` imported them as **runtime values**:

```typescript
import { AbilityBuilder, PureAbility, AbilityClass } from '@casl/ability';

export type AppAbility = PureAbility<[Actions, Subjects]>;
export const AppAbility = PureAbility as AbilityClass<AppAbility>;   // undefined at runtime in v7
```

Because `nest start --watch` uses SWC (which strips types without type-checking), the non-existent imports compiled silently and only failed at runtime. Every request to a `CaslGuard`-protected route crashed inside `AbilityBuilder.build()` with:

```
Cannot read properties of undefined (reading 'prototype')
```

This surfaced as a `500 INTERNAL_ERROR` on `POST /api/patients` (and every other CASL-guarded endpoint). The error appeared *before* `ValidationPipe` ran, because NestJS executes guards before pipes — so even invalid payloads produced the same 500 instead of a 400.

## Decision

Migrate `apps/api/src/core/auth/ability.ts` to the `@casl/ability` v7 API:

- **Type:** `AppAbility` is now `MongoAbility<[Actions, Subjects]>` (was `PureAbility<...>`).
- **Factory:** `AbilityBuilder` is constructed with `createMongoAbility` (a factory function) instead of the removed `AppAbility` class const.
- **Removed:** the `export const AppAbility = PureAbility as AbilityClass<AppAbility>;` line — it was a v6 pattern made obsolete by the factory approach, and nothing imported it as a runtime value (all 34 references across the codebase are type positions).

```typescript
import { AbilityBuilder, MongoAbility, createMongoAbility } from '@casl/ability';

export type AppAbility = MongoAbility<[Actions, Subjects]>;

export function defineAbilitiesFor(user: User): AppAbility {
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(createMongoAbility);
  // ... switch (user.role) unchanged ...
  return build();
}
```

No other files changed. `CaslGuard`, the `@Ability()` decorator, and all three services (`patients`, `encounters`, `tasks`) only use the `AppAbility` *type* and `ability.can()` — both unchanged in v7.

## Rationale

1. **Preserves ADR 0007's architecture.** The centralized `defineAbilitiesFor` + guard-attaches-ability + `ability.can()` pattern is untouched. This is a library API migration, not an authorization redesign.

2. **`MongoAbility` over plain `Ability` for future-proofing.** The app currently uses only `ability.can(action, subject)` — no conditions, no fields. Plain `Ability` would suffice today. But ADR 0007 rationale #7 explicitly anticipates attribute-based rules (e.g., "providers can update only encounters they own", currently faked via a service ownership check). `MongoAbility` wires in `mongoQueryMatcher` + `fieldPatternMatcher`, so a future migration of that ownership check into a CASL condition (`{ assignedTo: user.id }`) needs no further plumbing change.

3. **`createMongoAbility` is the idiomatic v7 pattern.** The official v7 docs show `new AbilityBuilder(createMongoAbility)` in the `AbilityBuilder` constructor example. `AbilityBuilder` accepts either a class or a factory (`AbilityFactory = AnyClass<T> | ((rules?, options?) => T)`); at runtime `build()` checks `this._.prototype.possibleRulesFor` and takes the factory branch for `createMongoAbility`.

4. **Minimal blast radius.** One file, four lines changed. The entire `switch (user.role)` rule body is byte-for-byte identical — no risk of accidentally altering permissions.

## Consequences

- **Positive:** All CASL-guarded routes (`patients`, `encounters`, `tasks`) now function at runtime. `POST /api/patients` returns `201` for `clinical_staff`/`admin` and `403` for `front_desk`, as designed in ADR 0007.
- **Positive:** `ValidationPipe` now runs for CASL-guarded routes — invalid payloads return `400 VALIDATION_ERROR` instead of being pre-empted by the guard crash.
- **Positive:** `pnpm --filter patient-flow-api build` (which runs `tsc`) passes, closing the SWC blind spot for this file.
- **Negative:** Developers must use the v7 import names (`MongoAbility`, `createMongoAbility`) when extending `ability.ts` — the old `PureAbility`/`AbilityClass` names no longer exist.
- **Neutral:** ADR 0007's design (resource-level permissions in CASL, field-level permissions in `PatientsService.assertCanWrite()`) is unchanged. This ADR only documents the API surface migration.

## Verification

- `pnpm --filter patient-flow-api build` completes without errors.
- `POST /api/patients` with a valid payload as `clinical_staff` or `admin` → `201` with role-filtered patient body.
- `POST /api/patients` as `front_desk` → `403` ("You are not allowed to create patients") — confirms CASL still enforces.
- `GET /api/patients` as any role → `200` (was `500` before the fix, since `CaslGuard` runs on every guarded route).
- Invalid payload (e.g. `identity.country_national: 'ZZ'`) → `400 VALIDATION_ERROR` — confirms the guard no longer pre-empts the pipe.

## Further Considerations

- **CI type-check gap.** `nest start --watch` uses SWC (no type-checking), which is why the bad import ran silently. Adding `pnpm --filter patient-flow-api build` (or `tsc --noEmit`) as a CI gate would catch similar issues earlier. Tracked separately, not part of this ADR.
