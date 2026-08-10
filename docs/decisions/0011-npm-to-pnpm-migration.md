# Migration from npm to pnpm

**Date:** 2026-08-11  
**Status:** decided  
**Supersedes:** [0010](./0010-monorepo-restructure.md)

## Problem

ADR 0010 originally chose **npm workspaces** + Turborepo for the monorepo, explicitly rejecting pnpm ("pnpm would change the package manager... and the `.npmrc` supply-chain policy assumes npm"). Over time this created friction:

1. **Supply-chain policy was npm-specific** — the `minimum-release-age` setting in `.npmrc` was the only hardening in place, and npm's hoisting model made it harder to reason about which packages could execute install scripts.
2. **No build-script safety** — npm installs run lifecycle scripts for all transitive dependencies by default, with no first-class way to allowlist which packages may run build scripts.
3. **Weaker isolation** — npm's flat `node_modules` hoisting masked phantom dependency issues and made Docker layer caching less reproducible across apps.
4. **Lockfile drift** — npm's lockfile format and resolution algorithm differed enough from the Docker-based installs that `npm ci` occasionally diverged from local `npm install` results.

A migration to pnpm was started to address these issues, but was left half-finished: the lockfile, `pnpm-workspace.yaml`, Dockerfiles, and `.npmrc` had been converted, but stale documentation, a dead `migrate` script, a missing `apps/api/.env.example`, and a contradictory ADR 0010 remained.

## Decision

Migrate the monorepo from **npm workspaces** to **pnpm 10.10.0** (pinned via `packageManager` in the root `package.json` and activated through Corepack in all Dockerfiles):

- **`pnpm-workspace.yaml`** declares `packages: [apps/*]` (replaces the npm `"workspaces"` field, which was removed from `package.json`).
- **`.npmrc`** retains `minimum-release-age=10080` (7-day supply-chain hardening) and adds pnpm-specific settings: `auto-install-peers=true`, `dedupe-peer-dependents=true`, `strict-peer-dependencies=false`, `node-linker=isolated`, `shamefully-hoist=false`.
- **`onlyBuiltDependencies`** in `pnpm-workspace.yaml` allowlists which packages may run install/build scripts (`@scarf/scarf`, `@swc/core`, `esbuild`) — all others are blocked by default.
- **Single root lockfile** (`pnpm-lock.yaml`); no per-app lockfiles. All four Dockerfiles (API/client × dev/prod) use `corepack enable` + `corepack prepare pnpm@10.10.0 --activate` followed by `pnpm install --frozen-lockfile`.
- **CI/Docker install policy**: `pnpm install --frozen-lockfile` for reproducible installs; `pnpm install` / `pnpm add` only for intentional local updates (per `AGENTS.md`).

## Rationale

1. **Strict `node_modules` isolation** — pnpm's symlinked `.pnpm` store means each workspace only sees its declared dependencies, surfacing phantom dependencies at build time instead of runtime.
2. **`onlyBuiltDependencies`** gives first-class control over which transitive packages can execute install scripts — a meaningful supply-chain hardening beyond `minimum-release-age`.
3. **Content-addressed store** — pnpm's global store deduplicates packages on disk and makes Docker layer caching faster and more reproducible.
4. **Corepack pinning** — `packageManager: pnpm@10.10.0` ensures every developer and CI runner gets the exact same pnpm version without a separate install step.
5. **Single lockfile** — one `pnpm-lock.yaml` at the root covers both workspaces, eliminating the per-app lockfile drift that npm workspaces required.

## Consequences

- All install commands are now `pnpm install --frozen-lockfile` (CI/Docker) or `pnpm install` (local intentional updates).
- The `.npmrc` settings are pnpm-specific (`node-linker`, `shamefully-hoist`, `auto-install-peers`) and will not work with npm.
- **ADR 0010 is superseded** — its rationale ("pnpm would change the package manager... rejected") no longer applies; this ADR documents the reversal.
- Historical ADRs (0005, 0007, 0008, 0009) still reference `npm run` in their verification sections — these are left unchanged as historical records of what was run at decision time.
- `docker-compose.test.yml` uses anonymous volumes for `/app/node_modules` and per-app `node_modules` to prevent host-container symlink conflicts during development.
