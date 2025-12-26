# Popati - Property Rent Collection App

> A lean, focused property management tool for landlords. Unlike comprehensive property management suites, Popati prioritizes **rent collection tracking** above all else.

## Core Philosophy

- **Simple over feature-rich**: Do one thing well — track rent payments
- **Minimal clicks**: Property → Tenant → Record payment
- **Mobile-friendly**: Landlords collect rent on the go

---

## User Personas

| Persona | Description | Permissions |
|---------|-------------|-------------|
| **Landlord (Owner)** | Primary user, owns properties | Full access: CRUD all entities, delegate access |
| **Manager** | Delegated by landlord | View + edit: properties, tenants, rent entries |
| **Viewer** | Read-only access | View only: no modifications allowed |

---

## Data Model

### Entities & Relationships

```
Landlord (User)
│
├── Property
│       ├── name: string
│       ├── city: string
│       ├── country: string
│       ├── construction_year: number (optional)
│       │
│       ├── Unit (optional, for multi-unit properties)
│       │       ├── unit_name: string
│       │       ├── unit_number: string
│       │       └── Tenant ──► Rent Entry
│       │
│       └── Tenant (direct, for single-unit properties)
│               └── Rent Entry
│
└── User Access (delegated permissions)
        ├── user: relation → User
        ├── property: relation → Property
        └── role: "manager" | "viewer"
```

### Entity Details

#### Property
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | ✓ | e.g., "Sunrise Apartments" |
| city | string | ✓ | |
| country | string | ✓ | |
| construction_year | number | | Optional metadata |
| owner | relation → User | ✓ | The landlord |

#### Unit
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| unit_name | string | | e.g., "Ground Floor Left" |
| unit_number | string | ✓ | e.g., "A1", "101" |
| property | relation → Property | ✓ | |

#### Tenant
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| name | string | ✓ | Full name |
| id_number | string | | National ID / Passport |
| phone | string | ✓ | Primary contact |
| property | relation → Property | ✓ | Always linked to property |
| unit | relation → Unit | | Optional, for multi-unit properties |
| active | boolean | ✓ | Current tenant or past |

#### Rent Entry
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| tenant | relation → Tenant | ✓ | |
| amount | number | ✓ | Amount collected |
| currency | string | ✓ | e.g., "KES", "USD" |
| date | date | ✓ | Payment date |
| period | string | ✓ | e.g., "2025-01" for January 2025 |
| notes | string | | Optional remarks |
| recorded_by | relation → User | ✓ | For audit trail |

#### User Access (Delegation)
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| user | relation → User | ✓ | The delegated user |
| property | relation → Property | ✓ | Access scope |
| role | select | ✓ | "manager" or "viewer" |
| granted_by | relation → User | ✓ | The landlord |

#### Audit Log
| Field | Type | Required | Notes |
|-------|------|----------|-------|
| entity_type | string | ✓ | "property", "tenant", "unit", "rent_entry" |
| entity_id | string | ✓ | Record ID |
| action | string | ✓ | "create", "update", "delete" |
| changes | json | | Before/after values |
| user | relation → User | ✓ | Who made the change |
| timestamp | datetime | ✓ | Auto-set |

---

## Key Workflows

### 1. Property Setup (One-time)

```
Create Property → (Optional) Add Units → Add Tenants
```

### 2. Rent Collection (Daily use) ⭐

```
Select Property → Select Tenant → Enter Amount + Date → Save
```

> This is the **primary workflow** — must be fast and frictionless.

### 3. Delegate Access

```
Property Settings → Invite User (email) → Select Role → Send Invite
```

---

## UI/UX Principles

1. **Dashboard first**: Show rent collection status at a glance
   - Properties with overdue/pending rent highlighted
   - Quick-add rent button prominently placed

2. **Property-centric navigation**: 
   - List of properties → Property detail → Tenants/Units → Rent history

3. **Minimal form fields**: Only ask for what's essential
   - Rent entry: tenant (pre-selected if navigating from tenant), amount, date
   - Everything else optional or auto-filled

4. **Mobile-optimized**: 
   - Large touch targets
   - Bottom navigation for key actions
   - Pull-to-refresh patterns

---

## Technical Implementation Notes

### Backend (PocketBase)

- **Collections**: properties, units, tenants, rent_entries, user_access, audit_logs
- **Row-level security**: Filter by `owner = @request.auth.id` OR via `user_access` relation
- **Hooks**: Auto-create audit log entries on create/update/delete

### Frontend (SvelteKit + Svelte 5)

- **Existing**: Auth flow, basic components (Button, Card, FormInput, Alert)
- **Needed**: Table, Modal, Dropdown, property/tenant/rent forms
- **State**: Use PocketBase realtime subscriptions for live updates

---

## MVP Scope (Phase 1)

- [ ] PocketBase collections setup with security rules
- [ ] Property CRUD
- [ ] Tenant CRUD (direct to property, no units)
- [ ] Rent entry creation and listing
- [ ] Basic dashboard with property list

## Phase 2

- [ ] Unit support for multi-unit properties
- [ ] User access delegation
- [ ] Audit log viewing
- [ ] Rent period tracking (due vs. paid)

## Phase 3

- [ ] Reporting (monthly/yearly summaries)
- [ ] Export to CSV/PDF
- [ ] Notifications (rent due reminders)
- [ ] Multi-currency support