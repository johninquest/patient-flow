---
name: scaffold-react-feature
description: "Generate a React feature module following Patient Flow conventions"
---

# Scaffold React Feature

Generate a complete React feature module for the Patient Flow client.

## Input

Ask me for:
1. **Feature name** (e.g., `patients`, `encounters`, `tasks`)
2. **Entity fields** and their display types
3. **Which roles can see which views/actions**

## Output

Generate the following files:

### 1. `apps/client/src/features/<name>/<Name>ListPage.tsx`
- Default export (for lazy loading)
- `useTranslation()` for all strings
- TanStack Query hook for data fetching (`useQuery`)
- Use `Card` component as container
- Use `StatusPill` for status indicators (map entity status to design system: waiting/in_progress/ready/delayed)
- Use `EmptyState` when list is empty
- Use `LoadingSpinner` for loading state
- Use `Button` for actions (create, edit, delete)
- Role-based action buttons (hidden for unauthorized roles)
- Use Heroicons for all icons

### 2. `apps/client/src/features/<name>/<Name>DetailPage.tsx`
- Default export (for lazy loading)
- `useParams()` for ID, TanStack Query for detail fetch
- Use `Card` component as container
- Use `StatusPill` for status display
- Use `Button` for edit/delete actions (role-gated)
- Use `LoadingSpinner` for loading state
- Use Heroicons for back button and other icons

### 3. `apps/client/src/features/<name>/<Name>Form.tsx`
- Create/edit form using `FormInput` component for all fields
- Use `Button` for submit and cancel actions
- TanStack Query mutation (`useMutation`) for submit
- Validation feedback via `FormInput` error prop
- i18n labels and placeholders
- Use `Card` as form container

### 4. `apps/client/src/features/<name>/<Name>Card.tsx`
- Use `Card` component as wrapper
- Use `Avatar` if displaying user/patient initials
- Use `StatusPill` for status
- Key fields displayed with design system typography
- Click-through to detail

### 5. `apps/client/src/features/<name>/index.ts`
- Public exports for the feature

### 6. `apps/client/src/hooks/use<Names>.ts`
- `use<Names>()` — list query
- `use<Name>(id)` — detail query
- `useCreate<Name>()` — create mutation
- `useUpdate<Name>()` — update mutation
- `useDelete<Name>()` — delete mutation
- All mutations invalidate relevant query keys on success

### 7. `apps/client/src/lib/types/<name>.types.ts`
- TypeScript interface matching the backend entity
- Create and Update DTO types matching backend DTOs

### 8. Route registration
- Add lazy route(s) to the router config
- Wrap in `ProtectedRoute`
- Add navigation link to sidebar/nav

### 9. i18n keys
- Add translation keys to both `apps/client/src/i18n/en.json` and `apps/client/src/i18n/fr.json`

## Conventions Reference

- See `.github/instructions/react.instructions.md` for detailed patterns
- Function components only, named exports
- Tailwind CSS v4 for all styling with design system tokens
- `useTranslation()` for all user-facing strings
- TanStack Query for all server state
- **Always use design system components** from `apps/client/src/components/ui/`
- **Always use Heroicons** from `@heroicons/react`
- **Always include empty states** using `EmptyState` component
- **Always include loading states** using `LoadingSpinner` component
- **Map entity statuses** to design system status types (waiting/in_progress/ready/delayed)

## Design System Components

Import from `apps/client/src/components/ui`:
- `Button` — actions (primary, secondary, ghost, danger)
- `Card` — containers
- `StatusPill` — status indicators with icon + label
- `MetricCard` — dashboard metrics
- `FormInput` — form fields
- `Modal` — dialogs
- `EmptyState` — empty views
- `LoadingSpinner` — loading indicators
- `Avatar` — user initials

## Icons

Import from `@heroicons/react`:
```typescript
import { UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
```
