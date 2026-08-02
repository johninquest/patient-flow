---
applyTo: "apps/client/src/**"
description: "Design system rules and component usage guidelines for Patient Flow"
---

# Design System Instructions

## Overview

Patient Flow uses a comprehensive design system to ensure visual consistency, accessibility, and maintainability. **All UI must use design system components and tokens.**

## Design Tokens

All tokens are defined in `apps/client/src/index.css` using Tailwind v4's `@theme` directive.

### Color Palette

**Brand Colors:**
- `primary` (#0E7C86) — Primary actions, active states, links
- `accent` (#3B82C4) — Secondary actions, highlights

**Text Colors:**
- `text-primary` (#1B2023) — Headings, body text
- `text-secondary` (#5C6469) — Metadata, helper text, inactive states

**Background Colors:**
- `bg-canvas` (#F6F7F7) — Page background
- `bg-surface` (#FFFFFF) — Cards, modals, elevated surfaces

**Border Colors:**
- `border-default` (#E4E7E8) — Dividers, card borders, input borders

**Status Colors (Accessibility: Always pair with icon + label):**
- Waiting: `status-waiting-bg` (#FAEEDA), `status-waiting-text` (#633806)
- In Progress: `status-progress-bg` (#E1F5EE), `status-progress-text` (#085041)
- Ready: `status-ready-bg` (#EAF3DE), `status-ready-text` (#27500A)
- Delayed: `status-delayed-bg` (#FCEBEB), `status-delayed-text` (#791F1F)

### Typography

**Font Family:** Inter (400, 500 weights)

**Type Scale:**
- `text-xs` (12px) — Captions, timestamps
- `text-sm` (14px) — Secondary text, metadata
- `text-base` (16px) — Body text
- `text-lg` (20px) — Section headers
- `text-xl` (24px) — Page titles, key metrics
- `text-2xl` (32px) — Dashboard hero numbers

**Font Weights:**
- `font-normal` (400) — Body text
- `font-medium` (500) — Headings, emphasis

### Spacing & Layout

**8pt Grid:** 4, 8, 12, 16, 24, 32, 48px

**Corner Radius:**
- `radius-control` (8px) — Buttons, inputs, small controls
- `radius-card` (10-12px) — Cards, modals, large containers

**Breakpoints (Mobile-First):**
- Base (0px) — Mobile: single column, bottom tab bar
- `sm:` (640px) — Tablet: 2-column grids
- `md:` (768px) — Tablet landscape: 3-4 column grids
- `lg:` (1024px) — Desktop: sidebar nav, multi-column layouts

## Component Library

All components are in `apps/client/src/components/ui/`. **Always use these instead of building custom UI.**

### Button

**Usage:** Actions, form submissions, navigation triggers

**Variants:**
- `primary` — Main actions (create, save, submit)
- `secondary` — Secondary actions (cancel, back)
- `ghost` — Tertiary actions (close, dismiss)
- `danger` — Destructive actions (delete, suspend)

**Sizes:** `sm`, `md`, `lg`

**States:** `loading`, `disabled`

```tsx
import { Button } from '../components/ui';

<Button variant="primary" size="md" onClick={handleClick}>
  Create Patient
</Button>

<Button variant="danger" loading={isDeleting}>
  Delete
</Button>
```

### Card

**Usage:** Containers for content sections, list items, detail views

**Props:** `padding` (none, sm, md, lg)

```tsx
import { Card } from '../components/ui';

<Card padding="md">
  <h2>Patient Details</h2>
  {/* content */}
</Card>
```

### StatusPill

**Usage:** Status indicators for entities (encounters, tasks, patients)

**Status Types:** `waiting`, `in_progress`, `ready`, `delayed`

**Accessibility:** Always includes icon + label, never color alone

```tsx
import { StatusPill } from '../components/ui';
import { ClockIcon } from '@heroicons/react/24/outline';

<StatusPill
  status="in_progress"
  label="In Progress"
  icon={<ClockIcon className="w-4 h-4" />}
/>
```

**Status Mapping:**
- Encounter `scheduled`/`checked_in` → `waiting`
- Encounter `in_progress` → `in_progress`
- Encounter `completed` → `ready`
- Encounter `cancelled` → `delayed`
- Task `todo` → `waiting`
- Task `in_progress` → `in_progress`
- Task `done` → `ready`
- Priority `high` → `delayed`
- Priority `medium` → `waiting`
- Priority `low` → `ready`

### MetricCard

**Usage:** Dashboard metrics, summary statistics

**Props:** `label`, `value`, `icon`, `linkTo`, `linkLabel`

```tsx
import { MetricCard } from '../components/ui';
import { UserGroupIcon } from '@heroicons/react/24/outline';

<MetricCard
  label="Total Patients"
  value={stats.totalPatients}
  icon={<UserGroupIcon className="w-6 h-6" />}
  linkTo="/patients"
  linkLabel="View all"
/>
```

### FormInput

**Usage:** Form fields with labels, validation, and helper text

**Props:** `label`, `error`, `helpText`, plus all standard input props

```tsx
import { FormInput } from '../components/ui';

<FormInput
  label="Email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  error={errors.email}
  helpText="We'll never share your email"
/>
```

### Modal

**Usage:** Dialogs, confirmations, forms

**Props:** `isOpen`, `onClose`, `title`, `size` (sm, md, lg)

**Accessibility:** Focus trap, escape to close, aria labels

```tsx
import { Modal } from '../components/ui';

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Delete"
  size="sm"
>
  {/* modal content */}
</Modal>
```

### EmptyState

**Usage:** Empty lists, no search results, initial states

**Props:** `icon`, `title`, `description`, `action`

```tsx
import { EmptyState } from '../components/ui';
import { UserGroupIcon } from '@heroicons/react/24/outline';

<EmptyState
  icon={<UserGroupIcon className="w-12 h-12" />}
  title="No patients yet"
  description="Get started by adding your first patient"
  action={{
    label: "Add Patient",
    onClick: () => navigate('/patients/new')
  }}
/>
```

### LoadingSpinner

**Usage:** Loading states, async operations

**Props:** `size` (sm, md, lg), `text`

```tsx
import { LoadingSpinner } from '../components/ui';

<LoadingSpinner size="md" text="Loading patients..." />
```

### Avatar

**Usage:** User/patient initials with status-based coloring

**Props:** `initials`, `size` (sm, md, lg), `variant` (neutral, waiting, in_progress, ready, delayed)

```tsx
import { Avatar } from '../components/ui';

<Avatar
  initials="JD"
  size="md"
  variant="in_progress"
/>
```

## Icons

Use `@heroicons/react` for all icons.

**Import Pattern:**
```tsx
import { UserIcon, CalendarIcon } from '@heroicons/react/24/outline';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
```

**Guidelines:**
- Use outline icons (24/outline) for navigation and general UI
- Use solid icons (24/solid) for active states and emphasis
- Standard size: `w-5 h-5` or `w-6 h-6`
- Never use inline SVGs unless absolutely necessary

## Accessibility Requirements

### WCAG AA Compliance

- All text/background pairs must meet 4.5:1 contrast ratio
- Large text (18px+ bold or 24px+) must meet 3:1 contrast ratio
- Design system tokens are pre-validated for compliance

### Status Indicators

**Never use color alone to convey status.** Always include:
1. Icon
2. Text label
3. Color (via StatusPill component)

```tsx
// ✅ Correct
<StatusPill status="ready" label="Completed" icon={<CheckIcon />} />

// ❌ Incorrect
<span className="bg-green-100 text-green-800">Completed</span>
```

### Empty, Loading, and Error States

**Every list view must include:**
- Empty state (no data)
- Loading state (fetching data)
- Error state (failed to load)

```tsx
if (isLoading) return <LoadingSpinner text="Loading..." />;
if (error) return <ErrorState message={error.message} />;
if (!data.length) return <EmptyState ... />;
```

### Focus Management

- Use design system components (they handle focus correctly)
- Modals trap focus and restore it on close
- Interactive elements have visible focus rings

## Responsive Design

### Mobile-First Approach

Write base styles for mobile, then add responsive variants:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  {/* cards */}
</div>
```

### Navigation

- **Mobile (<1024px):** Bottom tab bar
- **Desktop (≥1024px):** Left sidebar

### Layout Patterns

**Mobile:**
- Single column layouts
- Stacked cards
- Full-width buttons
- Bottom tab bar navigation

**Tablet (sm:, md:):**
- 2-3 column grids
- Side-by-side cards
- Inline buttons

**Desktop (lg:):**
- Multi-column layouts
- Sidebar navigation
- Tables for dense data

### Touch Targets

- Minimum 44x44px for interactive elements on mobile
- Use `min-h-[44px]` and `min-w-[44px]` for touch targets
- Add adequate padding: `p-3` or `p-4`

## Common Patterns

### List Page

```tsx
import { Card, StatusPill, EmptyState, LoadingSpinner, Button } from '../components/ui';
import { UserGroupIcon } from '@heroicons/react/24/outline';

export default function PatientListPage() {
  const { data: patients, isLoading } = usePatients();
  
  if (isLoading) return <LoadingSpinner text="Loading patients..." />;
  
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-medium text-text-primary">Patients</h1>
        <Button onClick={() => navigate('/patients/new')}>Add Patient</Button>
      </div>
      
      {patients?.length ? (
        <Card padding="none">
          <ul className="divide-y divide-border-default">
            {patients.map(patient => (
              <li key={patient.id}>
                {/* list item */}
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={<UserGroupIcon className="w-12 h-12" />}
          title="No patients yet"
          description="Add your first patient to get started"
          action={{ label: "Add Patient", onClick: () => navigate('/patients/new') }}
        />
      )}
    </div>
  );
}
```

### Detail Page

```tsx
import { Card, StatusPill, Button } from '../components/ui';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function PatientDetailPage() {
  const { id } = useParams();
  const { data: patient, isLoading } = usePatient(id);
  
  if (isLoading) return <LoadingSpinner />;
  
  return (
    <div>
      <Link to="/patients" className="inline-flex items-center gap-1.5 text-sm text-primary mb-6">
        <ArrowLeftIcon className="w-4 h-4" />
        Back to Patients
      </Link>
      
      <Card padding="none">
        <div className="px-4 py-5 sm:px-6 border-b border-border-default">
          <h1 className="text-lg font-medium text-text-primary">
            {patient.firstName} {patient.lastName}
          </h1>
        </div>
        {/* detail content */}
      </Card>
    </div>
  );
}
```

### Form Page

```tsx
import { Card, FormInput, Button } from '../components/ui';

export default function PatientForm() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  
  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <FormInput
          label="First Name"
          {...register('firstName', { required: 'Required' })}
          error={errors.firstName?.message}
        />
        
        <FormInput
          label="Email"
          type="email"
          {...register('email')}
          error={errors.email?.message}
        />
        
        <div className="flex gap-3 pt-4">
          <Button type="submit">Save</Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>
    </Card>
  );
}
```

## Anti-Patterns

### ❌ Don't Do This

```tsx
// ❌ Custom button instead of Button component
<button className="bg-blue-500 text-white px-4 py-2 rounded">
  Click Me
</button>

// ❌ Inline SVG instead of Heroicons
<svg viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12..." />
</svg>

// ❌ Color-only status indicator
<span className="bg-green-500 w-3 h-3 rounded-full" />

// ❌ Hardcoded colors instead of tokens
<div className="bg-gray-100 text-gray-900">...</div>

// ❌ Missing empty/loading states
{data.map(item => <Item key={item.id} />)}
```

### ✅ Do This Instead

```tsx
// ✅ Use Button component
<Button variant="primary" onClick={handleClick}>
  Click Me
</Button>

// ✅ Use Heroicons
import { CheckIcon } from '@heroicons/react/24/outline';
<CheckIcon className="w-5 h-5" />

// ✅ Use StatusPill with icon + label
<StatusPill status="ready" label="Active" icon={<CheckIcon />} />

// ✅ Use design tokens
<div className="bg-bg-canvas text-text-primary">...</div>

// ✅ Include all states
if (isLoading) return <LoadingSpinner />;
if (!data.length) return <EmptyState ... />;
{data.map(item => <Item key={item.id} />)}
```

## Testing

### Visual Testing

- Test on mobile (375px), tablet (768px), and desktop (1280px)
- Verify all status indicators have icon + label
- Check empty, loading, and error states
- Test with long text (overflow, truncation)

### Accessibility Testing

- Use browser DevTools to check color contrast
- Test keyboard navigation (Tab, Enter, Escape)
- Test with screen reader (VoiceOver, NVDA)
- Verify focus indicators are visible

### Component Testing

```tsx
import { render, screen } from '@testing-library/react';
import { Button } from '../components/ui';

test('Button renders with correct variant', () => {
  render(<Button variant="primary">Click Me</Button>);
  expect(screen.getByRole('button')).toHaveClass('bg-primary');
});
```

## Resources

- **Design Tokens:** `apps/client/src/index.css`
- **Component Library:** `apps/client/src/components/ui/`
- **Icons:** [@heroicons/react](https://heroicons.com/)
- **Tailwind v4 Docs:** [tailwindcss.com](https://tailwindcss.com/)
- **WCAG Guidelines:** [w3.org/WAI/WCAG21](https://www.w3.org/WAI/WCAG21/quickref/)
