# Architecture Decision Records

This directory contains lightweight Architecture Decision Records (ADRs) for the Patient Flow project.

## Purpose

Capture the **why** behind major architectural and implementation decisions — not just what changed, but the thought process and rationale.

## When to Create an ADR

Document decisions about:
- New modules or major features
- Database schema changes (new tables, relationships, indexing strategies)
- Technology or library choices
- Major refactors or architectural shifts
- Authentication/authorization changes
- API design decisions

## Format

Each ADR is a markdown file named `NNNN-short-description.md` (e.g., `0001-drizzle-over-prisma.md`).

**Template:**
```markdown
# [Title]

**Date:** YYYY-MM-DD  
**Status:** decided | superseded by NNNN

## Problem
What needed to change or be decided?

## Decision
What did you decide?

## Rationale
Why this approach over alternatives?
```

## Creating an ADR

Use the Copilot prompt: `/log-architecture-decision`

Or manually create a new file following the template above.

## Status Values

- **decided** — Final decision, currently in effect
- **superseded by NNNN** — Replaced by a later decision (reference the new ADR number)
