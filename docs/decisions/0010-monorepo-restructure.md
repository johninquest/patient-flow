# Monorepo Restructure with npm Workspaces + Turborepo

**Date:** 2026-07-25  
**Status:** decided

## Problem

The Patient Flow codebase had grown into two independent applications — a NestJS API and a React client — each living at the repository root (`api/`, `client/`) with separate `package.json`, lockfiles, and `.npmrc` files. This created friction:

1. **No shared task orchestration** — running lint/build/test across both apps required manual `cd` into each directory.
2. **Duplicated tooling config** — `.npmrc` supply-chain hardening (`minimumReleaseAge=10080`) was copy-pasted into both apps.
3. **No caching** — repeated builds re-ran unchanged work.
4. **Deployment coupling** — the apps deploy separately (API → VPS via Docker/Traefik; client → Firebase Hosting for MVP), so the structure needed to keep per-app build contexts and lockfiles intact.

A restructure was needed to centralize tooling while preserving independent, separately-deployable builds.

## Decision

Adopt a **monorepo** using **npm workspaces** (`"workspaces": ["apps/*"]`) plus **Turborepo v2** as the task runner, with the following layout:

```
apps/
  api/      # NestJS backend (existing api/ moved here)
  client/   # React frontend (existing client/ moved here)
```

- **Root `package.json`** declares the workspace and exposes `dev`, `build`, `test`, `lint` (via `turbo run`) plus `dev:api` / `dev:client` passthroughs.
- **`turbo.json`** defines `build` (dependsOn `^build`, outputs `dist/**` `build/**`), `lint`, `test` (dependsOn `^build`), and `dev` (cache disabled, persistent).
- **`.npmrc`** with `minimumReleaseAge=10080` is consolidated at the repo root; per-app `.npmrc` files were removed.
- **Per-app Docker builds** are retained: each `Dockerfile`/`Dockerfile.prod` uses its own `apps/<app>` build context and keeps its own lockfile, so the API and client can still be built and deployed independently.
- **`packages/shared`** (shared code/types) is **explicitly deferred** — the only genuinely shared dependency is `better-auth`, which is a normal npm dependency, not internal code. Cross-package code sharing is not needed yet.

## Rationale

1. **npm workspaces** is zero-cost (ships with npm, the project's existing package manager) — no new package manager to learn or CI changes required.
2. **Turborepo** adds fast task orchestration and caching on top of workspaces with a tiny config footprint, directly addressing the build/lint/test friction.
3. **Per-app Docker contexts + lockfiles** preserve the separate-deploy requirement (VPS API, Firebase client) without a monolithic image.
4. **Deferring `packages/shared`** avoids premature abstraction — the apps share no internal TypeScript today, and introducing a shared package now would add build-order complexity for no current benefit.

Considered pnpm workspaces and Nx, but pnpm would change the package manager (and the `.npmrc` supply-chain policy assumes npm), and Nx was heavier than the project's needs. Both were rejected in favor of the lighter npm-workspaces + Turborepo combination.

## Consequences

- All path references in docs, instructions, and prompts were updated from `api/` → `apps/api/` and `client/` → `apps/client/`.
- CI and Docker Compose files point at `apps/api` and `apps/client` build contexts.
- `npm install` at the root links both workspaces and generates a single root lockfile; per-app lockfiles remain for Docker reproducibility.
