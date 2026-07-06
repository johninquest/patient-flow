---
name: log-architecture-decision
description: "Create an Architecture Decision Record (ADR) for a recent change"
---

# Log Architecture Decision

Create a lightweight Architecture Decision Record documenting a recent architectural or implementation decision.

## Input

Ask me for:
1. **What changed?** (brief description of the decision or change)
2. **Why?** (the problem it solves or the reason for the change)
3. **Any alternatives considered?** (optional — what else did you think about?)

## Process

1. **Determine the next ADR number:**
   - List files in `docs/decisions/` directory
   - Find the highest numbered ADR (e.g., `0003-something.md`)
   - Increment by 1 (e.g., `0004`)
   - If no ADRs exist, start with `0001`

2. **Generate a filename:**
   - Format: `NNNN-short-description.md`
   - Use lowercase, hyphens for spaces
   - Keep it concise (3-5 words max)
   - Example: `0004-uuidv7-for-ids.md`

3. **Create the ADR file** at `docs/decisions/NNNN-short-description.md` using this template:

```markdown
# [Descriptive Title]

**Date:** YYYY-MM-DD  
**Status:** decided

## Problem
[What needed to change or be decided? What was the situation before?]

## Decision
[What did you decide to do? Be specific about the implementation choice.]

## Rationale
[Why this approach? What were the key factors? If alternatives were considered, briefly mention them and why they were rejected.]
```

## Guidelines

- **Keep it lightweight** — aim for 10-20 lines total
- **Focus on the "why"** — the rationale is the most important part
- **Be specific** — avoid vague language; name the actual technologies, patterns, or approaches
- **Write for your future self** — in 6 months, will this explain why you made this choice?
- **Use today's date** for the Date field
- **Status is always "decided"** for new ADRs (unless explicitly superseding an older one)

## After Creating the ADR

1. Confirm the file was created
2. Show the full path: `docs/decisions/NNNN-short-description.md`
3. Suggest adding a comment in relevant code files if appropriate (e.g., `// See: docs/decisions/0004-uuidv7-for-ids.md`)

## Example

**Input:**
- What changed: "Switched from gen_random_uuid() to uuidv7() for all entity IDs"
- Why: "Need time-sortable IDs for better query performance and debugging"
- Alternatives: "Considered ULID but uuidv7 is native to PostgreSQL and works with Drizzle"

**Output:** `docs/decisions/0004-uuidv7-for-ids.md`

```markdown
# Use UUIDv7 for All Entity IDs

**Date:** 2026-07-06  
**Status:** decided

## Problem
Entity IDs were using `gen_random_uuid()` which produces random UUIDs. This made it difficult to sort records chronologically and debug issues by ID order.

## Decision
All entity IDs now use `uuidv7()` instead of `gen_random_uuid()`. This applies to patients, encounters, tasks, and audit_log tables.

## Rationale
UUIDv7 produces time-sortable UUIDs while maintaining the UUID format. This gives us chronological ordering for free, which improves query performance on time-range queries and makes debugging easier (newer records have "larger" IDs). Considered ULID but uuidv7 is natively supported in PostgreSQL 18 and has better Drizzle ORM integration.
```
