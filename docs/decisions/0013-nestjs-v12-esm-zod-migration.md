# NestJS v12 + Full ESM + Zod v4 Validation Migration

**Date:** 2026-09-14  
**Status:** decided

## Problem

The API was on NestJS v11, compiled as CommonJS, and validated request bodies with `class-validator` + `class-transformer` via the classic `ValidationPipe`. Three forces pushed for change:

1. **NestJS v12** (released July 2026) is the new supported baseline. It ships first-class support for the **Standard Schema** spec, meaning a schema library can be plugged in natively — which is exactly what the team wanted in order to drop the decorator-heavy DTO classes.
2. **ESM is the direction of the ecosystem.** Staying on CommonJS meant fighting `resolvePackageJsonExports`, `.js` extension mismatches, and `__dirname` shims indefinitely. Doing the module-format switch in the same change as the Nest major bump avoids paying two coordinated migrations.
3. **`class-validator` DTO classes are verbose and duplicate the schema.** Types had to be re-declared via `PartialType`/`OmitType`, validation messages were decorator arguments, and the inferred TS types never matched the runtime rules exactly.

## Decision

Migrate `apps/api` in one coordinated change:

- **NestJS v11 → v12** (`@nestjs/common|core|platform-express|swagger` → `^12.0.0`). Note `@nestjs/config` also jumped a major (4 → 12) to realign with the framework version line.
- **CommonJS → native ESM.** `"type": "module"`, tsconfig `module`/`moduleResolution: nodenext`, `.js` extensions on every relative import, `import.meta.dirname` instead of `__dirname`, and `start:prod` corrected to `node dist/src/main.js`.
- **`class-validator`/`class-transformer` → Zod v4** for all request DTOs. Controllers declare `@Body({ schema })`; a single global `StandardSchemaValidationPipe` enforces them. Zod v4 is required (not v3) because `zod-openapi@6` peers on `zod ^4.0.0`.
- **Strictness moves into the schema.** The Standard Schema pipe has **no** `whitelist`/`forbidNonWhitelisted` options, so every DTO schema ends in `.strict()` to preserve the "reject unknown keys" behaviour the old pipe provided.
- **Swagger is generated from the Zod schemas** via `zod-openapi`'s `createSchema`, wired through Nest's `standardSchemaConverter` option.
- **Jest → Vitest 3** for tests, using `unplugin-swc`.

## Rationale

**Why Zod + Standard Schema rather than staying with class-validator?** One artifact now serves as runtime validator, static type (via `z.infer`), and OpenAPI source (via `zod-openapi`). The old setup needed three parallel declarations that could drift. Zod v4 additionally gives `.strict()` as a schema-level guarantee that is visible at the call site, and better composability for the deeply nested `Patient` sections.

**Why `unplugin-swc` in the Vitest config?** This was the single non-obvious requirement. Vitest's default esbuild transform does **not** emit TypeScript decorator metadata, so NestJS dependency injection silently resolves `undefined` and the test suite fails with `Cannot read properties of undefined (reading 'getHello')`. Running the tests through SWC with `legacyDecorator: true` and `decoratorMetadata: true` mirrors what `nest build` does and restores DI.

**Why Vitest 3 and not 4?** Vitest 4 requires Vite ^6/^7/^8, but the workspace pins Vite 5 (via the client). Vitest 3 declares `vite: ^5.0.0 || ^6.0.0 || ^7.0.0-0`, so it is the newest version compatible with the monorepo's existing Vite.

**Why a custom ISO date helper instead of `z.iso.datetime()`?** The old `@IsDateString()` accepted partial ISO strings, and the client's `<input type="datetime-local">` submits `2026-08-15T10:00` (no seconds, no timezone). `z.iso.datetime()` rejects that. `isoDateString` in `core/common/validation.ts` keeps a permissive ISO 8601 regex so existing client payloads stay valid — behaviour parity, not a silent contract change.

**Consequences accepted:** request-body validation is the only automated strictness. `@Body()` without a `schema`, `@Param`/`@Query` values, and response shapes are **not** validated by the pipe; the FSM status transition check remains service-level logic. A shared `createValidationExceptionFactory()` keeps the error envelope (`{ statusCode, error: 'VALIDATION_ERROR', message, errors: [{ field, message }], timestamp, path }`) byte-identical to what `apps/client/src/lib/api/errors.ts` already consumes, so no frontend change was needed.

Lint improved as a side effect (195 → 121 problems; 161 → 88 errors), and `pnpm why class-validator` now reports it only as an optional peer of Nest.
