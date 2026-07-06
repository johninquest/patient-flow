---
applyTo: "**"
description: "Remind to log architectural decisions when detecting significant changes"
---

# Architecture Decision Reminder

When you detect that the user has made a significant architectural or implementation change, remind them to create an Architecture Decision Record (ADR).

## When to Suggest an ADR

Suggest creating an ADR when you observe:

1. **New module creation** — adding a new NestJS module in `api/src/modules/`
2. **Database schema changes** — modifications to `api/src/core/db/schema.ts` (new tables, columns, relationships, indexes)
3. **Technology or library changes** — adding new dependencies to `package.json` (especially architectural ones like ORMs, auth libraries, state management)
4. **Major refactors** — restructuring code across multiple files, changing patterns, or replacing implementations
5. **Authentication/authorization changes** — modifications to auth flow, guards, roles, or permissions
6. **API design decisions** — new endpoints that represent a shift in API design philosophy
7. **Frontend architecture changes** — new routing patterns, state management approaches, or major component restructuring

## How to Suggest

When you detect one of these changes, add a brief, non-intrusive reminder at the end of your response:

```
💡 **Architecture Decision:** This looks like a significant change. Consider logging the decision with `/log-architecture-decision` to capture your rationale for future reference.
```

## Guidelines

- **Be selective** — only suggest for genuinely significant changes, not routine bug fixes or minor updates
- **Don't be repetitive** — if you've already suggested an ADR for this change in the current conversation, don't suggest again
- **Be contextual** — if the user has already explained their rationale in the conversation, mention that specifically: "You mentioned choosing X because of Y — that would make a good ADR"
- **Respect the user's choice** — if they decline or ignore the suggestion, don't push it

## What NOT to Suggest ADRs For

- Bug fixes (unless they reveal a fundamental design flaw)
- Adding fields to existing DTOs
- Minor UI tweaks or styling changes
- Test additions or updates
- Documentation updates
- Dependency version bumps (unless major version with breaking changes)
- Configuration changes (unless they represent a strategic shift)
