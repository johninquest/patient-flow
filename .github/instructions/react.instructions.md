---
applyTo: "apps/client/src/**"
description: "React frontend conventions for Patient Flow"
---

# React Instructions

## Component Rules

- **Function components only** — no class components
- **Named exports** — `export function PatientList()` not `export default`
- **Co-locate** — keep component file, styles (if any), and tests together
- **Small components** — extract sub-components when a file exceeds ~200 lines

## File Naming

- Components: `PascalCase.tsx` → `PatientCard.tsx`
- Hooks: `camelCase.ts` → `useAuth.ts`
- Utils: `camelCase.ts` → `formatDate.ts`
- Types: `camelCase.types.ts` → `patient.types.ts`
- Route pages: `PascalCase.tsx` → `PatientListPage.tsx`

## Data Fetching — TanStack Query

All server state goes through TanStack Query. Never use `fetch` or `axios` directly in components.

### API Client

Centralized API client in `apps/client/src/lib/api/client.ts` with `credentials: 'include'` for cookie-based auth.

### Query Hooks

Create custom hooks per feature in `apps/client/src/hooks/`:

```typescript
// hooks/usePatients.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api/client';

export function usePatients() {
  return useQuery({
    queryKey: ['patients'],
    queryFn: () => api.get('/patients').then(r => r.json()),
  });
}

export function useCreatePatient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePatientDto) => api.post('/patients', data).then(r => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patients'] }),
  });
}
```

### Query Key Convention

Use arrays for hierarchical keys:
- `['patients']` — list
- `['patients', id]` — detail
- `['encounters', { patientId }]` — filtered list

## Auth — React Context

Auth/session state lives in a React Context. This is the **only** use of Context for shared state.

```typescript
// hooks/useAuth.ts
const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) { ... }
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

## i18n — react-i18next

All user-facing strings must use the `useTranslation()` hook. Never hardcode English text.

```typescript
import { useTranslation } from 'react-i18next';

function PatientCard({ patient }: Props) {
  const { t } = useTranslation();
  return <h2>{t('patients.detail.title')}</h2>;
}
```

Translation files: `apps/client/src/i18n/en.json` and `apps/client/src/i18n/fr.json`.
Always add keys for **both** locales when adding new user-facing strings.

## Styling — Tailwind CSS v4

- **Tailwind only** — no inline styles, no CSS modules, no styled-components
- Use utility classes directly: `className="flex items-center gap-2 text-sm text-text-secondary"`
- For complex repeated patterns, extract to a component, not a CSS class
- Design tokens defined in `apps/client/src/index.css` using `@theme` directive

## Design System

The application uses a comprehensive design system with predefined tokens and reusable components. **Always use design system components instead of building custom UI elements.**

### Design Tokens

All design tokens are defined in `apps/client/src/index.css` and available as Tailwind utilities:

**Colors:**
- Brand: `primary` (#0E7C86), `accent` (#3B82C4)
- Text: `text-primary` (#1B2023), `text-secondary` (#5C6469)
- Backgrounds: `bg-canvas` (#F6F7F7), `bg-surface` (#FFFFFF)
- Borders: `border-default` (#E4E7E8)
- Status colors (always pair with icon + label for accessibility):
  - Waiting: `status-waiting-bg` (#FAEEDA), `status-waiting-text` (#633806)
  - In Progress: `status-progress-bg` (#E1F5EE), `status-progress-text` (#085041)
  - Ready: `status-ready-bg` (#EAF3DE), `status-ready-text` (#27500A)
  - Delayed: `status-delayed-bg` (#FCEBEB), `status-delayed-text` (#791F1F)

**Typography:**
- Font: Inter (400, 500 weights)
- Scale: `text-xs` (12px), `text-sm` (14px), `text-base` (16px), `text-lg` (20px), `text-xl` (24px), `text-2xl` (32px)

**Spacing & Layout:**
- 8pt grid: 4, 8, 12, 16, 24, 32, 48px
- Corner radius: `radius-control` (8px), `radius-card` (10-12px)
- Mobile-first breakpoints: base (0), tablet (768px), desktop (1024px)

### UI Component Library

All reusable components are in `apps/client/src/components/ui/`. **Use these instead of building custom UI:**

- **Button** — Primary, secondary, ghost, danger variants with loading states
- **Card** — Container with surface background and border
- **StatusPill** — Status indicators with icon + label (never color alone)
- **MetricCard** — Dashboard metric display with label, value, icon, link
- **FormInput** — Form field with label, input, error, help text
- **Modal** — Accessible modal with focus trap
- **EmptyState** — Empty list/view state with icon, title, description, action
- **LoadingSpinner** — Loading indicator with optional text
- **Avatar** — User initials with status-based coloring

**Import pattern:**
```typescript
import { Button, Card, StatusPill, MetricCard } from '../components/ui';
```

### Icons

Use `@heroicons/react` for all icons:
```typescript
import { UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
```

- Use outline icons for navigation and general UI
- Use solid icons for active states and emphasis
- Never use inline SVGs unless absolutely necessary

### Accessibility

- **WCAG AA compliance** — all text/background pairs meet 4.5:1 contrast ratio
- **Status indicators** — never use color alone, always include icon + text label
- **Empty states** — design empty, loading, and error states for every list view
- **Focus management** — use design system components which handle focus correctly

### Responsive Design

- **Mobile-first** — base styles for mobile, use `sm:`, `md:`, `lg:` breakpoints for larger screens
- **Navigation** — bottom tab bar on mobile (<1024px), sidebar on desktop (≥1024px)
- **Layout** — single column on mobile, multi-column on desktop
- **Touch targets** — minimum 44x44px for interactive elements on mobile

## Routing — React Router v7

All feature routes are lazy-loaded:

```typescript
// routes/AppRoutes.tsx
import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';

const DashboardPage = lazy(() => import('../features/dashboard/DashboardPage'));
const PatientListPage = lazy(() => import('../features/patients/PatientListPage'));
const PatientDetailPage = lazy(() => import('../features/patients/PatientDetailPage'));

export function AppRoutes() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/patients" element={<PatientListPage />} />
        <Route path="/patients/:id" element={<PatientDetailPage />} />
      </Routes>
    </Suspense>
  );
}
```

### Protected Routes

Wrap authenticated routes in a `ProtectedRoute` component that checks `useAuth()`:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/auth/login" />;
  return <>{children}</>;
}
```

## Feature Module Structure

```
features/<name>/
  <Name>ListPage.tsx       # List view
  <Name>DetailPage.tsx     # Detail view
  <Name>Form.tsx           # Create/edit form
  <Name>Card.tsx           # Card/list item component
  index.ts                 # Public exports
```

## Reusable Components

Shared UI primitives live in `apps/client/src/components/`:
- Button, Modal, Table, FormInput, Select, Alert, EmptyState, ConfirmDialog, Tooltip
- Prefer these over creating new one-off components
- All shared components accept `className` prop for Tailwind customization

## Error Handling

- Use TanStack Query's `error` state for API errors
- Show user-friendly error messages (translated via i18n)
- Never show raw API error responses to users
- Use error boundaries for unexpected React errors

## TypeScript

- Strict mode enabled
- Define types in `apps/client/src/lib/types/` — one file per entity
- Use interfaces for object shapes, types for unions/aliases
- API response types should match backend DTOs
